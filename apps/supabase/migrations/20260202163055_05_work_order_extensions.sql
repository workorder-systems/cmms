-- SPDX-License-Identifier: AGPL-3.0-or-later

-- ============================================================================
-- Work Order Time Entries
-- ============================================================================

create table app.work_order_time_entries (
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

create index work_order_time_entries_work_order_idx 
  on app.work_order_time_entries (work_order_id);

create index work_order_time_entries_tenant_work_order_idx 
  on app.work_order_time_entries (tenant_id, work_order_id);

create index work_order_time_entries_tenant_user_idx 
  on app.work_order_time_entries (tenant_id, user_id);

create index work_order_time_entries_user_entry_date_idx 
  on app.work_order_time_entries (user_id, entry_date desc);

create index work_order_time_entries_entry_date_idx 
  on app.work_order_time_entries (entry_date desc);

create index work_order_time_entries_logged_at_idx 
  on app.work_order_time_entries (logged_at desc);

create index work_order_time_entries_tenant_user_date_idx 
  on app.work_order_time_entries (tenant_id, user_id, entry_date desc);

create index work_order_time_entries_created_by_idx 
  on app.work_order_time_entries (created_by) 
  where created_by is not null;

create trigger work_order_time_entries_set_updated_at 
  before update on app.work_order_time_entries 
  for each row 
  execute function util.set_updated_at();

alter table app.work_order_time_entries enable row level security;

-- ============================================================================
-- Work Order Attachments
-- ============================================================================

create table app.work_order_attachments (
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

create index work_order_attachments_work_order_idx 
  on app.work_order_attachments (work_order_id);

create index work_order_attachments_tenant_work_order_idx 
  on app.work_order_attachments (tenant_id, work_order_id);

create index work_order_attachments_tenant_created_by_idx 
  on app.work_order_attachments (tenant_id, created_by) 
  where created_by is not null;

create index work_order_attachments_created_at_idx 
  on app.work_order_attachments (created_at desc);

create index work_order_attachments_kind_idx 
  on app.work_order_attachments (kind) 
  where kind is not null;

create trigger work_order_attachments_set_updated_at 
  before update on app.work_order_attachments 
  for each row 
  execute function util.set_updated_at();

alter table app.work_order_attachments enable row level security;

-- ============================================================================
-- Maintenance Type Catalogs
-- ============================================================================

create table cfg.maintenance_type_catalogs (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  entity_type text not null default 'work_order',
  category text not null,
  key text not null,
  name text not null,
  description text,
  display_order integer not null,
  color text,
  icon text,
  is_system boolean not null default false,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint maintenance_type_catalogs_unique unique (tenant_id, entity_type, key),
  constraint maintenance_type_catalogs_category_check check (
    category in ('reactive', 'planned', 'advanced', 'lean', 'other')
  ),
  constraint maintenance_type_catalogs_key_format_check check (
    key ~ '^[a-z0-9_]+$' 
    and length(key) >= 1 
    and length(key) <= 50
  ),
  constraint maintenance_type_catalogs_display_order_check check (
    display_order >= 0
  )
);

comment on table cfg.maintenance_type_catalogs is 
  'Tenant-configurable maintenance type definitions. Each tenant can define custom maintenance types organized by category (reactive, planned, advanced, lean, other). Enables filtering and reporting by maintenance strategy. System types are created automatically for new tenants.';

comment on column cfg.maintenance_type_catalogs.category is 
  'Maintenance category: reactive (unplanned), planned (scheduled), advanced (data-driven), lean (operational excellence), other (inspection, calibration, etc.).';

comment on column cfg.maintenance_type_catalogs.key is 
  'Maintenance type key (e.g., corrective, preventive_time, predictive). Unique within tenant and entity type. Used programmatically for type references.';

comment on column cfg.maintenance_type_catalogs.name is 
  'Human-readable maintenance type name (e.g., "Corrective", "Time-Based PM", "Predictive Maintenance").';

comment on column cfg.maintenance_type_catalogs.description is 
  'Optional description explaining when and how to use this maintenance type.';

comment on column cfg.maintenance_type_catalogs.is_system is 
  'If true, this is a system maintenance type that cannot be deleted (e.g., default types created automatically).';

create index maintenance_type_catalogs_tenant_entity_idx 
  on cfg.maintenance_type_catalogs (tenant_id, entity_type);

create index maintenance_type_catalogs_tenant_entity_key_idx 
  on cfg.maintenance_type_catalogs (tenant_id, entity_type, key);

create index maintenance_type_catalogs_category_idx 
  on cfg.maintenance_type_catalogs (tenant_id, entity_type, category, display_order);

create index maintenance_type_catalogs_display_idx 
  on cfg.maintenance_type_catalogs (tenant_id, entity_type, display_order);

create trigger maintenance_type_catalogs_set_updated_at 
  before update on cfg.maintenance_type_catalogs 
  for each row 
  execute function util.set_updated_at();

alter table cfg.maintenance_type_catalogs enable row level security;

-- ============================================================================
-- Add maintenance_type to work_orders
-- ============================================================================

alter table app.work_orders
add column maintenance_type text;

comment on column app.work_orders.maintenance_type is 
  'Maintenance type (validated against maintenance_type_catalogs). Categorizes work order by maintenance strategy (reactive, planned, advanced, lean, other). Used for filtering and reporting.';

create index work_orders_maintenance_type_idx 
  on app.work_orders (tenant_id, maintenance_type) 
  where maintenance_type is not null;

-- ============================================================================
-- Authorization Helper Functions
-- ============================================================================

create function authz.is_admin_or_manager(
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
grant execute on function authz.is_admin_or_manager(uuid, uuid) to anon;

-- ============================================================================
-- Validation Functions
-- ============================================================================

create function util.validate_work_order_maintenance_type()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.maintenance_type is not null then
    if not exists (
      select 1
      from cfg.maintenance_type_catalogs
      where tenant_id = new.tenant_id
        and entity_type = 'work_order'
        and key = new.maintenance_type
    ) then
      raise exception using
        message = format('Invalid maintenance type: %s. Type must exist in tenant maintenance type catalog.', new.maintenance_type),
        errcode = '23503';
    end if;
  end if;
  return new;
end;
$$;

comment on function util.validate_work_order_maintenance_type() is 
  'Trigger function for work_orders table that validates maintenance_type against workflow catalogs. Called before insert/update on app.work_orders.';

revoke all on function util.validate_work_order_maintenance_type() from public;
grant execute on function util.validate_work_order_maintenance_type() to postgres;

create function util.validate_time_entry_user_tenant()
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

-- ============================================================================
-- Validation Triggers
-- ============================================================================

create trigger work_orders_validate_maintenance_type 
  before insert or update on app.work_orders 
  for each row 
  execute function util.validate_work_order_maintenance_type();

create trigger work_order_time_entries_validate_user_tenant 
  before insert or update on app.work_order_time_entries 
  for each row 
  execute function util.validate_time_entry_user_tenant();

-- ============================================================================
-- Row Level Security Policies
-- ============================================================================

-- Work Order Time Entries
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

comment on policy work_order_time_entries_select_tenant on app.work_order_time_entries is 
  'Allows authenticated users to view time entries in tenants they are members of.';
comment on policy work_order_time_entries_insert_tenant on app.work_order_time_entries is 
  'Allows authenticated users to create time entries in tenants they are members of.';
comment on policy work_order_time_entries_update_tenant on app.work_order_time_entries is 
  'Allows authenticated users to update their own time entries or admins/managers to update any time entry in tenants they are members of.';
comment on policy work_order_time_entries_delete_tenant on app.work_order_time_entries is 
  'Allows authenticated users to delete their own time entries or admins/managers to delete any time entry in tenants they are members of.';

-- Work Order Attachments
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

comment on policy work_order_attachments_select_tenant on app.work_order_attachments is 
  'Allows authenticated users to view attachments in tenants they are members of.';
comment on policy work_order_attachments_insert_tenant on app.work_order_attachments is 
  'Allows authenticated users to create attachments in tenants they are members of.';
comment on policy work_order_attachments_update_tenant on app.work_order_attachments is 
  'Allows authenticated users to update their own attachments or admins/managers to update any attachment in tenants they are members of.';
comment on policy work_order_attachments_delete_tenant on app.work_order_attachments is 
  'Allows authenticated users to delete their own attachments or admins/managers to delete any attachment in tenants they are members of.';

-- Maintenance Type Catalogs
create policy maintenance_type_catalogs_select_tenant 
  on cfg.maintenance_type_catalogs 
  for select 
  to authenticated 
  using (authz.is_current_user_tenant_member(tenant_id));

create policy maintenance_type_catalogs_select_anon 
  on cfg.maintenance_type_catalogs 
  for select 
  to anon 
  using (authz.is_current_user_tenant_member(tenant_id));

comment on policy maintenance_type_catalogs_select_tenant on cfg.maintenance_type_catalogs is 
  'Allows authenticated users to view maintenance type catalogs in tenants they are members of.';

comment on policy maintenance_type_catalogs_select_anon on cfg.maintenance_type_catalogs is 
  'Allows anonymous users to view maintenance type catalogs in tenants they are members of (via tenant context).';

-- ============================================================================
-- Default Maintenance Types Creation Function
-- ============================================================================

create function cfg.create_default_maintenance_types(
  p_tenant_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Reactive maintenance types
  insert into cfg.maintenance_type_catalogs (tenant_id, entity_type, category, key, name, description, display_order, is_system)
  values
    (p_tenant_id, 'work_order', 'reactive', 'corrective', 'Corrective', 'Fix after failure or defect is detected. Unplanned maintenance to restore equipment to working condition.', 1, true),
    (p_tenant_id, 'work_order', 'reactive', 'emergency', 'Emergency', 'Urgent, safety-critical maintenance requiring immediate response. Highest priority reactive maintenance.', 2, true),
    (p_tenant_id, 'work_order', 'reactive', 'breakdown', 'Breakdown', 'Unplanned equipment failure requiring immediate repair. Equipment is non-operational.', 3, true),
    (p_tenant_id, 'work_order', 'reactive', 'run_to_failure', 'Run to Failure', 'Intentional strategy for low-value assets. No maintenance until failure occurs.', 4, true);

  -- Planned maintenance types
  insert into cfg.maintenance_type_catalogs (tenant_id, entity_type, category, key, name, description, display_order, is_system)
  values
    (p_tenant_id, 'work_order', 'planned', 'preventive_time', 'Time-Based PM', 'Preventive maintenance scheduled by calendar intervals (daily, weekly, monthly, quarterly, annual).', 5, true),
    (p_tenant_id, 'work_order', 'planned', 'preventive_usage', 'Usage-Based PM', 'Preventive maintenance scheduled by usage metrics (runtime hours, cycles, miles, production units).', 6, true),
    (p_tenant_id, 'work_order', 'planned', 'condition_based', 'Condition-Based', 'Maintenance triggered by condition monitoring (vibration, oil analysis, thermography, ultrasonic, visual inspection thresholds).', 7, true);

  -- Advanced maintenance types
  insert into cfg.maintenance_type_catalogs (tenant_id, entity_type, category, key, name, description, display_order, is_system)
  values
    (p_tenant_id, 'work_order', 'advanced', 'predictive', 'Predictive', 'Data-driven maintenance using IoT sensors, machine learning, and statistical analysis to predict failures before they occur.', 8, true),
    (p_tenant_id, 'work_order', 'advanced', 'rcm', 'RCM', 'Reliability-Centered Maintenance. Risk-based analysis to determine optimal maintenance strategy for each asset.', 9, true),
    (p_tenant_id, 'work_order', 'advanced', 'rbm', 'RBM', 'Risk-Based Maintenance. Prioritizes maintenance on critical assets based on risk assessment.', 10, true),
    (p_tenant_id, 'work_order', 'advanced', 'fmea', 'FMEA', 'Failure Mode and Effects Analysis. Systematic analysis of potential failure modes and their effects.', 11, true);

  -- Lean/operational excellence types
  insert into cfg.maintenance_type_catalogs (tenant_id, entity_type, category, key, name, description, display_order, is_system)
  values
    (p_tenant_id, 'work_order', 'lean', 'tpm', 'TPM', 'Total Productive Maintenance. Operator involvement in maintenance activities, zero defects philosophy.', 12, true),
    (p_tenant_id, 'work_order', 'lean', 'proactive', 'Proactive', 'Root cause analysis and design improvements to prevent recurring failures. Focuses on eliminating root causes.', 13, true),
    (p_tenant_id, 'work_order', 'lean', 'design_out', 'Design-Out', 'Eliminate failure modes through design changes or equipment modifications.', 14, true);

  -- Other maintenance types
  insert into cfg.maintenance_type_catalogs (tenant_id, entity_type, category, key, name, description, display_order, is_system)
  values
    (p_tenant_id, 'work_order', 'other', 'inspection', 'Inspection', 'Routine checks and assessments without repair work. Visual inspections, safety checks, compliance audits.', 15, true),
    (p_tenant_id, 'work_order', 'other', 'calibration', 'Calibration', 'Adjust equipment to meet specifications. Ensures accuracy and compliance with standards.', 16, true),
    (p_tenant_id, 'work_order', 'other', 'installation', 'Installation', 'New equipment setup and commissioning. Initial installation of assets.', 17, true),
    (p_tenant_id, 'work_order', 'other', 'modification', 'Modification', 'Design changes or upgrades to existing equipment. Improvements and enhancements.', 18, true),
    (p_tenant_id, 'work_order', 'other', 'project', 'Project', 'Large-scale, multi-phase maintenance work. Complex projects requiring coordination.', 19, true),
    (p_tenant_id, 'work_order', 'other', 'shutdown', 'Shutdown/Turnaround', 'Planned facility downtime for major maintenance. Scheduled plant shutdowns.', 20, true);
end;
$$;

comment on function cfg.create_default_maintenance_types(uuid) is 
  'Creates default maintenance types organized by category (reactive, planned, advanced, lean, other) for a new tenant. Provides comprehensive taxonomy covering all major maintenance strategies. System types cannot be deleted. Called automatically during tenant creation.';

revoke all on function cfg.create_default_maintenance_types(uuid) from public;
grant execute on function cfg.create_default_maintenance_types(uuid) to authenticated;

-- ============================================================================
-- Update Default Tenant Roles Function
-- ============================================================================

create or replace function cfg.create_default_tenant_roles(
  p_tenant_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_role_id uuid;
  v_member_role_id uuid;
  v_technician_role_id uuid;
  v_manager_role_id uuid;
begin
  -- Create admin role (full permissions)
  insert into cfg.tenant_roles (tenant_id, key, name, is_default, is_system)
  values (p_tenant_id, 'admin', 'Administrator', false, true)
  returning id into v_admin_role_id;

  -- Create member role (view-only permissions)
  insert into cfg.tenant_roles (tenant_id, key, name, is_default, is_system)
  values (p_tenant_id, 'member', 'Member', true, true)
  returning id into v_member_role_id;

  -- Create technician role (view WOs, view assets/locations, complete assigned WOs)
  insert into cfg.tenant_roles (tenant_id, key, name, is_default, is_system)
  values (p_tenant_id, 'technician', 'Technician', false, true)
  returning id into v_technician_role_id;

  -- Create manager role (view + create + edit + assign WOs and assets; no tenant admin)
  insert into cfg.tenant_roles (tenant_id, key, name, is_default, is_system)
  values (p_tenant_id, 'manager', 'Manager', false, true)
  returning id into v_manager_role_id;

  -- Admin: all permissions
  insert into cfg.tenant_role_permissions (tenant_role_id, permission_id)
  select v_admin_role_id, id
  from cfg.permissions;

  -- Member: view-only permissions
  insert into cfg.tenant_role_permissions (tenant_role_id, permission_id)
  select v_member_role_id, id
  from cfg.permissions
  where key like '%.view';

  -- Technician: view WOs, view assets/locations, complete assigned WOs
  insert into cfg.tenant_role_permissions (tenant_role_id, permission_id)
  select v_technician_role_id, id
  from cfg.permissions
  where key in (
    'workorder.view',
    'workorder.complete.assigned',
    'asset.view',
    'location.view'
  );

  -- Manager: workorder.*, asset.*, location.* (no tenant.admin)
  insert into cfg.tenant_role_permissions (tenant_role_id, permission_id)
  select v_manager_role_id, id
  from cfg.permissions
  where key like 'workorder.%'
     or key like 'asset.%'
     or key like 'location.%';

  -- Create default workflows (statuses, priorities, maintenance types)
  perform cfg.create_default_work_order_statuses(p_tenant_id);
  perform cfg.create_default_work_order_priorities(p_tenant_id);
  perform cfg.create_default_asset_statuses(p_tenant_id);
  perform cfg.create_default_maintenance_types(p_tenant_id);
end;
$$;

comment on function cfg.create_default_tenant_roles(uuid) is 
  'Creates default tenant roles (admin, member, technician, manager) and assigns appropriate permissions. Also creates default workflows including statuses, priorities, asset statuses, and maintenance types. Technician role can view and complete assigned work orders. Manager role can manage work orders, assets, and locations but not tenant administration. Called automatically during tenant creation.';

-- ============================================================================
-- Grants for SECURITY INVOKER Views
-- ============================================================================

grant select on app.work_order_time_entries to authenticated;
grant select on app.work_order_time_entries to anon;

grant update on app.work_order_time_entries to authenticated;
grant delete on app.work_order_time_entries to authenticated;

grant select on app.work_order_attachments to authenticated;
grant select on app.work_order_attachments to anon;

grant update on app.work_order_attachments to authenticated;
grant delete on app.work_order_attachments to authenticated;

grant select on cfg.maintenance_type_catalogs to authenticated;
grant select on cfg.maintenance_type_catalogs to anon;

-- ============================================================================
-- Force RLS on Work Order Extension Tables
-- ============================================================================

alter table app.work_order_time_entries force row level security;
alter table app.work_order_attachments force row level security;
alter table cfg.maintenance_type_catalogs force row level security;
