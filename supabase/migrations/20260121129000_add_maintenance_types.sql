-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Adds maintenance type catalog system with hierarchical taxonomy (category + type).
-- 
-- Changes:
-- - Creates cfg.maintenance_type_catalogs table for tenant-configurable maintenance types
-- - Adds maintenance_type column to app.work_orders table
-- - Creates default maintenance types: reactive (corrective, emergency), planned (preventive_time, preventive_usage, condition_based), advanced (predictive, rcm, rbm), lean (tpm, proactive), other (inspection, calibration, installation, modification, project, shutdown)
-- - Adds validation trigger for maintenance_type
-- - Updates views and RPCs to support maintenance_type

-- ============================================================================
-- Maintenance type catalog table
-- ============================================================================

create table if not exists cfg.maintenance_type_catalogs (
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

-- Index for tenant + entity lookups (used in validation triggers)
create index if not exists maintenance_type_catalogs_tenant_entity_idx 
  on cfg.maintenance_type_catalogs (tenant_id, entity_type);

-- Index for validation queries (tenant + entity + key)
create index if not exists maintenance_type_catalogs_tenant_entity_key_idx 
  on cfg.maintenance_type_catalogs (tenant_id, entity_type, key);

-- Index for category-based queries and display ordering
create index if not exists maintenance_type_catalogs_category_idx 
  on cfg.maintenance_type_catalogs (tenant_id, entity_type, category, display_order);

-- Index for display ordering queries
create index if not exists maintenance_type_catalogs_display_idx 
  on cfg.maintenance_type_catalogs (tenant_id, entity_type, display_order);

create trigger maintenance_type_catalogs_set_updated_at 
  before update on cfg.maintenance_type_catalogs 
  for each row 
  execute function util.set_updated_at();

alter table cfg.maintenance_type_catalogs enable row level security;

create policy maintenance_type_catalogs_select_tenant 
  on cfg.maintenance_type_catalogs 
  for select 
  to authenticated 
  using (tenant_id = authz.get_current_tenant_id());

create policy maintenance_type_catalogs_select_anon 
  on cfg.maintenance_type_catalogs 
  for select 
  to anon 
  using (tenant_id = authz.get_current_tenant_id());

-- ============================================================================
-- Add maintenance_type to work_orders table
-- ============================================================================

alter table app.work_orders
add column if not exists maintenance_type text;

comment on column app.work_orders.maintenance_type is 
  'Maintenance type (validated against maintenance_type_catalogs). Categorizes work order by maintenance strategy (reactive, planned, advanced, lean, other). Used for filtering and reporting.';

create index if not exists work_orders_maintenance_type_idx 
  on app.work_orders (tenant_id, maintenance_type) 
  where maintenance_type is not null;

-- Add validation trigger for maintenance_type
-- Optimized: Uses indexed lookup on (tenant_id, entity_type, key)
create or replace function util.validate_work_order_maintenance_type()
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

create trigger work_orders_validate_maintenance_type 
  before insert or update on app.work_orders 
  for each row 
  execute function util.validate_work_order_maintenance_type();

-- ============================================================================
-- Default maintenance types creation function
-- ============================================================================

create or replace function cfg.create_default_maintenance_types(
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
    (p_tenant_id, 'work_order', 'reactive', 'run_to_failure', 'Run to Failure', 'Intentional strategy for low-value assets. No maintenance until failure occurs.', 4, true)
  on conflict (tenant_id, entity_type, key) do nothing;

  -- Planned maintenance types
  insert into cfg.maintenance_type_catalogs (tenant_id, entity_type, category, key, name, description, display_order, is_system)
  values
    (p_tenant_id, 'work_order', 'planned', 'preventive_time', 'Time-Based PM', 'Preventive maintenance scheduled by calendar intervals (daily, weekly, monthly, quarterly, annual).', 5, true),
    (p_tenant_id, 'work_order', 'planned', 'preventive_usage', 'Usage-Based PM', 'Preventive maintenance scheduled by usage metrics (runtime hours, cycles, miles, production units).', 6, true),
    (p_tenant_id, 'work_order', 'planned', 'condition_based', 'Condition-Based', 'Maintenance triggered by condition monitoring (vibration, oil analysis, thermography, ultrasonic, visual inspection thresholds).', 7, true)
  on conflict (tenant_id, entity_type, key) do nothing;

  -- Advanced maintenance types
  insert into cfg.maintenance_type_catalogs (tenant_id, entity_type, category, key, name, description, display_order, is_system)
  values
    (p_tenant_id, 'work_order', 'advanced', 'predictive', 'Predictive', 'Data-driven maintenance using IoT sensors, machine learning, and statistical analysis to predict failures before they occur.', 8, true),
    (p_tenant_id, 'work_order', 'advanced', 'rcm', 'RCM', 'Reliability-Centered Maintenance. Risk-based analysis to determine optimal maintenance strategy for each asset.', 9, true),
    (p_tenant_id, 'work_order', 'advanced', 'rbm', 'RBM', 'Risk-Based Maintenance. Prioritizes maintenance on critical assets based on risk assessment.', 10, true),
    (p_tenant_id, 'work_order', 'advanced', 'fmea', 'FMEA', 'Failure Mode and Effects Analysis. Systematic analysis of potential failure modes and their effects.', 11, true)
  on conflict (tenant_id, entity_type, key) do nothing;

  -- Lean/operational excellence types
  insert into cfg.maintenance_type_catalogs (tenant_id, entity_type, category, key, name, description, display_order, is_system)
  values
    (p_tenant_id, 'work_order', 'lean', 'tpm', 'TPM', 'Total Productive Maintenance. Operator involvement in maintenance activities, zero defects philosophy.', 12, true),
    (p_tenant_id, 'work_order', 'lean', 'proactive', 'Proactive', 'Root cause analysis and design improvements to prevent recurring failures. Focuses on eliminating root causes.', 13, true),
    (p_tenant_id, 'work_order', 'lean', 'design_out', 'Design-Out', 'Eliminate failure modes through design changes or equipment modifications.', 14, true)
  on conflict (tenant_id, entity_type, key) do nothing;

  -- Other maintenance types
  insert into cfg.maintenance_type_catalogs (tenant_id, entity_type, category, key, name, description, display_order, is_system)
  values
    (p_tenant_id, 'work_order', 'other', 'inspection', 'Inspection', 'Routine checks and assessments without repair work. Visual inspections, safety checks, compliance audits.', 15, true),
    (p_tenant_id, 'work_order', 'other', 'calibration', 'Calibration', 'Adjust equipment to meet specifications. Ensures accuracy and compliance with standards.', 16, true),
    (p_tenant_id, 'work_order', 'other', 'installation', 'Installation', 'New equipment setup and commissioning. Initial installation of assets.', 17, true),
    (p_tenant_id, 'work_order', 'other', 'modification', 'Modification', 'Design changes or upgrades to existing equipment. Improvements and enhancements.', 18, true),
    (p_tenant_id, 'work_order', 'other', 'project', 'Project', 'Large-scale, multi-phase maintenance work. Complex projects requiring coordination.', 19, true),
    (p_tenant_id, 'work_order', 'other', 'shutdown', 'Shutdown/Turnaround', 'Planned facility downtime for major maintenance. Scheduled plant shutdowns.', 20, true)
  on conflict (tenant_id, entity_type, key) do nothing;
end;
$$;

comment on function cfg.create_default_maintenance_types(uuid) is 
  'Creates default maintenance types organized by category (reactive, planned, advanced, lean, other) for a new tenant. Provides comprehensive taxonomy covering all major maintenance strategies. System types cannot be deleted. Called automatically during tenant creation.';

revoke all on function cfg.create_default_maintenance_types(uuid) from public;
grant execute on function cfg.create_default_maintenance_types(uuid) to authenticated;

-- Update create_default_tenant_roles to include maintenance types
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
-- Public views for maintenance types
-- ============================================================================

create or replace view public.v_maintenance_type_catalogs as
select
  id,
  tenant_id,
  entity_type,
  category,
  key,
  name,
  description,
  display_order,
  color,
  icon,
  is_system,
  created_at,
  updated_at
from cfg.maintenance_type_catalogs
where tenant_id = authz.get_current_tenant_id()
order by category, display_order;

comment on view public.v_maintenance_type_catalogs is 
  'Tenant maintenance type catalogs filtered by current tenant context. RLS on underlying table applies additional filtering. Used by frontend to display available maintenance types organized by category.';

grant select on public.v_maintenance_type_catalogs to authenticated;
grant select on public.v_maintenance_type_catalogs to anon;

-- ============================================================================
-- Update rpc_create_work_order to include maintenance_type parameter
-- ============================================================================

-- Drop old function signature first to avoid function overloading conflicts
drop function if exists public.rpc_create_work_order(uuid, text, text, text, uuid, uuid, uuid, timestamptz);

-- ============================================================================
-- Update existing views to include maintenance_type
-- ============================================================================

-- Update v_work_orders view to include maintenance_type
create or replace view public.v_work_orders as
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
  coalesce(te_agg.total_minutes, 0) as total_labor_minutes,
  wo.maintenance_type
from app.work_orders wo
left join lateral (
  select sum(minutes) as total_minutes
  from app.work_order_time_entries
  where work_order_id = wo.id
) te_agg on true
where wo.tenant_id = authz.get_current_tenant_id();

comment on view public.v_work_orders is 
  'Work orders view scoped to the current tenant context. Includes maintenance_type and total_labor_minutes aggregated from time entries. Clients must set tenant context via rpc_set_tenant_context. Underlying table RLS still applies.';

-- Update dashboard views to include maintenance_type
create or replace view public.v_dashboard_open_work_orders as
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
  wo.created_at,
  wo.updated_at,
  coalesce(te_agg.total_minutes, 0) as total_labor_minutes,
  wo.maintenance_type
from app.work_orders wo
left join lateral (
  select sum(minutes) as total_minutes
  from app.work_order_time_entries
  where work_order_id = wo.id
) te_agg on true
where wo.tenant_id = authz.get_current_tenant_id()
  and wo.status not in ('completed', 'cancelled')
order by 
  case wo.priority
    when 'critical' then 1
    when 'high' then 2
    when 'medium' then 3
    when 'low' then 4
    else 5
  end,
  wo.due_date nulls last,
  wo.created_at desc;

comment on view public.v_dashboard_open_work_orders is 
  'Open work orders (not completed or cancelled) for the current tenant. Includes maintenance_type and total_labor_minutes aggregated from time entries. Ordered by priority (critical first), then due date, then creation date. Used for dashboard display of active work orders.';

-- Update overdue view
create or replace view public.v_dashboard_overdue_work_orders as
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
  wo.created_at,
  wo.updated_at,
  coalesce(te_agg.total_minutes, 0) as total_labor_minutes,
  extract(epoch from (pg_catalog.now() - wo.due_date)) / 86400 as days_overdue,
  wo.maintenance_type
from app.work_orders wo
left join lateral (
  select sum(minutes) as total_minutes
  from app.work_order_time_entries
  where work_order_id = wo.id
) te_agg on true
where wo.tenant_id = authz.get_current_tenant_id()
  and wo.status not in ('completed', 'cancelled')
  and wo.due_date is not null
  and wo.due_date < pg_catalog.now()
order by 
  wo.due_date asc,
  case wo.priority
    when 'critical' then 1
    when 'high' then 2
    when 'medium' then 3
    when 'low' then 4
    else 5
  end;

comment on view public.v_dashboard_overdue_work_orders is 
  'Overdue work orders (due date in the past, not completed or cancelled) for the current tenant. Includes maintenance_type, total_labor_minutes aggregated from time entries, and days_overdue calculation. Ordered by due date (oldest first), then priority. Used for dashboard display of overdue work orders.';

-- Add maintenance type breakdown view
create or replace view public.v_dashboard_work_orders_by_maintenance_type as
select
  wo.maintenance_type,
  mtc.category,
  mtc.name as maintenance_type_name,
  count(*) as count,
  count(*) filter (where wo.status not in ('completed', 'cancelled')) as open_count,
  count(*) filter (where wo.status = 'completed') as completed_count,
  count(*) filter (where wo.due_date < pg_catalog.now() and wo.status not in ('completed', 'cancelled')) as overdue_count,
  avg(extract(epoch from (wo.completed_at - wo.created_at)) / 3600) filter (where wo.completed_at is not null) as avg_completion_hours,
  sum(te_agg.total_minutes) as total_labor_minutes
from app.work_orders wo
left join cfg.maintenance_type_catalogs mtc on mtc.tenant_id = wo.tenant_id 
  and mtc.entity_type = 'work_order' 
  and mtc.key = wo.maintenance_type
left join lateral (
  select sum(minutes) as total_minutes
  from app.work_order_time_entries
  where work_order_id = wo.id
) te_agg on true
where wo.tenant_id = authz.get_current_tenant_id()
group by wo.maintenance_type, mtc.category, mtc.name
order by 
  case mtc.category
    when 'reactive' then 1
    when 'planned' then 2
    when 'advanced' then 3
    when 'lean' then 4
    when 'other' then 5
    else 6
  end,
  mtc.name;

comment on view public.v_dashboard_work_orders_by_maintenance_type is 
  'Work orders grouped by maintenance type for the current tenant. Provides maintenance strategy breakdown with counts, completion metrics, and labor statistics. Used for dashboard maintenance strategy analysis.';

grant select on public.v_dashboard_work_orders_by_maintenance_type to authenticated;
grant select on public.v_dashboard_work_orders_by_maintenance_type to anon;

-- ============================================================================
-- Performance index for priority validation queries
-- ============================================================================

-- Index for priority validation queries (tenant + entity + key lookup)
create index if not exists priority_catalogs_tenant_entity_key_idx 
  on cfg.priority_catalogs (tenant_id, entity_type, key);

-- ============================================================================
-- Update RPCs to support maintenance_type
-- ============================================================================

-- Update rpc_create_work_order to accept maintenance_type
create or replace function public.rpc_create_work_order(
  p_tenant_id uuid,
  p_title text,
  p_description text default null,
  p_priority text default 'medium',
  p_maintenance_type text default null,
  p_assigned_to uuid default null,
  p_location_id uuid default null,
  p_asset_id uuid default null,
  p_due_date timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_work_order_id uuid;
  v_initial_status text;
begin
  perform util.check_rate_limit('work_order_create', null, 10, 1, auth.uid(), p_tenant_id);
  
  v_user_id := authz.rpc_setup(p_tenant_id, 'workorder.create');

  -- Validate priority exists (uses index on priority_catalogs)
  if not exists (
    select 1
    from cfg.priority_catalogs
    where tenant_id = p_tenant_id
      and entity_type = 'work_order'
      and key = p_priority
  ) then
    raise exception using
      message = format('Invalid priority: %s', p_priority),
      errcode = '23503';
  end if;

  -- Validate maintenance type exists (uses index on maintenance_type_catalogs_tenant_entity_key_idx)
  if p_maintenance_type is not null then
    if not exists (
      select 1
      from cfg.maintenance_type_catalogs
      where tenant_id = p_tenant_id
        and entity_type = 'work_order'
        and key = p_maintenance_type
    ) then
      raise exception using
        message = format('Invalid maintenance type: %s', p_maintenance_type),
        errcode = '23503';
    end if;
  end if;

  v_initial_status := cfg.get_default_status(
    p_tenant_id,
    'work_order',
    pg_catalog.jsonb_build_object('assigned_to', p_assigned_to)
  );

  insert into app.work_orders (
    tenant_id,
    title,
    description,
    priority,
    maintenance_type,
    assigned_to,
    location_id,
    asset_id,
    due_date,
    status
  )
  values (
    p_tenant_id,
    p_title,
    p_description,
    p_priority,
    p_maintenance_type,
    p_assigned_to,
    p_location_id,
    p_asset_id,
    p_due_date,
    v_initial_status
  )
  returning id into v_work_order_id;

  return v_work_order_id;
end;
$$;

comment on function public.rpc_create_work_order(uuid, text, text, text, text, uuid, uuid, uuid, timestamptz) is 
  'Creates a new work order for the current tenant context. Requires workorder.create permission. Validates priority and optional maintenance_type exist in catalogs, automatically assigns default status from workflow catalogs based on context. Validates that referenced assets and locations belong to the same tenant. Rate limited to 10 work orders per minute per user. Returns the UUID of the created work order. NOTE: This function is further extended in 20260121131000_add_meters_and_pm_api_layer.sql to support pm_schedule_id parameter. Permission statements are handled in the final migration.';

-- Add RPC to create custom maintenance type
create or replace function public.rpc_create_maintenance_type(
  p_tenant_id uuid,
  p_category text,
  p_key text,
  p_name text,
  p_description text default null,
  p_display_order integer default null,
  p_color text default null,
  p_icon text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_maintenance_type_id uuid;
  v_max_display_order integer;
begin
  perform util.check_rate_limit('maintenance_type_create', null, 20, 1, auth.uid(), p_tenant_id);
  
  v_user_id := authz.rpc_setup(p_tenant_id, 'tenant.admin');

  if p_category not in ('reactive', 'planned', 'advanced', 'lean', 'other') then
    raise exception using
      message = 'Invalid category. Must be one of: reactive, planned, advanced, lean, other',
      errcode = '23503';
  end if;

  if p_display_order is null then
    select coalesce(max(display_order), 0) + 1
    into v_max_display_order
    from cfg.maintenance_type_catalogs
    where tenant_id = p_tenant_id
      and entity_type = 'work_order'
      and category = p_category;
    
    p_display_order := v_max_display_order;
  end if;

  insert into cfg.maintenance_type_catalogs (
    tenant_id,
    entity_type,
    category,
    key,
    name,
    description,
    display_order,
    color,
    icon
  )
  values (
    p_tenant_id,
    'work_order',
    p_category,
    p_key,
    p_name,
    p_description,
    p_display_order,
    p_color,
    p_icon
  )
  returning id into v_maintenance_type_id;

  return v_maintenance_type_id;
end;
$$;

comment on function public.rpc_create_maintenance_type(uuid, text, text, text, text, integer, text, text) is 
  'Creates a new maintenance type in the tenant catalog. Requires tenant.admin permission. Validates category is one of: reactive, planned, advanced, lean, other. Auto-calculates display_order if not provided. Rate limited to 20 maintenance type creations per minute per user. Returns the UUID of the created maintenance type.';

revoke all on function public.rpc_create_maintenance_type(uuid, text, text, text, text, integer, text, text) from public;
grant execute on function public.rpc_create_maintenance_type(uuid, text, text, text, text, integer, text, text) to authenticated;
