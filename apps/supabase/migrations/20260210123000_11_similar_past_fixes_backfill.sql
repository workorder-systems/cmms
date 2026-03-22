-- SPDX-License-Identifier: AGPL-3.0-or-later
--
-- Migration: Similar Past Fixes Backfill & Cron Support
--
-- Purpose
-- -------
-- Extend the Similar Past Fixes experiment with:
-- - Embedding lifecycle metadata on app.work_order_embeddings
-- - A helper RPC to fetch completed work orders that lack embeddings
--   for use by cron/backfill Edge Functions.
--
-- This migration is safe to apply on databases that already ran the
-- initial Similar Past Fixes migration:
-- - Columns are added with IF NOT EXISTS.
-- - Functions are created or replaced with compatible definitions.

-- ============================================================================
-- Embedding lifecycle metadata on app.work_order_embeddings
-- ============================================================================

alter table app.work_order_embeddings
  add column if not exists model_name text;

alter table app.work_order_embeddings
  add column if not exists model_version text;

alter table app.work_order_embeddings
  add column if not exists embedded_at timestamptz;

comment on column app.work_order_embeddings.model_name is
  'Name of the embedding model used when this embedding was computed (e.g. openai:text-embedding-3-small).';

comment on column app.work_order_embeddings.model_version is
  'Logical version tag for the embedding model (e.g. v1, 2026-02-10). Used to drive re-embedding when models change.';

comment on column app.work_order_embeddings.embedded_at is
  'Timestamp when this embedding was computed. Used to reason about staleness and backfill progress.';

-- ============================================================================
-- Helper RPC: rpc_next_work_orders_for_embedding
-- ============================================================================
-- Used by cron/backfill jobs to find a batch of completed work orders that
-- do not yet have embeddings. Security definer with direct access to app.*

-- tables; callers should still be trusted (e.g. service role or backend).
--
-- Drop first when changing return type (Postgres does not allow changing
-- OUT/return type with create or replace).

drop function if exists public.rpc_next_work_orders_for_embedding(int);

create or replace function public.rpc_next_work_orders_for_embedding(
  p_limit int default 50
)
returns table (
  work_order_id uuid,
  tenant_id uuid,
  title text,
  description text,
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
  'Returns up to p_limit completed work orders that do not yet have embeddings, for use by backfill/cron jobs. Uses a left join on app.work_order_embeddings and orders by completed_at DESC. Also returns asset_name and location_name (if available) to enrich embedding text.';

revoke all on function public.rpc_next_work_orders_for_embedding(int) from public;
grant execute on function public.rpc_next_work_orders_for_embedding(int) to authenticated;

