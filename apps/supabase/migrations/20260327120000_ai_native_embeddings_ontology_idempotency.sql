-- SPDX-License-Identifier: AGPL-3.0-or-later
--
-- Migration: AI-native CMMS — pgvector work order + asset + part embeddings,
--   cross-CMMS entity aliases and candidate search, idempotency ledger.
--
-- Purpose: Restore semantic search (dropped in 20260322163000), extend with
--   content_hash, embedding_profile, batch upsert; add asset/part embedding
--   tables and similarity RPCs; ontology aliases; optional idempotency keys
--   for agent-safe writes.
--
-- Embedding API calls remain outside Postgres (Supabase Edge Functions).

set check_function_bodies = off;

-- ============================================================================
-- 1. pgvector extension
-- ============================================================================

create extension if not exists vector;

comment on extension vector is
  'pgvector: tenant-scoped embeddings for semantic CMMS search (work orders, assets, parts).';

-- ============================================================================
-- 2. Work order embeddings (with content_hash + embedding_profile)
-- ============================================================================

create table app.work_order_embeddings (
  id bigint generated always as identity primary key,
  work_order_id uuid not null references app.work_orders (id) on delete cascade,
  tenant_id uuid not null references app.tenants (id) on delete cascade,
  embedding vector(1536) not null,
  source_text text,
  model_name text,
  model_version text,
  embedded_at timestamptz,
  content_hash text,
  embedding_profile text,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint work_order_embeddings_work_order_unique unique (work_order_id)
);

comment on table app.work_order_embeddings is
  'Vector embeddings for work orders (semantic similar-past search). Populated by Edge Functions; Postgres stores vectors only.';
comment on column app.work_order_embeddings.content_hash is
  'Hash of canonical source text; skip re-embed in Edge when unchanged.';
comment on column app.work_order_embeddings.embedding_profile is
  'Logical profile (e.g. openai_3small_1536_v1) for model migrations.';

create index work_order_embeddings_tenant_idx on app.work_order_embeddings (tenant_id);
create index work_order_embeddings_work_order_idx on app.work_order_embeddings (work_order_id);
create index work_order_embeddings_embedding_hnsw_idx
  on app.work_order_embeddings
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

create trigger work_order_embeddings_set_updated_at
  before update on app.work_order_embeddings
  for each row
  execute function util.set_updated_at();

alter table app.work_order_embeddings enable row level security;

create policy work_order_embeddings_select_tenant
  on app.work_order_embeddings for select to authenticated
  using (authz.is_current_user_tenant_member(tenant_id));
create policy work_order_embeddings_select_anon
  on app.work_order_embeddings for select to anon using (false);
create policy work_order_embeddings_insert_tenant
  on app.work_order_embeddings for insert to authenticated
  with check (authz.is_current_user_tenant_member(tenant_id));
create policy work_order_embeddings_insert_anon
  on app.work_order_embeddings for insert to anon with check (false);
create policy work_order_embeddings_update_tenant
  on app.work_order_embeddings for update to authenticated
  using (authz.is_current_user_tenant_member(tenant_id))
  with check (authz.is_current_user_tenant_member(tenant_id));
create policy work_order_embeddings_update_anon
  on app.work_order_embeddings for update to anon using (false) with check (false);
create policy work_order_embeddings_delete_tenant
  on app.work_order_embeddings for delete to authenticated
  using (authz.is_current_user_tenant_member(tenant_id));
create policy work_order_embeddings_delete_anon
  on app.work_order_embeddings for delete to anon using (false);

create function util.validate_work_order_embedding_work_order()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_wo_tenant_id uuid;
begin
  select tenant_id into v_wo_tenant_id
  from app.work_orders
  where id = new.work_order_id;

  if v_wo_tenant_id is null then
    raise exception using message = 'Work order not found', errcode = '23503';
  end if;

  if v_wo_tenant_id != new.tenant_id then
    raise exception using
      message = 'work_order_embeddings.tenant_id must match work_orders.tenant_id',
      errcode = '23503';
  end if;

  return new;
end;
$$;

revoke all on function util.validate_work_order_embedding_work_order() from public;
grant execute on function util.validate_work_order_embedding_work_order() to postgres;

create trigger work_order_embeddings_validate_work_order
  before insert or update on app.work_order_embeddings
  for each row
  execute function util.validate_work_order_embedding_work_order();

-- ============================================================================
-- 3. Asset embeddings
-- ============================================================================

create table app.asset_embeddings (
  id bigint generated always as identity primary key,
  asset_id uuid not null references app.assets (id) on delete cascade,
  tenant_id uuid not null references app.tenants (id) on delete cascade,
  embedding vector(1536) not null,
  source_text text,
  model_name text,
  model_version text,
  embedded_at timestamptz,
  content_hash text,
  embedding_profile text,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint asset_embeddings_asset_unique unique (asset_id)
);

comment on table app.asset_embeddings is
  'Semantic embeddings for assets (name/description context).';

create index asset_embeddings_tenant_idx on app.asset_embeddings (tenant_id);
create index asset_embeddings_hnsw_idx
  on app.asset_embeddings
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

create trigger asset_embeddings_set_updated_at
  before update on app.asset_embeddings
  for each row
  execute function util.set_updated_at();

alter table app.asset_embeddings enable row level security;

create policy asset_embeddings_select_tenant
  on app.asset_embeddings for select to authenticated
  using (authz.is_current_user_tenant_member(tenant_id));
create policy asset_embeddings_select_anon on app.asset_embeddings for select to anon using (false);
create policy asset_embeddings_insert_tenant
  on app.asset_embeddings for insert to authenticated
  with check (authz.is_current_user_tenant_member(tenant_id));
create policy asset_embeddings_insert_anon on app.asset_embeddings for insert to anon with check (false);
create policy asset_embeddings_update_tenant
  on app.asset_embeddings for update to authenticated
  using (authz.is_current_user_tenant_member(tenant_id))
  with check (authz.is_current_user_tenant_member(tenant_id));
create policy asset_embeddings_update_anon on app.asset_embeddings for update to anon using (false) with check (false);
create policy asset_embeddings_delete_tenant
  on app.asset_embeddings for delete to authenticated
  using (authz.is_current_user_tenant_member(tenant_id));
create policy asset_embeddings_delete_anon on app.asset_embeddings for delete to anon using (false);

create function util.validate_asset_embedding_asset()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tid uuid;
begin
  select tenant_id into v_tid from app.assets where id = new.asset_id;
  if v_tid is null then
    raise exception using message = 'Asset not found', errcode = '23503';
  end if;
  if v_tid != new.tenant_id then
    raise exception using message = 'asset_embeddings.tenant_id mismatch', errcode = '23503';
  end if;
  return new;
end;
$$;

revoke all on function util.validate_asset_embedding_asset() from public;
grant execute on function util.validate_asset_embedding_asset() to postgres;

create trigger asset_embeddings_validate_asset
  before insert or update on app.asset_embeddings
  for each row
  execute function util.validate_asset_embedding_asset();

-- ============================================================================
-- 4. Part embeddings
-- ============================================================================

create table app.part_embeddings (
  id bigint generated always as identity primary key,
  part_id uuid not null references app.parts (id) on delete cascade,
  tenant_id uuid not null references app.tenants (id) on delete cascade,
  embedding vector(1536) not null,
  source_text text,
  model_name text,
  model_version text,
  embedded_at timestamptz,
  content_hash text,
  embedding_profile text,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint part_embeddings_part_unique unique (part_id)
);

comment on table app.part_embeddings is
  'Semantic embeddings for parts (description/part number context).';

create index part_embeddings_tenant_idx on app.part_embeddings (tenant_id);
create index part_embeddings_hnsw_idx
  on app.part_embeddings
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

create trigger part_embeddings_set_updated_at
  before update on app.part_embeddings
  for each row
  execute function util.set_updated_at();

alter table app.part_embeddings enable row level security;

create policy part_embeddings_select_tenant
  on app.part_embeddings for select to authenticated
  using (authz.is_current_user_tenant_member(tenant_id));
create policy part_embeddings_select_anon on app.part_embeddings for select to anon using (false);
create policy part_embeddings_insert_tenant
  on app.part_embeddings for insert to authenticated
  with check (authz.is_current_user_tenant_member(tenant_id));
create policy part_embeddings_insert_anon on app.part_embeddings for insert to anon with check (false);
create policy part_embeddings_update_tenant
  on app.part_embeddings for update to authenticated
  using (authz.is_current_user_tenant_member(tenant_id))
  with check (authz.is_current_user_tenant_member(tenant_id));
create policy part_embeddings_update_anon on app.part_embeddings for update to anon using (false) with check (false);
create policy part_embeddings_delete_tenant
  on app.part_embeddings for delete to authenticated
  using (authz.is_current_user_tenant_member(tenant_id));
create policy part_embeddings_delete_anon on app.part_embeddings for delete to anon using (false);

create function util.validate_part_embedding_part()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tid uuid;
begin
  select tenant_id into v_tid from app.parts where id = new.part_id;
  if v_tid is null then
    raise exception using message = 'Part not found', errcode = '23503';
  end if;
  if v_tid != new.tenant_id then
    raise exception using message = 'part_embeddings.tenant_id mismatch', errcode = '23503';
  end if;
  return new;
end;
$$;

revoke all on function util.validate_part_embedding_part() from public;
grant execute on function util.validate_part_embedding_part() to postgres;

create trigger part_embeddings_validate_part
  before insert or update on app.part_embeddings
  for each row
  execute function util.validate_part_embedding_part();

-- ============================================================================
-- 5. Ontology: entity aliases
-- ============================================================================

create table app.entity_aliases (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references app.tenants (id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  alias_text citext not null,
  created_at timestamptz not null default pg_catalog.now(),
  constraint entity_aliases_type_check check (entity_type ~ '^[a-z][a-z0-9_]*$'),
  constraint entity_aliases_alias_len check (
    length(trim(alias_text::text)) >= 1
    and length(alias_text::text) <= 500
  ),
  constraint entity_aliases_unique unique (tenant_id, entity_type, alias_text)
);

comment on table app.entity_aliases is
  'Tenant-scoped aliases for CMMS entities (assets, parts, locations, etc.) for agent/human resolution.';

create index entity_aliases_tenant_idx on app.entity_aliases (tenant_id);
create index entity_aliases_lookup_idx on app.entity_aliases (tenant_id, entity_type);

alter table app.entity_aliases enable row level security;

create policy entity_aliases_select_tenant
  on app.entity_aliases for select to authenticated
  using (authz.is_current_user_tenant_member(tenant_id));
create policy entity_aliases_select_anon on app.entity_aliases for select to anon using (false);
create policy entity_aliases_insert_tenant
  on app.entity_aliases for insert to authenticated
  with check (authz.is_current_user_tenant_member(tenant_id));
create policy entity_aliases_insert_anon on app.entity_aliases for insert to anon with check (false);
create policy entity_aliases_update_tenant
  on app.entity_aliases for update to authenticated
  using (authz.is_current_user_tenant_member(tenant_id))
  with check (authz.is_current_user_tenant_member(tenant_id));
create policy entity_aliases_update_anon on app.entity_aliases for update to anon using (false) with check (false);
create policy entity_aliases_delete_tenant
  on app.entity_aliases for delete to authenticated
  using (authz.is_current_user_tenant_member(tenant_id));
create policy entity_aliases_delete_anon on app.entity_aliases for delete to anon using (false);

-- ============================================================================
-- 6. Idempotency ledger (agent-proof writes)
-- ============================================================================

create table app.client_idempotency (
  tenant_id uuid not null references app.tenants (id) on delete cascade,
  scope text not null,
  idempotency_key text not null,
  resource_id uuid,
  created_at timestamptz not null default pg_catalog.now(),
  constraint client_idempotency_scope_check check (
    length(scope) >= 1
    and length(scope) <= 128
  ),
  constraint client_idempotency_key_check check (
    length(idempotency_key) >= 1
    and length(idempotency_key) <= 256
  ),
  primary key (tenant_id, scope, idempotency_key)
);

comment on table app.client_idempotency is
  'Records idempotent write attempts per tenant/scope/key. Apps insert after successful create; retries see existing row.';

alter table app.client_idempotency enable row level security;

create policy client_idempotency_select_tenant
  on app.client_idempotency for select to authenticated
  using (authz.is_current_user_tenant_member(tenant_id));
create policy client_idempotency_select_anon on app.client_idempotency for select to anon using (false);
create policy client_idempotency_insert_tenant
  on app.client_idempotency for insert to authenticated
  with check (authz.is_current_user_tenant_member(tenant_id));
create policy client_idempotency_insert_anon on app.client_idempotency for insert to anon with check (false);
create policy client_idempotency_delete_tenant
  on app.client_idempotency for delete to authenticated
  using (authz.is_current_user_tenant_member(tenant_id));
create policy client_idempotency_delete_anon on app.client_idempotency for delete to anon using (false);
create policy client_idempotency_update_tenant
  on app.client_idempotency for update to authenticated
  using (false)
  with check (false);
create policy client_idempotency_update_anon
  on app.client_idempotency for update to anon using (false) with check (false);

-- ============================================================================
-- 7. RPC: work order embedding upsert + batch + similar + get + next
-- ============================================================================

create or replace function public.rpc_upsert_work_order_embedding(
  p_work_order_id uuid,
  p_embedding vector(1536),
  p_source_text text default null,
  p_model_name text default null,
  p_model_version text default null,
  p_content_hash text default null,
  p_embedding_profile text default null
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
    raise exception using message = 'Work order not found', errcode = '23503';
  end if;

  if not authz.is_tenant_member(v_user_id, v_tenant_id) then
    raise exception using message = 'Work order not found', errcode = '23503';
  end if;

  insert into app.work_order_embeddings (
    work_order_id,
    tenant_id,
    embedding,
    source_text,
    model_name,
    model_version,
    embedded_at,
    content_hash,
    embedding_profile
  )
  values (
    p_work_order_id,
    v_tenant_id,
    p_embedding,
    p_source_text,
    p_model_name,
    p_model_version,
    pg_catalog.now(),
    p_content_hash,
    p_embedding_profile
  )
  on conflict (work_order_id) do update
  set
    embedding = excluded.embedding,
    source_text = coalesce(excluded.source_text, app.work_order_embeddings.source_text),
    model_name = coalesce(excluded.model_name, app.work_order_embeddings.model_name),
    model_version = coalesce(excluded.model_version, app.work_order_embeddings.model_version),
    embedded_at = pg_catalog.now(),
    content_hash = coalesce(excluded.content_hash, app.work_order_embeddings.content_hash),
    embedding_profile = coalesce(excluded.embedding_profile, app.work_order_embeddings.embedding_profile),
    updated_at = pg_catalog.now();
end;
$$;

comment on function public.rpc_upsert_work_order_embedding(uuid, vector(1536), text, text, text, text, text) is
  'Upserts work order embedding; optional content_hash and embedding_profile for modular Edge pipelines.';

revoke all on function public.rpc_upsert_work_order_embedding(uuid, vector(1536), text, text, text, text, text) from public;
grant execute on function public.rpc_upsert_work_order_embedding(uuid, vector(1536), text, text, text, text, text) to authenticated;

create or replace function public.rpc_batch_upsert_work_order_embeddings(p_rows jsonb)
returns int
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid;
  v_tenant_id uuid;
  v_count int := 0;
  rec record;
  v_wo uuid;
  v_emb vector(1536);
  v_wot uuid;
begin
  v_user_id := authz.validate_authenticated();
  v_tenant_id := authz.get_current_tenant_id();

  if v_tenant_id is null then
    raise exception using
      message = 'Tenant context required. Call rpc_set_tenant_context first.',
      errcode = 'P0001';
  end if;

  if not authz.is_tenant_member(v_user_id, v_tenant_id) then
    raise exception using message = 'Unauthorized', errcode = '42501';
  end if;

  if p_rows is null or jsonb_typeof(p_rows) != 'array' then
    raise exception using message = 'p_rows must be a JSON array', errcode = '22000';
  end if;

  for rec in select elem from jsonb_array_elements(p_rows) as t(elem)
  loop
    v_wo := (rec.elem->>'work_order_id')::uuid;
    v_emb := (rec.elem->>'embedding')::vector(1536);

    select tenant_id into v_wot from app.work_orders where id = v_wo;
    if v_wot is null or v_wot != v_tenant_id then
      continue;
    end if;

    insert into app.work_order_embeddings (
      work_order_id,
      tenant_id,
      embedding,
      source_text,
      model_name,
      model_version,
      embedded_at,
      content_hash,
      embedding_profile
    )
    values (
      v_wo,
      v_tenant_id,
      v_emb,
      rec.elem->>'source_text',
      rec.elem->>'model_name',
      rec.elem->>'model_version',
      pg_catalog.now(),
      rec.elem->>'content_hash',
      rec.elem->>'embedding_profile'
    )
    on conflict (work_order_id) do update
    set
      embedding = excluded.embedding,
      source_text = coalesce(excluded.source_text, app.work_order_embeddings.source_text),
      model_name = coalesce(excluded.model_name, app.work_order_embeddings.model_name),
      model_version = coalesce(excluded.model_version, app.work_order_embeddings.model_version),
      embedded_at = pg_catalog.now(),
      content_hash = coalesce(excluded.content_hash, app.work_order_embeddings.content_hash),
      embedding_profile = coalesce(excluded.embedding_profile, app.work_order_embeddings.embedding_profile),
      updated_at = pg_catalog.now();

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

comment on function public.rpc_batch_upsert_work_order_embeddings(jsonb) is
  'Batch upsert work order embeddings for Edge indexers. Each element: work_order_id, embedding (vector text), optional source_text, model_*, content_hash, embedding_profile.';

revoke all on function public.rpc_batch_upsert_work_order_embeddings(jsonb) from public;
grant execute on function public.rpc_batch_upsert_work_order_embeddings(jsonb) to authenticated;

create or replace function public.rpc_get_work_order_embedding(p_work_order_id uuid)
returns vector(1536)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_emb vector(1536);
begin
  v_user_id := authz.validate_authenticated();

  select e.embedding into v_emb
  from app.work_order_embeddings e
  join app.work_orders w on w.id = e.work_order_id and w.tenant_id = e.tenant_id
  where e.work_order_id = p_work_order_id
    and authz.is_tenant_member(v_user_id, e.tenant_id);

  return v_emb;
end;
$$;

comment on function public.rpc_get_work_order_embedding(uuid) is
  'Returns embedding vector for a work order if the user can access that tenant.';

revoke all on function public.rpc_get_work_order_embedding(uuid) from public;
grant execute on function public.rpc_get_work_order_embedding(uuid) to authenticated;

create or replace function public.rpc_next_work_orders_for_embedding(p_limit int default 50)
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
language plpgsql
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

  return query
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
  left join app.work_order_embeddings e on e.work_order_id = w.id
  left join app.assets a on a.id = w.asset_id and a.tenant_id = w.tenant_id
  left join app.locations l on l.id = w.location_id and l.tenant_id = w.tenant_id
  where w.tenant_id = v_tenant_id
    and w.completed_at is not null
    and e.work_order_id is null
  order by w.completed_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 500);
end;
$$;

comment on function public.rpc_next_work_orders_for_embedding(int) is
  'Completed work orders without embeddings (for Edge embed-index backfill).';

revoke all on function public.rpc_next_work_orders_for_embedding(int) from public;
grant execute on function public.rpc_next_work_orders_for_embedding(int) to authenticated;

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
  'Semantic search over completed work orders (cosine similarity).';

revoke all on function public.rpc_similar_past_work_orders(vector(1536), int, uuid, float) from public;
grant execute on function public.rpc_similar_past_work_orders(vector(1536), int, uuid, float) to authenticated;

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
set search_path = public, extensions
as $$
declare
  v_emb vector(1536);
begin
  v_emb := public.rpc_get_work_order_embedding(p_work_order_id);
  if v_emb is null then
    return;
  end if;

  return query
  select *
  from public.rpc_similar_past_work_orders(v_emb, p_limit, p_work_order_id, p_min_similarity);
end;
$$;

comment on function public.rpc_similar_past_work_orders_by_work_order_id(uuid, int, float) is
  'Similar completed work orders using the embedding of the given work order.';

revoke all on function public.rpc_similar_past_work_orders_by_work_order_id(uuid, int, float) from public;
grant execute on function public.rpc_similar_past_work_orders_by_work_order_id(uuid, int, float) to authenticated;

-- ============================================================================
-- 8. RPC: asset / part embeddings + similarity
-- ============================================================================

create or replace function public.rpc_upsert_asset_embedding(
  p_asset_id uuid,
  p_embedding vector(1536),
  p_source_text text default null,
  p_model_name text default null,
  p_model_version text default null,
  p_content_hash text default null,
  p_embedding_profile text default null
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
  select tenant_id into v_tenant_id from app.assets where id = p_asset_id;

  if v_tenant_id is null then
    raise exception using message = 'Asset not found', errcode = '23503';
  end if;

  if not authz.is_tenant_member(v_user_id, v_tenant_id) then
    raise exception using message = 'Asset not found', errcode = '23503';
  end if;

  insert into app.asset_embeddings (
    asset_id, tenant_id, embedding, source_text, model_name, model_version, embedded_at, content_hash, embedding_profile
  )
  values (
    p_asset_id, v_tenant_id, p_embedding, p_source_text, p_model_name, p_model_version,
    pg_catalog.now(), p_content_hash, p_embedding_profile
  )
  on conflict (asset_id) do update
  set
    embedding = excluded.embedding,
    source_text = coalesce(excluded.source_text, app.asset_embeddings.source_text),
    model_name = coalesce(excluded.model_name, app.asset_embeddings.model_name),
    model_version = coalesce(excluded.model_version, app.asset_embeddings.model_version),
    embedded_at = pg_catalog.now(),
    content_hash = coalesce(excluded.content_hash, app.asset_embeddings.content_hash),
    embedding_profile = coalesce(excluded.embedding_profile, app.asset_embeddings.embedding_profile),
    updated_at = pg_catalog.now();
end;
$$;

revoke all on function public.rpc_upsert_asset_embedding(uuid, vector(1536), text, text, text, text, text) from public;
grant execute on function public.rpc_upsert_asset_embedding(uuid, vector(1536), text, text, text, text, text) to authenticated;

create or replace function public.rpc_similar_assets(
  p_query_embedding vector(1536),
  p_limit int default 10,
  p_min_similarity float default null
)
returns table (
  asset_id uuid,
  name text,
  description text,
  asset_number text,
  similarity_score float
)
language plpgsql
stable
set search_path = public, extensions
as $$
declare
  v_tenant_id uuid;
  v_user_id uuid;
begin
  v_user_id := authz.validate_authenticated();
  v_tenant_id := authz.get_current_tenant_id();
  if v_tenant_id is null then
    raise exception using message = 'Tenant context required.', errcode = 'P0001';
  end if;
  if not authz.is_tenant_member(v_user_id, v_tenant_id) then
    return;
  end if;
  p_limit := least(greatest(coalesce(p_limit, 10), 1), 50);

  return query
  select
    ast.id as asset_id,
    ast.name,
    ast.description,
    ast.asset_number,
    (1 - (e.embedding <=> p_query_embedding))::float as similarity_score
  from app.asset_embeddings e
  join app.assets ast on ast.id = e.asset_id and ast.tenant_id = e.tenant_id
  where e.tenant_id = v_tenant_id
    and (
      p_min_similarity is null
      or (1 - (e.embedding <=> p_query_embedding))::float >= p_min_similarity
    )
  order by e.embedding <=> p_query_embedding
  limit p_limit;
end;
$$;

revoke all on function public.rpc_similar_assets(vector(1536), int, float) from public;
grant execute on function public.rpc_similar_assets(vector(1536), int, float) to authenticated;

create or replace function public.rpc_upsert_part_embedding(
  p_part_id uuid,
  p_embedding vector(1536),
  p_source_text text default null,
  p_model_name text default null,
  p_model_version text default null,
  p_content_hash text default null,
  p_embedding_profile text default null
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
  select tenant_id into v_tenant_id from app.parts where id = p_part_id;

  if v_tenant_id is null then
    raise exception using message = 'Part not found', errcode = '23503';
  end if;

  if not authz.is_tenant_member(v_user_id, v_tenant_id) then
    raise exception using message = 'Part not found', errcode = '23503';
  end if;

  insert into app.part_embeddings (
    part_id, tenant_id, embedding, source_text, model_name, model_version, embedded_at, content_hash, embedding_profile
  )
  values (
    p_part_id, v_tenant_id, p_embedding, p_source_text, p_model_name, p_model_version,
    pg_catalog.now(), p_content_hash, p_embedding_profile
  )
  on conflict (part_id) do update
  set
    embedding = excluded.embedding,
    source_text = coalesce(excluded.source_text, app.part_embeddings.source_text),
    model_name = coalesce(excluded.model_name, app.part_embeddings.model_name),
    model_version = coalesce(excluded.model_version, app.part_embeddings.model_version),
    embedded_at = pg_catalog.now(),
    content_hash = coalesce(excluded.content_hash, app.part_embeddings.content_hash),
    embedding_profile = coalesce(excluded.embedding_profile, app.part_embeddings.embedding_profile),
    updated_at = pg_catalog.now();
end;
$$;

revoke all on function public.rpc_upsert_part_embedding(uuid, vector(1536), text, text, text, text, text) from public;
grant execute on function public.rpc_upsert_part_embedding(uuid, vector(1536), text, text, text, text, text) to authenticated;

create or replace function public.rpc_similar_parts(
  p_query_embedding vector(1536),
  p_limit int default 10,
  p_min_similarity float default null
)
returns table (
  part_id uuid,
  name text,
  description text,
  part_number text,
  similarity_score float
)
language plpgsql
stable
set search_path = public, extensions
as $$
declare
  v_tenant_id uuid;
  v_user_id uuid;
begin
  v_user_id := authz.validate_authenticated();
  v_tenant_id := authz.get_current_tenant_id();
  if v_tenant_id is null then
    raise exception using message = 'Tenant context required.', errcode = 'P0001';
  end if;
  if not authz.is_tenant_member(v_user_id, v_tenant_id) then
    return;
  end if;
  p_limit := least(greatest(coalesce(p_limit, 10), 1), 50);

  return query
  select
    p.id as part_id,
    p.name,
    p.description,
    p.part_number,
    (1 - (e.embedding <=> p_query_embedding))::float as similarity_score
  from app.part_embeddings e
  join app.parts p on p.id = e.part_id and p.tenant_id = e.tenant_id
  where e.tenant_id = v_tenant_id
    and (
      p_min_similarity is null
      or (1 - (e.embedding <=> p_query_embedding))::float >= p_min_similarity
    )
  order by e.embedding <=> p_query_embedding
  limit p_limit;
end;
$$;

revoke all on function public.rpc_similar_parts(vector(1536), int, float) from public;
grant execute on function public.rpc_similar_parts(vector(1536), int, float) to authenticated;

-- ============================================================================
-- 9. Ontology RPCs
-- ============================================================================

create or replace function public.rpc_register_entity_alias(
  p_tenant_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_alias_text text
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_id bigint;
  v_trim text;
begin
  v_user_id := authz.rpc_setup(p_tenant_id, 'tenant.admin');
  v_trim := trim(coalesce(p_alias_text, ''));
  if v_trim = '' then
    raise exception using message = 'alias_text required', errcode = '23514';
  end if;

  insert into app.entity_aliases (tenant_id, entity_type, entity_id, alias_text)
  values (p_tenant_id, p_entity_type, p_entity_id, v_trim::citext)
  on conflict (tenant_id, entity_type, alias_text) do update
  set entity_id = excluded.entity_id
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.rpc_register_entity_alias(uuid, text, uuid, text) is
  'Register or update an alias for a CMMS entity (tenant.admin).';

revoke all on function public.rpc_register_entity_alias(uuid, text, uuid, text) from public;
grant execute on function public.rpc_register_entity_alias(uuid, text, uuid, text) to authenticated;

create or replace function public.rpc_search_entity_candidates(
  p_query text,
  p_entity_types text[] default null,
  p_limit int default 10
)
returns table (
  entity_type text,
  entity_id uuid,
  label text,
  match_type text,
  score float
)
language plpgsql
stable
set search_path = ''
as $$
declare
  v_tenant_id uuid;
  v_user_id uuid;
  v_q text;
  lim int;
begin
  v_user_id := authz.validate_authenticated();
  v_tenant_id := authz.get_current_tenant_id();
  if v_tenant_id is null then
    raise exception using message = 'Tenant context required.', errcode = 'P0001';
  end if;
  if not authz.is_tenant_member(v_user_id, v_tenant_id) then
    return;
  end if;

  v_q := trim(coalesce(p_query, ''));
  lim := least(greatest(coalesce(p_limit, 10), 1), 50);
  if v_q = '' then
    return;
  end if;

  return query
  select * from (
    select
      ea.entity_type::text,
      ea.entity_id,
      ea.alias_text::text as label,
      'alias'::text as match_type,
      1.0::float as score
    from app.entity_aliases ea
    where ea.tenant_id = v_tenant_id
      and ea.alias_text ilike '%' || v_q || '%'
      and (p_entity_types is null or ea.entity_type = any (p_entity_types))

    union all

    select
      'asset'::text,
      a.id,
      a.name,
      'name'::text,
      0.8::float
    from app.assets a
    where a.tenant_id = v_tenant_id
      and (p_entity_types is null or 'asset' = any (p_entity_types))
      and a.name ilike '%' || v_q || '%'

    union all

    select
      'part'::text,
      p.id,
      p.name,
      'name'::text,
      0.8::float
    from app.parts p
    where p.tenant_id = v_tenant_id
      and (p_entity_types is null or 'part' = any (p_entity_types))
      and p.name ilike '%' || v_q || '%'

    union all

    select
      'location'::text,
      l.id,
      l.name,
      'name'::text,
      0.8::float
    from app.locations l
    where l.tenant_id = v_tenant_id
      and (p_entity_types is null or 'location' = any (p_entity_types))
      and l.name ilike '%' || v_q || '%'
  ) u
  order by u.score desc, length(u.label) asc
  limit lim;
end;
$$;

comment on function public.rpc_search_entity_candidates(text, text[], int) is
  'Ranked entity candidates from aliases and name matches (ilike).';

revoke all on function public.rpc_search_entity_candidates(text, text[], int) from public;
grant execute on function public.rpc_search_entity_candidates(text, text[], int) to authenticated;

-- ============================================================================
-- 10. Idempotency RPC
-- ============================================================================

create or replace function public.rpc_claim_idempotency(
  p_tenant_id uuid,
  p_scope text,
  p_idempotency_key text,
  p_resource_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  v_user_id := authz.rpc_setup(p_tenant_id);

  insert into app.client_idempotency (tenant_id, scope, idempotency_key, resource_id)
  values (p_tenant_id, p_scope, p_idempotency_key, p_resource_id);
  return true;
exception
  when unique_violation then
    return false;
end;
$$;

comment on function public.rpc_claim_idempotency(uuid, text, text, uuid) is
  'Try to claim an idempotency key; returns true if first claim, false if duplicate.';

revoke all on function public.rpc_claim_idempotency(uuid, text, text, uuid) from public;
grant execute on function public.rpc_claim_idempotency(uuid, text, text, uuid) to authenticated;

create or replace function public.rpc_get_idempotency_resource(
  p_tenant_id uuid,
  p_scope text,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rid uuid;
begin
  perform authz.rpc_setup(p_tenant_id);
  select c.resource_id into v_rid
  from app.client_idempotency c
  where c.tenant_id = p_tenant_id
    and c.scope = p_scope
    and c.idempotency_key = p_idempotency_key;
  return v_rid;
end;
$$;

comment on function public.rpc_get_idempotency_resource(uuid, text, text) is
  'Returns resource_id for a previously claimed idempotency key, if any.';

revoke all on function public.rpc_get_idempotency_resource(uuid, text, text) from public;
grant execute on function public.rpc_get_idempotency_resource(uuid, text, text) to authenticated;
