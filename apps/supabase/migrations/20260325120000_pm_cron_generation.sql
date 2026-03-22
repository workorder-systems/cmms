/*
 * migration: 20260325120000_pm_cron_generation.sql
 *
 * purpose:
 *   - add app.insert_work_order_for_pm_schedule: create pm-linked work orders without jwt (no rpc_create_work_order).
 *   - refactor pm.generate_pm_work_order to use it (meter/manual/rpc_generate_due_pms unchanged at call sites).
 *   - add public.rpc_process_due_pm_generation for pg_cron: all tenants, open-wo dedupe for calendar-like schedules.
 *
 * affected: app.insert_work_order_for_pm_schedule (new), pm.generate_pm_work_order, pm.is_pm_due (calendar date fix),
 *   public.rpc_process_due_pm_generation (new), cron.job
 */

-- ============================================================================
-- 1. internal insert for pm-generated work orders (postgres only; no jwt)
-- ============================================================================

create or replace function app.insert_work_order_for_pm_schedule(
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
  v_initial_status text;
  v_title text;
  v_description text;
  v_priority text;
  v_maintenance_type text;
  v_assigned_to uuid := null;
  v_location_id uuid := null;
  v_due_date timestamptz := null;
begin
  select * into v_pm_schedule
  from app.pm_schedules
  where id = p_pm_schedule_id;

  if not found then
    raise exception using
      message = format('PM schedule %s not found', p_pm_schedule_id),
      errcode = 'P0001';
  end if;

  if not v_pm_schedule.is_active then
    raise exception using
      message = 'PM schedule is not active',
      errcode = '23503';
  end if;

  if not pm.check_pm_dependencies(p_pm_schedule_id) then
    raise exception using
      message = 'PM dependencies not satisfied',
      errcode = '23503';
  end if;

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

  if v_pm_schedule.trigger_type = 'time' then
    v_maintenance_type := 'preventive_time';
  elsif v_pm_schedule.trigger_type = 'usage' then
    v_maintenance_type := 'preventive_usage';
  else
    v_maintenance_type := 'preventive_time';
  end if;

  if not exists (
    select 1
    from cfg.priority_catalogs
    where tenant_id = v_pm_schedule.tenant_id
      and entity_type = 'work_order'
      and key = v_priority
  ) then
    raise exception using
      message = format('Invalid priority: %s', v_priority),
      errcode = '23503';
  end if;

  if v_maintenance_type is not null then
    if not exists (
      select 1
      from cfg.maintenance_type_catalogs
      where tenant_id = v_pm_schedule.tenant_id
        and entity_type = 'work_order'
        and key = v_maintenance_type
    ) then
      raise exception using
        message = format('Invalid maintenance type: %s', v_maintenance_type),
        errcode = '23503';
    end if;
  end if;

  v_initial_status := cfg.get_default_status(
    v_pm_schedule.tenant_id,
    'work_order',
    pg_catalog.jsonb_build_object('assigned_to', v_assigned_to)
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
    v_pm_schedule.tenant_id,
    v_title,
    v_description,
    v_priority,
    v_maintenance_type,
    v_assigned_to,
    v_location_id,
    v_pm_schedule.asset_id,
    v_due_date,
    v_initial_status,
    p_pm_schedule_id,
    null::uuid
  )
  returning id into v_work_order_id;

  update app.pm_schedules
  set
    last_work_order_id = v_work_order_id,
    updated_at = pg_catalog.now()
  where id = p_pm_schedule_id;

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

comment on function app.insert_work_order_for_pm_schedule(uuid) is
  'Creates a work order for a PM schedule without JWT (catalog + default status validation only). Used by pm.generate_pm_work_order and pg_cron.';

revoke all on function app.insert_work_order_for_pm_schedule(uuid) from public;
grant execute on function app.insert_work_order_for_pm_schedule(uuid) to postgres;

-- ============================================================================
-- 2. pm.generate_pm_work_order: delegate to internal insert
-- ============================================================================

create or replace function pm.generate_pm_work_order(
  p_pm_schedule_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  return app.insert_work_order_for_pm_schedule(p_pm_schedule_id);
end;
$$;

comment on function pm.generate_pm_work_order(uuid) is
  'Generates work order from PM schedule via app.insert_work_order_for_pm_schedule (no rpc_create_work_order; safe under pg_cron).';

-- ============================================================================
-- 3. cron processor: due schedules, skip if non-final WO already exists
-- ============================================================================

create or replace function public.rpc_process_due_pm_generation(
  p_limit integer default 200
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pm_schedule app.pm_schedules%rowtype;
  v_generated_count integer := 0;
begin
  if p_limit is null or p_limit < 1 then
    p_limit := 200;
  end if;

  for v_pm_schedule in
    select ps.*
    from app.pm_schedules ps
    where ps.is_active = true
      and ps.auto_generate = true
      and ps.next_due_date is not null
      and ps.next_due_date <= pg_catalog.now()
      and pm.is_pm_due(ps)
      and not exists (
        select 1
        from app.work_orders wo
        join cfg.status_catalogs sc
          on sc.tenant_id = wo.tenant_id
         and sc.entity_type = 'work_order'
         and sc.key = wo.status
        where wo.pm_schedule_id = ps.id
          and coalesce(sc.is_final, false) = false
      )
    order by ps.next_due_date asc
    limit p_limit
  loop
    if pm.check_pm_dependencies(v_pm_schedule.id) then
      perform pm.generate_pm_work_order(v_pm_schedule.id);
      v_generated_count := v_generated_count + 1;
    end if;
  end loop;

  return v_generated_count;
end;
$$;

comment on function public.rpc_process_due_pm_generation(integer) is
  'pg_cron: generates work orders for due PM schedules across all tenants. Skips when an open (non-final status) WO already exists for the schedule. Grant: postgres only.';

revoke all on function public.rpc_process_due_pm_generation(integer) from public;
grant execute on function public.rpc_process_due_pm_generation(integer) to postgres;

-- ============================================================================
-- 4. schedule pg_cron (replace same job name if re-run)
-- ============================================================================

do $cron$
declare
  jid bigint;
begin
  for jid in
    select j.jobid
    from cron.job j
    where j.jobname = 'process_due_pm_generation'
  loop
    perform cron.unschedule(jid);
  end loop;
end
$cron$;

select cron.schedule(
  'process_due_pm_generation',
  '*/15 * * * *',
  $$select public.rpc_process_due_pm_generation()$$
);

-- ============================================================================
-- 5. pm.is_pm_due: calendar branch — pg_catalog.current_date is invalid under
--    empty search_path (current_date is a sql keyword, not pg_catalog).
-- ============================================================================

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
    v_is_due := p_pm_schedule.next_due_date is not null
      and p_pm_schedule.next_due_date::date <= (pg_catalog.now())::date;

  elsif p_pm_schedule.trigger_type = 'condition' then
    v_is_due := false;

  elsif p_pm_schedule.trigger_type = 'manual' then
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
  'Checks if PM is currently due based on trigger_type. Calendar compares next_due_date date to current date (pg_catalog.now()::date).';

revoke all on function pm.is_pm_due(app.pm_schedules) from public;
grant execute on function pm.is_pm_due(app.pm_schedules) to authenticated;
grant execute on function pm.is_pm_due(app.pm_schedules) to anon;
