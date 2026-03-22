/*
 * migration: 20260326100000_schedule_validate_availability_skills_crew_sla.sql
 *
 * purpose: deepen public.rpc_validate_schedule (availability patterns/overrides,
 *   asset-required skills vs technician_skills, crew member checks, sla_resolution/response due).
 *   add app.asset_required_skills for skill gap detection when scheduling against a work order asset.
 */

-- ============================================================================
-- 1. asset_required_skills (optional skills needed for work on an asset)
-- ============================================================================

create table app.asset_required_skills (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  asset_id uuid not null references app.assets(id) on delete cascade,
  skill_id uuid not null references cfg.skill_catalogs(id) on delete cascade,
  created_at timestamptz not null default pg_catalog.now(),
  constraint asset_required_skills_asset_skill_unique unique (asset_id, skill_id)
);

comment on table app.asset_required_skills is
  'Skills recommended or required for work on an asset. Used by rpc_validate_schedule when a work order has an asset.';

create index asset_required_skills_tenant_asset_idx on app.asset_required_skills (tenant_id, asset_id);
create index asset_required_skills_skill_idx on app.asset_required_skills (skill_id);

alter table app.asset_required_skills enable row level security;

create or replace function util.validate_asset_required_skills_tenant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_asset_tenant uuid;
  v_skill_tenant uuid;
begin
  select tenant_id into v_asset_tenant from app.assets where id = new.asset_id;
  if v_asset_tenant is null or v_asset_tenant <> new.tenant_id then
    raise exception using message = 'asset tenant must match row tenant_id', errcode = '23503';
  end if;
  select tenant_id into v_skill_tenant from cfg.skill_catalogs where id = new.skill_id;
  if v_skill_tenant is null or v_skill_tenant <> new.tenant_id then
    raise exception using message = 'skill catalog tenant must match row tenant_id', errcode = '23503';
  end if;
  return new;
end;
$$;

revoke all on function util.validate_asset_required_skills_tenant() from public;
grant execute on function util.validate_asset_required_skills_tenant() to postgres;

create trigger asset_required_skills_validate_tenant
  before insert or update on app.asset_required_skills
  for each row
  execute function util.validate_asset_required_skills_tenant();

create policy asset_required_skills_select_tenant on app.asset_required_skills
  for select to authenticated
  using (authz.is_current_user_tenant_member(tenant_id));

create policy asset_required_skills_select_anon on app.asset_required_skills
  for select to anon
  using (false);

create policy asset_required_skills_insert_tenant on app.asset_required_skills
  for insert to authenticated
  with check (authz.is_current_user_tenant_member(tenant_id));

create policy asset_required_skills_insert_anon on app.asset_required_skills
  for insert to anon
  with check (false);

create policy asset_required_skills_update_tenant on app.asset_required_skills
  for update to authenticated
  using (authz.is_current_user_tenant_member(tenant_id))
  with check (authz.is_current_user_tenant_member(tenant_id));

create policy asset_required_skills_update_anon on app.asset_required_skills
  for update to anon
  using (false)
  with check (false);

create policy asset_required_skills_delete_tenant on app.asset_required_skills
  for delete to authenticated
  using (authz.is_current_user_tenant_member(tenant_id));

create policy asset_required_skills_delete_anon on app.asset_required_skills
  for delete to anon
  using (false);

comment on policy asset_required_skills_select_tenant on app.asset_required_skills is
  'Tenant members can list required skills for assets in their tenants.';

grant select, insert, update, delete on app.asset_required_skills to authenticated;
alter table app.asset_required_skills force row level security;

-- ============================================================================
-- 2. rpc_validate_schedule (availability, skills, crew aggregation, sla columns)
-- ============================================================================

create or replace function public.rpc_validate_schedule(
  p_technician_id uuid default null,
  p_crew_id uuid default null,
  p_start_at timestamptz default null,
  p_end_at timestamptz default null,
  p_work_order_id uuid default null,
  p_exclude_block_id uuid default null
)
returns table (
  check_type text,
  severity text,
  message text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tenant_id uuid;
  v_technician_id uuid;
  v_start timestamptz;
  v_end timestamptz;
  v_due_date timestamptz;
  v_priority text;
  v_sla_resp timestamptz;
  v_sla_res timestamptz;
  v_asset_id uuid;
  v_skill_name text;
  v_day date;
  v_seg_start timestamptz;
  v_seg_end timestamptz;
  v_dow double precision;
  v_has_patterns boolean;
  v_day_ok boolean;
  v_override record;
  v_crew_tenant uuid;
  v_member_count integer;
  v_row record;
  v_sub record;
begin
  if p_technician_id is null and p_crew_id is null then
    return;
  end if;

  if p_start_at is null or p_end_at is null or p_end_at <= p_start_at then
    check_type := 'input';
    severity := 'error';
    message := 'start_at and end_at must be set and end_at > start_at';
    return next;
    return;
  end if;

  v_start := p_start_at;
  v_end := p_end_at;

  /* ---------------------------------------------------------------------- */
  /* Crew path: validate each active member (cap 50 technicians)          */
  /* ---------------------------------------------------------------------- */
  if p_crew_id is not null and p_technician_id is null then
    select c.tenant_id into v_crew_tenant from app.crews c where c.id = p_crew_id;
    if v_crew_tenant is null then
      check_type := 'input';
      severity := 'error';
      message := 'Crew not found';
      return next;
      return;
    end if;
    if not authz.is_current_user_tenant_member(v_crew_tenant) then
      raise exception using message = 'Unauthorized: not a member of this tenant', errcode = '42501';
    end if;

    select count(*)::integer into v_member_count
    from app.crew_members cm
    where cm.crew_id = p_crew_id
      and cm.left_at is null;

    if v_member_count = 0 then
      check_type := 'crew';
      severity := 'warning';
      message := 'Crew has no active members';
      return next;
    end if;

    if v_member_count > 50 then
      check_type := 'crew';
      severity := 'info';
      message := 'Crew has more than 50 active members; validating first 50 only';
      return next;
    end if;

    for v_row in
      select cm.technician_id as tid
      from app.crew_members cm
      where cm.crew_id = p_crew_id
        and cm.left_at is null
      order by cm.id
      limit 50
    loop
      for v_sub in
        select * from public.rpc_validate_schedule(
          v_row.tid,
          null,
          v_start,
          v_end,
          p_work_order_id,
          p_exclude_block_id
        ) x
      loop
        check_type := v_sub.check_type || '_member';
        severity := v_sub.severity;
        message := format('[crew member] %s', v_sub.message);
        return next;
      end loop;
    end loop;

    return;
  end if;

  /* ---------------------------------------------------------------------- */
  /* Single technician (original + extensions)                             */
  /* ---------------------------------------------------------------------- */
  v_technician_id := p_technician_id;

  select t.tenant_id into v_tenant_id from app.technicians t where t.id = v_technician_id;
  if v_tenant_id is null then
    check_type := 'input';
    severity := 'error';
    message := 'Technician not found';
    return next;
    return;
  end if;
  if not authz.is_current_user_tenant_member(v_tenant_id) then
    raise exception using message = 'Unauthorized: not a member of this tenant', errcode = '42501';
  end if;

  /* Shift conflicts */
  if exists (
    select 1 from public.rpc_check_shift_conflicts(v_technician_id, v_start, v_end, null) c
  ) then
    check_type := 'conflict';
    severity := 'warning';
    message := 'Technician has overlapping shift(s) in this range';
    return next;
  end if;

  /* Other schedule blocks */
  if exists (
    select 1 from app.schedule_blocks sb
    where sb.technician_id = v_technician_id
      and (p_exclude_block_id is null or sb.id <> p_exclude_block_id)
      and tstzrange(sb.start_at, sb.end_at, '[)') && tstzrange(v_start, v_end, '[)')
  ) then
    check_type := 'conflict';
    severity := 'warning';
    message := 'Technician has overlapping schedule block(s) in this range';
    return next;
  end if;

  /* Availability: patterns + overrides (UTC calendar-day interpretation when timezone null) */
  select exists (
    select 1 from app.availability_patterns ap where ap.technician_id = v_technician_id
  ) into v_has_patterns;

  if not v_has_patterns then
    check_type := 'availability';
    severity := 'info';
    message := 'No weekly availability patterns defined for this technician; recurring availability not checked.';
    return next;
  else
  v_day := (v_start at time zone 'utc')::date;
  while v_day <= (v_end at time zone 'utc')::date loop
    v_seg_start := greatest(v_start, v_day::timestamptz);
    v_seg_end := least(v_end, (v_day + 1)::timestamptz);
    if v_seg_end <= v_seg_start then
      v_day := v_day + 1;
      continue;
    end if;

    select * into v_override
    from app.availability_overrides ao
    where ao.technician_id = v_technician_id
      and ao.override_date = v_day;

    if found and v_override.is_available = false then
      check_type := 'availability';
      severity := 'warning';
      message := format('Technician marked unavailable on %s (override)', v_day);
      return next;
    end if;

    if found and v_override.is_available = true
      and v_override.start_time is not null
      and v_override.end_time is not null
    then
      v_day_ok :=
        tstzrange(v_seg_start, v_seg_end, '[)') && tstzrange(
          (v_day::timestamp + v_override.start_time) at time zone 'utc',
          (v_day::timestamp + v_override.end_time) at time zone 'utc',
          '[)'
        );
      if not coalesce(v_day_ok, false) then
        check_type := 'availability';
        severity := 'warning';
        message := format('Slot outside override availability window on %s', v_day);
        return next;
      end if;
    elsif found and v_override.is_available = true then
      /* available all day — skip pattern check */
      null;
    else
      v_dow := extract(dow from v_day::timestamp);

      if not exists (
        select 1 from app.availability_patterns ap
        where ap.technician_id = v_technician_id
          and ap.day_of_week::double precision = v_dow
      ) then
        check_type := 'availability';
        severity := 'warning';
        message := format('No recurring availability for day_of_week on %s', v_day);
        return next;
      end if;

      select exists (
        select 1
        from app.availability_patterns ap
        where ap.technician_id = v_technician_id
          and ap.day_of_week::double precision = v_dow
          and tstzrange(v_seg_start, v_seg_end, '[)') && tstzrange(
            (v_day::timestamp + ap.start_time) at time zone coalesce(
              nullif(trim(ap.timezone), ''),
              'utc'
            ),
            (v_day::timestamp + ap.end_time) at time zone coalesce(
              nullif(trim(ap.timezone), ''),
              'utc'
            ),
            '[)'
          )
      ) into v_day_ok;

      if not coalesce(v_day_ok, false) then
        check_type := 'availability';
        severity := 'warning';
        message := format('Slot outside recurring availability on %s', v_day);
        return next;
      end if;
    end if;

    v_day := v_day + 1;
  end loop;
  end if;

  /* Work order: due date, SLA columns, asset skills */
  if p_work_order_id is not null then
    select
      wo.due_date,
      wo.priority,
      wo.sla_response_due_at,
      wo.sla_resolution_due_at,
      wo.asset_id
    into v_due_date, v_priority, v_sla_resp, v_sla_res, v_asset_id
    from app.work_orders wo
    where wo.id = p_work_order_id;

    if v_due_date is not null and v_end > v_due_date then
      check_type := 'sla';
      severity := 'breach';
      message := 'Scheduled end is after work order due date';
      return next;
    elsif v_due_date is not null and v_end > v_due_date - interval '2 hours' and v_end <= v_due_date then
      check_type := 'sla';
      severity := 'warning';
      message := 'Scheduled end is within 2 hours of due date';
      return next;
    end if;

    if v_sla_res is not null and v_end > v_sla_res then
      check_type := 'sla';
      severity := 'breach';
      message := 'Scheduled end is after SLA resolution due time';
      return next;
    elsif v_sla_res is not null and v_end > v_sla_res - interval '2 hours' and v_end <= v_sla_res then
      check_type := 'sla';
      severity := 'warning';
      message := 'Scheduled end is within 2 hours of SLA resolution due time';
      return next;
    end if;

    if v_sla_resp is not null and v_start > v_sla_resp then
      check_type := 'sla';
      severity := 'warning';
      message := 'Schedule starts after SLA response due time';
      return next;
    end if;

    if v_asset_id is not null then
      for v_skill_name in
        select sc.name
        from app.asset_required_skills ars
        join cfg.skill_catalogs sc on sc.id = ars.skill_id
        where ars.asset_id = v_asset_id
          and not exists (
            select 1
            from app.technician_skills ts
            where ts.technician_id = v_technician_id
              and ts.skill_id = ars.skill_id
          )
      loop
        check_type := 'skill';
        severity := 'warning';
        message := format('Technician missing required asset skill: %s', v_skill_name);
        return next;
      end loop;
    end if;

    if v_priority is not null then
      check_type := 'priority';
      severity := 'info';
      message := 'Work order priority: ' || v_priority;
      return next;
    end if;
  end if;

  return;
end;
$$;

comment on function public.rpc_validate_schedule(uuid, uuid, timestamptz, timestamptz, uuid, uuid) is
  'Validates a candidate slot: shift/schedule conflicts, availability patterns and overrides (UTC when pattern timezone null), SLA due_date and sla_*_due_at, optional asset_required_skills vs technician_skills. Crew: aggregates checks for up to 50 active members.';

revoke all on function public.rpc_validate_schedule(uuid, uuid, timestamptz, timestamptz, uuid, uuid) from public;
grant execute on function public.rpc_validate_schedule(uuid, uuid, timestamptz, timestamptz, uuid, uuid) to authenticated;
