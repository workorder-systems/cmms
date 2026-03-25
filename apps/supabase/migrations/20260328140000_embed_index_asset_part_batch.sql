-- SPDX-License-Identifier: AGPL-3.0-or-later
--
-- migration: 20260328140000_embed_index_asset_part_batch.sql
--
-- purpose: extend ai-native embedding pipeline with next-row selectors and batch upserts
--          for assets and parts (parity with work orders for embed-index worker).
-- affected: new public rpc_next_assets_for_embedding, rpc_next_parts_for_embedding,
--           rpc_batch_upsert_asset_embeddings, rpc_batch_upsert_part_embeddings.
-- notes: tenant context required (jwt tenant_id); skips rows not in current tenant.

-- ============================================================================
-- 1. next assets without embeddings
-- ============================================================================

create or replace function public.rpc_next_assets_for_embedding(p_limit int default 50)
returns table (
  asset_id uuid,
  tenant_id uuid,
  name text,
  description text,
  asset_number text,
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
    a.id as asset_id,
    a.tenant_id,
    a.name,
    a.description,
    a.asset_number,
    l.name as location_name
  from app.assets a
  left join app.asset_embeddings e on e.asset_id = a.id
  left join app.locations l on l.id = a.location_id and l.tenant_id = a.tenant_id
  where a.tenant_id = v_tenant_id
    and e.asset_id is null
  order by a.updated_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 500);
end;
$$;

comment on function public.rpc_next_assets_for_embedding(int) is
  'Assets without embeddings (for Edge embed-index backfill).';

revoke all on function public.rpc_next_assets_for_embedding(int) from public;
grant execute on function public.rpc_next_assets_for_embedding(int) to authenticated;

-- ============================================================================
-- 2. next parts without embeddings
-- ============================================================================

create or replace function public.rpc_next_parts_for_embedding(p_limit int default 50)
returns table (
  part_id uuid,
  tenant_id uuid,
  part_number text,
  name text,
  description text
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
    p.id as part_id,
    p.tenant_id,
    p.part_number,
    p.name,
    p.description
  from app.parts p
  left join app.part_embeddings e on e.part_id = p.id
  where p.tenant_id = v_tenant_id
    and e.part_id is null
    and coalesce(p.is_active, true)
  order by p.updated_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 500);
end;
$$;

comment on function public.rpc_next_parts_for_embedding(int) is
  'Active parts without embeddings (for Edge embed-index backfill).';

revoke all on function public.rpc_next_parts_for_embedding(int) from public;
grant execute on function public.rpc_next_parts_for_embedding(int) to authenticated;

-- ============================================================================
-- 3. batch upsert asset embeddings
-- ============================================================================

create or replace function public.rpc_batch_upsert_asset_embeddings(p_rows jsonb)
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
  v_asset uuid;
  v_emb vector(1536);
  v_at uuid;
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
    v_asset := (rec.elem->>'asset_id')::uuid;
    v_emb := (rec.elem->>'embedding')::vector(1536);

    select tenant_id into v_at from app.assets where id = v_asset;
    if v_at is null or v_at != v_tenant_id then
      continue;
    end if;

    insert into app.asset_embeddings (
      asset_id,
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
      v_asset,
      v_tenant_id,
      v_emb,
      rec.elem->>'source_text',
      rec.elem->>'model_name',
      rec.elem->>'model_version',
      pg_catalog.now(),
      rec.elem->>'content_hash',
      rec.elem->>'embedding_profile'
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

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

comment on function public.rpc_batch_upsert_asset_embeddings(jsonb) is
  'Batch upsert asset embeddings for Edge indexers. Each element: asset_id, embedding (vector text), optional source_text, model_*, content_hash, embedding_profile.';

revoke all on function public.rpc_batch_upsert_asset_embeddings(jsonb) from public;
grant execute on function public.rpc_batch_upsert_asset_embeddings(jsonb) to authenticated;

-- ============================================================================
-- 4. batch upsert part embeddings
-- ============================================================================

create or replace function public.rpc_batch_upsert_part_embeddings(p_rows jsonb)
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
  v_part uuid;
  v_emb vector(1536);
  v_pt uuid;
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
    v_part := (rec.elem->>'part_id')::uuid;
    v_emb := (rec.elem->>'embedding')::vector(1536);

    select tenant_id into v_pt from app.parts where id = v_part;
    if v_pt is null or v_pt != v_tenant_id then
      continue;
    end if;

    insert into app.part_embeddings (
      part_id,
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
      v_part,
      v_tenant_id,
      v_emb,
      rec.elem->>'source_text',
      rec.elem->>'model_name',
      rec.elem->>'model_version',
      pg_catalog.now(),
      rec.elem->>'content_hash',
      rec.elem->>'embedding_profile'
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

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

comment on function public.rpc_batch_upsert_part_embeddings(jsonb) is
  'Batch upsert part embeddings for Edge indexers. Each element: part_id, embedding (vector text), optional source_text, model_*, content_hash, embedding_profile.';

revoke all on function public.rpc_batch_upsert_part_embeddings(jsonb) from public;
grant execute on function public.rpc_batch_upsert_part_embeddings(jsonb) to authenticated;
