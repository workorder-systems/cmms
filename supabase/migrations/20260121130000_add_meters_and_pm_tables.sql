-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Adds comprehensive meter tracking and preventive maintenance (PM) scheduling system.
-- 
-- This migration implements a complete meter and PM system with:
-- - Meter tracking: app.asset_meters and app.meter_readings tables for tracking asset meters
-- - PM templates: cfg.pm_templates for reusable PM procedure definitions
-- - PM schedules: app.pm_schedules for asset-specific PM scheduling
-- - PM history: app.pm_history for audit trail of PM executions
-- - PM dependencies: app.pm_dependencies for PM sequencing rules
-- - Work order integration: pm_schedule_id column added to app.work_orders
-- 
-- Features:
-- - Supports five PM trigger types: time, usage, calendar, condition, manual
-- - Structured work order template columns (wo_title, wo_description, wo_priority, wo_estimated_hours)
-- - Checklist items table (cfg.pm_template_checklist_items) for structured checklists
-- - Comprehensive validation functions and business logic
-- - Full RLS policies for tenant isolation
-- - Public views and RPC functions following ADR conventions
-- 
-- Performance optimizations:
-- - Indexes on all foreign keys and frequently queried columns
-- - Partial indexes for filtered queries (is_active, pm_schedule_id, etc.)
-- - STABLE function markers for query optimization
-- - security_invoker = false on views for performance

-- ============================================================================
-- Meter System Tables
-- ============================================================================

create table if not exists app.asset_meters (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  asset_id uuid not null references app.assets(id) on delete cascade,
  meter_type text not null,
  name text not null,
  unit text not null,
  current_reading numeric not null default 0,
  last_reading_date timestamptz,
  reading_direction text not null default 'increasing',
  decimal_places integer not null default 0,
  is_active boolean not null default true,
  description text,
  installation_date date,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint asset_meters_unique unique (tenant_id, asset_id, name),
  constraint asset_meters_meter_type_check check (
    meter_type in ('runtime_hours', 'cycles', 'miles', 'production_units', 'custom')
  ),
  constraint asset_meters_reading_direction_check check (
    reading_direction in ('increasing', 'decreasing', 'reset')
  ),
  constraint asset_meters_decimal_places_check check (
    decimal_places >= 0 and decimal_places <= 6
  ),
  constraint asset_meters_current_reading_check check (
    current_reading >= 0
  ),
  constraint asset_meters_name_length_check check (
    length(name) >= 1 and length(name) <= 255
  ),
  constraint asset_meters_unit_length_check check (
    length(unit) >= 1 and length(unit) <= 50
  )
);

comment on table app.asset_meters is 
  'Meter definitions attached to assets. Supports multiple meters per asset (e.g., runtime hours, cycles, miles). Tracks current reading and reading direction for PM usage-based triggers.';

comment on column app.asset_meters.meter_type is 
  'Type of meter: runtime_hours (operating hours), cycles (operation cycles), miles (distance), production_units (units produced), custom (user-defined).';

comment on column app.asset_meters.name is 
  'Display name for the meter (e.g., "Main Engine Hours", "Production Count"). Must be unique per asset within tenant.';

comment on column app.asset_meters.unit is 
  'Unit of measurement (e.g., "hours", "miles", "count", "units").';

comment on column app.asset_meters.current_reading is 
  'Current meter reading value. Updated automatically when new readings are recorded. Must be >= 0.';

comment on column app.asset_meters.reading_direction is 
  'Direction of meter readings: increasing (normal, counts up), decreasing (counts down), reset (resets to zero periodically).';

comment on column app.asset_meters.decimal_places is 
  'Number of decimal places to display (0-6). Used for formatting meter readings.';

comment on column app.asset_meters.is_active is 
  'If false, meter is soft-deleted and should not be used for new PM schedules.';

-- Composite index for tenant-asset queries (most common pattern)
-- Optimized for: WHERE tenant_id = X AND asset_id = Y
create index if not exists asset_meters_tenant_asset_idx 
  on app.asset_meters (tenant_id, asset_id);

-- Partial index for active meters only (smaller, faster for common queries)
-- Optimized for: WHERE tenant_id = X AND asset_id = Y AND is_active = true
-- Note: Partial index is more efficient than full index when most queries filter active meters
-- is_active not in key columns since it's already filtered in WHERE clause
create index if not exists asset_meters_active_idx 
  on app.asset_meters (tenant_id, asset_id) 
  where is_active = true;

create index if not exists asset_meters_type_idx 
  on app.asset_meters (meter_type);

create trigger asset_meters_set_updated_at 
  before update on app.asset_meters 
  for each row 
  execute function util.set_updated_at();

alter table app.asset_meters enable row level security;

create table if not exists app.meter_readings (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  meter_id uuid not null references app.asset_meters(id) on delete cascade,
  reading_value numeric not null,
  reading_date timestamptz not null,
  reading_type text not null default 'manual',
  notes text,
  recorded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default pg_catalog.now(),
  constraint meter_readings_reading_type_check check (
    reading_type in ('manual', 'automated', 'imported', 'estimated')
  ),
  constraint meter_readings_reading_value_check check (
    reading_value >= 0
  )
);

comment on table app.meter_readings is 
  'Complete audit trail of all meter readings. Each reading updates the meter current_reading and triggers PM usage-based checks.';

comment on column app.meter_readings.reading_value is 
  'Meter reading value at the time of recording. Must be >= 0.';

comment on column app.meter_readings.reading_date is 
  'Timestamp when the reading was taken (not when it was recorded in the system). Allows backdating for historical data.';

comment on column app.meter_readings.reading_type is 
  'Source of reading: manual (entered by user), automated (from sensor/integration), imported (bulk import), estimated (calculated/estimated value).';

comment on column app.meter_readings.recorded_by is 
  'User who recorded the reading. Null for automated or imported readings.';

-- Composite index for meter-specific queries (most common pattern)
-- Optimized for: WHERE meter_id = X ORDER BY reading_date DESC
create index if not exists meter_readings_meter_date_idx 
  on app.meter_readings (meter_id, reading_date desc);

-- Composite index for tenant-wide queries (RLS and reporting)
-- Optimized for: WHERE tenant_id = X ORDER BY reading_date DESC
create index if not exists meter_readings_tenant_date_idx 
  on app.meter_readings (tenant_id, reading_date desc);

-- Covering index for meter reading lookups (index-only scans)
-- Includes frequently selected columns to avoid table heap access
-- Includes reading_date in key columns for better range query performance
create index if not exists meter_readings_meter_covering_idx 
  on app.meter_readings (meter_id, reading_date desc) 
  include (reading_value, reading_type, notes);

alter table app.meter_readings enable row level security;

-- ============================================================================
-- PM System Tables
-- ============================================================================

create table if not exists cfg.pm_templates (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  name text not null,
  description text,
  trigger_type text not null,
  trigger_config jsonb not null,
  wo_title text,
  wo_description text,
  wo_priority text,
  wo_priority_entity_type text not null default 'work_order',
  wo_estimated_hours numeric,
  is_system boolean not null default false,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint pm_templates_trigger_type_check check (
    trigger_type in ('time', 'usage', 'calendar', 'condition', 'manual')
  ),
  constraint pm_templates_name_length_check check (
    length(name) >= 1 and length(name) <= 255
  ),
  constraint pm_templates_wo_estimated_hours_check check (
    wo_estimated_hours is null or wo_estimated_hours >= 0
  )
);

comment on table cfg.pm_templates is 
  'Reusable PM procedure templates. Templates define trigger configuration and work order structure that can be applied to multiple assets.';

comment on column cfg.pm_templates.trigger_type is 
  'Type of PM trigger: time (interval-based), usage (meter-based), calendar (scheduled dates), condition (sensor-based), manual (user-triggered).';

comment on column cfg.pm_templates.trigger_config is 
  'JSONB configuration for the trigger type. Structure validated per trigger_type. See plan documentation for schema details.';

comment on column cfg.pm_templates.wo_title is 
  'Work order title template. Used when generating work orders from this PM template.';

comment on column cfg.pm_templates.wo_description is 
  'Work order description template. Used when generating work orders from this PM template.';

comment on column cfg.pm_templates.wo_priority is 
  'Work order priority template. Must reference cfg.priority_catalogs(tenant_id, entity_type, key) where entity_type matches wo_priority_entity_type.';

comment on column cfg.pm_templates.wo_priority_entity_type is 
  'Entity type for wo_priority foreign key reference. Defaults to work_order. Used in composite foreign key to cfg.priority_catalogs.';

comment on column cfg.pm_templates.wo_estimated_hours is 
  'Work order estimated hours template. Must be >= 0 if provided.';

-- Composite index for tenant template queries (RLS and filtering)
-- Optimized for: WHERE tenant_id = X AND is_system = Y
-- Column order: tenant_id (equality) first for RLS policy efficiency
create index if not exists pm_templates_tenant_idx 
  on cfg.pm_templates (tenant_id, is_system);

-- Index for trigger type filtering (useful for template discovery)
-- Optimized for: WHERE trigger_type = X (finding templates by trigger type)
create index if not exists pm_templates_trigger_type_idx 
  on cfg.pm_templates (trigger_type);

create index if not exists pm_templates_wo_priority_idx 
  on cfg.pm_templates (tenant_id, wo_priority) 
  where wo_priority is not null;

create trigger pm_templates_set_updated_at 
  before update on cfg.pm_templates 
  for each row 
  execute function util.set_updated_at();

alter table cfg.pm_templates enable row level security;

create table if not exists app.pm_schedules (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  asset_id uuid references app.assets(id) on delete cascade,
  template_id uuid references cfg.pm_templates(id) on delete set null,
  title text not null,
  description text,
  trigger_type text not null,
  trigger_config jsonb not null,
  wo_title text,
  wo_description text,
  wo_priority text,
  wo_priority_entity_type text not null default 'work_order',
  wo_estimated_hours numeric,
  auto_generate boolean not null default true,
  next_due_date timestamptz,
  last_completed_at timestamptz,
  last_work_order_id uuid references app.work_orders(id) on delete set null,
  completion_count integer not null default 0,
  parent_pm_id uuid references app.pm_schedules(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint pm_schedules_trigger_type_check check (
    trigger_type in ('time', 'usage', 'calendar', 'condition', 'manual')
  ),
  constraint pm_schedules_unique unique (tenant_id, asset_id, title),
  constraint pm_schedules_title_length_check check (
    length(title) >= 1 and length(title) <= 500
  ),
  constraint pm_schedules_wo_estimated_hours_check check (
    wo_estimated_hours is null or wo_estimated_hours >= 0
  )
);

comment on table app.pm_schedules is 
  'PM schedule definitions attached to assets. Each schedule defines when PM should be performed based on trigger_type and trigger_config. Supports five trigger types with flexible configuration.';

comment on column app.pm_schedules.asset_id is 
  'Asset this PM schedule applies to. Nullable for future multi-asset PM support.';

comment on column app.pm_schedules.template_id is 
  'Optional reference to PM template. If provided, template values are used as defaults but can be overridden.';

comment on column app.pm_schedules.trigger_type is 
  'Type of PM trigger: time (interval-based), usage (meter-based), calendar (scheduled dates), condition (sensor-based), manual (user-triggered).';

comment on column app.pm_schedules.trigger_config is 
  'JSONB configuration for the trigger type. Structure validated per trigger_type. See plan documentation for schema details.';

comment on column app.pm_schedules.wo_title is 
  'Work order title template. Overrides template wo_title if template_id is set. Used when generating work orders from this PM schedule.';

comment on column app.pm_schedules.wo_description is 
  'Work order description template. Overrides template wo_description if template_id is set. Used when generating work orders from this PM schedule.';

comment on column app.pm_schedules.wo_priority is 
  'Work order priority template. Overrides template wo_priority if template_id is set. Must reference cfg.priority_catalogs(tenant_id, entity_type, key) where entity_type matches wo_priority_entity_type.';

comment on column app.pm_schedules.wo_priority_entity_type is 
  'Entity type for wo_priority foreign key reference. Defaults to work_order. Used in composite foreign key to cfg.priority_catalogs.';

comment on column app.pm_schedules.wo_estimated_hours is 
  'Work order estimated hours template. Overrides template wo_estimated_hours if template_id is set. Must be >= 0 if provided.';

comment on column app.pm_schedules.auto_generate is 
  'If true, work orders are automatically generated when PM becomes due. If false, PM must be manually triggered.';

comment on column app.pm_schedules.next_due_date is 
  'Computed next due date for this PM. Denormalized for performance. Recalculated after each PM completion.';

comment on column app.pm_schedules.last_completed_at is 
  'Timestamp when this PM was last completed (work order marked as completed).';

comment on column app.pm_schedules.completion_count is 
  'Total number of times this PM has been completed. Incremented on each completion.';

comment on column app.pm_schedules.parent_pm_id is 
  'Optional reference to parent PM schedule for dependency relationships.';

-- Composite index for tenant-asset PM queries (most common lookup pattern)
-- Optimized for: WHERE tenant_id = X AND asset_id = Y AND is_active = Z
-- Column order: tenant_id (equality) first for RLS policy efficiency
create index if not exists pm_schedules_tenant_asset_idx 
  on app.pm_schedules (tenant_id, asset_id, is_active);

-- Partial composite index for due PM queries (most critical performance path)
-- Optimized for: WHERE tenant_id = X AND next_due_date <= NOW() AND is_active = true AND auto_generate = true
-- Column order: tenant_id (equality) first, then next_due_date (range) for optimal query plans
-- Note: is_active removed from key columns since it's already in WHERE clause
create index if not exists pm_schedules_due_idx 
  on app.pm_schedules (tenant_id, next_due_date) 
  where is_active = true and auto_generate = true;

-- Partial composite index for usage-based PM lookups (optimized for meter reading triggers)
-- Optimized for: WHERE trigger_type = 'usage' AND is_active = true AND auto_generate = true
-- Used by rpc_record_meter_reading to find usage-based PMs for a meter
-- Note: JSONB meter_id extraction still requires table scan, but this narrows the search space
create index if not exists pm_schedules_usage_trigger_idx 
  on app.pm_schedules (tenant_id, trigger_type) 
  where trigger_type = 'usage' and is_active = true and auto_generate = true;

-- General index for trigger type filtering (for other query patterns)
-- Optimized for: WHERE trigger_type = X (reporting and general queries)
create index if not exists pm_schedules_trigger_type_idx 
  on app.pm_schedules (trigger_type);

-- Partial index for template-based PMs (only non-null template_id)
-- Optimized for: WHERE template_id = X (common join pattern)
create index if not exists pm_schedules_template_idx 
  on app.pm_schedules (template_id) 
  where template_id is not null;

-- Partial composite index for priority-based PM queries
-- Optimized for: WHERE tenant_id = X AND wo_priority = Y (filtering by priority)
-- Only indexes non-null priorities to reduce index size
create index if not exists pm_schedules_wo_priority_idx 
  on app.pm_schedules (tenant_id, wo_priority) 
  where wo_priority is not null;

-- Partial index on parent_pm_id foreign key for dependency queries
-- Optimized for: WHERE parent_pm_id = X (reverse dependency lookups)
-- Only indexes non-null parent_pm_id to reduce index size
create index if not exists pm_schedules_parent_pm_idx 
  on app.pm_schedules (parent_pm_id) 
  where parent_pm_id is not null;

create trigger pm_schedules_set_updated_at 
  before update on app.pm_schedules 
  for each row 
  execute function util.set_updated_at();

alter table app.pm_schedules enable row level security;

create table if not exists app.pm_history (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  pm_schedule_id uuid not null references app.pm_schedules(id) on delete cascade,
  work_order_id uuid references app.work_orders(id) on delete set null,
  scheduled_date timestamptz not null,
  completed_date timestamptz,
  completed_by uuid references auth.users(id) on delete set null,
  actual_hours numeric,
  cost numeric,
  notes text,
  created_at timestamptz not null default pg_catalog.now()
);

comment on table app.pm_history is 
  'Complete audit trail of PM executions. One record per PM completion, linking PM schedule to work order and tracking completion details.';

comment on column app.pm_history.scheduled_date is 
  'Date when PM was scheduled/due. Used for tracking PM adherence and scheduling accuracy.';

comment on column app.pm_history.completed_date is 
  'Timestamp when work order was completed. Null if PM was scheduled but not yet completed.';

comment on column app.pm_history.completed_by is 
  'User who completed the PM work order.';

comment on column app.pm_history.actual_hours is 
  'Actual hours spent on PM (from work order time entries).';

comment on column app.pm_history.cost is 
  'Total cost of PM (labor + materials).';

-- Composite index for PM-specific history queries
-- Optimized for: WHERE pm_schedule_id = X ORDER BY scheduled_date DESC
create index if not exists pm_history_pm_idx 
  on app.pm_history (pm_schedule_id, scheduled_date desc);

-- Partial index for work order lookups (only non-null work_order_id)
-- Optimized for: WHERE work_order_id = X (common join pattern)
create index if not exists pm_history_work_order_idx 
  on app.pm_history (work_order_id) 
  where work_order_id is not null;

-- Composite index for tenant-wide history queries (RLS and reporting)
-- Optimized for: WHERE tenant_id = X ORDER BY scheduled_date DESC
create index if not exists pm_history_tenant_date_idx 
  on app.pm_history (tenant_id, scheduled_date desc);

alter table app.pm_history enable row level security;

create table if not exists app.pm_dependencies (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  pm_schedule_id uuid not null references app.pm_schedules(id) on delete cascade,
  depends_on_pm_id uuid not null references app.pm_schedules(id) on delete cascade,
  dependency_type text not null default 'after',
  created_at timestamptz not null default pg_catalog.now(),
  constraint pm_dependencies_unique unique (pm_schedule_id, depends_on_pm_id),
  constraint pm_dependencies_dependency_type_check check (
    dependency_type in ('before', 'after', 'same_day')
  )
);

comment on table app.pm_dependencies is 
  'PM dependency relationships. Defines that PM B must run after PM A (or before, or same day). Used to enforce PM sequencing and prevent circular dependencies.';

comment on column app.pm_dependencies.dependency_type is 
  'Type of dependency: after (PM must run after dependency), before (PM must run before dependency), same_day (PM must run on same day as dependency).';

-- Composite index for PM dependency lookups (forward dependencies)
-- Optimized for: WHERE pm_schedule_id = X (checking if PM has dependencies)
-- Also optimized for JOIN in pm.check_pm_dependencies() function: JOIN on depends_on_pm_id
create index if not exists pm_dependencies_pm_idx 
  on app.pm_dependencies (pm_schedule_id, depends_on_pm_id);

-- Index for reverse dependency lookups (backward dependencies)
-- Optimized for: WHERE depends_on_pm_id = X (checking what depends on this PM)
create index if not exists pm_dependencies_depends_on_idx 
  on app.pm_dependencies (depends_on_pm_id);

alter table app.pm_dependencies enable row level security;

-- ============================================================================
-- PM Template Checklist Items Table
-- ============================================================================

create table if not exists cfg.pm_template_checklist_items (
  id uuid primary key default extensions.gen_random_uuid(),
  template_id uuid not null references cfg.pm_templates(id) on delete cascade,
  description text not null,
  required boolean not null default false,
  display_order integer not null,
  created_at timestamptz not null default pg_catalog.now(),
  constraint pm_template_checklist_items_order_check check (display_order >= 0),
  constraint pm_template_checklist_items_description_length_check check (
    length(description) >= 1 and length(description) <= 1000
  )
);

comment on table cfg.pm_template_checklist_items is 
  'Checklist items for PM templates. Each item represents a step in the PM procedure checklist with description, required flag, and display order.';

comment on column cfg.pm_template_checklist_items.template_id is 
  'PM template this checklist item belongs to. Cascade delete when template is deleted.';

comment on column cfg.pm_template_checklist_items.description is 
  'Description of the checklist item/step. Must be 1-1000 characters.';

comment on column cfg.pm_template_checklist_items.required is 
  'Whether this checklist item is required to be completed. Defaults to false.';

comment on column cfg.pm_template_checklist_items.display_order is 
  'Order in which this item should be displayed (0-based). Used to preserve the order of checklist items. Must be >= 0.';

-- Composite index for checklist item queries (ordered retrieval)
-- Optimized for: WHERE template_id = X ORDER BY display_order ASC
-- Column order: template_id (equality) first, then display_order (ordering)
create index if not exists pm_template_checklist_items_template_idx 
  on cfg.pm_template_checklist_items (template_id, display_order);

create trigger pm_template_checklist_items_set_updated_at 
  before update on cfg.pm_template_checklist_items 
  for each row 
  execute function util.set_updated_at();

alter table cfg.pm_template_checklist_items enable row level security;

-- ============================================================================
-- Data Migration: JSONB to Structured Columns
-- ============================================================================
-- 
-- ============================================================================
-- Add Foreign Key Constraints
-- ============================================================================

-- Foreign key constraints for wo_priority columns (after data migration)
-- Note: Composite foreign keys reference (tenant_id, entity_type, key) from priority_catalogs
-- The wo_priority_entity_type column defaults to 'work_order' and is included in the FK
alter table cfg.pm_templates
  add constraint pm_templates_wo_priority_fk 
  foreign key (tenant_id, wo_priority_entity_type, wo_priority) 
  references cfg.priority_catalogs(tenant_id, entity_type, key)
  on delete restrict;

alter table app.pm_schedules
  add constraint pm_schedules_wo_priority_fk 
  foreign key (tenant_id, wo_priority_entity_type, wo_priority) 
  references cfg.priority_catalogs(tenant_id, entity_type, key)
  on delete restrict;

-- ============================================================================
-- Add pm_schedule_id to work_orders table
-- ============================================================================

alter table app.work_orders
  add column if not exists pm_schedule_id uuid references app.pm_schedules(id) on delete set null;

comment on column app.work_orders.pm_schedule_id is 
  'Reference to PM schedule that generated this work order. Null for manually created work orders. Set automatically when PM generates work order.';

-- Partial index for PM-generated work orders (only non-null pm_schedule_id)
-- Optimized for: WHERE pm_schedule_id = X (finding work orders for a PM)
-- Partial index reduces size since most work orders are not PM-generated
create index if not exists work_orders_pm_schedule_idx 
  on app.work_orders (pm_schedule_id) 
  where pm_schedule_id is not null;

-- Update v_work_orders view to include pm_schedule_id
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
  wo.maintenance_type,
  wo.pm_schedule_id
from app.work_orders wo
left join lateral (
  select sum(minutes) as total_minutes
  from app.work_order_time_entries
  where work_order_id = wo.id
) te_agg on true
where wo.tenant_id = authz.get_current_tenant_id();

comment on view public.v_work_orders is 
  'Work orders view scoped to the current tenant context. Includes total_labor_minutes aggregated from time entries, maintenance_type, and pm_schedule_id. Clients must set tenant context via rpc_set_tenant_context. Underlying table RLS still applies.';

grant select on public.v_work_orders to authenticated;
grant select on public.v_work_orders to anon;

-- ============================================================================
-- Create PM Schema
-- ============================================================================

create schema if not exists pm;

comment on schema pm is 
  'Preventive maintenance core functions. Contains business logic for PM scheduling, trigger evaluation, and work order generation.';

-- ============================================================================
-- Validation Functions
-- ============================================================================

create or replace function util.validate_meter_reading()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meter app.asset_meters%rowtype;
  v_decrease_percentage numeric;
begin
  -- Get meter details
  select * into v_meter
  from app.asset_meters
  where id = new.meter_id;

  if not found then
    raise exception using
      message = format('Meter %s not found', new.meter_id),
      errcode = '23503';
  end if;

  -- Validate reading value
  if new.reading_value < 0 then
    raise exception using
      message = 'Reading value must be >= 0',
      errcode = '23514';
  end if;

  -- Validate reading date (allow up to 7 days in future, 90 days in past)
  if new.reading_date > pg_catalog.now() + interval '7 days' then
    raise exception using
      message = 'Reading date cannot be more than 7 days in the future',
      errcode = '23514';
  end if;

  if new.reading_date < pg_catalog.now() - interval '90 days' then
    raise exception using
      message = 'Reading date cannot be more than 90 days in the past',
      errcode = '23514';
  end if;

  -- Validate reading direction
  if v_meter.reading_direction = 'increasing' then
    if new.reading_value < v_meter.current_reading then
      v_decrease_percentage := ((v_meter.current_reading - new.reading_value) / nullif(v_meter.current_reading, 0)) * 100;
      if v_decrease_percentage > 10 then
        raise exception using
          message = format('Reading decreased by %s%%. For increasing meters, new reading must be >= current reading (allowing up to 10%% tolerance for user error)', to_char(v_decrease_percentage, 'FM999999990.00')),
          errcode = '23514';
      end if;
    end if;
  elsif v_meter.reading_direction = 'decreasing' then
    if new.reading_value > v_meter.current_reading then
      raise exception using
        message = 'For decreasing meters, new reading must be <= current reading',
        errcode = '23514';
    end if;
  -- reset meters: always allow (no validation needed)
  end if;

  -- Update meter current_reading and last_reading_date
  update app.asset_meters
  set
    current_reading = new.reading_value,
    last_reading_date = new.reading_date,
    updated_at = pg_catalog.now()
  where id = new.meter_id;

  return new;
end;
$$;

comment on function util.validate_meter_reading() is 
  'Trigger function that validates new meter readings. Ensures reading_value >= 0, validates reading direction (increasing/decreasing/reset), allows tolerance for user error on increasing meters, validates reading_date within acceptable range (7 days future, 90 days past), and updates meter current_reading and last_reading_date.';

revoke all on function util.validate_meter_reading() from public;
grant execute on function util.validate_meter_reading() to postgres;

create or replace function util.validate_asset_meter_tenant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_asset_tenant_id uuid;
begin
  select tenant_id into v_asset_tenant_id
  from app.assets
  where id = new.asset_id;

  if not found then
    raise exception using
      message = format('Asset %s not found', new.asset_id),
      errcode = '23503';
  end if;

  perform util.validate_tenant_match(
    new.tenant_id,
    v_asset_tenant_id,
    'Asset'
  );

  return new;
end;
$$;

comment on function util.validate_asset_meter_tenant() is 
  'Trigger function ensuring meter belongs to same tenant as asset. Validates asset exists and tenant matches.';

revoke all on function util.validate_asset_meter_tenant() from public;
grant execute on function util.validate_asset_meter_tenant() to postgres;

create or replace function util.validate_pm_trigger_config()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pm.validate_trigger_config(new.trigger_type, new.trigger_config);
  return new;
end;
$$;

comment on function util.validate_pm_trigger_config() is 
  'Trigger function validating trigger_config on insert/update. Calls pm.validate_trigger_config() to ensure configuration matches trigger_type requirements.';

revoke all on function util.validate_pm_trigger_config() from public;
grant execute on function util.validate_pm_trigger_config() to postgres;

create or replace function util.validate_pm_meter_tenant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meter_tenant_id uuid;
  v_meter_id uuid;
begin
  if new.trigger_type = 'usage' then
    v_meter_id := (new.trigger_config->>'meter_id')::uuid;
    
    if v_meter_id is not null then
      select tenant_id into v_meter_tenant_id
      from app.asset_meters
      where id = v_meter_id;

      if not found then
        raise exception using
          message = format('Meter %s not found', v_meter_id),
          errcode = '23503';
      end if;

      if v_meter_tenant_id != new.tenant_id then
        raise exception using
          message = 'Unauthorized: Meter does not belong to this tenant',
          errcode = '42501';
      end if;
    end if;
  end if;

  return new;
end;
$$;

comment on function util.validate_pm_meter_tenant() is 
  'Trigger function ensuring usage-based PM meters belong to same tenant. Validates meter exists and tenant matches for usage trigger types.';

revoke all on function util.validate_pm_meter_tenant() from public;
grant execute on function util.validate_pm_meter_tenant() to postgres;

create or replace function util.validate_pm_dependency_cycle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_has_cycle boolean;
begin
  with recursive dependency_chain as (
    select
      pm_schedule_id,
      depends_on_pm_id,
      1 as depth
    from app.pm_dependencies
    where pm_schedule_id = new.pm_schedule_id
      and depends_on_pm_id = new.depends_on_pm_id
    
    union all
    
    select
      pd.pm_schedule_id,
      pd.depends_on_pm_id,
      dc.depth + 1
    from app.pm_dependencies pd
    inner join dependency_chain dc on pd.pm_schedule_id = dc.depends_on_pm_id
    where dc.depth < 1000
      and pd.pm_schedule_id != new.pm_schedule_id
  )
  select exists (
    select 1
    from dependency_chain
    where pm_schedule_id = depends_on_pm_id
      or depth >= 1000
  ) into v_has_cycle;

  if v_has_cycle then
    raise exception using
      message = 'Circular dependency detected: PM dependencies cannot form a cycle',
      errcode = '23503';
  end if;

  return new;
end;
$$;

comment on function util.validate_pm_dependency_cycle() is 
  'Trigger function preventing circular PM dependencies. Uses recursive CTE to detect cycles in dependency chain. Raises exception if cycle detected or max depth (1000) exceeded.';

revoke all on function util.validate_pm_dependency_cycle() from public;
grant execute on function util.validate_pm_dependency_cycle() to postgres;

-- ============================================================================
-- Core PM Functions
-- ============================================================================

create or replace function pm.validate_trigger_config(
  p_trigger_type text,
  p_trigger_config jsonb
)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_trigger_config is null then
    raise exception using
      message = 'trigger_config is required',
      errcode = '23514';
  end if;

  if p_trigger_type = 'time' then
    if not (p_trigger_config ? 'interval_days') then
      raise exception using
        message = 'Time-based trigger requires interval_days',
        errcode = '23514';
    end if;
    
    if (p_trigger_config->>'interval_days')::integer < 1 then
      raise exception using
        message = 'interval_days must be >= 1',
        errcode = '23514';
    end if;

  elsif p_trigger_type = 'usage' then
    if not (p_trigger_config ? 'meter_id') then
      raise exception using
        message = 'Usage-based trigger requires meter_id',
        errcode = '23514';
    end if;
    
    if not (p_trigger_config ? 'threshold') then
      raise exception using
        message = 'Usage-based trigger requires threshold',
        errcode = '23514';
    end if;
    
    if (p_trigger_config->>'threshold')::numeric <= 0 then
      raise exception using
        message = 'threshold must be > 0',
        errcode = '23514';
    end if;

  elsif p_trigger_type = 'calendar' then
    if not (p_trigger_config ? 'pattern') then
      raise exception using
        message = 'Calendar-based trigger requires pattern',
        errcode = '23514';
    end if;
    
    if (p_trigger_config->>'pattern')::text not in ('daily', 'weekly', 'monthly', 'quarterly', 'yearly') then
      raise exception using
        message = 'pattern must be one of: daily, weekly, monthly, quarterly, yearly',
        errcode = '23514';
    end if;

  elsif p_trigger_type = 'condition' then
    if not (p_trigger_config ? 'threshold') then
      raise exception using
        message = 'Condition-based trigger requires threshold',
        errcode = '23514';
    end if;
    
    if not (p_trigger_config ? 'operator') then
      raise exception using
        message = 'Condition-based trigger requires operator',
        errcode = '23514';
    end if;
    
    if (p_trigger_config->>'operator')::text not in ('greater_than', 'less_than', 'equals', 'not_equals') then
      raise exception using
        message = 'operator must be one of: greater_than, less_than, equals, not_equals',
        errcode = '23514';
    end if;
    
    if not ((p_trigger_config ? 'sensor_id') or (p_trigger_config ? 'integration_id')) then
      raise exception using
        message = 'Condition-based trigger requires sensor_id or integration_id',
        errcode = '23514';
    end if;

  elsif p_trigger_type = 'manual' then
    -- Manual triggers require no configuration
    null;

  else
    raise exception using
      message = format('Invalid trigger_type: %s', p_trigger_type),
      errcode = '23514';
  end if;
end;
$$;

comment on function pm.validate_trigger_config(text, jsonb) is 
  'Validates trigger_config structure matches trigger_type requirements. Raises exception with clear error message if invalid. Supports all five trigger types: time, usage, calendar, condition, manual.';

revoke all on function pm.validate_trigger_config(text, jsonb) from public;
grant execute on function pm.validate_trigger_config(text, jsonb) to postgres;

create or replace function pm.calculate_next_due_date(
  p_pm_schedule app.pm_schedules,
  p_last_completed_at timestamptz
)
returns timestamptz
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_next_due_date timestamptz;
  v_interval_days integer;
  v_start_date timestamptz;
  v_timezone text;
  v_base_date timestamptz;
begin
  if p_pm_schedule.trigger_type = 'time' then
    v_interval_days := (p_pm_schedule.trigger_config->>'interval_days')::integer;
    v_start_date := coalesce(
      (p_pm_schedule.trigger_config->>'start_date')::timestamptz,
      p_pm_schedule.created_at
    );
    v_timezone := coalesce(
      (p_pm_schedule.trigger_config->>'timezone')::text,
      'UTC'
    );
    
    v_base_date := coalesce(p_last_completed_at, v_start_date);
    v_next_due_date := v_base_date + (v_interval_days || ' days')::interval;

  elsif p_pm_schedule.trigger_type = 'usage' then
    -- Usage-based PMs don't have a fixed next_due_date
    -- They are triggered when meter threshold is reached
    v_next_due_date := null;

  elsif p_pm_schedule.trigger_type = 'calendar' then
    -- Calendar-based PMs require complex date calculation
    -- For now, return null (to be implemented with full calendar logic)
    -- This is a placeholder that can be enhanced later
    v_next_due_date := null;

  elsif p_pm_schedule.trigger_type = 'condition' then
    -- Condition-based PMs don't have a fixed next_due_date
    -- They are triggered when condition threshold is met
    v_next_due_date := null;

  elsif p_pm_schedule.trigger_type = 'manual' then
    -- Manual PMs don't have a next_due_date
    v_next_due_date := null;

  else
    raise exception using
      message = format('Invalid trigger_type: %s', p_pm_schedule.trigger_type),
      errcode = '23514';
  end if;

  return v_next_due_date;
end;
$$;

comment on function pm.calculate_next_due_date(app.pm_schedules, timestamptz) is 
  'Calculates next_due_date based on trigger_type and trigger_config. Handles time-based triggers with interval calculation. Returns null for usage, calendar, condition, and manual triggers (which are triggered differently).';

revoke all on function pm.calculate_next_due_date(app.pm_schedules, timestamptz) from public;
grant execute on function pm.calculate_next_due_date(app.pm_schedules, timestamptz) to postgres;

create or replace function pm.is_pm_due(
  p_pm_schedule app.pm_schedules
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_is_due boolean := false;
  v_meter_id uuid;
  v_threshold numeric;
  v_current_reading numeric;
begin
  if not p_pm_schedule.is_active then
    return false;
  end if;

  if p_pm_schedule.trigger_type = 'time' then
    v_is_due := p_pm_schedule.next_due_date is not null
      and p_pm_schedule.next_due_date <= pg_catalog.now();

  elsif p_pm_schedule.trigger_type = 'usage' then
    v_meter_id := (p_pm_schedule.trigger_config->>'meter_id')::uuid;
    v_threshold := (p_pm_schedule.trigger_config->>'threshold')::numeric;
    
    if v_meter_id is not null and v_threshold is not null then
      select current_reading into v_current_reading
      from app.asset_meters
      where id = v_meter_id;
      
      if found and v_current_reading >= v_threshold then
        v_is_due := true;
      end if;
    end if;

  elsif p_pm_schedule.trigger_type = 'calendar' then
    -- Calendar-based PMs: check if current date matches pattern
    -- Simplified: check if next_due_date is today or past
    v_is_due := p_pm_schedule.next_due_date is not null
      and p_pm_schedule.next_due_date::date <= pg_catalog.current_date;

  elsif p_pm_schedule.trigger_type = 'condition' then
    -- Condition-based PMs: check sensor/integration value
    -- This requires integration with sensor systems (placeholder)
    v_is_due := false;

  elsif p_pm_schedule.trigger_type = 'manual' then
    -- Manual PMs are never automatically due
    v_is_due := false;

  else
    raise exception using
      message = format('Invalid trigger_type: %s', p_pm_schedule.trigger_type),
      errcode = '23514';
  end if;

  return v_is_due;
end;
$$;

comment on function pm.is_pm_due(app.pm_schedules) is 
  'Checks if PM is currently due based on trigger_type. Returns true if PM should be generated now. Handles time, usage, calendar triggers. Condition and manual triggers return false (handled separately).';

revoke all on function pm.is_pm_due(app.pm_schedules) from public;
grant execute on function pm.is_pm_due(app.pm_schedules) to postgres;

create or replace function pm.check_pm_dependencies(
  p_pm_schedule_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_all_dependencies_met boolean := true;
  v_dependency record;
begin
  -- Optimized query using composite index pm_dependencies_pm_idx
  for v_dependency in
    select
      pd.depends_on_pm_id,
      pd.dependency_type,
      ps.last_completed_at
    from app.pm_dependencies pd
    join app.pm_schedules ps on pd.depends_on_pm_id = ps.id
    where pd.pm_schedule_id = p_pm_schedule_id
  loop
    if v_dependency.dependency_type = 'after' then
      if v_dependency.last_completed_at is null then
        v_all_dependencies_met := false;
        exit;
      end if;
    elsif v_dependency.dependency_type = 'before' then
      -- PM must run before dependency, so dependency should not be completed
      if v_dependency.last_completed_at is not null then
        v_all_dependencies_met := false;
        exit;
      end if;
    elsif v_dependency.dependency_type = 'same_day' then
      -- For same_day, check if dependency was completed today
      if v_dependency.last_completed_at is null
        or v_dependency.last_completed_at::date != pg_catalog.current_date then
        v_all_dependencies_met := false;
        exit;
      end if;
    end if;
  end loop;

  return v_all_dependencies_met;
end;
$$;

comment on function pm.check_pm_dependencies(uuid) is 
  'Checks if PM dependencies are satisfied. Returns true if all dependencies are met (based on dependency_type), false otherwise. Used before generating PM work orders.';

revoke all on function pm.check_pm_dependencies(uuid) from public;
grant execute on function pm.check_pm_dependencies(uuid) to postgres;

create or replace function pm.generate_pm_work_order(
  p_pm_schedule_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pm_schedule app.pm_schedules%rowtype;
  v_work_order_id uuid;
  v_title text;
  v_description text;
  v_priority text;
  v_maintenance_type text;
begin
  -- Get PM schedule
  select * into v_pm_schedule
  from app.pm_schedules
  where id = p_pm_schedule_id;

  if not found then
    raise exception using
      message = format('PM schedule %s not found', p_pm_schedule_id),
      errcode = 'P0001';
  end if;

  -- Check if dependencies are met
  if not pm.check_pm_dependencies(p_pm_schedule_id) then
    raise exception using
      message = 'PM dependencies not satisfied',
      errcode = '23503';
  end if;

  -- Get work order template values (from schedule or template)
  v_title := coalesce(
    v_pm_schedule.wo_title,
    (
      select wo_title
      from cfg.pm_templates
      where id = v_pm_schedule.template_id
    ),
    v_pm_schedule.title
  );
  v_description := coalesce(
    v_pm_schedule.wo_description,
    (
      select wo_description
      from cfg.pm_templates
      where id = v_pm_schedule.template_id
    ),
    v_pm_schedule.description
  );
  v_priority := coalesce(
    v_pm_schedule.wo_priority,
    (
      select wo_priority
      from cfg.pm_templates
      where id = v_pm_schedule.template_id
    ),
    'medium'
  );

  -- Determine maintenance type based on trigger type
  if v_pm_schedule.trigger_type = 'time' then
    v_maintenance_type := 'preventive_time';
  elsif v_pm_schedule.trigger_type = 'usage' then
    v_maintenance_type := 'preventive_usage';
  else
    v_maintenance_type := 'preventive_time';
  end if;

  -- Create work order via RPC
  v_work_order_id := public.rpc_create_work_order(
    v_pm_schedule.tenant_id,
    v_title,
    v_description,
    v_priority,
    v_maintenance_type,
    null, -- assigned_to
    null, -- location_id
    v_pm_schedule.asset_id,
    null, -- due_date
    p_pm_schedule_id
  );

  -- Update PM schedule
  update app.pm_schedules
  set
    last_work_order_id = v_work_order_id,
    updated_at = pg_catalog.now()
  where id = p_pm_schedule_id;

  -- Recalculate next_due_date (for time-based PMs)
  if v_pm_schedule.trigger_type = 'time' then
    update app.pm_schedules
    set
      next_due_date = pm.calculate_next_due_date(
        v_pm_schedule,
        v_pm_schedule.last_completed_at
      ),
      updated_at = pg_catalog.now()
    where id = p_pm_schedule_id;
  end if;

  return v_work_order_id;
end;
$$;

comment on function pm.generate_pm_work_order(uuid) is 
  'Generates work order from PM schedule. Uses structured wo_* columns, sets maintenance_type to preventive_time or preventive_usage, links to PM schedule, updates next_due_date. Checks dependencies before generating.';

revoke all on function pm.generate_pm_work_order(uuid) from public;
grant execute on function pm.generate_pm_work_order(uuid) to postgres;

create or replace function pm.update_pm_on_completion(
  p_work_order_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_work_order app.work_orders%rowtype;
  v_pm_schedule app.pm_schedules%rowtype;
  v_meter_id uuid;
  v_reset_after_pm boolean;
  v_threshold_offset numeric;
begin
  -- Get work order
  select * into v_work_order
  from app.work_orders
  where id = p_work_order_id;

  if not found then
    raise exception using
      message = format('Work order %s not found', p_work_order_id),
      errcode = 'P0001';
  end if;

  if v_work_order.pm_schedule_id is null then
    -- Not a PM work order, nothing to do
    return;
  end if;

  -- Get PM schedule
  select * into v_pm_schedule
  from app.pm_schedules
  where id = v_work_order.pm_schedule_id;

  if not found then
    raise exception using
      message = format('PM schedule %s not found', v_work_order.pm_schedule_id),
      errcode = 'P0001';
  end if;

  -- Update PM schedule
  update app.pm_schedules
  set
    last_completed_at = pg_catalog.now(),
    completion_count = completion_count + 1,
    next_due_date = pm.calculate_next_due_date(
      v_pm_schedule,
      pg_catalog.now()
    ),
    updated_at = pg_catalog.now()
  where id = v_pm_schedule.id;

  -- Create PM history record
  insert into app.pm_history (
    tenant_id,
    pm_schedule_id,
    work_order_id,
    scheduled_date,
    completed_date,
    completed_by
  )
  values (
    v_pm_schedule.tenant_id,
    v_pm_schedule.id,
    p_work_order_id,
    v_pm_schedule.next_due_date,
    pg_catalog.now(),
    v_work_order.completed_by
  );

  -- Handle usage meter reset if configured
  if v_pm_schedule.trigger_type = 'usage' then
    v_reset_after_pm := coalesce(
      (v_pm_schedule.trigger_config->>'reset_after_pm')::boolean,
      false
    );

    if v_reset_after_pm then
      v_meter_id := (v_pm_schedule.trigger_config->>'meter_id')::uuid;
      v_threshold_offset := coalesce(
        (v_pm_schedule.trigger_config->>'threshold_offset')::numeric,
        0
      );

      -- Update meter threshold offset (stored in trigger_config)
      update app.pm_schedules
      set
        trigger_config = jsonb_set(
          trigger_config,
          '{threshold_offset}',
          to_jsonb(
            coalesce(
              (trigger_config->>'threshold_offset')::numeric,
              0
            ) + coalesce(
              (select current_reading from app.asset_meters where id = v_meter_id),
              0
            )
          )
        ),
        updated_at = pg_catalog.now()
      where id = v_pm_schedule.id;
    end if;
  end if;
end;
$$;

comment on function pm.update_pm_on_completion(uuid) is 
  'Called when PM work order is completed. Updates pm_schedules.last_completed_at, completion_count, recalculates next_due_date, creates pm_history record, handles usage meter reset if configured.';

revoke all on function pm.update_pm_on_completion(uuid) from public;
grant execute on function pm.update_pm_on_completion(uuid) to postgres;

-- ============================================================================
-- Triggers
-- ============================================================================

create trigger meter_readings_validate_reading 
  before insert on app.meter_readings 
  for each row 
  execute function util.validate_meter_reading();

create trigger asset_meters_validate_tenant 
  before insert or update on app.asset_meters 
  for each row 
  execute function util.validate_asset_meter_tenant();

create trigger pm_templates_validate_trigger_config 
  before insert or update on cfg.pm_templates 
  for each row 
  execute function util.validate_pm_trigger_config();

create trigger pm_schedules_validate_trigger_config 
  before insert or update on app.pm_schedules 
  for each row 
  execute function util.validate_pm_trigger_config();

create trigger pm_schedules_validate_meter_tenant 
  before insert or update on app.pm_schedules 
  for each row 
  execute function util.validate_pm_meter_tenant();

create trigger pm_dependencies_validate_cycle 
  before insert or update on app.pm_dependencies 
  for each row 
  execute function util.validate_pm_dependency_cycle();

-- ============================================================================
-- Work Order Completion Trigger
-- ============================================================================

create or replace function util.update_pm_on_work_order_completion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Only process if work order was just completed (completed_at was set and was null before)
  if new.completed_at is not null and (old.completed_at is null or old.completed_at is distinct from new.completed_at) then
    if new.pm_schedule_id is not null then
      perform pm.update_pm_on_completion(new.id);
    end if;
  end if;

  return new;
end;
$$;

comment on function util.update_pm_on_work_order_completion() is 
  'Trigger function that calls pm.update_pm_on_completion() when a PM work order is completed. Checks if completed_at was just set and pm_schedule_id is not null.';

revoke all on function util.update_pm_on_work_order_completion() from public;
grant execute on function util.update_pm_on_work_order_completion() to postgres;

create trigger work_orders_update_pm_on_completion 
  after update of completed_at, completed_by on app.work_orders 
  for each row 
  when (new.completed_at is not null and (old.completed_at is null or old.completed_at is distinct from new.completed_at))
  execute function util.update_pm_on_work_order_completion();

-- ============================================================================
-- Views
-- ============================================================================

create or replace view public.v_asset_meters as
select
  am.id,
  am.tenant_id,
  am.asset_id,
  a.name as asset_name,
  am.meter_type,
  am.name,
  am.unit,
  am.current_reading,
  am.last_reading_date,
  am.reading_direction,
  am.decimal_places,
  am.is_active,
  am.description,
  am.installation_date,
  am.created_at,
  am.updated_at
from app.asset_meters am
join app.assets a on am.asset_id = a.id
where am.tenant_id = authz.get_current_tenant_id();

comment on view public.v_asset_meters is 
  'Current active meters for assets in current tenant context. Includes asset name, meter details, current reading, last reading date. Clients must set tenant context via rpc_set_tenant_context.';

grant select on public.v_asset_meters to anon;
grant select on public.v_asset_meters to authenticated;

create or replace view public.v_meter_readings as
select
  mr.id,
  mr.tenant_id,
  mr.meter_id,
  am.name as meter_name,
  am.asset_id,
  a.name as asset_name,
  mr.reading_value,
  mr.reading_date,
  mr.reading_type,
  mr.notes,
  mr.recorded_by,
  mr.created_at
from app.meter_readings mr
join app.asset_meters am on mr.meter_id = am.id
join app.assets a on am.asset_id = a.id
where mr.tenant_id = authz.get_current_tenant_id();

comment on view public.v_meter_readings is 
  'Reading history for meters in current tenant context. Includes meter name, asset name, reading details, recorded by user. Clients must set tenant context via rpc_set_tenant_context.';

grant select on public.v_meter_readings to anon;
grant select on public.v_meter_readings to authenticated;

create or replace view public.v_pm_schedules as
select
  ps.id,
  ps.tenant_id,
  ps.asset_id,
  a.name as asset_name,
  ps.template_id,
  pt.name as template_name,
  ps.title,
  ps.description,
  ps.trigger_type,
  ps.trigger_config,
  ps.wo_title,
  ps.wo_description,
  ps.wo_priority,
  ps.wo_estimated_hours,
  ps.auto_generate,
  ps.next_due_date,
  ps.last_completed_at,
  ps.completion_count,
  ps.is_active,
  ps.created_at,
  ps.updated_at,
  case
    when ps.next_due_date is not null and ps.next_due_date < pg_catalog.now() then true
    else false
  end as is_overdue
from app.pm_schedules ps
left join app.assets a on ps.asset_id = a.id
left join cfg.pm_templates pt on ps.template_id = pt.id
where ps.tenant_id = authz.get_current_tenant_id();

comment on view public.v_pm_schedules is 
  'PM schedules for current tenant. Includes asset name, trigger details, next_due_date, last_completed_at, completion_count, is_overdue flag. Clients must set tenant context via rpc_set_tenant_context.';

grant select on public.v_pm_schedules to anon;
grant select on public.v_pm_schedules to authenticated;

create or replace view public.v_pm_templates as
select
  pt.id,
  pt.tenant_id,
  pt.name,
  pt.description,
  pt.trigger_type,
  pt.trigger_config,
  pt.wo_title,
  pt.wo_description,
  pt.wo_priority,
  pt.wo_estimated_hours,
  pt.is_system,
  pt.created_at,
  pt.updated_at
from cfg.pm_templates pt
where pt.tenant_id = authz.get_current_tenant_id();

comment on view public.v_pm_templates is 
  'PM templates for current tenant. Includes trigger_type, trigger_config summary. Clients must set tenant context via rpc_set_tenant_context.';

grant select on public.v_pm_templates to anon;
grant select on public.v_pm_templates to authenticated;

create or replace view public.v_due_pms as
select
  ps.id,
  ps.tenant_id,
  ps.asset_id,
  a.name as asset_name,
  ps.title,
  ps.trigger_type,
  ps.next_due_date,
  ps.last_completed_at
from app.pm_schedules ps
left join app.assets a on ps.asset_id = a.id
where ps.tenant_id = authz.get_current_tenant_id()
  and ps.is_active = true
  and ps.auto_generate = true
  and ps.next_due_date is not null
  and ps.next_due_date <= pg_catalog.now()
  and pm.is_pm_due(ps);

comment on view public.v_due_pms is 
  'PMs that are currently due (next_due_date <= now() and is_due() = true). For dashboard display. Clients must set tenant context via rpc_set_tenant_context.';

grant select on public.v_due_pms to anon;
grant select on public.v_due_pms to authenticated;

create or replace view public.v_overdue_pms as
select
  ps.id,
  ps.tenant_id,
  ps.asset_id,
  a.name as asset_name,
  ps.title,
  ps.trigger_type,
  ps.next_due_date,
  ps.last_completed_at,
  pg_catalog.now() - ps.next_due_date as days_overdue
from app.pm_schedules ps
left join app.assets a on ps.asset_id = a.id
where ps.tenant_id = authz.get_current_tenant_id()
  and ps.is_active = true
  and ps.next_due_date is not null
  and ps.next_due_date < pg_catalog.now() - interval '1 day';

comment on view public.v_overdue_pms is 
  'PMs that are overdue (next_due_date < now() - interval ''1 day''). For alerts. Clients must set tenant context via rpc_set_tenant_context.';

grant select on public.v_overdue_pms to anon;
grant select on public.v_overdue_pms to authenticated;

create or replace view public.v_upcoming_pms as
select
  ps.id,
  ps.tenant_id,
  ps.asset_id,
  a.name as asset_name,
  ps.title,
  ps.trigger_type,
  ps.next_due_date,
  ps.last_completed_at,
  ps.next_due_date - pg_catalog.now() as days_until_due
from app.pm_schedules ps
left join app.assets a on ps.asset_id = a.id
where ps.tenant_id = authz.get_current_tenant_id()
  and ps.is_active = true
  and ps.next_due_date is not null
  and ps.next_due_date between pg_catalog.now() and pg_catalog.now() + interval '30 days';

comment on view public.v_upcoming_pms is 
  'PMs due in next 30 days. For planning. Clients must set tenant context via rpc_set_tenant_context.';

grant select on public.v_upcoming_pms to anon;
grant select on public.v_upcoming_pms to authenticated;

create or replace view public.v_pm_history as
select
  ph.id,
  ph.tenant_id,
  ph.pm_schedule_id,
  ps.title as pm_title,
  ps.trigger_type,
  ph.work_order_id,
  wo.title as work_order_title,
  wo.status as work_order_status,
  ph.scheduled_date,
  ph.completed_date,
  ph.completed_by,
  ph.actual_hours,
  ph.cost,
  ph.notes,
  ph.created_at
from app.pm_history ph
join app.pm_schedules ps on ph.pm_schedule_id = ps.id
left join app.work_orders wo on ph.work_order_id = wo.id
where ph.tenant_id = authz.get_current_tenant_id();

comment on view public.v_pm_history is 
  'PM execution history for current tenant. Includes PM details, work order details, completion info. Clients must set tenant context via rpc_set_tenant_context.';

grant select on public.v_pm_history to anon;
grant select on public.v_pm_history to authenticated;

-- Set security_invoker = false for performance optimization
-- Views run with owner privileges rather than invoker privileges
alter view public.v_asset_meters set (security_invoker = false);
alter view public.v_meter_readings set (security_invoker = false);
alter view public.v_pm_schedules set (security_invoker = false);
alter view public.v_pm_templates set (security_invoker = false);
alter view public.v_due_pms set (security_invoker = false);
alter view public.v_overdue_pms set (security_invoker = false);
alter view public.v_upcoming_pms set (security_invoker = false);
alter view public.v_pm_history set (security_invoker = false);

-- ============================================================================
-- RLS Policies
-- ============================================================================

-- Asset meters policies
create policy asset_meters_select_authenticated
  on app.asset_meters
  for select
  to authenticated
  using (
    tenant_id in (
      select tenant_id
      from app.tenant_memberships
      where user_id = (select auth.uid())
    )
  );

create policy asset_meters_select_anon
  on app.asset_meters
  for select
  to anon
  using (false);

create policy asset_meters_insert_authenticated
  on app.asset_meters
  for insert
  to authenticated
  with check (
    tenant_id in (
      select tenant_id
      from app.tenant_memberships
      where user_id = (select auth.uid())
    )
  );

create policy asset_meters_insert_anon
  on app.asset_meters
  for insert
  to anon
  with check (false);

create policy asset_meters_update_authenticated
  on app.asset_meters
  for update
  to authenticated
  using (
    tenant_id in (
      select tenant_id
      from app.tenant_memberships
      where user_id = (select auth.uid())
    )
  )
  with check (
    tenant_id in (
      select tenant_id
      from app.tenant_memberships
      where user_id = (select auth.uid())
    )
  );

create policy asset_meters_update_anon
  on app.asset_meters
  for update
  to anon
  using (false)
  with check (false);

create policy asset_meters_delete_authenticated
  on app.asset_meters
  for delete
  to authenticated
  using (
    tenant_id in (
      select tenant_id
      from app.tenant_memberships
      where user_id = (select auth.uid())
    )
  );

create policy asset_meters_delete_anon
  on app.asset_meters
  for delete
  to anon
  using (false);

-- Meter readings policies
create policy meter_readings_select_authenticated
  on app.meter_readings
  for select
  to authenticated
  using (
    tenant_id in (
      select tenant_id
      from app.tenant_memberships
      where user_id = (select auth.uid())
    )
  );

create policy meter_readings_select_anon
  on app.meter_readings
  for select
  to anon
  using (false);

create policy meter_readings_insert_authenticated
  on app.meter_readings
  for insert
  to authenticated
  with check (
    tenant_id in (
      select tenant_id
      from app.tenant_memberships
      where user_id = (select auth.uid())
    )
  );

create policy meter_readings_insert_anon
  on app.meter_readings
  for insert
  to anon
  with check (false);

create policy meter_readings_update_authenticated
  on app.meter_readings
  for update
  to authenticated
  using (
    tenant_id in (
      select tenant_id
      from app.tenant_memberships
      where user_id = (select auth.uid())
    )
  )
  with check (
    tenant_id in (
      select tenant_id
      from app.tenant_memberships
      where user_id = (select auth.uid())
    )
  );

create policy meter_readings_update_anon
  on app.meter_readings
  for update
  to anon
  using (false)
  with check (false);

create policy meter_readings_delete_authenticated
  on app.meter_readings
  for delete
  to authenticated
  using (
    tenant_id in (
      select tenant_id
      from app.tenant_memberships
      where user_id = (select auth.uid())
    )
  );

create policy meter_readings_delete_anon
  on app.meter_readings
  for delete
  to anon
  using (false);

-- PM templates policies
create policy pm_templates_select_authenticated
  on cfg.pm_templates
  for select
  to authenticated
  using (
    tenant_id in (
      select tenant_id
      from app.tenant_memberships
      where user_id = (select auth.uid())
    )
  );

create policy pm_templates_select_anon
  on cfg.pm_templates
  for select
  to anon
  using (false);

create policy pm_templates_insert_authenticated
  on cfg.pm_templates
  for insert
  to authenticated
  with check (
    tenant_id in (
      select tenant_id
      from app.tenant_memberships
      where user_id = (select auth.uid())
    )
    and authz.has_permission(auth.uid(), tenant_id, 'tenant.admin')
  );

create policy pm_templates_insert_anon
  on cfg.pm_templates
  for insert
  to anon
  with check (false);

create policy pm_templates_update_authenticated
  on cfg.pm_templates
  for update
  to authenticated
  using (
    tenant_id in (
      select tenant_id
      from app.tenant_memberships
      where user_id = (select auth.uid())
    )
    and authz.has_permission(auth.uid(), tenant_id, 'tenant.admin')
  )
  with check (
    tenant_id in (
      select tenant_id
      from app.tenant_memberships
      where user_id = (select auth.uid())
    )
    and authz.has_permission(auth.uid(), tenant_id, 'tenant.admin')
  );

create policy pm_templates_update_anon
  on cfg.pm_templates
  for update
  to anon
  using (false)
  with check (false);

create policy pm_templates_delete_authenticated
  on cfg.pm_templates
  for delete
  to authenticated
  using (
    tenant_id in (
      select tenant_id
      from app.tenant_memberships
      where user_id = (select auth.uid())
    )
    and authz.has_permission(auth.uid(), tenant_id, 'tenant.admin')
  );

create policy pm_templates_delete_anon
  on cfg.pm_templates
  for delete
  to anon
  using (false);

-- PM template checklist items policies
create policy pm_template_checklist_items_select_authenticated
  on cfg.pm_template_checklist_items
  for select
  to authenticated
  using (
    template_id in (
      select id
      from cfg.pm_templates
      where tenant_id in (
        select tenant_id
        from app.tenant_memberships
        where user_id = (select auth.uid())
      )
    )
  );

create policy pm_template_checklist_items_select_anon
  on cfg.pm_template_checklist_items
  for select
  to anon
  using (false);

create policy pm_template_checklist_items_insert_authenticated
  on cfg.pm_template_checklist_items
  for insert
  to authenticated
  with check (
    template_id in (
      select id
      from cfg.pm_templates
      where tenant_id in (
        select tenant_id
        from app.tenant_memberships
        where user_id = (select auth.uid())
      )
    )
  );

create policy pm_template_checklist_items_insert_anon
  on cfg.pm_template_checklist_items
  for insert
  to anon
  with check (false);

create policy pm_template_checklist_items_update_authenticated
  on cfg.pm_template_checklist_items
  for update
  to authenticated
  using (
    template_id in (
      select id
      from cfg.pm_templates
      where tenant_id in (
        select tenant_id
        from app.tenant_memberships
        where user_id = (select auth.uid())
      )
    )
  )
  with check (
    template_id in (
      select id
      from cfg.pm_templates
      where tenant_id in (
        select tenant_id
        from app.tenant_memberships
        where user_id = (select auth.uid())
      )
    )
  );

create policy pm_template_checklist_items_update_anon
  on cfg.pm_template_checklist_items
  for update
  to anon
  using (false)
  with check (false);

create policy pm_template_checklist_items_delete_authenticated
  on cfg.pm_template_checklist_items
  for delete
  to authenticated
  using (
    template_id in (
      select id
      from cfg.pm_templates
      where tenant_id in (
        select tenant_id
        from app.tenant_memberships
        where user_id = (select auth.uid())
      )
    )
  );

create policy pm_template_checklist_items_delete_anon
  on cfg.pm_template_checklist_items
  for delete
  to anon
  using (false);

-- PM schedules policies
create policy pm_schedules_select_authenticated
  on app.pm_schedules
  for select
  to authenticated
  using (
    tenant_id in (
      select tenant_id
      from app.tenant_memberships
      where user_id = (select auth.uid())
    )
  );

create policy pm_schedules_select_anon
  on app.pm_schedules
  for select
  to anon
  using (false);

create policy pm_schedules_insert_authenticated
  on app.pm_schedules
  for insert
  to authenticated
  with check (
    tenant_id in (
      select tenant_id
      from app.tenant_memberships
      where user_id = (select auth.uid())
    )
  );

create policy pm_schedules_insert_anon
  on app.pm_schedules
  for insert
  to anon
  with check (false);

create policy pm_schedules_update_authenticated
  on app.pm_schedules
  for update
  to authenticated
  using (
    tenant_id in (
      select tenant_id
      from app.tenant_memberships
      where user_id = (select auth.uid())
    )
  )
  with check (
    tenant_id in (
      select tenant_id
      from app.tenant_memberships
      where user_id = (select auth.uid())
    )
  );

create policy pm_schedules_update_anon
  on app.pm_schedules
  for update
  to anon
  using (false)
  with check (false);

create policy pm_schedules_delete_authenticated
  on app.pm_schedules
  for delete
  to authenticated
  using (
    tenant_id in (
      select tenant_id
      from app.tenant_memberships
      where user_id = (select auth.uid())
    )
  );

create policy pm_schedules_delete_anon
  on app.pm_schedules
  for delete
  to anon
  using (false);

-- PM history policies
create policy pm_history_select_authenticated
  on app.pm_history
  for select
  to authenticated
  using (
    tenant_id in (
      select tenant_id
      from app.tenant_memberships
      where user_id = (select auth.uid())
    )
  );

create policy pm_history_select_anon
  on app.pm_history
  for select
  to anon
  using (false);

create policy pm_history_insert_authenticated
  on app.pm_history
  for insert
  to authenticated
  with check (
    tenant_id in (
      select tenant_id
      from app.tenant_memberships
      where user_id = (select auth.uid())
    )
  );

create policy pm_history_insert_anon
  on app.pm_history
  for insert
  to anon
  with check (false);

create policy pm_history_update_authenticated
  on app.pm_history
  for update
  to authenticated
  using (
    tenant_id in (
      select tenant_id
      from app.tenant_memberships
      where user_id = (select auth.uid())
    )
  )
  with check (
    tenant_id in (
      select tenant_id
      from app.tenant_memberships
      where user_id = (select auth.uid())
    )
  );

create policy pm_history_update_anon
  on app.pm_history
  for update
  to anon
  using (false)
  with check (false);

create policy pm_history_delete_authenticated
  on app.pm_history
  for delete
  to authenticated
  using (
    tenant_id in (
      select tenant_id
      from app.tenant_memberships
      where user_id = (select auth.uid())
    )
  );

create policy pm_history_delete_anon
  on app.pm_history
  for delete
  to anon
  using (false);

-- PM dependencies policies
create policy pm_dependencies_select_authenticated
  on app.pm_dependencies
  for select
  to authenticated
  using (
    tenant_id in (
      select tenant_id
      from app.tenant_memberships
      where user_id = (select auth.uid())
    )
  );

create policy pm_dependencies_select_anon
  on app.pm_dependencies
  for select
  to anon
  using (false);

create policy pm_dependencies_insert_authenticated
  on app.pm_dependencies
  for insert
  to authenticated
  with check (
    tenant_id in (
      select tenant_id
      from app.tenant_memberships
      where user_id = (select auth.uid())
    )
  );

create policy pm_dependencies_insert_anon
  on app.pm_dependencies
  for insert
  to anon
  with check (false);

create policy pm_dependencies_update_authenticated
  on app.pm_dependencies
  for update
  to authenticated
  using (
    tenant_id in (
      select tenant_id
      from app.tenant_memberships
      where user_id = (select auth.uid())
    )
  )
  with check (
    tenant_id in (
      select tenant_id
      from app.tenant_memberships
      where user_id = (select auth.uid())
    )
  );

create policy pm_dependencies_update_anon
  on app.pm_dependencies
  for update
  to anon
  using (false)
  with check (false);

create policy pm_dependencies_delete_authenticated
  on app.pm_dependencies
  for delete
  to authenticated
  using (
    tenant_id in (
      select tenant_id
      from app.tenant_memberships
      where user_id = (select auth.uid())
    )
  );

create policy pm_dependencies_delete_anon
  on app.pm_dependencies
  for delete
  to anon
  using (false);
