-- 20250312120000_similar_past_fixes_by_work_order_id_rpc.sql
--
-- Purpose: Similar Past Fixes by work order ID over RPC only (no Edge Function).
--   Callers can search using the stored embedding for a work order without
--   calling the similar-past-fixes Edge Function or OpenAI.
-- Affected: New RPC public.rpc_similar_past_work_orders_by_work_order_id.
--
-- When the work order is already embedded (e.g. by backfill), this RPC returns
-- the same result shape as rpc_similar_past_work_orders. If the work order has
-- no embedding, returns no rows. Rate limiting still applies via normal RPC
-- usage; for stricter limits use rpc_check_similar_past_fixes_rate_limit before
-- calling if desired.

create or replace function public.rpc_similar_past_work_orders_by_work_order_id(
  p_work_order_id uuid,
  p_limit int default 5,
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
security definer
set search_path = public, app, authz, extensions
as $$
declare
  v_embedding app.work_order_embeddings.embedding%type;
begin
  perform authz.validate_authenticated();

  -- Enforce same rate limit as Edge Function path.
  perform public.rpc_check_similar_past_fixes_rate_limit('by_work_order_id');

  -- Use stored embedding for this work order (tenant check is inside the RPC).
  v_embedding := public.rpc_get_work_order_embedding(p_work_order_id);

  if v_embedding is null then
    return;
  end if;

  return query
  select
    wo.id as work_order_id,
    wo.title,
    wo.description,
    wo.status,
    wo.completed_at,
    (1 - (e.embedding <=> v_embedding))::float as similarity_score,
    wo.asset_id,
    wo.location_id,
    wo.cause,
    wo.resolution
  from app.work_order_embeddings e
  join app.work_orders wo
    on wo.id = e.work_order_id
   and wo.tenant_id = e.tenant_id
  where e.tenant_id = authz.get_current_tenant_id()
    and authz.is_tenant_member(auth.uid(), e.tenant_id)
    and wo.completed_at is not null
    and wo.id != p_work_order_id
    and (
      p_min_similarity is null
      or (1 - (e.embedding <=> v_embedding))::float >= p_min_similarity
    )
  order by e.embedding <=> v_embedding
  limit least(greatest(coalesce(p_limit, 5), 1), 50);
end;
$$;

comment on function public.rpc_similar_past_work_orders_by_work_order_id(uuid, int, float) is
  'Similar Past Fixes by work order ID using stored embedding only (no OpenAI). Returns completed work orders in the same tenant most similar to the given work order. If the work order has no embedding, returns no rows. p_limit 1–50 default 5, p_min_similarity in [0,1] default 0.5.';

revoke all on function public.rpc_similar_past_work_orders_by_work_order_id(uuid, int, float) from public;
grant execute on function public.rpc_similar_past_work_orders_by_work_order_id(uuid, int, float) to authenticated;
