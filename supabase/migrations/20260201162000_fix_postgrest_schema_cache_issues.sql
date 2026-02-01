-- ============================================================================
-- Fix PostgREST Schema Cache Issues
-- ============================================================================
-- Purpose: Ensures PostgREST can properly discover and cache:
-- 1. rpc_register_plugin function (service_role only)
-- 2. v_pm_template_checklist_items view
-- 3. Proper function signatures for all RPCs
--
-- These fixes address "No suitable key or wrong key type" and 
-- "Could not find the table in the schema cache" errors.
-- ============================================================================

-- ============================================================================
-- Force PostgREST to recognize rpc_register_plugin
-- ============================================================================
-- Drop and recreate to ensure PostgREST picks it up
-- Explicitly set all parameters and return type

drop function if exists public.rpc_register_plugin(text, text, text, boolean, boolean);

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
  -- Input validation
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

  -- Access internal schema (int.plugins) - this is the public wrapper pattern
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

-- Ensure proper grants (service_role only, not authenticated)
revoke all on function public.rpc_register_plugin(text, text, text, boolean, boolean) from public;
grant execute on function public.rpc_register_plugin(text, text, text, boolean, boolean) to service_role;
grant execute on function public.rpc_register_plugin(text, text, text, boolean, boolean) to postgres;

-- ============================================================================
-- Ensure v_pm_template_checklist_items view is properly created and discoverable
-- ============================================================================
-- Drop and recreate to ensure PostgREST picks it up
-- Use CREATE OR REPLACE to ensure it's always available

drop view if exists public.v_pm_template_checklist_items cascade;

create or replace view public.v_pm_template_checklist_items as
select
  ci.id,
  ci.template_id,
  pt.tenant_id,
  ci.description,
  ci.required,
  ci.display_order,
  ci.created_at
from cfg.pm_template_checklist_items ci
join cfg.pm_templates pt on ci.template_id = pt.id
where pt.tenant_id = authz.get_current_tenant_id()
order by ci.display_order asc;

comment on view public.v_pm_template_checklist_items is
  'PM template checklist items for current tenant. Read-only view following ADR 0001 (public views for reads). Clients must set tenant context via rpc_set_tenant_context. Items are ordered by display_order.';

grant select on public.v_pm_template_checklist_items to authenticated;
grant select on public.v_pm_template_checklist_items to anon;

-- Set security_invoker = false for performance (view runs with owner privileges)
-- This is safe because the WHERE clause filters by tenant_id from authz.get_current_tenant_id()
alter view public.v_pm_template_checklist_items set (security_invoker = false);

-- ============================================================================
-- Ensure rpc_update_pm_schedule properly recalculates next_due_date
-- ============================================================================
-- Fix the logic to ensure next_due_date is recalculated when trigger_config changes
-- This fixes the is_overdue test

create or replace function public.rpc_update_pm_schedule(
  p_tenant_id uuid,
  p_pm_schedule_id uuid,
  p_title text default null,
  p_description text default null,
  p_trigger_config jsonb default null,
  p_auto_generate boolean default null,
  p_is_active boolean default null,
  p_estimated_hours numeric default null,
  p_wo_title text default null,
  p_wo_description text default null,
  p_wo_priority text default null,
  p_wo_estimated_hours numeric default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_pm_schedule_tenant_id uuid;
  v_trigger_type text;
  v_pm_schedule app.pm_schedules%rowtype;
  v_wo_title text;
  v_wo_description text;
  v_wo_priority text;
  v_wo_estimated_hours numeric;
  v_new_next_due_date timestamptz;
begin
  perform util.check_rate_limit('pm_schedule_update', null, 20, 1, auth.uid(), p_tenant_id);
  
  v_user_id := authz.rpc_setup(p_tenant_id, 'workorder.create');

  -- Validate PM schedule belongs to tenant
  select tenant_id, trigger_type into v_pm_schedule_tenant_id, v_trigger_type
  from app.pm_schedules
  where id = p_pm_schedule_id;

  if not found then
    raise exception using
      message = format('PM schedule %s not found', p_pm_schedule_id),
      errcode = 'P0001';
  end if;

  if v_pm_schedule_tenant_id != p_tenant_id then
    raise exception using
      message = 'Unauthorized: PM schedule does not belong to this tenant',
      errcode = '42501';
  end if;

  -- Validate title length if provided
  if p_title is not null and (length(p_title) < 1 or length(p_title) > 500) then
    raise exception using
      message = 'PM schedule title must be between 1 and 500 characters',
      errcode = '23514';
  end if;

  -- Validate trigger_config if provided
  if p_trigger_config is not null then
    perform pm.validate_trigger_config(v_trigger_type, p_trigger_config);
  end if;

  -- Use structured parameters
  v_wo_title := p_wo_title;
  v_wo_description := p_wo_description;
  v_wo_priority := p_wo_priority;
  v_wo_estimated_hours := coalesce(p_wo_estimated_hours, p_estimated_hours);

  -- Validate wo_priority if provided
  if v_wo_priority is not null then
    if not exists (
      select 1
      from cfg.priority_catalogs
      where tenant_id = p_tenant_id
        and entity_type = 'work_order'
        and key = v_wo_priority
    ) then
      raise exception using
        message = format('Invalid priority: %s. Priority must exist in tenant priority catalog for work_order entity type.', v_wo_priority),
        errcode = '23503';
    end if;
  end if;

  -- Get current PM schedule for recalculation
  select * into v_pm_schedule
  from app.pm_schedules
  where id = p_pm_schedule_id;

  -- Update PM schedule
  update app.pm_schedules
  set
    title = coalesce(p_title, title),
    description = coalesce(p_description, description),
    trigger_config = coalesce(p_trigger_config, trigger_config),
    wo_title = coalesce(v_wo_title, wo_title),
    wo_description = coalesce(v_wo_description, wo_description),
    wo_priority = coalesce(v_wo_priority, wo_priority),
    wo_estimated_hours = coalesce(v_wo_estimated_hours, wo_estimated_hours),
    auto_generate = coalesce(p_auto_generate, auto_generate),
    is_active = coalesce(p_is_active, is_active),
    updated_at = pg_catalog.now()
  where id = p_pm_schedule_id;

  -- Recalculate next_due_date if trigger_config changed
  -- IMPORTANT: Always recalculate if trigger_config was provided, even if it's the same
  -- This ensures next_due_date is properly set based on the current trigger_config
  if p_trigger_config is not null then
    -- Get updated schedule
    select * into v_pm_schedule
    from app.pm_schedules
    where id = p_pm_schedule_id;

    -- Recalculate next_due_date using the updated trigger_config
    v_new_next_due_date := pm.calculate_next_due_date(
      v_pm_schedule,
      v_pm_schedule.last_completed_at
    );

    update app.pm_schedules
    set
      next_due_date = v_new_next_due_date,
      updated_at = pg_catalog.now()
    where id = p_pm_schedule_id;
  end if;
end;
$$;

comment on function public.rpc_update_pm_schedule(uuid, uuid, text, text, jsonb, boolean, boolean, numeric, text, text, text, numeric) is 
  'Updates PM schedule. Recalculates next_due_date if trigger_config is provided (even if unchanged). Accepts structured wo_* parameters and p_estimated_hours for backward compatibility. Requires workorder.create permission. Rate limited to 20 requests per minute per user.';

revoke all on function public.rpc_update_pm_schedule(uuid, uuid, text, text, jsonb, boolean, boolean, numeric, text, text, text, numeric) from public;
grant execute on function public.rpc_update_pm_schedule(uuid, uuid, text, text, jsonb, boolean, boolean, numeric, text, text, text, numeric) to authenticated;
