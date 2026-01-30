-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Adds technician and manager roles, auditable time tracking, and work order attachments.
-- 
-- Changes:
-- - Adds Technician and Manager roles to default tenant setup
-- - Creates work_order_time_entries table for auditable time tracking (replaces simple integer column)
-- - Creates work_order_attachments table for photos/files
-- - Adds RPCs: rpc_log_work_order_time (creates time entries), rpc_add_work_order_attachment

-- ============================================================================
-- Phase 0.2: Opinionated default roles (Technician, Manager)
-- ============================================================================
-- Note: cfg.create_default_tenant_roles is updated in 20260121129000_add_maintenance_types.sql
-- to include technician, manager roles, and maintenance types. This migration focuses on
-- time tracking and attachments functionality.

-- ============================================================================
-- Phase 0.4: Minimal schema for technician speed
-- ============================================================================

-- Create work_order_time_entries table for auditable time tracking
create table if not exists app.work_order_time_entries (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  work_order_id uuid not null references app.work_orders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete set null,
  entry_date date not null default current_date,
  minutes integer not null,
  description text,
  logged_at timestamptz not null default pg_catalog.now(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint work_order_time_entries_minutes_check check (
    minutes > 0 
    and minutes <= 1440
  ),
  constraint work_order_time_entries_entry_date_range_check check (
    entry_date >= current_date - make_interval(days => 365)
    and entry_date <= current_date + make_interval(days => 7)
  ),
  constraint work_order_time_entries_description_length_check check (
    description is null 
    or (length(description) >= 1 
        and length(description) <= 1000)
  )
);

comment on table app.work_order_time_entries is 
  'Time entries for work orders. Each entry represents time spent by a user on a specific date. Provides full audit trail of who worked when and for how long. Enables timesheet reporting and historical time tracking.';

comment on column app.work_order_time_entries.user_id is 
  'User who performed the work. Must be a member of the tenant.';

comment on column app.work_order_time_entries.entry_date is 
  'Date when the work was performed. Defaults to current date but can be set to past dates (up to 365 days ago) or future dates (up to 7 days ahead) for scheduling.';

comment on column app.work_order_time_entries.minutes is 
  'Time spent in minutes. Must be between 1 and 1440 (24 hours).';

comment on column app.work_order_time_entries.description is 
  'Optional description of work performed (e.g., "Replaced filter", "Diagnosed issue").';

comment on column app.work_order_time_entries.logged_at is 
  'Timestamp when the time entry was logged. May differ from entry_date if backdating.';

comment on column app.work_order_time_entries.created_at is 
  'Timestamp when the time entry was created. Automatically set on insert.';

comment on column app.work_order_time_entries.created_by is 
  'User who created the time entry (may differ from user_id if manager logs time for technician).';

comment on column app.work_order_time_entries.updated_at is 
  'Timestamp when the time entry was last updated. Automatically maintained by trigger.';

-- Indexes optimized for common query patterns and RLS filtering
-- Foreign key index for work_order lookups
create index if not exists work_order_time_entries_work_order_idx 
  on app.work_order_time_entries (work_order_id);

-- Composite index for tenant + work_order queries (common pattern)
create index if not exists work_order_time_entries_tenant_work_order_idx 
  on app.work_order_time_entries (tenant_id, work_order_id);

-- Composite index for RLS filtering + user queries
create index if not exists work_order_time_entries_tenant_user_idx 
  on app.work_order_time_entries (tenant_id, user_id);

-- Index for user timesheet queries across all tenants (if needed for admin queries)
-- Note: Most queries will use tenant_user_date_idx instead
create index if not exists work_order_time_entries_user_entry_date_idx 
  on app.work_order_time_entries (user_id, entry_date desc);

-- Index for date-range queries (used in reporting/analytics)
create index if not exists work_order_time_entries_entry_date_idx 
  on app.work_order_time_entries (entry_date desc);

-- Index for audit/logging queries
create index if not exists work_order_time_entries_logged_at_idx 
  on app.work_order_time_entries (logged_at desc);

-- Composite index for tenant user timesheet queries (most common pattern)
create index if not exists work_order_time_entries_tenant_user_date_idx 
  on app.work_order_time_entries (tenant_id, user_id, entry_date desc);

-- Foreign key index for created_by lookups (for ownership checks)
create index if not exists work_order_time_entries_created_by_idx 
  on app.work_order_time_entries (created_by) 
  where created_by is not null;

create trigger work_order_time_entries_set_updated_at 
  before update on app.work_order_time_entries 
  for each row 
  execute function util.set_updated_at();

alter table app.work_order_time_entries enable row level security;

-- Helper function for checking admin/manager role (optimizes RLS policies)
create or replace function authz.is_admin_or_manager(
  p_user_id uuid,
  p_tenant_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return exists (
    select 1
    from app.user_tenant_roles utr
    join cfg.tenant_roles tr on utr.tenant_role_id = tr.id
    where utr.user_id = p_user_id
      and utr.tenant_id = p_tenant_id
      and tr.key in ('admin', 'manager')
  );
end;
$$;

comment on function authz.is_admin_or_manager(uuid, uuid) is 
  'Checks if user has admin or manager role in tenant. Optimized single indexed lookup. Used by RLS policies for ownership checks. Returns true if user has admin or manager role, false otherwise.';

revoke all on function authz.is_admin_or_manager(uuid, uuid) from public;
grant execute on function authz.is_admin_or_manager(uuid, uuid) to authenticated;

-- RLS policies for work_order_time_entries
-- Optimized: Use authz.is_current_user_tenant_member() and authz.is_admin_or_manager() for efficient checks
create policy work_order_time_entries_select_tenant 
  on app.work_order_time_entries 
  for select 
  to authenticated 
  using (authz.is_current_user_tenant_member(tenant_id));

create policy work_order_time_entries_select_anon 
  on app.work_order_time_entries 
  for select 
  to anon 
  using (authz.is_current_user_tenant_member(tenant_id));

create policy work_order_time_entries_insert_tenant 
  on app.work_order_time_entries 
  for insert 
  to authenticated 
  with check (authz.is_current_user_tenant_member(tenant_id));

create policy work_order_time_entries_insert_anon 
  on app.work_order_time_entries 
  for insert 
  to anon 
  with check (false);

create policy work_order_time_entries_delete_tenant 
  on app.work_order_time_entries 
  for delete 
  to authenticated 
  using (
    authz.is_current_user_tenant_member(tenant_id)
    and (
      created_by = auth.uid()
      or authz.is_admin_or_manager(auth.uid(), tenant_id)
    )
  );

create policy work_order_time_entries_delete_anon 
  on app.work_order_time_entries 
  for delete 
  to anon 
  using (false);

create policy work_order_time_entries_update_tenant 
  on app.work_order_time_entries 
  for update 
  to authenticated 
  using (
    authz.is_current_user_tenant_member(tenant_id)
    and (
      created_by = auth.uid()
      or authz.is_admin_or_manager(auth.uid(), tenant_id)
    )
  )
  with check (authz.is_current_user_tenant_member(tenant_id));

create policy work_order_time_entries_update_anon 
  on app.work_order_time_entries 
  for update 
  to anon 
  using (false)
  with check (false);

-- Create work_order_attachments table for photos and files
create table if not exists app.work_order_attachments (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  work_order_id uuid not null references app.work_orders(id) on delete cascade,
  file_ref text not null,
  label text,
  kind text,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  created_by uuid references auth.users(id) on delete set null,
  constraint work_order_attachments_file_ref_length_check check (
    length(file_ref) >= 1 
    and length(file_ref) <= 500
  ),
  constraint work_order_attachments_label_length_check check (
    label is null 
    or (length(label) >= 1 
        and length(label) <= 255)
  ),
  constraint work_order_attachments_kind_format_check check (
    kind is null 
    or (kind ~ '^[a-z0-9_]+$' 
        and length(kind) >= 1 
        and length(kind) <= 50)
  )
);

comment on table app.work_order_attachments is 
  'Attachments (photos, files) associated with work orders. Stores only file references (Supabase Storage paths or URLs), not the actual files. Enables technicians to add photos and documentation to work orders.';

comment on column app.work_order_attachments.file_ref is 
  'Reference to file (Supabase Storage path or URL). Must be 1-500 characters. Actual file storage handled by Supabase Storage service.';

comment on column app.work_order_attachments.label is 
  'Optional human-readable label for the attachment (e.g., "Before photo", "Parts receipt").';

comment on column app.work_order_attachments.kind is 
  'Optional attachment type (e.g., "photo", "document", "invoice"). Used for filtering and display.';

comment on column app.work_order_attachments.created_at is 
  'Timestamp when the attachment was created. Automatically set on insert.';

comment on column app.work_order_attachments.updated_at is 
  'Timestamp when the attachment was last updated. Automatically maintained by trigger.';

comment on column app.work_order_attachments.created_by is 
  'User who created the attachment. Used for ownership checks in RLS policies.';

-- Indexes optimized for common query patterns and RLS filtering
-- Foreign key index for work_order lookups
create index if not exists work_order_attachments_work_order_idx 
  on app.work_order_attachments (work_order_id);

-- Composite index for tenant + work_order queries (common pattern)
create index if not exists work_order_attachments_tenant_work_order_idx 
  on app.work_order_attachments (tenant_id, work_order_id);

-- Composite index for RLS filtering + ownership queries
create index if not exists work_order_attachments_tenant_created_by_idx 
  on app.work_order_attachments (tenant_id, created_by) 
  where created_by is not null;

-- Index for chronological queries (most recent first)
create index if not exists work_order_attachments_created_at_idx 
  on app.work_order_attachments (created_at desc);

-- Index for filtering by attachment kind
create index if not exists work_order_attachments_kind_idx 
  on app.work_order_attachments (kind) 
  where kind is not null;

create trigger work_order_attachments_set_updated_at 
  before update on app.work_order_attachments 
  for each row 
  execute function util.set_updated_at();

alter table app.work_order_attachments enable row level security;

-- RLS policies for work_order_attachments
-- Optimized: Use authz.is_current_user_tenant_member() and authz.is_admin_or_manager() for efficient checks
create policy work_order_attachments_select_tenant 
  on app.work_order_attachments 
  for select 
  to authenticated 
  using (authz.is_current_user_tenant_member(tenant_id));

create policy work_order_attachments_select_anon 
  on app.work_order_attachments 
  for select 
  to anon 
  using (authz.is_current_user_tenant_member(tenant_id));

create policy work_order_attachments_insert_tenant 
  on app.work_order_attachments 
  for insert 
  to authenticated 
  with check (authz.is_current_user_tenant_member(tenant_id));

create policy work_order_attachments_insert_anon 
  on app.work_order_attachments 
  for insert 
  to anon 
  with check (false);

create policy work_order_attachments_delete_tenant 
  on app.work_order_attachments 
  for delete 
  to authenticated 
  using (
    authz.is_current_user_tenant_member(tenant_id)
    and (
      created_by = auth.uid()
      or authz.is_admin_or_manager(auth.uid(), tenant_id)
    )
  );

create policy work_order_attachments_delete_anon 
  on app.work_order_attachments 
  for delete 
  to anon 
  using (false);

create policy work_order_attachments_update_tenant 
  on app.work_order_attachments 
  for update 
  to authenticated 
  using (
    authz.is_current_user_tenant_member(tenant_id)
    and (
      created_by = auth.uid()
      or authz.is_admin_or_manager(auth.uid(), tenant_id)
    )
  )
  with check (authz.is_current_user_tenant_member(tenant_id));

create policy work_order_attachments_update_anon 
  on app.work_order_attachments 
  for update 
  to anon 
  using (false)
  with check (false);

-- RPC: Log work order time entry
create or replace function public.rpc_log_work_order_time(
  p_tenant_id uuid,
  p_work_order_id uuid,
  p_minutes integer,
  p_entry_date date default null,
  p_user_id uuid default null,
  p_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_logged_by uuid;
  v_work_order_tenant_id uuid;
  v_time_entry_user_id uuid;
  v_entry_date date;
  v_time_entry_id uuid;
begin
  perform util.check_rate_limit('work_order_log_time', null, 60, 1, auth.uid(), p_tenant_id);
  
  v_logged_by := authz.rpc_setup(p_tenant_id);

  -- Note: Minutes validation handled by table constraint (must be > 0 and <= 1440)

  -- Verify work order exists and belongs to tenant (single optimized query)
  -- Uses index on (id, tenant_id) if available
  select tenant_id into v_work_order_tenant_id
  from app.work_orders
  where id = p_work_order_id
    and tenant_id = p_tenant_id;

  if v_work_order_tenant_id is null then
    raise exception using
      message = 'Work order not found or does not belong to this tenant',
      errcode = 'P0001';
  end if;

  -- Determine user_id: use provided user_id if manager/admin, otherwise use logged-in user
  if p_user_id is not null then
    -- Verify logged-in user has permission to log time for others
    -- Uses optimized permission check function
    if not authz.has_permission(v_logged_by, p_tenant_id, 'workorder.edit') then
      raise exception using
        message = 'Unauthorized: Cannot log time for other users without workorder.edit permission',
        errcode = '42501';
    end if;
    
    -- Verify target user is tenant member (optimized indexed lookup)
    if not authz.is_tenant_member(p_user_id, p_tenant_id) then
      raise exception using
        message = 'User is not a member of this tenant',
        errcode = '42501';
    end if;
    
    v_time_entry_user_id := p_user_id;
  else
    v_time_entry_user_id := v_logged_by;
  end if;

  -- Use provided entry_date or default to today
  v_entry_date := coalesce(p_entry_date, current_date);

  -- Note: Entry date and minutes validation handled by table constraints
  -- No need to duplicate validation here

  -- Insert time entry
  insert into app.work_order_time_entries (
    tenant_id,
    work_order_id,
    user_id,
    entry_date,
    minutes,
    description,
    created_by
  )
  values (
    p_tenant_id,
    p_work_order_id,
    v_time_entry_user_id,
    v_entry_date,
    p_minutes,
    p_description,
    v_logged_by
  )
  returning id into v_time_entry_id;

  return v_time_entry_id;
end;
$$;

comment on function public.rpc_log_work_order_time(uuid, uuid, integer, date, uuid, text) is 
  'Creates a time entry for a work order. Each call creates a new auditable time entry record. Users can log their own time; managers/admins can log time for others. Rate limited to 60 requests per minute per user. Returns the UUID of the created time entry.';

revoke all on function public.rpc_log_work_order_time(uuid, uuid, integer, date, uuid, text) from public;
grant execute on function public.rpc_log_work_order_time(uuid, uuid, integer, date, uuid, text) to authenticated;

-- RPC: Add work order attachment
create or replace function public.rpc_add_work_order_attachment(
  p_tenant_id uuid,
  p_work_order_id uuid,
  p_file_ref text,
  p_label text default null,
  p_kind text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_work_order_tenant_id uuid;
  v_attachment_id uuid;
begin
  perform util.check_rate_limit('work_order_attachment_add', null, 30, 1, auth.uid(), p_tenant_id);
  
  v_user_id := authz.rpc_setup(p_tenant_id);

  -- Verify work order exists and belongs to tenant (single query)
  select tenant_id into v_work_order_tenant_id
  from app.work_orders
  where id = p_work_order_id
    and tenant_id = p_tenant_id;

  if v_work_order_tenant_id is null then
    raise exception using
      message = 'Work order not found or does not belong to this tenant',
      errcode = 'P0001';
  end if;

  -- Note: File reference length validation handled by table constraint

  -- Insert attachment
  insert into app.work_order_attachments (
    tenant_id,
    work_order_id,
    file_ref,
    label,
    kind,
    created_by
  )
  values (
    p_tenant_id,
    p_work_order_id,
    p_file_ref,
    p_label,
    p_kind,
    v_user_id
  )
  returning id into v_attachment_id;

  return v_attachment_id;
end;
$$;

comment on function public.rpc_add_work_order_attachment(uuid, uuid, text, text, text) is 
  'Adds an attachment (photo, file) to a work order. Stores only file reference (Supabase Storage path or URL), not the actual file. Rate limited to 30 attachments per minute per user. Returns the UUID of the created attachment. Side effects: Creates work order attachment record.';

revoke all on function public.rpc_add_work_order_attachment(uuid, uuid, text, text, text) from public;
grant execute on function public.rpc_add_work_order_attachment(uuid, uuid, text, text, text) to authenticated;

-- Update v_work_orders view to include total labor minutes (aggregated from time entries)
-- Use lateral join for better performance on large datasets
drop view if exists public.v_work_orders;
create view public.v_work_orders as
select 
  wo.id, 
  wo.tenant_id, 
  wo.title, 
  wo.description, 
  wo.status, 
  wo.priority, 
  wo.assigned_to, 
  wo.location_id, 
  wo.asset_id,
  wo.due_date, 
  wo.completed_at, 
  wo.completed_by, 
  wo.created_at, 
  wo.updated_at,
  coalesce(te_agg.total_minutes, 0) as total_labor_minutes
from app.work_orders wo
left join lateral (
  select sum(minutes) as total_minutes
  from app.work_order_time_entries
  where work_order_id = wo.id
) te_agg on true
where wo.tenant_id = authz.get_current_tenant_id();

comment on view public.v_work_orders is 
  'Work orders view scoped to the current tenant context. Includes total_labor_minutes aggregated from time entries. Clients must set tenant context via rpc_set_tenant_context. Underlying table RLS still applies.';

grant select on public.v_work_orders to authenticated;
grant select on public.v_work_orders to anon;

-- Create view for work order time entries
create or replace view public.v_work_order_time_entries as
select
  te.id,
  te.tenant_id,
  te.work_order_id,
  te.user_id,
  te.entry_date,
  te.minutes,
  te.description,
  te.logged_at,
  te.created_by,
  te.created_at,
  te.updated_at
from app.work_order_time_entries te
where te.tenant_id = authz.get_current_tenant_id()
order by te.entry_date desc, te.logged_at desc;

comment on view public.v_work_order_time_entries is 
  'Work order time entries view scoped to the current tenant context. Clients must set tenant context via rpc_set_tenant_context. Underlying table RLS still applies.';

grant select on public.v_work_order_time_entries to authenticated;
grant select on public.v_work_order_time_entries to anon;

-- Create view for work order attachments
create or replace view public.v_work_order_attachments as
select
  woa.id,
  woa.tenant_id,
  woa.work_order_id,
  woa.file_ref,
  woa.label,
  woa.kind,
  woa.created_at,
  woa.updated_at,
  woa.created_by
from app.work_order_attachments woa
where woa.tenant_id = authz.get_current_tenant_id()
order by woa.created_at desc;

comment on view public.v_work_order_attachments is 
  'Work order attachments view scoped to the current tenant context. Clients must set tenant context via rpc_set_tenant_context. Underlying table RLS still applies.';

grant select on public.v_work_order_attachments to authenticated;
grant select on public.v_work_order_attachments to anon;

-- Add tenant validation trigger for time entries (user_id must be tenant member)
create or replace function util.validate_time_entry_user_tenant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not authz.is_tenant_member(new.user_id, new.tenant_id) then
    raise exception using
      message = format('User %s is not a member of tenant %s', new.user_id, new.tenant_id),
      errcode = '23503';
  end if;
  return new;
end;
$$;

comment on function util.validate_time_entry_user_tenant() is 
  'Trigger function that validates user_id in time entries belongs to the tenant. Ensures data integrity for time tracking.';

revoke all on function util.validate_time_entry_user_tenant() from public;
grant execute on function util.validate_time_entry_user_tenant() to postgres;

create trigger work_order_time_entries_validate_user_tenant 
  before insert or update on app.work_order_time_entries 
  for each row 
  execute function util.validate_time_entry_user_tenant();

-- Add audit triggers
create trigger work_order_attachments_audit_trigger
  after insert or update or delete on app.work_order_attachments
  for each row execute function audit.log_entity_change();

create trigger work_order_time_entries_audit_trigger
  after insert or update or delete on app.work_order_time_entries
  for each row execute function audit.log_entity_change();
