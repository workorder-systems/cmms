-- SPDX-License-Identifier: AGPL-3.0-or-later
--
-- Migration: Similar Past Fixes Experiment (Individual Experiment A)
--
-- Purpose: Enable semantic "similar past fixes" for work orders using pgvector.
-- Affected: New extension (vector), new table app.work_order_embeddings,
--   new RPCs rpc_upsert_work_order_embedding and rpc_similar_past_work_orders.
--
-- Experiment goals:
--   - Embed completed work orders (title + description; cause/resolution when available).
--   - Store embeddings in a tenant-isolated table with RLS.
--   - On creation or update of a work order, clients can retrieve the most similar
--     completed jobs via rpc_similar_past_work_orders(p_query_embedding, p_limit).
--
-- Embedding dimension: 1536 (OpenAI text-embedding-3-small / ada-002). Use the same
-- dimension for your embedding model or migrate the column if you switch models.
--
-- ============================================================================
-- Extension: pgvector
-- ============================================================================
-- Use default schema (public) so Supabase dashboard-enabled vector works.
-- Dimension 1536 matches OpenAI text-embedding-3-small / ada-002.

create extension if not exists vector;

comment on extension vector is 'pgvector: similarity search and AI embeddings. Used by Similar Past Fixes experiment (work_order_embeddings).';

-- ============================================================================
-- ============================================================================
-- Stores one embedding per work order. Intended for completed work orders only,
-- so that "similar past fixes" searches only consider finished jobs.
-- Application (or Edge Function) computes the embedding and calls
-- rpc_upsert_work_order_embedding. Source text is optional but useful for
-- debugging and for re-embedding when the model changes.
-- Embedding lifecycle:
--   - Indexing can happen on work order completion, via cron backfill, or both.
--   - Re-embedding can be triggered when text changes or when the model version
--     changes, using the model_name/model_version/embedded_at metadata.

create table app.work_order_embeddings (
  id bigint generated always as identity primary key,
  work_order_id uuid not null references app.work_orders(id) on delete cascade,
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  embedding vector(1536) not null,
  source_text text,
  model_name text,
  model_version text,
  embedded_at timestamptz,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint work_order_embeddings_work_order_unique unique (work_order_id)
);

comment on table app.work_order_embeddings is 'Experiment: Stores vector embeddings for work orders to power semantic "similar past fixes" suggestions. One row per work order. Embeddings are computed by the application (e.g. OpenAI) and upserted via rpc_upsert_work_order_embedding. Only completed work orders should be embedded for similarity search. Tenant isolation enforced by RLS.';
comment on column app.work_order_embeddings.embedding is 'Vector embedding of work order text (e.g. title + description). Dimension must match embedding model (1536 for OpenAI ada-002 / text-embedding-3-small).';
comment on column app.work_order_embeddings.source_text is 'Optional copy of the text that was embedded. Used for debugging and for re-embedding when the model changes.';
comment on column app.work_order_embeddings.model_name is 'Name of the embedding model used when this embedding was computed (e.g. openai:text-embedding-3-small).';
comment on column app.work_order_embeddings.model_version is 'Logical version tag for the embedding model (e.g. v1, 2026-02-09). Used to drive re-embedding when models change.';
comment on column app.work_order_embeddings.embedded_at is 'Timestamp when this embedding was computed. Used to reason about staleness and backfill progress.';

create index work_order_embeddings_tenant_idx
  on app.work_order_embeddings (tenant_id);

create index work_order_embeddings_work_order_idx
  on app.work_order_embeddings (work_order_id);

-- HNSW index for fast approximate nearest-neighbor search (cosine distance).
-- RLS will filter by tenant_id; the planner can use this index for the ORDER BY embedding <=> $1.
create index work_order_embeddings_embedding_hnsw_idx
  on app.work_order_embeddings
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

create trigger work_order_embeddings_set_updated_at
  before update on app.work_order_embeddings
  for each row
  execute function util.set_updated_at();

alter table app.work_order_embeddings enable row level security;

-- ============================================================================
-- RLS Policies: app.work_order_embeddings
-- ============================================================================
-- Same tenant-membership pattern as work_orders: users can only see and modify
-- embeddings for work orders in tenants they belong to.

create policy work_order_embeddings_select_tenant
  on app.work_order_embeddings
  for select
  to authenticated
  using (authz.is_current_user_tenant_member(tenant_id));

create policy work_order_embeddings_select_anon
  on app.work_order_embeddings
  for select
  to anon
  using (false);

create policy work_order_embeddings_insert_tenant
  on app.work_order_embeddings
  for insert
  to authenticated
  with check (authz.is_current_user_tenant_member(tenant_id));

create policy work_order_embeddings_insert_anon
  on app.work_order_embeddings
  for insert
  to anon
  with check (false);

create policy work_order_embeddings_update_tenant
  on app.work_order_embeddings
  for update
  to authenticated
  using (authz.is_current_user_tenant_member(tenant_id))
  with check (authz.is_current_user_tenant_member(tenant_id));

create policy work_order_embeddings_update_anon
  on app.work_order_embeddings
  for update
  to anon
  using (false)
  with check (false);

create policy work_order_embeddings_delete_tenant
  on app.work_order_embeddings
  for delete
  to authenticated
  using (authz.is_current_user_tenant_member(tenant_id));

create policy work_order_embeddings_delete_anon
  on app.work_order_embeddings
  for delete
  to anon
  using (false);

comment on policy work_order_embeddings_select_tenant on app.work_order_embeddings is
  'Authenticated users can select embeddings only for tenants they are members of.';
comment on policy work_order_embeddings_insert_tenant on app.work_order_embeddings is
  'Authenticated users can insert embeddings only for their tenants.';
comment on policy work_order_embeddings_update_tenant on app.work_order_embeddings is
  'Authenticated users can update embeddings only for their tenants.';
comment on policy work_order_embeddings_delete_tenant on app.work_order_embeddings is
  'Authenticated users can delete embeddings only for their tenants.';

-- ============================================================================
-- Validation: work order must belong to tenant and be completed for embedding
-- ============================================================================

create function util.validate_work_order_embedding_work_order()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_wo_tenant_id uuid;
  v_wo_completed_at timestamptz;
begin
  select tenant_id, completed_at
  into v_wo_tenant_id, v_wo_completed_at
  from app.work_orders
  where id = new.work_order_id;

  if v_wo_tenant_id is null then
    raise exception using
      message = 'Work order not found',
      errcode = '23503';
  end if;

  if v_wo_tenant_id != new.tenant_id then
    raise exception using
      message = 'work_order_embeddings.tenant_id must match work_orders.tenant_id',
      errcode = '23503';
  end if;

  /* Experiment: only allow embeddings for completed work orders so similarity
     search returns only "past fixes". Uncomment to enforce:
  if v_wo_completed_at is null then
    raise exception using
      message = 'Embeddings are only allowed for completed work orders',
      errcode = '23514';
  end if;
  */
  return new;
end;
$$;

comment on function util.validate_work_order_embedding_work_order() is
  'Ensures work_order_embeddings.tenant_id matches the work order and optionally that the work order is completed.';

revoke all on function util.validate_work_order_embedding_work_order() from public;
grant execute on function util.validate_work_order_embedding_work_order() to postgres;

create trigger work_order_embeddings_validate_work_order
  before insert or update on app.work_order_embeddings
  for each row
  execute function util.validate_work_order_embedding_work_order();

-- ============================================================================
-- RPC: rpc_upsert_work_order_embedding
-- ============================================================================
-- Called by the application after computing an embedding (e.g. from title + description).
-- Verifies the work order belongs to the current tenant and the user has access.

create or replace function public.rpc_upsert_work_order_embedding(
  p_work_order_id uuid,
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
  v_user_id uuid;
begin
  v_user_id := authz.validate_authenticated();

  select tenant_id into v_tenant_id
  from app.work_orders
  where id = p_work_order_id;

  if v_tenant_id is null then
    raise exception using
      message = 'Work order not found',
      errcode = '23503';
  end if;

  if not authz.is_tenant_member(v_user_id, v_tenant_id) then
    raise exception using
      message = 'Work order not found',
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
    v_tenant_id,
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

comment on function public.rpc_upsert_work_order_embedding(uuid, vector(1536), text, text, text) is
  'Experiment: Upserts a vector embedding for a work order. Call after computing the embedding (e.g. from title + description) in the application. Enforces tenant membership. Optional model_name/model_version fields allow tracking which embedding model was used.';

revoke all on function public.rpc_upsert_work_order_embedding(uuid, vector(1536), text, text, text) from public;
grant execute on function public.rpc_upsert_work_order_embedding(uuid, vector(1536), text, text, text) to authenticated;

-- ============================================================================
-- Helper RPC: rpc_next_work_orders_for_embedding
-- ============================================================================
-- Used by backfill/cron jobs to find a batch of completed work orders that
-- do not yet have embeddings. Security definer with direct access to app.*
-- tables; callers should still be trusted (e.g. service role).

create or replace function public.rpc_next_work_orders_for_embedding(
  p_limit int default 50
)
returns table (
  work_order_id uuid,
  tenant_id uuid,
  title text,
  description text
)
language sql
security definer
set search_path = ''
as $$
  select
    w.id as work_order_id,
    w.tenant_id,
    w.title,
    w.description
  from app.work_orders w
  left join app.work_order_embeddings e
    on e.work_order_id = w.id
  where w.completed_at is not null
    and e.work_order_id is null
  order by w.completed_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 500);
$$;

comment on function public.rpc_next_work_orders_for_embedding(int) is
  'Returns up to p_limit completed work orders that do not yet have embeddings, for use by backfill/cron jobs. Uses a simple left join on app.work_order_embeddings and orders by completed_at DESC.';

revoke all on function public.rpc_next_work_orders_for_embedding(int) from public;
grant execute on function public.rpc_next_work_orders_for_embedding(int) to authenticated;

-- ============================================================================
-- RPC: rpc_similar_past_work_orders
-- ============================================================================
-- Returns completed work orders in the current tenant whose embeddings are
-- closest to the query embedding (cosine similarity). Used to show "Similar
-- past fixes" when creating or editing a work order.
-- p_exclude_work_order_id: optional; exclude this work order from results
--   (e.g. when editing an existing WO so it does not match itself).

create or replace function public.rpc_similar_past_work_orders(
  p_query_embedding vector(1536),
  p_limit int default 5,
  p_exclude_work_order_id uuid default null
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
  order by e.embedding <=> p_query_embedding
  limit p_limit;
end;
$$;

comment on function public.rpc_similar_past_work_orders(vector(1536), int, uuid) is
  'Experiment: Returns completed work orders most similar to the query embedding (cosine). Scoped to current tenant. Use for "Similar past fixes" suggestions. Client must compute the query embedding from the current title/description.';

revoke all on function public.rpc_similar_past_work_orders(vector(1536), int, uuid) from public;
grant execute on function public.rpc_similar_past_work_orders(vector(1536), int, uuid) to authenticated;

-- ============================================================================
-- Grants
-- ============================================================================

grant select on app.work_order_embeddings to authenticated;
grant select on app.work_order_embeddings to anon;

grant insert on app.work_order_embeddings to authenticated;
grant update on app.work_order_embeddings to authenticated;
grant delete on app.work_order_embeddings to authenticated;

alter table app.work_order_embeddings force row level security;
