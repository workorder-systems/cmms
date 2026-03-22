-- 20260210150000_15_work_order_cause_resolution.sql
--
-- Purpose:
--   Add optional cause and resolution fields to work orders so that completed
--   jobs carry structured root-cause and fix information. Surface these fields
--   through views and Similar Past Fixes RPCs, and include them in embedding
--   text for richer semantic search.
--
-- Notes:
--   - All new fields are nullable for backward compatibility.
--   - Existing callers of rpc_complete_work_order remain valid because new
--     parameters have defaults.
--   - Existing embeddings remain valid; new completions will include
--     cause/resolution in embedding text when backfilled.

set check_function_bodies = off;

-- ============================================================================
-- app.work_orders: cause and resolution fields
-- ============================================================================

alter table app.work_orders
  add column if not exists cause text;

alter table app.work_orders
  add column if not exists resolution text;

comment on column app.work_orders.cause is
  'Root cause of the issue for this work order (e.g. worn bearing, misalignment). Optional free-form text.';

comment on column app.work_orders.resolution is
  'What was done to fix the issue for this work order (e.g. replaced bearing, realigned motor). Optional free-form text.';

-- ============================================================================
-- v_work_orders: expose cause and resolution
-- ============================================================================
-- Recreate view to include new columns while preserving existing behaviour.

drop view if exists public.v_work_orders;

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
  ) as total_labor_minutes
from app.work_orders wo
left join app.profiles p_assigned
  on p_assigned.user_id = wo.assigned_to
 and p_assigned.tenant_id = wo.tenant_id
left join app.profiles p_completed
  on p_completed.user_id = wo.completed_by
 and p_completed.tenant_id = wo.tenant_id
where wo.tenant_id = authz.get_current_tenant_id();

comment on view public.v_work_orders is 
  'Work orders view scoped to the current tenant context. Uses SECURITY INVOKER to enforce RLS policies correctly. Clients must set tenant context via rpc_set_tenant_context. Underlying table RLS still applies. Includes optional cause and resolution fields for completed work orders.';

grant select on public.v_work_orders to authenticated;
grant select on public.v_work_orders to anon;

-- ============================================================================
-- rpc_complete_work_order: accept optional cause and resolution
-- ============================================================================
-- Extend the contract to optionally capture cause and resolution at the time
-- of completion. Existing callers that pass only tenant_id and work_order_id
-- continue to work because new parameters have defaults.

drop function if exists public.rpc_complete_work_order(uuid, uuid);

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
begin
  -- Perform the normal status transition to the final "completed" state.
  perform public.rpc_transition_work_order_status(p_tenant_id, p_work_order_id, 'completed');

  -- Optionally capture cause and resolution for additional context.
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
  'Completes a work order. Convenience wrapper around rpc_transition_work_order_status that transitions to "completed" status and optionally records cause and resolution. Requires appropriate permissions for completing work orders (workorder.complete.assigned if assigned to user, workorder.complete.any otherwise). Rate limited to 30 completions per minute per user.';

revoke all on function public.rpc_complete_work_order(uuid, uuid, text, text) from public;
grant execute on function public.rpc_complete_work_order(uuid, uuid, text, text) to authenticated;

-- ============================================================================
-- rpc_next_work_orders_for_embedding: include cause and resolution
-- ============================================================================
-- Extend helper RPC used by backfill to return cause and resolution so that
-- embeddings include richer context about what happened and why.

drop function if exists public.rpc_next_work_orders_for_embedding(int);

create or replace function public.rpc_next_work_orders_for_embedding(
  p_limit int default 50
)
returns table (
  work_order_id uuid,
  tenant_id uuid,
  title text,
  description text,
  cause text,
  resolution text,
  asset_name text,
  location_name text
)
language sql
security definer
set search_path = ''
as $$
  select
    w.id as work_order_id,
    w.tenant_id,
    w.title,
    w.description,
    w.cause,
    w.resolution,
    a.name as asset_name,
    l.name as location_name
  from app.work_orders w
  left join app.work_order_embeddings e
    on e.work_order_id = w.id
  left join app.assets a
    on a.id = w.asset_id
   and a.tenant_id = w.tenant_id
  left join app.locations l
    on l.id = w.location_id
   and l.tenant_id = w.tenant_id
  where w.completed_at is not null
    and e.work_order_id is null
  order by w.completed_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 500);
$$;

comment on function public.rpc_next_work_orders_for_embedding(int) is
  'Returns up to p_limit completed work orders that do not yet have embeddings, for use by backfill/cron jobs. Uses a left join on app.work_order_embeddings and orders by completed_at DESC. Also returns cause, resolution, asset_name, and location_name (if available) to enrich embedding text.';

revoke all on function public.rpc_next_work_orders_for_embedding(int) from public;
grant execute on function public.rpc_next_work_orders_for_embedding(int) to authenticated;

-- ============================================================================
-- rpc_similar_past_work_orders: return cause and resolution
-- ============================================================================
-- Extend Similar Past Fixes RPC to include cause and resolution in the result
-- set so callers can understand not just what the job was, but why it happened
-- and how it was fixed.

drop function if exists public.rpc_similar_past_work_orders(vector(1536), int, uuid);
drop function if exists public.rpc_similar_past_work_orders(vector(1536), int, uuid, float);

create or replace function public.rpc_similar_past_work_orders(
  p_query_embedding vector(1536),
  p_limit int default 5,
  p_exclude_work_order_id uuid default null,
  p_min_similarity float default 0.5
)
returns table (
  work_order_id uuid,
  title text,
  description text,
  status text,
  completed_at timestamptz,
  similarity_score float,
  asset_id uuid,
  location_id uuid,
  cause text,
  resolution text
)
language plpgsql
stable
-- Include public and extensions so pgvector operator <=> is found (cannot be schema-qualified in SQL).
set search_path = public, extensions
as $$
declare
  v_tenant_id uuid;
  v_user_id uuid;
begin
  v_user_id := authz.validate_authenticated();
  v_tenant_id := authz.get_current_tenant_id();

  if v_tenant_id is null then
    raise exception using
      message = 'Tenant context required. Call rpc_set_tenant_context first.',
      errcode = 'P0001';
  end if;

  if not authz.is_tenant_member(v_user_id, v_tenant_id) then
    return;
  end if;

  -- Clamp limit defensively to [1,50] to avoid extreme values.
  p_limit := least(greatest(coalesce(p_limit, 5), 1), 50);

  return query
  select
    wo.id as work_order_id,
    wo.title,
    wo.description,
    wo.status,
    wo.completed_at,
    (1 - (e.embedding <=> p_query_embedding))::float as similarity_score,
    wo.asset_id,
    wo.location_id,
    wo.cause,
    wo.resolution
  from app.work_order_embeddings e
  join app.work_orders wo
    on wo.id = e.work_order_id
   and wo.tenant_id = e.tenant_id
  where e.tenant_id = v_tenant_id
    and wo.completed_at is not null
    and (p_exclude_work_order_id is null or wo.id != p_exclude_work_order_id)
    and (
      p_min_similarity is null
      or (1 - (e.embedding <=> p_query_embedding))::float >= p_min_similarity
    )
  order by e.embedding <=> p_query_embedding
  limit p_limit;
end;
$$;

comment on function public.rpc_similar_past_work_orders(vector(1536), int, uuid, float) is
  'Experiment: Returns completed work orders most similar to the query embedding (cosine). Scoped to current tenant. Includes asset_id, location_id, cause, and resolution for explainability. p_min_similarity (default 0.5) filters out low-confidence matches based on similarity_score in [0,1].';

revoke all on function public.rpc_similar_past_work_orders(vector(1536), int, uuid, float) from public;
grant execute on function public.rpc_similar_past_work_orders(vector(1536), int, uuid, float) to authenticated;

