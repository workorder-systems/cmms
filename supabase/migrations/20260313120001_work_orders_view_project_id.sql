-- SPDX-License-Identifier: AGPL-3.0-or-later
--
-- Expose work_orders.project_id in v_work_orders and add p_project_id to rpc_create_work_order.
-- Enables cost roll-up by project and project assignment when creating work orders.
--
-- Affected: public.v_work_orders (add project_id column), public.rpc_create_work_order (add p_project_id).

-- ============================================================================
-- 1. v_work_orders: add project_id at end so create or replace is valid
-- ============================================================================

create or replace view public.v_work_orders
with (security_invoker = true)
as
select
  wo.id,
  wo.tenant_id,
  wo.title,
  wo.description,
  wo.status,
  wo.priority,
  wo.maintenance_type,
  wo.assigned_to,
  p_assigned.full_name as assigned_to_name,
  wo.location_id,
  wo.asset_id,
  wo.pm_schedule_id,
  wo.due_date,
  wo.completed_at,
  wo.completed_by,
  p_completed.full_name as completed_by_name,
  wo.cause,
  wo.resolution,
  wo.created_at,
  wo.updated_at,
  coalesce(
    (
      select sum(tote.minutes)
      from app.work_order_time_entries tote
      where tote.work_order_id = wo.id
        and tote.tenant_id = wo.tenant_id
    ),
    0
  ) as total_labor_minutes,
  wo.project_id
from app.work_orders wo
left join app.profiles p_assigned
  on p_assigned.user_id = wo.assigned_to
  and p_assigned.tenant_id = wo.tenant_id
left join app.profiles p_completed
  on p_completed.user_id = wo.completed_by
  and p_completed.tenant_id = wo.tenant_id
where wo.tenant_id = authz.get_current_tenant_id();

comment on view public.v_work_orders is
  'Work orders view scoped to the current tenant context. Includes project_id for cost roll-up and cause/resolution for completed work orders.';

-- ============================================================================
-- 2. rpc_create_work_order: add p_project_id, validate and insert
-- ============================================================================

drop function if exists public.rpc_create_work_order(uuid, text, text, text, text, uuid, uuid, uuid, timestamptz, uuid);

create or replace function public.rpc_create_work_order(
  p_tenant_id uuid,
  p_title text,
  p_description text default null,
  p_priority text default 'medium',
  p_maintenance_type text default null,
  p_assigned_to uuid default null,
  p_location_id uuid default null,
  p_asset_id uuid default null,
  p_due_date timestamptz default null,
  p_pm_schedule_id uuid default null,
  p_project_id uuid default null
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
  v_pm_schedule_tenant_id uuid;
  v_pm_schedule_is_active boolean;
  v_project_tenant_id uuid;
begin
  perform util.check_rate_limit('work_order_create', null, 10, 1, auth.uid(), p_tenant_id);

  v_user_id := authz.rpc_setup(p_tenant_id, 'workorder.create');

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

  if p_pm_schedule_id is not null then
    select tenant_id, is_active into v_pm_schedule_tenant_id, v_pm_schedule_is_active
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

    if not v_pm_schedule_is_active then
      raise exception using
        message = 'PM schedule is not active',
        errcode = '23503';
    end if;
  end if;

  if p_project_id is not null then
    select tenant_id into v_project_tenant_id from app.projects where id = p_project_id;
    if not found then
      raise exception using
        message = format('Project %s not found', p_project_id),
        errcode = 'P0001';
    end if;
    perform util.validate_tenant_match(p_tenant_id, v_project_tenant_id, 'Project');
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
    status,
    pm_schedule_id,
    project_id
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
    v_initial_status,
    p_pm_schedule_id,
    p_project_id
  )
  returning id into v_work_order_id;

  return v_work_order_id;
end;
$$;

comment on function public.rpc_create_work_order(uuid, text, text, text, text, uuid, uuid, uuid, timestamptz, uuid, uuid) is
  'Creates a new work order. Accepts optional project_id for cost roll-up. Validates project belongs to tenant.';

revoke all on function public.rpc_create_work_order(uuid, text, text, text, text, uuid, uuid, uuid, timestamptz, uuid, uuid) from public;
grant execute on function public.rpc_create_work_order(uuid, text, text, text, text, uuid, uuid, uuid, timestamptz, uuid, uuid) to authenticated;
