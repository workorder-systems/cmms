-- SPDX-License-Identifier: AGPL-3.0-or-later
create table if not exists util.rate_limit_tracking (
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

create index if not exists rate_limit_tracking_lookup_idx 
  on util.rate_limit_tracking (user_id, tenant_id, operation_type, operation_key, window_start);

create index if not exists rate_limit_tracking_cleanup_idx 
  on util.rate_limit_tracking (window_start);

create table if not exists cfg.rate_limit_configs (
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

create index if not exists rate_limit_configs_tenant_idx 
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


create table if not exists audit.entity_changes (
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

create index if not exists entity_changes_table_idx 
  on audit.entity_changes (table_schema, table_name, record_id);

create index if not exists entity_changes_tenant_created_idx 
  on audit.entity_changes (tenant_id, created_at desc) 
  where tenant_id is not null;

create index if not exists entity_changes_user_created_idx 
  on audit.entity_changes (user_id, created_at desc) 
  where user_id is not null;

create index if not exists entity_changes_operation_created_idx 
  on audit.entity_changes (operation, created_at desc);

create index if not exists entity_changes_created_at_brin_idx 
  on audit.entity_changes using brin (created_at);

create table if not exists audit.permission_changes (
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

create index if not exists permission_changes_tenant_created_idx 
  on audit.permission_changes (tenant_id, created_at desc);

create index if not exists permission_changes_target_user_idx 
  on audit.permission_changes (target_user_id, created_at desc) 
  where target_user_id is not null;

create index if not exists permission_changes_change_type_idx 
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

create or replace view public.v_audit_entity_changes as
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
  'Tenant-scoped audit log view. Only accessible to tenant admins. Returns audit trail for current tenant context. Used for compliance reporting and security monitoring.';


create materialized view if not exists public.mv_work_order_summary as
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

create unique index if not exists mv_work_order_summary_pkey 
  on public.mv_work_order_summary (tenant_id, status, priority);

create index if not exists mv_work_order_summary_tenant_idx 
  on public.mv_work_order_summary (tenant_id);

create materialized view if not exists public.mv_asset_summary as
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

create unique index if not exists mv_asset_summary_pkey 
  on public.mv_asset_summary (tenant_id, status, location_id);

create index if not exists mv_asset_summary_tenant_idx 
  on public.mv_asset_summary (tenant_id);

create materialized view if not exists public.mv_location_summary as
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

create unique index if not exists mv_location_summary_pkey 
  on public.mv_location_summary (location_id);

create index if not exists mv_location_summary_tenant_idx 
  on public.mv_location_summary (tenant_id);

create index if not exists mv_location_summary_parent_idx 
  on public.mv_location_summary (parent_location_id) 
  where parent_location_id is not null;

create materialized view if not exists public.mv_tenant_overview as
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

create unique index if not exists mv_tenant_overview_pkey 
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

create or replace view public.v_work_orders_summary as
select *
from public.mv_work_order_summary
where tenant_id = authz.get_current_tenant_id();

comment on view public.v_work_orders_summary is 
  'Tenant-scoped work orders summary. Returns data for current tenant context only. Filters materialized view by tenant.';

create or replace view public.v_assets_summary as
select *
from public.mv_asset_summary
where tenant_id = authz.get_current_tenant_id();

comment on view public.v_assets_summary is 
  'Tenant-scoped assets summary. Returns data for current tenant context only. Filters materialized view by tenant.';

create or replace view public.v_locations_summary as
select *
from public.mv_location_summary
where tenant_id = authz.get_current_tenant_id();

comment on view public.v_locations_summary is 
  'Tenant-scoped locations summary. Returns data for current tenant context only. Filters materialized view by tenant.';

create or replace view public.v_tenants_overview as
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
  'Tenant overview for current tenant. Only accessible to tenant members. Filters materialized view by tenant and membership.';

select public.refresh_analytics_views();
