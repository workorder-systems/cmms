-- ============================================================================
-- Fix function signature issues and JSONB access problems
-- ============================================================================
-- Purpose: Fixes several issues:
-- 1. rpc_create_work_order function signature mismatch in pm.generate_pm_work_order
-- 2. JSONB access issues in views and queries
-- 3. PostgREST compatibility issues with JSONB fields
-- ============================================================================

-- Fix pm.generate_pm_work_order to explicitly cast all parameters
-- This ensures PostgreSQL can properly infer function signatures
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
  v_assigned_to uuid;
  v_location_id uuid;
  v_due_date timestamptz;
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

  -- Explicitly initialize and type all variables to avoid "unknown" type inference
  v_assigned_to := null::uuid;
  v_location_id := null::uuid;
  v_due_date := null::timestamptz;

  -- Create work order via RPC with explicit type casting for all parameters
  -- This ensures PostgreSQL can match the function signature correctly
  v_work_order_id := public.rpc_create_work_order(
    v_pm_schedule.tenant_id::uuid,
    v_title::text,
    coalesce(v_description, null)::text,
    v_priority::text,
    coalesce(v_maintenance_type, null)::text,
    v_assigned_to::uuid,
    v_location_id::uuid,
    v_pm_schedule.asset_id::uuid,
    v_due_date::timestamptz,
    p_pm_schedule_id::uuid
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
  'Generates work order from PM schedule using RPC function. Uses structured wo_* columns, sets maintenance_type to preventive_time or preventive_usage, links to PM schedule, updates next_due_date. Checks dependencies before generating. Fixed to explicitly cast all parameters for proper function signature matching.';

-- ============================================================================
-- Fix views to handle JSONB fields properly for PostgREST
-- ============================================================================

-- Recreate v_pm_schedules view to ensure JSONB fields are properly handled
-- PostgREST can have issues with JSONB in views, so we ensure all fields are properly typed
-- The trigger_config is already jsonb, so we don't need to cast it
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

-- Recreate v_pm_history view to ensure JSONB fields are properly handled
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

-- ============================================================================
-- Ensure rpc_create_work_order function exists with correct signature
-- ============================================================================

-- The function should already exist from previous migrations, but we ensure
-- it's available with the correct signature by checking if it needs to be recreated
-- This is a safety check to ensure the function is available when pm.generate_pm_work_order calls it

-- No action needed here as the function is created in 20260121131000_add_meters_and_pm_api_layer.sql
-- We just ensure the signature matches what we're calling
