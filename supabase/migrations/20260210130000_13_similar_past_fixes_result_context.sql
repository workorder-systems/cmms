-- 20260210130000_13_similar_past_fixes_result_context.sql
-- 
-- Purpose:
--   Enrich the "Similar Past Fixes" experiment results with additional context
--   so that callers can understand why a work order was suggested without
--   performing extra lookups.
--
-- Changes:
--   - Redefine public.rpc_similar_past_work_orders to:
--       * Preserve existing behaviour and parameters, including p_min_similarity.
--       * Extend the returned columns with asset_id and location_id.
--       * Continue to enforce tenant isolation via authz helpers and RLS.
--
-- Notes:
--   - This migration is backward-compatible. Existing callers that ignore the
--     new columns will continue to work unchanged.

set check_function_bodies = off;

-- Postgres does not allow changing the return type (out parameters) using
-- create or replace. Drop first so we can extend the returned columns.
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
  location_id uuid
)
language plpgsql
stable
security definer
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
    wo.location_id
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
  'Experiment: Returns completed work orders most similar to the query embedding (cosine). Scoped to current tenant. Includes asset_id and location_id for explainability. p_min_similarity (default 0.5) filters out low-confidence matches based on similarity_score in [0,1].';

revoke all on function public.rpc_similar_past_work_orders(vector(1536), int, uuid, float) from public;
grant execute on function public.rpc_similar_past_work_orders(vector(1536), int, uuid, float) to authenticated;

