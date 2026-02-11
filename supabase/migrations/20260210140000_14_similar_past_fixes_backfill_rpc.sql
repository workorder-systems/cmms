-- SPDX-License-Identifier: AGPL-3.0-or-later
--
-- Migration: Similar Past Fixes Backfill RPC
--
-- Purpose
-- -------
-- Add rpc_backfill_upsert_work_order_embedding for the cron backfill Edge Function.
-- The backfill uses service role and must upsert into app.work_order_embeddings
-- without exposing the app schema. This RPC is granted to service_role only.
--
-- The RPC validates that the work order exists and belongs to the given tenant,
-- then upserts the embedding. No user auth is required (trusted service role).

-- ============================================================================
-- RPC: rpc_backfill_upsert_work_order_embedding
-- ============================================================================
-- Used by the similar-past-fixes-backfill Edge Function (cron). Caller must use
-- service role key. Validates work order exists and tenant matches, then upserts.

create or replace function public.rpc_backfill_upsert_work_order_embedding(
  p_work_order_id uuid,
  p_tenant_id uuid,
  p_embedding vector(1536),
  p_source_text text default null,
  p_model_name text default null,
  p_model_version text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant_id uuid;
begin
  /* Validate work order exists and belongs to the given tenant */
  select tenant_id into v_tenant_id
  from app.work_orders
  where id = p_work_order_id;

  if v_tenant_id is null then
    raise exception using
      message = 'Work order not found',
      errcode = '23503';
  end if;

  if v_tenant_id != p_tenant_id then
    raise exception using
      message = 'Work order tenant mismatch',
      errcode = '23503';
  end if;

  insert into app.work_order_embeddings (
    work_order_id,
    tenant_id,
    embedding,
    source_text,
    model_name,
    model_version,
    embedded_at
  )
  values (
    p_work_order_id,
    p_tenant_id,
    p_embedding,
    p_source_text,
    p_model_name,
    p_model_version,
    pg_catalog.now()
  )
  on conflict (work_order_id) do update
  set
    embedding = excluded.embedding,
    source_text = coalesce(excluded.source_text, app.work_order_embeddings.source_text),
    model_name = coalesce(excluded.model_name, app.work_order_embeddings.model_name),
    model_version = coalesce(excluded.model_version, app.work_order_embeddings.model_version),
    embedded_at = pg_catalog.now(),
    updated_at = pg_catalog.now();
end;
$$;

comment on function public.rpc_backfill_upsert_work_order_embedding(uuid, uuid, vector(1536), text, text, text) is
  'Backfill: Upserts a work order embedding. Service role only. Validates work order exists and tenant matches.';

revoke all on function public.rpc_backfill_upsert_work_order_embedding(uuid, uuid, vector(1536), text, text, text) from public;
grant execute on function public.rpc_backfill_upsert_work_order_embedding(uuid, uuid, vector(1536), text, text, text) to service_role;
