-- SPDX-License-Identifier: AGPL-3.0-or-later
--
-- Scheduling and dispatch: schedule blocks, views by technician/crew/asset/location,
-- public API views, and RPCs for create/update/validate/unschedule.
-- Builds on labor foundation (technicians, crews, work_order_assignments, shifts, availability).
--
-- New: app.schedule_blocks; app and public views; rpc_schedule_work_order,
-- rpc_update_schedule_block, rpc_validate_schedule, rpc_unschedule_work_order.
-- RLS and tenant isolation on all new objects.

-- ============================================================================
-- 1. Schedule blocks table
-- ============================================================================

create table app.schedule_blocks (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  work_order_id uuid not null references app.work_orders(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  technician_id uuid references app.technicians(id) on delete cascade,
  crew_id uuid references app.crews(id) on delete set null,
  location_id uuid references app.locations(id) on delete set null,
  asset_id uuid references app.assets(id) on delete set null,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint schedule_blocks_end_after_start check (end_at > start_at),
  constraint schedule_blocks_technician_xor_crew check (
    (technician_id is not null and crew_id is null) or (technician_id is null and crew_id is not null)
  )
);

comment on table app.schedule_blocks is 'Time slots for work orders assigned to a technician or crew. Used for calendar/board scheduling and drag-and-drop. One of technician_id or crew_id must be set.';
comment on column app.schedule_blocks.work_order_id is 'Work order scheduled in this block.';
comment on column app.schedule_blocks.start_at is 'Start of the scheduled slot (inclusive).';
comment on column app.schedule_blocks.end_at is 'End of the scheduled slot (exclusive).';
comment on column app.schedule_blocks.technician_id is 'When set, work is scheduled to this technician. Mutually exclusive with crew_id.';
comment on column app.schedule_blocks.crew_id is 'When set, work is scheduled to this crew. Mutually exclusive with technician_id.';
comment on column app.schedule_blocks.location_id is 'Optional board grouping by location; defaults from work order when not set.';
comment on column app.schedule_blocks.asset_id is 'Optional board grouping by asset; defaults from work order when not set.';

create index schedule_blocks_tenant_idx on app.schedule_blocks (tenant_id);
create index schedule_blocks_tenant_start_end_idx on app.schedule_blocks (tenant_id, start_at, end_at);
create index schedule_blocks_work_order_idx on app.schedule_blocks (work_order_id);
create index schedule_blocks_technician_idx on app.schedule_blocks (technician_id) where technician_id is not null;
create index schedule_blocks_crew_idx on app.schedule_blocks (crew_id) where crew_id is not null;
create index schedule_blocks_location_idx on app.schedule_blocks (location_id) where location_id is not null;
create index schedule_blocks_asset_idx on app.schedule_blocks (asset_id) where asset_id is not null;

create trigger schedule_blocks_set_updated_at
  before update on app.schedule_blocks
  for each row
  execute function util.set_updated_at();

alter table app.schedule_blocks enable row level security;

-- ============================================================================
-- 2. RLS policies and grants for schedule_blocks
-- ============================================================================

create policy schedule_blocks_select_tenant on app.schedule_blocks for select to authenticated using (authz.is_current_user_tenant_member(tenant_id));
create policy schedule_blocks_insert_tenant on app.schedule_blocks for insert to authenticated with check (authz.is_current_user_tenant_member(tenant_id));
create policy schedule_blocks_update_tenant on app.schedule_blocks for update to authenticated using (authz.is_current_user_tenant_member(tenant_id)) with check (authz.is_current_user_tenant_member(tenant_id));
create policy schedule_blocks_delete_tenant on app.schedule_blocks for delete to authenticated using (authz.is_current_user_tenant_member(tenant_id));
create policy schedule_blocks_select_anon on app.schedule_blocks for select to anon using (false);
create policy schedule_blocks_insert_anon on app.schedule_blocks for insert to anon with check (false);
create policy schedule_blocks_update_anon on app.schedule_blocks for update to anon using (false) with check (false);
create policy schedule_blocks_delete_anon on app.schedule_blocks for delete to anon using (false);

grant select on app.schedule_blocks to authenticated, anon;
grant insert, update, delete on app.schedule_blocks to authenticated;

alter table app.schedule_blocks force row level security;

-- ============================================================================
-- 3. App views (schedule by technician, crew, asset, location; flat blocks)
-- ============================================================================

create or replace view app.v_schedule_blocks
with (security_invoker = true)
as
select
  sb.id,
  sb.tenant_id,
  sb.work_order_id,
  sb.start_at,
  sb.end_at,
  sb.technician_id,
  sb.crew_id,
  sb.location_id,
  sb.asset_id,
  sb.created_at,
  sb.updated_at,
  wo.title as work_order_title,
  wo.status as work_order_status,
  wo.priority as work_order_priority,
  wo.due_date as work_order_due_date,
  coalesce(sb.location_id, wo.location_id) as effective_location_id,
  coalesce(sb.asset_id, wo.asset_id) as effective_asset_id
from
  app.schedule_blocks sb
join
  app.work_orders wo on wo.id = sb.work_order_id;

comment on view app.v_schedule_blocks is 'Schedule blocks joined to work order for calendar/board data. effective_* columns use block override or work order.';

create or replace view app.v_schedule_by_technician
with (security_invoker = true)
as
select
  v.id,
  v.tenant_id,
  v.work_order_id,
  v.start_at,
  v.end_at,
  v.technician_id,
  v.crew_id,
  v.location_id,
  v.asset_id,
  v.work_order_title,
  v.work_order_status,
  v.work_order_priority,
  v.work_order_due_date,
  v.effective_location_id,
  v.effective_asset_id,
  v.created_at,
  v.updated_at
from
  app.v_schedule_blocks v
where
  v.technician_id is not null;

comment on view app.v_schedule_by_technician is 'Schedule blocks assigned to a technician. Filter by tenant_id, technician_id, start_at/end_at in client.';

create or replace view app.v_schedule_by_crew
with (security_invoker = true)
as
select
  v.id,
  v.tenant_id,
  v.work_order_id,
  v.start_at,
  v.end_at,
  v.technician_id,
  v.crew_id,
  v.location_id,
  v.asset_id,
  v.work_order_title,
  v.work_order_status,
  v.work_order_priority,
  v.work_order_due_date,
  v.effective_location_id,
  v.effective_asset_id,
  v.created_at,
  v.updated_at
from
  app.v_schedule_blocks v
where
  v.crew_id is not null;

comment on view app.v_schedule_by_crew is 'Schedule blocks assigned to a crew. Filter by tenant_id, crew_id, start_at/end_at in client.';

create or replace view app.v_schedule_by_asset
with (security_invoker = true)
as
select
  v.id,
  v.tenant_id,
  v.work_order_id,
  v.start_at,
  v.end_at,
  v.technician_id,
  v.crew_id,
  v.location_id,
  v.asset_id,
  v.work_order_title,
  v.work_order_status,
  v.work_order_priority,
  v.work_order_due_date,
  v.effective_location_id,
  v.effective_asset_id,
  v.created_at,
  v.updated_at
from
  app.v_schedule_blocks v
where
  v.effective_asset_id is not null;

comment on view app.v_schedule_by_asset is 'Schedule blocks with an effective asset. Filter by tenant_id, effective_asset_id, start_at/end_at in client.';

create or replace view app.v_schedule_by_location
with (security_invoker = true)
as
select
  v.id,
  v.tenant_id,
  v.work_order_id,
  v.start_at,
  v.end_at,
  v.technician_id,
  v.crew_id,
  v.location_id,
  v.asset_id,
  v.work_order_title,
  v.work_order_status,
  v.work_order_priority,
  v.work_order_due_date,
  v.effective_location_id,
  v.effective_asset_id,
  v.created_at,
  v.updated_at
from
  app.v_schedule_blocks v
where
  v.effective_location_id is not null;

comment on view app.v_schedule_by_location is 'Schedule blocks with an effective location. Filter by tenant_id, effective_location_id, start_at/end_at in client.';

grant select on app.v_schedule_blocks to authenticated, anon;
grant select on app.v_schedule_by_technician to authenticated, anon;
grant select on app.v_schedule_by_crew to authenticated, anon;
grant select on app.v_schedule_by_asset to authenticated, anon;
grant select on app.v_schedule_by_location to authenticated, anon;

-- ============================================================================
-- 4. Public API views (tenant-filtered for SDK / PostgREST)
-- ============================================================================

create or replace view public.v_schedule_blocks
with (security_invoker = true)
as
select
  v.id,
  v.tenant_id,
  v.work_order_id,
  v.start_at,
  v.end_at,
  v.technician_id,
  v.crew_id,
  v.location_id,
  v.asset_id,
  v.work_order_title,
  v.work_order_status,
  v.work_order_priority,
  v.work_order_due_date,
  v.effective_location_id,
  v.effective_asset_id,
  v.created_at,
  v.updated_at
from
  app.v_schedule_blocks v
where
  v.tenant_id = authz.get_current_tenant_id();

comment on view public.v_schedule_blocks is 'Schedule blocks for the current tenant. Set tenant context via rpc_set_tenant_context.';

grant select on public.v_schedule_blocks to authenticated;
grant select on public.v_schedule_blocks to anon;

create or replace view public.v_schedule_by_technician
with (security_invoker = true)
as
select
  v.id,
  v.tenant_id,
  v.work_order_id,
  v.start_at,
  v.end_at,
  v.technician_id,
  v.crew_id,
  v.location_id,
  v.asset_id,
  v.work_order_title,
  v.work_order_status,
  v.work_order_priority,
  v.work_order_due_date,
  v.effective_location_id,
  v.effective_asset_id,
  v.created_at,
  v.updated_at
from
  app.v_schedule_by_technician v
where
  v.tenant_id = authz.get_current_tenant_id();

comment on view public.v_schedule_by_technician is 'Schedule by technician for the current tenant. Set tenant context via rpc_set_tenant_context.';

grant select on public.v_schedule_by_technician to authenticated;
grant select on public.v_schedule_by_technician to anon;

create or replace view public.v_schedule_by_crew
with (security_invoker = true)
as
select
  v.id,
  v.tenant_id,
  v.work_order_id,
  v.start_at,
  v.end_at,
  v.technician_id,
  v.crew_id,
  v.location_id,
  v.asset_id,
  v.work_order_title,
  v.work_order_status,
  v.work_order_priority,
  v.work_order_due_date,
  v.effective_location_id,
  v.effective_asset_id,
  v.created_at,
  v.updated_at
from
  app.v_schedule_by_crew v
where
  v.tenant_id = authz.get_current_tenant_id();

comment on view public.v_schedule_by_crew is 'Schedule by crew for the current tenant. Set tenant context via rpc_set_tenant_context.';

grant select on public.v_schedule_by_crew to authenticated;
grant select on public.v_schedule_by_crew to anon;

create or replace view public.v_schedule_by_asset
with (security_invoker = true)
as
select
  v.id,
  v.tenant_id,
  v.work_order_id,
  v.start_at,
  v.end_at,
  v.technician_id,
  v.crew_id,
  v.location_id,
  v.asset_id,
  v.work_order_title,
  v.work_order_status,
  v.work_order_priority,
  v.work_order_due_date,
  v.effective_location_id,
  v.effective_asset_id,
  v.created_at,
  v.updated_at
from
  app.v_schedule_by_asset v
where
  v.tenant_id = authz.get_current_tenant_id();

comment on view public.v_schedule_by_asset is 'Schedule by asset for the current tenant. Set tenant context via rpc_set_tenant_context.';

grant select on public.v_schedule_by_asset to authenticated;
grant select on public.v_schedule_by_asset to anon;

create or replace view public.v_schedule_by_location
with (security_invoker = true)
as
select
  v.id,
  v.tenant_id,
  v.work_order_id,
  v.start_at,
  v.end_at,
  v.technician_id,
  v.crew_id,
  v.location_id,
  v.asset_id,
  v.work_order_title,
  v.work_order_status,
  v.work_order_priority,
  v.work_order_due_date,
  v.effective_location_id,
  v.effective_asset_id,
  v.created_at,
  v.updated_at
from
  app.v_schedule_by_location v
where
  v.tenant_id = authz.get_current_tenant_id();

comment on view public.v_schedule_by_location is 'Schedule by location for the current tenant. Set tenant context via rpc_set_tenant_context.';

grant select on public.v_schedule_by_location to authenticated;
grant select on public.v_schedule_by_location to anon;

-- ============================================================================
-- 5. RPC: Schedule work order (create schedule block)
-- ============================================================================

create or replace function public.rpc_schedule_work_order(
  p_work_order_id uuid,
  p_technician_id uuid default null,
  p_crew_id uuid default null,
  p_start_at timestamptz default null,
  p_end_at timestamptz default null,
  p_location_id uuid default null,
  p_asset_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant_id uuid;
  v_block_id uuid;
  v_wo_location_id uuid;
  v_wo_asset_id uuid;
begin
  if (p_technician_id is null and p_crew_id is null) or (p_technician_id is not null and p_crew_id is not null) then
    raise exception using message = 'Exactly one of p_technician_id or p_crew_id must be set', errcode = '22000';
  end if;
  if p_start_at is null or p_end_at is null or p_end_at <= p_start_at then
    raise exception using message = 'p_start_at and p_end_at must be set and end_at > start_at', errcode = '22000';
  end if;

  select wo.tenant_id, wo.location_id, wo.asset_id
  into v_tenant_id, v_wo_location_id, v_wo_asset_id
  from app.work_orders wo
  where wo.id = p_work_order_id;

  if v_tenant_id is null then
    raise exception using message = 'Work order not found', errcode = 'P0002';
  end if;
  if not authz.is_current_user_tenant_member(v_tenant_id) then
    raise exception using message = 'Unauthorized: not a member of this tenant', errcode = '42501';
  end if;

  /* One block per work order: delete existing block for this work order */
  delete from app.schedule_blocks
  where tenant_id = v_tenant_id and work_order_id = p_work_order_id;

  insert into app.schedule_blocks (
    tenant_id,
    work_order_id,
    start_at,
    end_at,
    technician_id,
    crew_id,
    location_id,
    asset_id
  )
  values (
    v_tenant_id,
    p_work_order_id,
    p_start_at,
    p_end_at,
    p_technician_id,
    p_crew_id,
    coalesce(p_location_id, v_wo_location_id),
    coalesce(p_asset_id, v_wo_asset_id)
  )
  returning id into v_block_id;

  if p_technician_id is not null then
    insert into app.work_order_assignments (tenant_id, work_order_id, technician_id)
    values (v_tenant_id, p_work_order_id, p_technician_id)
    on conflict (work_order_id, technician_id) do nothing;
  end if;

  return v_block_id;
end;
$$;

comment on function public.rpc_schedule_work_order(uuid, uuid, uuid, timestamptz, timestamptz, uuid, uuid) is
  'Creates a schedule block for a work order (technician or crew). Replaces any existing block for that work order. Syncs work_order_assignments when technician is set.';

revoke all on function public.rpc_schedule_work_order(uuid, uuid, uuid, timestamptz, timestamptz, uuid, uuid) from public;
grant execute on function public.rpc_schedule_work_order(uuid, uuid, uuid, timestamptz, timestamptz, uuid, uuid) to authenticated;

-- ============================================================================
-- 6. RPC: Update schedule block (drag-and-drop / reassign)
-- ============================================================================

create or replace function public.rpc_update_schedule_block(
  p_schedule_block_id uuid,
  p_technician_id uuid default null,
  p_crew_id uuid default null,
  p_start_at timestamptz default null,
  p_end_at timestamptz default null,
  p_location_id uuid default null,
  p_asset_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant_id uuid;
  v_work_order_id uuid;
  v_old_technician_id uuid;
  v_new_technician_id uuid;
  v_new_crew_id uuid;
begin
  select sb.tenant_id, sb.work_order_id, sb.technician_id
  into v_tenant_id, v_work_order_id, v_old_technician_id
  from app.schedule_blocks sb
  where sb.id = p_schedule_block_id;

  if v_tenant_id is null then
    raise exception using message = 'Schedule block not found', errcode = 'P0002';
  end if;
  if not authz.is_current_user_tenant_member(v_tenant_id) then
    raise exception using message = 'Unauthorized: not a member of this tenant', errcode = '42501';
  end if;

  if p_technician_id is not null and p_crew_id is not null then
    raise exception using message = 'Cannot set both technician_id and crew_id', errcode = '22000';
  end if;
  if p_start_at is not null and p_end_at is not null and p_end_at <= p_start_at then
    raise exception using message = 'end_at must be after start_at', errcode = '22000';
  end if;

  v_new_technician_id := coalesce(p_technician_id, v_old_technician_id);
  v_new_crew_id := case
    when p_technician_id is not null then null
    when p_crew_id is not null then p_crew_id
    else (select crew_id from app.schedule_blocks where id = p_schedule_block_id)
  end;

  if v_new_technician_id is not null and v_new_crew_id is not null then
    raise exception using message = 'Exactly one of technician_id or crew_id must be set', errcode = '22000';
  end if;
  if v_new_technician_id is null and v_new_crew_id is null then
    raise exception using message = 'Exactly one of technician_id or crew_id must be set', errcode = '22000';
  end if;

  update app.schedule_blocks
  set
    technician_id = v_new_technician_id,
    crew_id = v_new_crew_id,
    start_at = coalesce(p_start_at, start_at),
    end_at = coalesce(p_end_at, end_at),
    location_id = case when p_location_id is not null then p_location_id else location_id end,
    asset_id = case when p_asset_id is not null then p_asset_id else asset_id end
  where id = p_schedule_block_id;

  if v_new_technician_id is not null then
    insert into app.work_order_assignments (tenant_id, work_order_id, technician_id)
    values (v_tenant_id, v_work_order_id, v_new_technician_id)
    on conflict (work_order_id, technician_id) do nothing;
  end if;

  return p_schedule_block_id;
end;
$$;

comment on function public.rpc_update_schedule_block(uuid, uuid, uuid, timestamptz, timestamptz, uuid, uuid) is
  'Updates a schedule block (time, technician/crew, location/asset). Maintains technician XOR crew. Syncs work_order_assignments when technician changes.';

revoke all on function public.rpc_update_schedule_block(uuid, uuid, uuid, timestamptz, timestamptz, uuid, uuid) from public;
grant execute on function public.rpc_update_schedule_block(uuid, uuid, uuid, timestamptz, timestamptz, uuid, uuid) to authenticated;

-- ============================================================================
-- 7. RPC: Validate schedule (conflicts, availability, skills, SLA)
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
begin
  if p_technician_id is null and p_crew_id is null then
    return;
  end if;
  v_technician_id := p_technician_id;
  if v_technician_id is null and p_crew_id is not null then
    /* For crew we validate only if a technician is provided; otherwise skip conflict/availability checks */
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

  /* Other schedule blocks for same technician */
  if exists (
    select 1 from app.schedule_blocks sb
    where sb.technician_id = v_technician_id
      and (p_exclude_block_id is null or sb.id <> p_exclude_block_id)
      and tstzrange(sb.start_at, sb.end_at) && tstzrange(v_start, v_end)
  ) then
    check_type := 'conflict';
    severity := 'warning';
    message := 'Technician has overlapping schedule block(s) in this range';
    return next;
  end if;

  /* SLA: work order due_date vs block end */
  if p_work_order_id is not null then
    select wo.due_date, wo.priority into v_due_date, v_priority from app.work_orders wo where wo.id = p_work_order_id;
    if v_due_date is not null and v_end > v_due_date then
      check_type := 'sla';
      severity := 'breach';
      message := 'Scheduled end is after work order due date';
      return next;
    end if;
    if v_due_date is not null and v_end > v_due_date - interval '2 hours' and v_end <= v_due_date then
      check_type := 'sla';
      severity := 'warning';
      message := 'Scheduled end is within 2 hours of due date';
      return next;
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
  'Returns validation issues for a candidate slot: shift conflicts, schedule block conflicts, SLA (due_date), and priority. For technician only; crew validation can be extended later.';

revoke all on function public.rpc_validate_schedule(uuid, uuid, timestamptz, timestamptz, uuid, uuid) from public;
grant execute on function public.rpc_validate_schedule(uuid, uuid, timestamptz, timestamptz, uuid, uuid) to authenticated;

-- ============================================================================
-- 8. RPC: Unschedule work order (delete schedule block)
-- ============================================================================

create or replace function public.rpc_unschedule_work_order(
  p_schedule_block_id uuid default null,
  p_work_order_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant_id uuid;
  v_block_id uuid;
begin
  if p_schedule_block_id is not null then
    select sb.tenant_id into v_tenant_id from app.schedule_blocks sb where sb.id = p_schedule_block_id;
    v_block_id := p_schedule_block_id;
  elsif p_work_order_id is not null then
    select sb.tenant_id, sb.id into v_tenant_id, v_block_id
    from app.schedule_blocks sb
    where sb.work_order_id = p_work_order_id
    limit 1;
  else
    raise exception using message = 'One of p_schedule_block_id or p_work_order_id must be set', errcode = '22000';
  end if;

  if v_tenant_id is null or v_block_id is null then
    return; /* No block found, no-op */
  end if;
  if not authz.is_current_user_tenant_member(v_tenant_id) then
    raise exception using message = 'Unauthorized: not a member of this tenant', errcode = '42501';
  end if;

  delete from app.schedule_blocks where id = v_block_id;
  /* work_order_assignments are left as-is so "who is assigned" remains; only the slot is removed */
end;
$$;

comment on function public.rpc_unschedule_work_order(uuid, uuid) is
  'Removes the schedule block for a work order (by block id or work order id). Does not remove work_order_assignments.';

revoke all on function public.rpc_unschedule_work_order(uuid, uuid) from public;
grant execute on function public.rpc_unschedule_work_order(uuid, uuid) to authenticated;
