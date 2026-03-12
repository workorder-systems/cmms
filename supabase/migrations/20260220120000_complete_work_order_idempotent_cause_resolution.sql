-- Purpose: Make rpc_complete_work_order idempotent when work order is already completed,
--   and allow updating cause/resolution on already-completed work orders.
-- Affected: public.rpc_complete_work_order
-- When status is already 'completed', skip the transition and only update cause/resolution
-- so "complete again" or "add cause/resolution" does not raise invalid transition.

create or replace function public.rpc_complete_work_order(
  p_tenant_id uuid,
  p_work_order_id uuid,
  p_cause text default null,
  p_resolution text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_status text;
begin
  select wo.status
  into v_current_status
  from app.work_orders wo
  where wo.id = p_work_order_id
    and wo.tenant_id = p_tenant_id;

  if not found then
    raise exception using
      message = 'Work order not found',
      errcode = 'P0001';
  end if;

  -- If already completed, only update cause/resolution (idempotent; allows editing after completion).
  if v_current_status = 'completed' then
    if p_cause is not null or p_resolution is not null then
      update app.work_orders
      set
        cause = coalesce(p_cause, cause),
        resolution = coalesce(p_resolution, resolution)
      where id = p_work_order_id
        and tenant_id = p_tenant_id;
    end if;
    return;
  end if;

  -- Otherwise perform the normal status transition to completed.
  perform public.rpc_transition_work_order_status(p_tenant_id, p_work_order_id, 'completed');

  if p_cause is not null or p_resolution is not null then
    update app.work_orders
    set
      cause = coalesce(p_cause, cause),
      resolution = coalesce(p_resolution, resolution)
    where id = p_work_order_id
      and tenant_id = p_tenant_id;
  end if;
end;
$$;

comment on function public.rpc_complete_work_order(uuid, uuid, text, text) is
  'Completes a work order (transition to completed) and optionally records cause and resolution. If the work order is already completed, skips the transition and only updates cause/resolution when provided (idempotent; allows editing cause/resolution after completion). Rate limit applies to transition only.';
