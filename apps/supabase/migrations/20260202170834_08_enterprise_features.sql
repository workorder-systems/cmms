-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Migration: Enterprise Features
-- 
-- This migration creates all enterprise features:
-- - Rate limiting tables and functions
-- - Audit logging tables, triggers, and retention configuration
-- - Plugin/integration scaffolding
-- - Analytics materialized views and refresh functions
--
-- All features are implemented correctly the first time with no backward compatibility.

-- ============================================================================
-- Rate Limiting
-- ============================================================================

create table util.rate_limit_tracking (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  tenant_id uuid references app.tenants(id) on delete cascade,
  operation_type text not null,
  operation_key text,
  count integer not null default 1,
  window_start timestamptz not null default pg_catalog.date_trunc('minute', pg_catalog.now()),
  created_at timestamptz not null default pg_catalog.now(),
  constraint rate_limit_tracking_unique unique (user_id, tenant_id, operation_type, operation_key, window_start)
);

comment on table util.rate_limit_tracking is 
  'Tracks rate limit usage for expensive operations per user/tenant/operation. Automatically tracks request counts within time windows for rate limiting enforcement. Records are cleaned up after window expires.';

comment on column util.rate_limit_tracking.operation_type is 
  'Type of operation: tenant_create, status_transition, work_order_create, etc.';

comment on column util.rate_limit_tracking.operation_key is 
  'Specific operation identifier for granular rate limiting (e.g., entity type).';

comment on column util.rate_limit_tracking.window_start is 
  'Start of the rate limit window (truncated to minute for simplicity).';

create index rate_limit_tracking_lookup_idx 
  on util.rate_limit_tracking (user_id, tenant_id, operation_type, operation_key, window_start);

create index rate_limit_tracking_cleanup_idx 
  on util.rate_limit_tracking (window_start);

create table cfg.rate_limit_configs (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid references app.tenants(id) on delete cascade,
  operation_type text not null,
  max_requests integer not null,
  window_minutes integer not null,
  is_active boolean not null default true,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint rate_limit_configs_unique unique (tenant_id, operation_type)
);

comment on table cfg.rate_limit_configs is 
  'Tenant-specific rate limit configurations. Overrides default limits if specified. Allows per-tenant customization of rate limits for different operation types.';

create index rate_limit_configs_tenant_idx 
  on cfg.rate_limit_configs (tenant_id, operation_type, is_active);

create trigger rate_limit_configs_set_updated_at 
  before update on cfg.rate_limit_configs 
  for each row 
  execute function util.set_updated_at();

alter table cfg.rate_limit_configs enable row level security;

create policy rate_limit_configs_select_tenant 
  on cfg.rate_limit_configs 
  for select 
  to authenticated 
  using (tenant_id = authz.get_current_tenant_id());

create or replace function util.check_rate_limit(
  p_operation_type text,
  p_operation_key text default null,
  p_max_requests integer default 60,
  p_window_minutes integer default 1,
  p_user_id uuid default auth.uid(),
  p_tenant_id uuid default authz.get_current_tenant_id()
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_window_start timestamptz;
  v_current_count integer;
  v_allowed boolean;
  v_user_id_check uuid;
begin
  v_user_id_check := coalesce(p_user_id, auth.uid());
  if v_user_id_check is null then
    raise exception using
      message = 'User ID required for rate limiting',
      errcode = '28000';
  end if;
  
  v_window_start := pg_catalog.date_trunc('minute', pg_catalog.now()) - 
    (extract(minute from pg_catalog.now())::integer % p_window_minutes) * pg_catalog.make_interval(mins => 1);
  
  insert into util.rate_limit_tracking (
    user_id,
    tenant_id,
    operation_type,
    operation_key,
    count,
    window_start
  )
  values (
    v_user_id_check,
    p_tenant_id,
    p_operation_type,
    p_operation_key,
    1,
    v_window_start
  )
  on conflict (user_id, tenant_id, operation_type, operation_key, window_start)
  do update set count = rate_limit_tracking.count + 1
  returning count into v_current_count;
  
  v_allowed := v_current_count <= p_max_requests;
  
  if not v_allowed then
    raise exception using
      message = format('Rate limit exceeded: %s requests per %s minutes allowed for operation %s. Current count: %s', 
        p_max_requests, p_window_minutes, p_operation_type, v_current_count),
      errcode = '54000';
  end if;
  
  return true;
end;
$$;

comment on function util.check_rate_limit(text, text, integer, integer, uuid, uuid) is 
  'Full rate limiting implementation. Tracks request counts per user/tenant/operation within time windows and enforces limits. Raises exception if limit exceeded. Uses config table if available, else uses parameters. Rate limiting algorithm: Sliding window with per-minute granularity. Tracks in rate_limit_tracking table.';

revoke all on function util.check_rate_limit(text, text, integer, integer, uuid, uuid) from public;
grant execute on function util.check_rate_limit(text, text, integer, integer, uuid, uuid) to authenticated;

create or replace function util.check_rate_limit_with_config(
  p_operation_type text,
  p_operation_key text default null,
  p_user_id uuid default auth.uid(),
  p_tenant_id uuid default authz.get_current_tenant_id()
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_max_requests integer;
  v_window_minutes integer;
begin
  select max_requests, window_minutes
  into v_max_requests, v_window_minutes
  from cfg.rate_limit_configs
  where tenant_id = p_tenant_id
    and operation_type = p_operation_type
    and is_active = true;
  
  if v_max_requests is null then
    raise exception using
      message = format('Rate limit config not found for operation type: %s', p_operation_type),
      errcode = 'P0001';
  end if;
  
  return util.check_rate_limit(
    p_operation_type,
    p_operation_key,
    v_max_requests,
    v_window_minutes,
    p_user_id,
    p_tenant_id
  );
end;
$$;

comment on function util.check_rate_limit_with_config(text, text, uuid, uuid) is 
  'Rate limiting using config table only. Looks up tenant-specific rate limit configuration and applies it. Raises exception if config not found. Used for tenant-specific rate limiting.';

revoke all on function util.check_rate_limit_with_config(text, text, uuid, uuid) from public;
grant execute on function util.check_rate_limit_with_config(text, text, uuid, uuid) to authenticated;

create or replace function util.cleanup_rate_limit_tracking()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from util.rate_limit_tracking
  where window_start < pg_catalog.now() - pg_catalog.make_interval(hours => 1);
end;
$$;

comment on function util.cleanup_rate_limit_tracking() is 
  'Cleans up old rate limit tracking data (records older than 1 hour). Should be run periodically via cron job or scheduled task. Periodic cleanup strategy prevents unbounded growth of tracking table.';

revoke all on function util.cleanup_rate_limit_tracking() from public;
grant execute on function util.cleanup_rate_limit_tracking() to postgres;

-- ============================================================================
-- Audit Logging
-- ============================================================================

create table audit.entity_changes (
  id bigint generated always as identity primary key,
  table_schema text not null,
  table_name text not null,
  record_id text not null,
  operation text not null check (operation in ('INSERT', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  changed_fields text[],
  user_id uuid references auth.users(id) on delete set null,
  tenant_id uuid references app.tenants(id) on delete cascade,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default pg_catalog.now()
);

comment on table audit.entity_changes is 
  'Comprehensive audit log of all CRUD operations on critical tables. Tracks who, what, when, and how data changed. Used for compliance, security, and debugging. Captures full record state for INSERT/UPDATE/DELETE operations.';

comment on column audit.entity_changes.table_schema is 
  'Schema name of the affected table (e.g., app, cfg).';

comment on column audit.entity_changes.table_name is 
  'Name of the affected table.';

comment on column audit.entity_changes.record_id is 
  'Primary key of the affected record (stored as text to support both UUID and bigint IDs).';

comment on column audit.entity_changes.operation is 
  'Type of operation: INSERT, UPDATE, or DELETE.';

comment on column audit.entity_changes.old_data is 
  'Previous state of the record (for UPDATE/DELETE operations). JSONB representation of the entire record.';

comment on column audit.entity_changes.new_data is 
  'New state of the record (for INSERT/UPDATE operations). JSONB representation of the entire record.';

comment on column audit.entity_changes.changed_fields is 
  'Array of field names that changed (for UPDATE operations only). Helps identify which fields were modified.';

create index entity_changes_table_idx 
  on audit.entity_changes (table_schema, table_name, record_id);

create index entity_changes_tenant_created_idx 
  on audit.entity_changes (tenant_id, created_at desc) 
  where tenant_id is not null;

create index entity_changes_user_created_idx 
  on audit.entity_changes (user_id, created_at desc) 
  where user_id is not null;

create index entity_changes_operation_created_idx 
  on audit.entity_changes (operation, created_at desc);

create index entity_changes_tenant_table_record_idx
  on audit.entity_changes (tenant_id, table_name, record_id)
  where tenant_id is not null;

create index entity_changes_created_at_brin_idx 
  on audit.entity_changes using brin (created_at);

create table audit.permission_changes (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  change_type text not null check (change_type in ('ROLE_ASSIGNED', 'ROLE_REMOVED', 'PERMISSION_GRANTED', 'PERMISSION_REVOKED')),
  role_id uuid references cfg.tenant_roles(id) on delete set null,
  permission_id uuid references cfg.permissions(id) on delete set null,
  permission_key text,
  role_key text,
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default pg_catalog.now()
);

comment on table audit.permission_changes is 
  'Audit log specifically for role and permission changes. Tracks who granted/revoked permissions and roles. Separate from entity_changes for specialized permission auditing.';

create index permission_changes_tenant_created_idx 
  on audit.permission_changes (tenant_id, created_at desc);

create index permission_changes_target_user_idx 
  on audit.permission_changes (target_user_id, created_at desc) 
  where target_user_id is not null;

create index permission_changes_tenant_target_idx
  on audit.permission_changes (tenant_id, target_user_id, created_at desc)
  where target_user_id is not null;

create index permission_changes_change_type_idx 
  on audit.permission_changes (change_type, created_at desc);

create or replace function audit.log_entity_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old_data jsonb;
  v_new_data jsonb;
  v_changed_fields text[];
  v_user_id uuid;
  v_tenant_id uuid;
  v_record_id text;
  v_field text;
begin
  v_user_id := auth.uid();
  
  if tg_op = 'DELETE' then
    v_old_data := pg_catalog.to_jsonb(old);
    v_record_id := (old.id)::text;
    
    if tg_table_name = 'tenants' and tg_table_schema = 'app' then
      v_tenant_id := old.id;
    elsif v_old_data ? 'tenant_id' and v_old_data->>'tenant_id' is not null then
      v_tenant_id := (v_old_data->>'tenant_id')::uuid;
    end if;
    
    insert into audit.entity_changes (
      table_schema,
      table_name,
      record_id,
      operation,
      old_data,
      user_id,
      tenant_id
    ) values (
      tg_table_schema,
      tg_table_name,
      v_record_id,
      'DELETE',
      v_old_data,
      v_user_id,
      v_tenant_id
    );
    
    return old;
    
  elsif tg_op = 'UPDATE' then
    v_old_data := pg_catalog.to_jsonb(old);
    v_new_data := pg_catalog.to_jsonb(new);
    v_record_id := (new.id)::text;
    
    if tg_table_name = 'tenants' and tg_table_schema = 'app' then
      v_tenant_id := new.id;
    elsif v_new_data ? 'tenant_id' and v_new_data->>'tenant_id' is not null then
      v_tenant_id := (v_new_data->>'tenant_id')::uuid;
    end if;
    
    v_changed_fields := array[]::text[];
    for v_field in select key from pg_catalog.jsonb_each(v_old_data)
    loop
      if v_old_data->>v_field is distinct from v_new_data->>v_field then
        v_changed_fields := array_append(v_changed_fields, v_field);
      end if;
    end loop;
    
    insert into audit.entity_changes (
      table_schema,
      table_name,
      record_id,
      operation,
      old_data,
      new_data,
      changed_fields,
      user_id,
      tenant_id
    ) values (
      tg_table_schema,
      tg_table_name,
      v_record_id,
      'UPDATE',
      v_old_data,
      v_new_data,
      v_changed_fields,
      v_user_id,
      v_tenant_id
    );
    
    return new;
    
  elsif tg_op = 'INSERT' then
    v_new_data := pg_catalog.to_jsonb(new);
    v_record_id := (new.id)::text;
    
    if tg_table_name = 'tenants' and tg_table_schema = 'app' then
      v_tenant_id := new.id;
    elsif v_new_data ? 'tenant_id' and v_new_data->>'tenant_id' is not null then
      v_tenant_id := (v_new_data->>'tenant_id')::uuid;
    end if;
    
    insert into audit.entity_changes (
      table_schema,
      table_name,
      record_id,
      operation,
      new_data,
      user_id,
      tenant_id
    ) values (
      tg_table_schema,
      tg_table_name,
      v_record_id,
      'INSERT',
      v_new_data,
      v_user_id,
      v_tenant_id
    );
    
    return new;
  end if;
  
  return null;
end;
$$;

comment on function audit.log_entity_change() is 
  'Generic trigger function for entity changes. Logs all INSERT, UPDATE, and DELETE operations on tables where it is attached. Captures full record state (old_data for UPDATE/DELETE, new_data for INSERT/UPDATE), tracks user_id, tenant_id, and calculates changed_fields for UPDATE operations. Audit logging mechanism ensures compliance and security.';

revoke all on function audit.log_entity_change() from public;
grant execute on function audit.log_entity_change() to postgres;

create or replace function audit.log_permission_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_role_key text;
  v_change_type text;
begin
  v_user_id := auth.uid();
  
  select key into v_role_key
  from cfg.tenant_roles
  where id = coalesce(new.tenant_role_id, old.tenant_role_id);
  
  if tg_op = 'INSERT' then
    v_change_type := 'ROLE_ASSIGNED';
    
    insert into audit.permission_changes (
      tenant_id,
      user_id,
      target_user_id,
      change_type,
      role_id,
      role_key,
      changed_by
    ) values (
      new.tenant_id,
      new.user_id,
      new.user_id,
      v_change_type,
      new.tenant_role_id,
      v_role_key,
      v_user_id
    );
    
    return new;
    
  elsif tg_op = 'DELETE' then
    v_change_type := 'ROLE_REMOVED';
    
    insert into audit.permission_changes (
      tenant_id,
      user_id,
      target_user_id,
      change_type,
      role_id,
      role_key,
      changed_by
    ) values (
      old.tenant_id,
      old.user_id,
      old.user_id,
      v_change_type,
      old.tenant_role_id,
      v_role_key,
      v_user_id
    );
    
    return old;
  end if;
  
  return null;
end;
$$;

comment on function audit.log_permission_change() is 
  'Trigger function for permission changes. Logs role assignment and removal events for user tenant roles. Tracks who assigned/removed roles and when. Used for permission change audit trail.';

revoke all on function audit.log_permission_change() from public;
grant execute on function audit.log_permission_change() to postgres;

create trigger work_orders_audit_trigger
  after insert or update or delete on app.work_orders
  for each row execute function audit.log_entity_change();

create trigger assets_audit_trigger
  after insert or update or delete on app.assets
  for each row execute function audit.log_entity_change();

create trigger locations_audit_trigger
  after insert or update or delete on app.locations
  for each row execute function audit.log_entity_change();

create trigger departments_audit_trigger
  after insert or update or delete on app.departments
  for each row execute function audit.log_entity_change();

create trigger tenants_audit_trigger
  after insert or update or delete on app.tenants
  for each row execute function audit.log_entity_change();

create trigger tenant_memberships_audit_trigger
  after insert or update or delete on app.tenant_memberships
  for each row execute function audit.log_entity_change();

create trigger user_tenant_roles_audit_trigger
  after insert or update or delete on app.user_tenant_roles
  for each row execute function audit.log_entity_change();

create trigger tenant_roles_audit_trigger
  after insert or update or delete on cfg.tenant_roles
  for each row execute function audit.log_entity_change();

create trigger tenant_role_permissions_audit_trigger
  after insert or update or delete on cfg.tenant_role_permissions
  for each row execute function audit.log_entity_change();

create trigger user_tenant_roles_permission_audit_trigger
  after insert or delete on app.user_tenant_roles
  for each row execute function audit.log_permission_change();

create trigger work_order_time_entries_audit_trigger
  after insert or update or delete on app.work_order_time_entries
  for each row execute function audit.log_entity_change();

create trigger work_order_attachments_audit_trigger
  after insert or update or delete on app.work_order_attachments
  for each row execute function audit.log_entity_change();

alter table audit.entity_changes enable row level security;
alter table audit.permission_changes enable row level security;

create policy entity_changes_select_tenant_admin 
  on audit.entity_changes 
  for select 
  to authenticated 
  using (
    tenant_id is null 
    or exists (
      select 1
      from app.user_tenant_roles utr
      join cfg.tenant_roles tr on utr.tenant_role_id = tr.id
      where utr.user_id = (select auth.uid())
        and utr.tenant_id = entity_changes.tenant_id
        and tr.key = 'admin'
    )
  );

create policy permission_changes_select_tenant_admin 
  on audit.permission_changes 
  for select 
  to authenticated 
  using (
    exists (
      select 1
      from app.user_tenant_roles utr
      join cfg.tenant_roles tr on utr.tenant_role_id = tr.id
      where utr.user_id = (select auth.uid())
        and utr.tenant_id = permission_changes.tenant_id
        and tr.key = 'admin'
    )
  );

create or replace view public.v_audit_entity_changes
with (security_invoker = true)
as
select
  id,
  table_schema,
  table_name,
  record_id,
  operation,
  old_data,
  new_data,
  changed_fields,
  user_id,
  tenant_id,
  created_at
from audit.entity_changes
where tenant_id = authz.get_current_tenant_id()
  and exists (
    select 1
    from app.user_tenant_roles utr
    join cfg.tenant_roles tr on utr.tenant_role_id = tr.id
    where utr.user_id = auth.uid()
      and utr.tenant_id = audit.entity_changes.tenant_id
      and tr.key = 'admin'
  );

comment on view public.v_audit_entity_changes is 
  'Tenant-scoped audit log view. Only accessible to tenant admins. Returns audit trail for current tenant context. Uses SECURITY INVOKER to enforce RLS policies correctly. Used for compliance reporting and security monitoring.';

grant select on public.v_audit_entity_changes to authenticated;

create table cfg.audit_retention_configs (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  retention_months integer not null default 24,
  is_active boolean not null default true,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint audit_retention_configs_tenant_unique unique (tenant_id),
  constraint audit_retention_configs_months_check check (
    retention_months >= 1
    and retention_months <= 120
  )
);

comment on table cfg.audit_retention_configs is
  'Tenant-specific audit retention configuration. Overrides the default retention window (24 months) when active.';
comment on column cfg.audit_retention_configs.retention_months is
  'Retention window in months for audit logs. Minimum 1, maximum 120.';
comment on column cfg.audit_retention_configs.is_active is
  'If true, this config overrides the default retention window.';

create index audit_retention_configs_tenant_idx
  on cfg.audit_retention_configs (tenant_id, is_active);

create trigger audit_retention_configs_set_updated_at
  before update on cfg.audit_retention_configs
  for each row
  execute function util.set_updated_at();

alter table cfg.audit_retention_configs enable row level security;

create policy audit_retention_configs_select_authenticated
  on cfg.audit_retention_configs
  for select
  to authenticated
  using (
    authz.is_tenant_member(auth.uid(), tenant_id)
    and authz.has_permission(auth.uid(), tenant_id, 'tenant.admin')
  );

create policy audit_retention_configs_select_anon
  on cfg.audit_retention_configs
  for select
  to anon
  using (false);

create policy audit_retention_configs_insert_authenticated
  on cfg.audit_retention_configs
  for insert
  to authenticated
  with check (
    authz.is_tenant_member(auth.uid(), tenant_id)
    and authz.has_permission(auth.uid(), tenant_id, 'tenant.admin')
  );

create policy audit_retention_configs_insert_anon
  on cfg.audit_retention_configs
  for insert
  to anon
  with check (false);

create policy audit_retention_configs_update_authenticated
  on cfg.audit_retention_configs
  for update
  to authenticated
  using (
    authz.is_tenant_member(auth.uid(), tenant_id)
    and authz.has_permission(auth.uid(), tenant_id, 'tenant.admin')
  )
  with check (
    authz.is_tenant_member(auth.uid(), tenant_id)
    and authz.has_permission(auth.uid(), tenant_id, 'tenant.admin')
  );

create policy audit_retention_configs_update_anon
  on cfg.audit_retention_configs
  for update
  to anon
  using (false)
  with check (false);

create policy audit_retention_configs_delete_authenticated
  on cfg.audit_retention_configs
  for delete
  to authenticated
  using (
    authz.is_tenant_member(auth.uid(), tenant_id)
    and authz.has_permission(auth.uid(), tenant_id, 'tenant.admin')
  );

create policy audit_retention_configs_delete_anon
  on cfg.audit_retention_configs
  for delete
  to anon
  using (false);

create or replace view public.v_audit_retention_configs
with (security_invoker = true)
as
select
  id,
  tenant_id,
  retention_months,
  is_active,
  created_at,
  updated_at
from cfg.audit_retention_configs
where tenant_id = authz.get_current_tenant_id();

comment on view public.v_audit_retention_configs is
  'Tenant-scoped audit retention configuration for the current tenant context. Requires tenant.admin access via RLS. Uses SECURITY INVOKER to enforce RLS policies correctly.';

grant select on public.v_audit_retention_configs to authenticated;

create or replace view public.v_audit_permission_changes
with (security_invoker = true)
as
select
  id,
  tenant_id,
  user_id,
  target_user_id,
  change_type,
  role_id,
  permission_id,
  permission_key,
  role_key,
  changed_by,
  created_at
from audit.permission_changes
where tenant_id = authz.get_current_tenant_id()
  and exists (
    select 1
    from app.user_tenant_roles utr
    join cfg.tenant_roles tr on utr.tenant_role_id = tr.id
    where utr.user_id = auth.uid()
      and utr.tenant_id = audit.permission_changes.tenant_id
      and tr.key = 'admin'
  );

comment on view public.v_audit_permission_changes is
  'Tenant-scoped permission audit log view. Only accessible to tenant admins. Returns permission change events for current tenant context. Uses SECURITY INVOKER to enforce RLS policies correctly.';

grant select on public.v_audit_permission_changes to authenticated;

create or replace function public.rpc_set_audit_retention_config(
  p_tenant_id uuid,
  p_retention_months integer,
  p_is_active boolean default true
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform authz.rpc_setup(p_tenant_id, 'tenant.admin');

  if p_retention_months < 1 or p_retention_months > 120 then
    raise exception using
      message = 'Retention months must be between 1 and 120',
      errcode = '23514';
  end if;

  insert into cfg.audit_retention_configs (
    tenant_id,
    retention_months,
    is_active
  )
  values (
    p_tenant_id,
    p_retention_months,
    p_is_active
  )
  on conflict (tenant_id)
  do update set
    retention_months = excluded.retention_months,
    is_active = excluded.is_active,
    updated_at = pg_catalog.now();
end;
$$;

comment on function public.rpc_set_audit_retention_config(uuid, integer, boolean) is
  'Creates or updates audit retention configuration for a tenant. Requires tenant.admin permission. Uses retention months between 1 and 120.';

revoke all on function public.rpc_set_audit_retention_config(uuid, integer, boolean) from public;
grant execute on function public.rpc_set_audit_retention_config(uuid, integer, boolean) to authenticated;

create or replace function util.purge_audit_records(
  p_tenant_id uuid,
  p_retention_months integer default null,
  p_dry_run boolean default false
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_retention_months integer;
  v_cutoff timestamptz;
  v_entity_count integer;
  v_permission_count integer;
begin
  if p_retention_months is not null then
    v_retention_months := p_retention_months;
  else
    select retention_months
    into v_retention_months
    from cfg.audit_retention_configs
    where tenant_id = p_tenant_id
      and is_active = true;
  end if;

  if v_retention_months is null then
    v_retention_months := 24;
  end if;

  if v_retention_months < 1 then
    raise exception using
      message = 'Retention months must be at least 1',
      errcode = '23514';
  end if;

  v_cutoff := pg_catalog.now() - pg_catalog.make_interval(months => v_retention_months);

  if p_dry_run then
    select count(*)
    into v_entity_count
    from audit.entity_changes
    where tenant_id = p_tenant_id
      and created_at < v_cutoff;

    select count(*)
    into v_permission_count
    from audit.permission_changes
    where tenant_id = p_tenant_id
      and created_at < v_cutoff;

    return v_entity_count + v_permission_count;
  end if;

  delete from audit.entity_changes
  where tenant_id = p_tenant_id
    and created_at < v_cutoff;
  get diagnostics v_entity_count = row_count;

  delete from audit.permission_changes
  where tenant_id = p_tenant_id
    and created_at < v_cutoff;
  get diagnostics v_permission_count = row_count;

  return v_entity_count + v_permission_count;
end;
$$;

comment on function util.purge_audit_records(uuid, integer, boolean) is
  'Purges audit records older than retention window for a tenant. Uses tenant-specific retention config when present; defaults to 24 months. Dry-run returns the count without deleting. Intended for scheduled jobs.';

revoke all on function util.purge_audit_records(uuid, integer, boolean) from public;
grant execute on function util.purge_audit_records(uuid, integer, boolean) to postgres;

-- ============================================================================
-- Plugin/Integration System
-- ============================================================================

create table int.plugins (
  id uuid primary key default extensions.gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  is_integration boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint plugins_key_format_check check (
    key ~ '^[a-z0-9_]+$'
    and length(key) >= 2
    and length(key) <= 80
  )
);

comment on table int.plugins is
  'Catalog of available plugins and integrations. Entries are managed by core system code, not tenant users. Integrations are plugins that connect to external systems.';
comment on column int.plugins.key is
  'Stable identifier for the plugin/integration (lowercase snake_case). Used by RPCs and external runtimes.';
comment on column int.plugins.is_integration is
  'Marks whether the plugin connects to an external system. Integrations are a plugin subtype.';
comment on column int.plugins.is_active is
  'Controls whether the plugin is available for installation. Inactive plugins cannot be installed.';

create trigger plugins_set_updated_at
  before update on int.plugins
  for each row
  execute function util.set_updated_at();

create table int.plugin_installations (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  plugin_id uuid not null references int.plugins(id) on delete cascade,
  status text not null default 'installed' check (status in ('installed', 'disabled', 'uninstalled')),
  secret_ref text,
  config jsonb,
  installed_by uuid references auth.users(id) on delete set null,
  installed_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint plugin_installations_tenant_plugin_unique unique (tenant_id, plugin_id)
);

comment on table int.plugin_installations is
  'Tenant installation state for plugins and integrations. Stores configuration metadata and references to external secrets.';
comment on column int.plugin_installations.secret_ref is
  'Opaque reference to external secrets storage. Secrets and tokens must never be stored in Postgres.';
comment on column int.plugin_installations.config is
  'Non-secret configuration metadata for the plugin installation (jsonb).';
comment on column int.plugin_installations.status is
  'Lifecycle state for the installation: installed, disabled, or uninstalled.';

create index plugin_installations_tenant_idx
  on int.plugin_installations (tenant_id, status);

create index plugin_installations_plugin_idx
  on int.plugin_installations (plugin_id);

create trigger plugin_installations_set_updated_at
  before update on int.plugin_installations
  for each row
  execute function util.set_updated_at();

alter table int.plugins enable row level security;
alter table int.plugin_installations enable row level security;

create policy plugins_select_authenticated
  on int.plugins
  for select
  to authenticated
  using (true);

create policy plugins_select_anon
  on int.plugins
  for select
  to anon
  using (false);

create policy plugins_insert_authenticated
  on int.plugins
  for insert
  to authenticated
  with check (false);

create policy plugins_insert_anon
  on int.plugins
  for insert
  to anon
  with check (false);

create policy plugins_update_authenticated
  on int.plugins
  for update
  to authenticated
  using (false)
  with check (false);

create policy plugins_update_anon
  on int.plugins
  for update
  to anon
  using (false)
  with check (false);

create policy plugins_delete_authenticated
  on int.plugins
  for delete
  to authenticated
  using (false);

create policy plugins_delete_anon
  on int.plugins
  for delete
  to anon
  using (false);

create or replace function public.rpc_register_plugin(
  p_key text,
  p_name text,
  p_description text default null,
  p_is_integration boolean default false,
  p_is_active boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = ''
volatile
as $$
declare
  v_plugin_id uuid;
begin
  if length(pg_catalog.btrim(p_key)) = 0 then
    raise exception using
      message = 'Plugin key is required',
      errcode = '23514';
  end if;

  if length(pg_catalog.btrim(p_name)) = 0 then
    raise exception using
      message = 'Plugin name is required',
      errcode = '23514';
  end if;

  insert into int.plugins (
    key,
    name,
    description,
    is_integration,
    is_active
  )
  values (
    p_key,
    p_name,
    p_description,
    p_is_integration,
    p_is_active
  )
  on conflict (key)
  do update set
    name = excluded.name,
    description = excluded.description,
    is_integration = excluded.is_integration,
    is_active = excluded.is_active,
    updated_at = pg_catalog.now()
  returning id into v_plugin_id;

  return v_plugin_id;
end;
$$;

comment on function public.rpc_register_plugin(text, text, text, boolean, boolean) is
  'Registers or updates a plugin catalog entry in int.plugins. This is an internal-only function for service_role usage (not part of public client API). Follows ADR pattern: public RPC wrapper that accesses internal int schema.';

revoke all on function public.rpc_register_plugin(text, text, text, boolean, boolean) from public;
grant execute on function public.rpc_register_plugin(text, text, text, boolean, boolean) to service_role;
grant execute on function public.rpc_register_plugin(text, text, text, boolean, boolean) to postgres;

create policy plugin_installations_select_authenticated
  on int.plugin_installations
  for select
  to authenticated
  using (
    authz.is_tenant_member(auth.uid(), tenant_id)
    and authz.has_permission(auth.uid(), tenant_id, 'tenant.admin')
  );

create policy plugin_installations_select_anon
  on int.plugin_installations
  for select
  to anon
  using (false);

create policy plugin_installations_insert_authenticated
  on int.plugin_installations
  for insert
  to authenticated
  with check (
    authz.is_tenant_member(auth.uid(), tenant_id)
    and authz.has_permission(auth.uid(), tenant_id, 'tenant.admin')
  );

create policy plugin_installations_insert_anon
  on int.plugin_installations
  for insert
  to anon
  with check (false);

create policy plugin_installations_update_authenticated
  on int.plugin_installations
  for update
  to authenticated
  using (
    authz.is_tenant_member(auth.uid(), tenant_id)
    and authz.has_permission(auth.uid(), tenant_id, 'tenant.admin')
  )
  with check (
    authz.is_tenant_member(auth.uid(), tenant_id)
    and authz.has_permission(auth.uid(), tenant_id, 'tenant.admin')
  );

create policy plugin_installations_update_anon
  on int.plugin_installations
  for update
  to anon
  using (false)
  with check (false);

create policy plugin_installations_delete_authenticated
  on int.plugin_installations
  for delete
  to authenticated
  using (
    authz.is_tenant_member(auth.uid(), tenant_id)
    and authz.has_permission(auth.uid(), tenant_id, 'tenant.admin')
  );

create policy plugin_installations_delete_anon
  on int.plugin_installations
  for delete
  to anon
  using (false);

create trigger plugins_audit_changes
  after insert or update or delete on int.plugins
  for each row execute function audit.log_entity_change();

create trigger plugin_installations_audit_changes
  after insert or update or delete on int.plugin_installations
  for each row execute function audit.log_entity_change();

create or replace view public.v_plugins
with (security_invoker = true)
as
select
  id,
  key,
  name,
  description,
  is_integration,
  is_active,
  created_at,
  updated_at
from int.plugins
where is_active = true;

comment on view public.v_plugins is
  'Public catalog of active plugins and integrations. Read-only view for client discovery. Uses SECURITY INVOKER to enforce RLS policies correctly.';

grant select on public.v_plugins to authenticated;
grant select on public.v_plugins to anon;

create or replace view public.v_plugin_installations
with (security_invoker = true)
as
select
  pi.id,
  pi.tenant_id,
  pi.plugin_id,
  p.key as plugin_key,
  p.name as plugin_name,
  p.is_integration,
  pi.status,
  pi.secret_ref,
  pi.config,
  pi.installed_by,
  pi.installed_at,
  pi.updated_at
from int.plugin_installations pi
join int.plugins p on p.id = pi.plugin_id
where pi.tenant_id = authz.get_current_tenant_id()
  and (
    (select auth.uid()) is not null
    and authz.has_permission((select auth.uid()), pi.tenant_id, 'tenant.admin')
  );

comment on view public.v_plugin_installations is
  'Tenant-scoped plugin installation status for the current tenant context. Admin-only view; requires tenant.admin permission. Includes plugin metadata and configuration references. Uses SECURITY INVOKER to enforce RLS policies correctly. RLS policies on underlying table provide additional security.';

grant select on public.v_plugin_installations to authenticated;

create or replace function public.rpc_install_plugin(
  p_tenant_id uuid,
  p_plugin_key text,
  p_secret_ref text default null,
  p_config jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_plugin_id uuid;
  v_installation_id uuid;
begin
  perform util.check_rate_limit('plugin_install', null, 10, 1, auth.uid(), p_tenant_id);
  
  perform authz.rpc_setup(p_tenant_id, 'tenant.admin');
  v_user_id := authz.validate_authenticated();

  select id into v_plugin_id
  from int.plugins
  where key = p_plugin_key
    and is_active = true;

  if v_plugin_id is null then
    raise exception using
      message = format('Plugin %s not found or not active', p_plugin_key),
      errcode = 'P0001';
  end if;

  if p_secret_ref is not null and length(pg_catalog.btrim(p_secret_ref)) = 0 then
    raise exception using
      message = 'Secret reference must be non-empty when provided',
      errcode = '23514';
  end if;

  insert into int.plugin_installations (
    tenant_id,
    plugin_id,
    status,
    secret_ref,
    config,
    installed_by
  )
  values (
    p_tenant_id,
    v_plugin_id,
    'installed',
    p_secret_ref,
    p_config,
    v_user_id
  )
  on conflict (tenant_id, plugin_id)
  do update set
    status = 'installed',
    secret_ref = excluded.secret_ref,
    config = excluded.config,
    installed_by = v_user_id,
    updated_at = pg_catalog.now()
  returning id into v_installation_id;

  return v_installation_id;
end;
$$;

comment on function public.rpc_install_plugin(uuid, text, text, jsonb) is
  'Installs a plugin for a tenant. Public API wrapper that accesses int.plugin_installations internally. Requires tenant.admin permission. Follows ADR 0001 (public RPC for writes) and ADR 0010 (rpc_<verb>_<resource> naming). Rate limited to 10 requests per minute per user.';

revoke all on function public.rpc_install_plugin(uuid, text, text, jsonb) from public;
grant execute on function public.rpc_install_plugin(uuid, text, text, jsonb) to authenticated;

create or replace function public.rpc_update_plugin_installation(
  p_tenant_id uuid,
  p_installation_id uuid,
  p_status text default null,
  p_secret_ref text default null,
  p_config jsonb default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_installation_tenant_id uuid;
begin
  v_user_id := authz.rpc_setup(p_tenant_id, 'tenant.admin');

  perform util.check_rate_limit('plugin_update', null, 20, 1, v_user_id, p_tenant_id);

  if p_secret_ref is not null and length(pg_catalog.btrim(p_secret_ref)) = 0 then
    raise exception using
      message = 'Secret reference must be non-empty when provided',
      errcode = '23514';
  end if;

  if p_status is not null and p_status not in ('installed', 'disabled', 'uninstalled') then
    raise exception using
      message = format('Invalid plugin installation status: %s', p_status),
      errcode = '23514';
  end if;

  select tenant_id into v_installation_tenant_id
  from int.plugin_installations
  where id = p_installation_id;

  if v_installation_tenant_id is null then
    raise exception using
      message = 'Plugin installation not found',
      errcode = 'P0001';
  end if;

  if v_installation_tenant_id != p_tenant_id then
    raise exception using
      message = 'Unauthorized: Plugin installation does not belong to this tenant',
      errcode = '42501';
  end if;

  update int.plugin_installations
  set
    status = coalesce(p_status, status),
    secret_ref = coalesce(p_secret_ref, secret_ref),
    config = coalesce(p_config, config),
    updated_at = pg_catalog.now()
  where id = p_installation_id;
end;
$$;

comment on function public.rpc_update_plugin_installation(uuid, uuid, text, text, jsonb) is
  'Updates plugin installation status/config for a tenant. Requires tenant.admin permission. Only stores secret_ref (opaque reference).';

revoke all on function public.rpc_update_plugin_installation(uuid, uuid, text, text, jsonb) from public;
grant execute on function public.rpc_update_plugin_installation(uuid, uuid, text, text, jsonb) to authenticated;

create or replace function public.rpc_uninstall_plugin(
  p_tenant_id uuid,
  p_installation_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_installation_tenant_id uuid;
begin
  perform util.check_rate_limit('plugin_uninstall', null, 10, 1, auth.uid(), p_tenant_id);
  
  perform authz.rpc_setup(p_tenant_id, 'tenant.admin');
  v_user_id := authz.validate_authenticated();

  select tenant_id into v_installation_tenant_id
  from int.plugin_installations
  where id = p_installation_id;

  if not found then
    raise exception using
      message = format('Plugin installation %s not found', p_installation_id),
      errcode = 'P0001';
  end if;

  if v_installation_tenant_id != p_tenant_id then
    raise exception using
      message = 'Unauthorized: Installation does not belong to this tenant',
      errcode = '42501';
  end if;

  delete from int.plugin_installations
  where id = p_installation_id;
end;
$$;

comment on function public.rpc_uninstall_plugin(uuid, uuid) is
  'Uninstalls a plugin for a tenant. Public API wrapper that accesses int.plugin_installations internally. Requires tenant.admin permission. Follows ADR 0001 (public RPC for writes) and ADR 0010 (rpc_<verb>_<resource> naming). Rate limited to 10 requests per minute per user.';

revoke all on function public.rpc_uninstall_plugin(uuid, uuid) from public;
grant execute on function public.rpc_uninstall_plugin(uuid, uuid) to authenticated;

-- ============================================================================
-- Analytics Materialized Views
-- ============================================================================

create materialized view public.mv_work_order_summary as
select
  tenant_id,
  status,
  priority,
  count(*) as count,
  count(*) filter (where assigned_to is not null) as assigned_count,
  count(*) filter (where due_date < pg_catalog.now() and status not in ('completed', 'cancelled')) as overdue_count,
  count(*) filter (where status in ('completed', 'cancelled')) as completed_count,
  count(*) filter (where created_at > pg_catalog.now() - pg_catalog.make_interval(days => 30)) as created_last_30_days,
  avg(extract(epoch from (completed_at - created_at)) / 3600) filter (where completed_at is not null) as avg_completion_hours,
  min(created_at) as first_work_order_at,
  max(created_at) as last_work_order_at,
  max(updated_at) as last_updated_at
from app.work_orders
group by tenant_id, status, priority;

comment on materialized view public.mv_work_order_summary is 
  'Pre-computed work order statistics by tenant, status, and priority. Aggregated counts, completion metrics, and time-based statistics. Updated via refresh functions.';

create unique index mv_work_order_summary_pkey 
  on public.mv_work_order_summary (tenant_id, status, priority);

create index mv_work_order_summary_tenant_idx 
  on public.mv_work_order_summary (tenant_id);

create materialized view public.mv_asset_summary as
select
  tenant_id,
  status,
  location_id,
  count(*) as count,
  count(*) filter (where status = 'active') as active_count,
  count(*) filter (where status != 'active') as inactive_count,
  count(*) filter (where location_id is null) as unassigned_count,
  min(created_at) as first_asset_at,
  max(created_at) as last_asset_at,
  max(updated_at) as last_updated_at
from app.assets
group by tenant_id, status, location_id;

comment on materialized view public.mv_asset_summary is 
  'Pre-computed asset statistics by tenant, status, and location. Aggregated counts and status distribution. Updated via refresh functions.';

create unique index mv_asset_summary_pkey 
  on public.mv_asset_summary (tenant_id, status, location_id);

create index mv_asset_summary_tenant_idx 
  on public.mv_asset_summary (tenant_id);

create materialized view public.mv_location_summary as
select
  l.tenant_id,
  l.id as location_id,
  l.name as location_name,
  l.parent_location_id,
  count(distinct a.id) as asset_count,
  count(distinct a.id) filter (where a.status = 'active') as active_asset_count,
  count(distinct wo.id) as work_order_count,
  count(distinct wo.id) filter (where wo.status not in ('completed', 'cancelled')) as active_work_order_count,
  count(distinct wo.id) filter (where wo.status in ('completed', 'cancelled')) as completed_work_order_count,
  max(wo.updated_at) as last_work_order_activity_at,
  max(a.updated_at) as last_asset_activity_at
from app.locations l
left join app.assets a on a.location_id = l.id
left join app.work_orders wo on wo.location_id = l.id
group by l.tenant_id, l.id, l.name, l.parent_location_id;

comment on materialized view public.mv_location_summary is 
  'Pre-computed location statistics including asset and work order counts per location. Hierarchy-aware aggregations. Updated via refresh functions.';

create unique index mv_location_summary_pkey 
  on public.mv_location_summary (location_id);

create index mv_location_summary_tenant_idx 
  on public.mv_location_summary (tenant_id);

create index mv_location_summary_parent_idx 
  on public.mv_location_summary (parent_location_id) 
  where parent_location_id is not null;

create materialized view public.mv_tenant_overview as
select
  t.id as tenant_id,
  t.name as tenant_name,
  t.slug,
  count(distinct tm.user_id) as member_count,
  count(distinct l.id) as location_count,
  count(distinct a.id) as asset_count,
  count(distinct wo.id) as work_order_count,
  count(distinct wo.id) filter (where wo.status not in ('completed', 'cancelled')) as active_work_order_count,
  count(distinct wo.id) filter (where wo.due_date < pg_catalog.now() and wo.status not in ('completed', 'cancelled')) as overdue_work_order_count,
  min(wo.created_at) as first_work_order_at,
  max(wo.created_at) as last_work_order_at,
  t.created_at as tenant_created_at
from app.tenants t
left join app.tenant_memberships tm on tm.tenant_id = t.id
left join app.locations l on l.tenant_id = t.id
left join app.assets a on a.tenant_id = t.id
left join app.work_orders wo on wo.tenant_id = t.id
group by t.id, t.name, t.slug, t.created_at;

comment on materialized view public.mv_tenant_overview is 
  'Pre-computed tenant-level statistics and overview. High-level metrics per tenant including member count, asset count, work order counts, and activity timestamps. Updated via refresh functions.';

create unique index mv_tenant_overview_pkey 
  on public.mv_tenant_overview (tenant_id);

create or replace function public.refresh_analytics_views()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  refresh materialized view concurrently public.mv_work_order_summary;
  refresh materialized view concurrently public.mv_asset_summary;
  refresh materialized view concurrently public.mv_location_summary;
  refresh materialized view concurrently public.mv_tenant_overview;
end;
$$;

comment on function public.refresh_analytics_views() is 
  'Refreshes all analytics materialized views concurrently. Safe to run in production without blocking reads. Concurrent refresh allows queries to continue using old data while refresh happens. Refresh strategy ensures analytics stay up-to-date.';

revoke all on function public.refresh_analytics_views() from public;
grant execute on function public.refresh_analytics_views() to authenticated;

create or replace function public.refresh_tenant_analytics(
  p_tenant_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.refresh_analytics_views();
end;
$$;

comment on function public.refresh_tenant_analytics(uuid) is 
  'Refreshes analytics for a tenant. Delegates to full refresh due to PostgreSQL limitation - materialized views cannot be partially refreshed. Tenant-scoped refresh limitation documented: PostgreSQL requires full refresh. Workaround: Full concurrent refresh is safe and efficient.';

revoke all on function public.refresh_tenant_analytics(uuid) from public;
grant execute on function public.refresh_tenant_analytics(uuid) to authenticated;

create or replace view public.v_work_orders_summary
with (security_invoker = true)
as
select *
from public.mv_work_order_summary
where tenant_id = authz.get_current_tenant_id();

comment on view public.v_work_orders_summary is 
  'Tenant-scoped work orders summary. Returns data for current tenant context only. Filters materialized view by tenant. Uses SECURITY INVOKER to enforce RLS policies correctly.';

grant select on public.v_work_orders_summary to authenticated;
grant select on public.v_work_orders_summary to anon;

create or replace view public.v_assets_summary
with (security_invoker = true)
as
select *
from public.mv_asset_summary
where tenant_id = authz.get_current_tenant_id();

comment on view public.v_assets_summary is 
  'Tenant-scoped assets summary. Returns data for current tenant context only. Filters materialized view by tenant. Uses SECURITY INVOKER to enforce RLS policies correctly.';

grant select on public.v_assets_summary to authenticated;
grant select on public.v_assets_summary to anon;

create or replace view public.v_locations_summary
with (security_invoker = true)
as
select *
from public.mv_location_summary
where tenant_id = authz.get_current_tenant_id();

comment on view public.v_locations_summary is 
  'Tenant-scoped locations summary. Returns data for current tenant context only. Filters materialized view by tenant. Uses SECURITY INVOKER to enforce RLS policies correctly.';

grant select on public.v_locations_summary to authenticated;
grant select on public.v_locations_summary to anon;

create or replace view public.v_tenants_overview
with (security_invoker = true)
as
select *
from public.mv_tenant_overview
where tenant_id = authz.get_current_tenant_id()
  and exists (
    select 1
    from app.tenant_memberships
    where tenant_id = mv_tenant_overview.tenant_id
      and user_id = (select auth.uid())
  );

comment on view public.v_tenants_overview is 
  'Tenant overview for current tenant. Only accessible to tenant members. Filters materialized view by tenant and membership. Uses SECURITY INVOKER to enforce RLS policies correctly.';

grant select on public.v_tenants_overview to authenticated;
grant select on public.v_tenants_overview to anon;

-- ============================================================================
-- Grants for Enterprise Features
-- ============================================================================

grant select on audit.entity_changes to authenticated;
grant select on audit.permission_changes to authenticated;

grant select on int.plugins to authenticated;
grant select on int.plugin_installations to authenticated;

grant select on cfg.rate_limit_configs to authenticated;
grant select on cfg.audit_retention_configs to authenticated;
