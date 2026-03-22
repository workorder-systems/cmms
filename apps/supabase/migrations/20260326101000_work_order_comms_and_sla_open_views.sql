/*
 * migration: 20260326101000_work_order_comms_and_sla_open_views.sql
 *
 * purpose: work order communication audit trail + coordinator SLA queue view.
 */

-- ============================================================================
-- 1. work_order_comms_events
-- ============================================================================

create table app.work_order_comms_events (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  work_order_id uuid not null references app.work_orders(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  channel text not null default 'comment',
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default pg_catalog.now(),
  constraint work_order_comms_events_channel_check check (
    channel in ('comment', 'sms', 'email', 'phone', 'portal', 'other')
  ),
  constraint work_order_comms_events_body_length_check check (
    length(body) >= 1 and length(body) <= 8000
  )
);

comment on table app.work_order_comms_events is
  'Audit-style communication log for a work order (separate from technician field notes).';

create index work_order_comms_events_tenant_wo_idx
  on app.work_order_comms_events (tenant_id, work_order_id, created_at desc);

alter table app.work_order_comms_events enable row level security;

create policy work_order_comms_events_select_tenant on app.work_order_comms_events
  for select to authenticated
  using (authz.is_current_user_tenant_member(tenant_id));

create policy work_order_comms_events_select_anon on app.work_order_comms_events
  for select to anon
  using (false);

create policy work_order_comms_events_insert_tenant on app.work_order_comms_events
  for insert to authenticated
  with check (false);

create policy work_order_comms_events_insert_anon on app.work_order_comms_events
  for insert to anon
  with check (false);

create policy work_order_comms_events_update_tenant on app.work_order_comms_events
  for update to authenticated
  using (false)
  with check (false);

create policy work_order_comms_events_update_anon on app.work_order_comms_events
  for update to anon
  using (false)
  with check (false);

create policy work_order_comms_events_delete_tenant on app.work_order_comms_events
  for delete to authenticated
  using (false);

create policy work_order_comms_events_delete_anon on app.work_order_comms_events
  for delete to anon
  using (false);

comment on policy work_order_comms_events_select_tenant on app.work_order_comms_events is
  'Tenant members can read comms events for work orders in their tenant.';

grant select on app.work_order_comms_events to authenticated, anon;
alter table app.work_order_comms_events force row level security;

-- ============================================================================
-- 2. rpc_add_work_order_comms_event
-- ============================================================================

create or replace function public.rpc_add_work_order_comms_event(
  p_tenant_id uuid,
  p_work_order_id uuid,
  p_body text,
  p_channel text default 'comment',
  p_metadata jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_id uuid;
  v_wo_tenant uuid;
  v_assigned uuid;
  v_requested_by uuid;
begin
  perform util.check_rate_limit('work_order_comms_event', null, 120, 1, auth.uid(), p_tenant_id);

  v_user_id := authz.rpc_setup(p_tenant_id);

  if p_body is null or length(trim(p_body)) < 1 then
    raise exception using message = 'body is required', errcode = '23514';
  end if;

  if p_channel is not null and p_channel not in ('comment', 'sms', 'email', 'phone', 'portal', 'other') then
    raise exception using message = 'invalid channel', errcode = '23514';
  end if;

  select tenant_id, assigned_to, requested_by
  into v_wo_tenant, v_assigned, v_requested_by
  from app.work_orders
  where id = p_work_order_id;

  if v_wo_tenant is null or v_wo_tenant <> p_tenant_id then
    raise exception using message = 'Work order not found or wrong tenant', errcode = 'P0001';
  end if;

  if v_assigned is distinct from v_user_id and v_requested_by is distinct from v_user_id then
    perform authz.validate_permission(v_user_id, p_tenant_id, 'workorder.edit');
  end if;

  insert into app.work_order_comms_events (
    tenant_id,
    work_order_id,
    actor_user_id,
    channel,
    body,
    metadata
  )
  values (
    p_tenant_id,
    p_work_order_id,
    v_user_id,
    coalesce(nullif(trim(p_channel), ''), 'comment'),
    trim(p_body),
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.rpc_add_work_order_comms_event(uuid, uuid, text, text, jsonb) is
  'Logs a communication event on a work order. Requester or assignee may add; others need workorder.edit.';

revoke all on function public.rpc_add_work_order_comms_event(uuid, uuid, text, text, jsonb) from public;
grant execute on function public.rpc_add_work_order_comms_event(uuid, uuid, text, text, jsonb) to authenticated;

-- ============================================================================
-- 3. public.v_work_order_comms
-- ============================================================================

create or replace view public.v_work_order_comms
with (security_invoker = true)
as
select
  e.id,
  e.tenant_id,
  e.work_order_id,
  e.actor_user_id,
  e.channel,
  e.body,
  e.metadata,
  e.created_at
from app.work_order_comms_events e
where e.tenant_id = authz.get_current_tenant_id();

comment on view public.v_work_order_comms is
  'Communication events for the current tenant (set tenant context).';

grant select on public.v_work_order_comms to authenticated, anon;

-- ============================================================================
-- 4. public.v_work_orders_sla_open (coordinator queue)
-- ============================================================================

create or replace view public.v_work_orders_sla_open
with (security_invoker = true)
as
select
  wo.id as work_order_id,
  wo.tenant_id,
  wo.title,
  wo.status,
  wo.priority,
  wo.sla_response_due_at,
  wo.sla_resolution_due_at,
  wo.sla_response_breached_at,
  wo.sla_resolution_breached_at,
  wo.acknowledged_at,
  wo.created_at,
  case
    when wo.sla_response_due_at is not null then
      floor(extract(epoch from (wo.sla_response_due_at - pg_catalog.now())) / 60.0)::integer
    else null
  end as minutes_until_response_due,
  case
    when wo.sla_resolution_due_at is not null then
      floor(extract(epoch from (wo.sla_resolution_due_at - pg_catalog.now())) / 60.0)::integer
    else null
  end as minutes_until_resolution_due
from app.work_orders wo
join cfg.status_catalogs sc
  on sc.tenant_id = wo.tenant_id
  and sc.entity_type = 'work_order'
  and sc.key = wo.status
where wo.tenant_id = authz.get_current_tenant_id()
  and sc.is_final = false
  and (
    wo.sla_response_due_at is not null
    or wo.sla_resolution_due_at is not null
  );

comment on view public.v_work_orders_sla_open is
  'Non-final work orders with SLA deadlines for coordinator dashboards.';

grant select on public.v_work_orders_sla_open to authenticated, anon;
