-- 20260216120000_get_work_order_embedding_rpc.sql
--
-- Purpose: Allow Similar Past Fixes search-by-work-order to use the stored
--   embedding when present, avoiding an OpenAI call.
-- Affected: New RPC public.rpc_get_work_order_embedding.
--
-- When the client searches by workOrderId, the Edge Function can call this RPC
-- first. If the work order already has an embedding (e.g. from backfill), the
-- function returns it and the Edge Function skips the embed() call.

create or replace function public.rpc_get_work_order_embedding(p_work_order_id uuid)
returns vector(1536)
language plpgsql
stable
security definer
set search_path = public, app, authz, extensions
as $$
declare
  v_embedding app.work_order_embeddings.embedding%type;
begin
  perform authz.validate_authenticated();

  select e.embedding into v_embedding
  from app.work_order_embeddings e
  where e.work_order_id = p_work_order_id
    and authz.is_tenant_member(auth.uid(), e.tenant_id)
  limit 1;

  return v_embedding;
end;
$$;

comment on function public.rpc_get_work_order_embedding(uuid) is
  'Returns the stored embedding for a work order if it exists and the caller is a member of that work order''s tenant. Used by Similar Past Fixes search to skip OpenAI when the work order is already embedded.';

revoke all on function public.rpc_get_work_order_embedding(uuid) from public;
grant execute on function public.rpc_get_work_order_embedding(uuid) to authenticated;
