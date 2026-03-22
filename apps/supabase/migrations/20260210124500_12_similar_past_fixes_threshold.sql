-- SPDX-License-Identifier: AGPL-3.0-or-later
--
-- Migration: Similar Past Fixes Search Threshold
--
-- Purpose
-- -------
-- Improve the quality of \"Similar Past Fixes\" results by:
-- - Adding an optional minimum similarity parameter to rpc_similar_past_work_orders.
-- - Defaulting to a conservative threshold (0.5) so only clearly relevant
--   matches are returned unless the caller overrides it.
--
-- Notes
-- -----
-- - p_min_similarity is the cosine-based similarity score in [0,1].
-- - Existing callers that do not pass p_min_similarity continue to work and
--   now benefit from a default threshold.

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
  similarity_score float
)
language plpgsql
stable
security definer
set search_path = ''
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

  p_limit := least(greatest(coalesce(p_limit, 5), 1), 50);

  return query
  select
    wo.id as work_order_id,
    wo.title,
    wo.description,
    wo.status,
    wo.completed_at,
    (1 - (e.embedding <=> p_query_embedding))::float as similarity_score
  from app.work_order_embeddings e
  join app.work_orders wo on wo.id = e.work_order_id and wo.tenant_id = e.tenant_id
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
  'Experiment: Returns completed work orders most similar to the query embedding (cosine). Scoped to current tenant. p_min_similarity (default 0.5) filters out low-confidence matches based on similarity_score in [0,1].';

revoke all on function public.rpc_similar_past_work_orders(vector(1536), int, uuid, float) from public;
grant execute on function public.rpc_similar_past_work_orders(vector(1536), int, uuid, float) to authenticated;

