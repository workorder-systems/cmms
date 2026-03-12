-- SPDX-License-Identifier: AGPL-3.0-or-later
--
-- Migration: Tenant-scoped API keys and IoT meter reading ingestion
--
-- Purpose
-- -------
-- 1. Tenant API keys: table app.tenant_api_keys for scoped API keys (e.g. IoT).
--    Keys are stored as SHA-256 hash only; raw key is returned once on create.
-- 2. RPCs for API key management: create (returns raw key once), list, revoke.
-- 3. rpc_record_meter_reading_automated: service-role-only RPC for recording
--    meter readings with reading_type = 'automated', used by the Edge Function
--    after validating the API key.
--
-- Affected tables / objects
-- -------------------------
-- - app.tenant_api_keys (new)
-- - public.rpc_create_tenant_api_key, rpc_list_tenant_api_keys, rpc_revoke_tenant_api_key
-- - public.rpc_record_meter_reading_automated
-- - util.check_rate_limit: grant execute to service_role (for future per-api-key rate limit)
--
-- Security
-- --------
-- - API key secrets are never stored; only key_prefix (display) and key_hash are stored.
-- - Only tenant admins can create/list/revoke API keys for their tenant.
-- - rpc_record_meter_reading_automated is granted only to service_role.

-- ============================================================================
-- Tenant API Keys Table
-- ============================================================================

create table app.tenant_api_keys (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  name text not null,
  key_prefix text not null,
  key_hash text not null,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  last_used_at timestamptz,
  expires_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  constraint tenant_api_keys_name_length_check check (
    length(name) >= 1 and length(name) <= 255
  ),
  constraint tenant_api_keys_key_prefix_length_check check (
    length(key_prefix) >= 4 and length(key_prefix) <= 32
  ),
  constraint tenant_api_keys_key_hash_length_check check (
    length(key_hash) = 64
  )
);

comment on table app.tenant_api_keys is
  'Tenant-scoped API keys for machine access (e.g. IoT devices). Only key_hash (SHA-256 hex) and key_prefix (first chars for display) are stored; raw key is shown once on create.';

comment on column app.tenant_api_keys.name is
  'Human-readable label for the key (e.g. "Warehouse sensor gateway").';

comment on column app.tenant_api_keys.key_prefix is
  'First 4–32 characters of the key for display only (e.g. "wosk_abc1"). Used to identify which key was used; not used for lookup.';

comment on column app.tenant_api_keys.key_hash is
  'SHA-256 hash of the full key, hex-encoded (64 chars). Used to validate incoming keys; raw key is never stored.';

comment on column app.tenant_api_keys.last_used_at is
  'Timestamp of last successful use. Updated by the Edge Function when a reading is recorded.';

comment on column app.tenant_api_keys.expires_at is
  'Optional expiry; keys with expires_at in the past are rejected.';

create index tenant_api_keys_tenant_id_idx
  on app.tenant_api_keys (tenant_id);

create unique index tenant_api_keys_key_hash_idx
  on app.tenant_api_keys (key_hash);

create index tenant_api_keys_expires_at_idx
  on app.tenant_api_keys (expires_at)
  where expires_at is not null;

create trigger tenant_api_keys_set_updated_at
  before update on app.tenant_api_keys
  for each row
  execute function util.set_updated_at();

alter table app.tenant_api_keys enable row level security;

-- RLS: only tenant admins can manage API keys for their tenant.
-- select: tenant admins can list keys (see key_prefix, not secret).
create policy tenant_api_keys_select_authenticated
  on app.tenant_api_keys
  for select
  to authenticated
  using (authz.has_permission((select auth.uid()), tenant_id, 'tenant.admin'));

-- insert: tenant admins can create keys.
create policy tenant_api_keys_insert_authenticated
  on app.tenant_api_keys
  for insert
  to authenticated
  with check (authz.has_permission((select auth.uid()), tenant_id, 'tenant.admin'));

-- delete: tenant admins can revoke keys.
create policy tenant_api_keys_delete_authenticated
  on app.tenant_api_keys
  for delete
  to authenticated
  using (authz.has_permission((select auth.uid()), tenant_id, 'tenant.admin'));

-- No update policy: keys are not updated (only last_used_at is updated by service role in Edge Function).
-- Service role needs to read by key_hash and update last_used_at; we do that via a dedicated function
-- so we don't grant full table access to anon/authenticated.

grant select on app.tenant_api_keys to authenticated;
grant insert on app.tenant_api_keys to authenticated;
grant delete on app.tenant_api_keys to authenticated;

-- ============================================================================
-- API Key Validation (for Edge Function via service role)
-- ============================================================================
-- PostgREST exposes public schema by default; app.tenant_api_keys is not
-- directly selectable. So we provide an RPC that validates the key hash and
-- returns tenant_id and key_id for valid, non-expired keys.
-- ============================================================================

create or replace function public.rpc_validate_tenant_api_key(p_key_hash text)
returns table(tenant_id uuid, key_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if length(p_key_hash) <> 64 then
    return;
  end if;

  return query
  select
    k.tenant_id,
    k.id as key_id
  from app.tenant_api_keys k
  where k.key_hash = p_key_hash
    and (k.expires_at is null or k.expires_at > pg_catalog.now())
  limit 1;
end;
$$;

comment on function public.rpc_validate_tenant_api_key(text) is
  'Validates an API key hash and returns tenant_id and key_id if the key exists and is not expired. For use by Edge Function with service role only.';

revoke all on function public.rpc_validate_tenant_api_key(text) from public;
grant execute on function public.rpc_validate_tenant_api_key(text) to service_role;

-- ============================================================================
-- RPC: Create tenant API key (returns raw key once)
-- ============================================================================

create or replace function public.rpc_create_tenant_api_key(
  p_tenant_id uuid,
  p_name text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_key_raw text;
  v_key_prefix text;
  v_key_hash text;
  v_key_id uuid;
begin
  perform util.check_rate_limit('tenant_api_key_create', null, 10, 1, auth.uid(), p_tenant_id);
  v_user_id := authz.rpc_setup(p_tenant_id, 'tenant.admin');

  if length(p_name) < 1 or length(p_name) > 255 then
    raise exception using
      message = 'Name must be between 1 and 255 characters',
      errcode = '23514';
  end if;

  -- Generate a secure random key: prefix "wosk_" + 32 hex chars (from UUID without dashes).
  v_key_raw := 'wosk_' || replace(extensions.gen_random_uuid()::text, '-', '');
  v_key_prefix := substring(v_key_raw from 1 for 12);
  v_key_hash := encode(extensions.digest(v_key_raw, 'sha256'), 'hex');

  insert into app.tenant_api_keys (
    tenant_id,
    name,
    key_prefix,
    key_hash,
    created_by
  )
  values (
    p_tenant_id,
    p_name,
    v_key_prefix,
    v_key_hash,
    v_user_id
  )
  returning id into v_key_id;

  return jsonb_build_object(
    'id', v_key_id,
    'key', v_key_raw,
    'keyPrefix', v_key_prefix,
    'name', p_name,
    'createdAt', pg_catalog.now()
  );
end;
$$;

comment on function public.rpc_create_tenant_api_key(uuid, text) is
  'Creates a new tenant-scoped API key. Returns the raw key once in the response; it cannot be retrieved later. Requires tenant.admin. Rate limited to 10/minute per user per tenant.';

revoke all on function public.rpc_create_tenant_api_key(uuid, text) from public;
grant execute on function public.rpc_create_tenant_api_key(uuid, text) to authenticated;

-- ============================================================================
-- RPC: List tenant API keys (no secrets)
-- ============================================================================

create or replace function public.rpc_list_tenant_api_keys(p_tenant_id uuid)
returns setof jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform util.check_rate_limit('tenant_api_key_list', null, 30, 1, auth.uid(), p_tenant_id);
  perform authz.rpc_setup(p_tenant_id, 'tenant.admin');

  return query
  select jsonb_build_object(
    'id', k.id,
    'name', k.name,
    'keyPrefix', k.key_prefix,
    'createdAt', k.created_at,
    'lastUsedAt', k.last_used_at,
    'expiresAt', k.expires_at
  )
  from app.tenant_api_keys k
  where k.tenant_id = p_tenant_id
  order by k.created_at desc;
end;
$$;

comment on function public.rpc_list_tenant_api_keys(uuid) is
  'Lists API keys for the tenant. Returns metadata only (no secret). Requires tenant.admin.';

revoke all on function public.rpc_list_tenant_api_keys(uuid) from public;
grant execute on function public.rpc_list_tenant_api_keys(uuid) to authenticated;

-- ============================================================================
-- RPC: Revoke tenant API key
-- ============================================================================

create or replace function public.rpc_revoke_tenant_api_key(
  p_tenant_id uuid,
  p_key_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_affected integer;
begin
  perform util.check_rate_limit('tenant_api_key_revoke', null, 20, 1, auth.uid(), p_tenant_id);
  perform authz.rpc_setup(p_tenant_id, 'tenant.admin');

  delete from app.tenant_api_keys
  where id = p_key_id
    and tenant_id = p_tenant_id;

  get diagnostics v_affected = row_count;
  if v_affected = 0 then
    raise exception using
      message = format('API key %s not found or does not belong to this tenant', p_key_id),
      errcode = 'P0001';
  end if;
end;
$$;

comment on function public.rpc_revoke_tenant_api_key(uuid, uuid) is
  'Revokes (deletes) a tenant API key. Requires tenant.admin.';

revoke all on function public.rpc_revoke_tenant_api_key(uuid, uuid) from public;
grant execute on function public.rpc_revoke_tenant_api_key(uuid, uuid) to authenticated;

-- ============================================================================
-- RPC: Record meter reading (automated) – service role only
-- ============================================================================
-- Same logic as rpc_record_meter_reading but with reading_type = 'automated'
-- and recorded_by = null. Called by the Edge Function after validating API key.
-- No user context; rate limiting for automated path can be added later (e.g. per tenant in Edge Function).

create or replace function public.rpc_record_meter_reading_automated(
  p_tenant_id uuid,
  p_meter_id uuid,
  p_reading_value numeric,
  p_reading_date timestamptz default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reading_id uuid;
  v_meter app.asset_meters%rowtype;
  v_pm_schedule app.pm_schedules%rowtype;
  v_threshold numeric;
  v_current_reading numeric;
begin
  -- Validate meter exists and belongs to tenant
  select * into v_meter
  from app.asset_meters
  where id = p_meter_id;

  if not found then
    raise exception using
      message = format('Meter %s not found', p_meter_id),
      errcode = 'P0001';
  end if;

  if v_meter.tenant_id != p_tenant_id then
    raise exception using
      message = 'Unauthorized: Meter does not belong to this tenant',
      errcode = '42501';
  end if;

  if not v_meter.is_active then
    raise exception using
      message = 'Meter is not active',
      errcode = '23514';
  end if;

  -- Use provided reading_date or default to now
  if p_reading_date is null then
    p_reading_date := pg_catalog.now();
  end if;

  -- Validate reading_date range (allow up to 7 days in future, 90 days in past)
  if p_reading_date > pg_catalog.now() + interval '7 days' then
    raise exception using
      message = 'Reading date cannot be more than 7 days in the future',
      errcode = '23514';
  end if;

  if p_reading_date < pg_catalog.now() - interval '90 days' then
    raise exception using
      message = 'Reading date cannot be more than 90 days in the past',
      errcode = '23514';
  end if;

  if p_reading_value < 0 then
    raise exception using
      message = 'Reading value must be >= 0',
      errcode = '23514';
  end if;

  -- Insert reading (trigger will validate and update meter)
  insert into app.meter_readings (
    tenant_id,
    meter_id,
    reading_value,
    reading_date,
    reading_type,
    notes,
    recorded_by
  )
  values (
    p_tenant_id,
    p_meter_id,
    p_reading_value,
    p_reading_date,
    'automated',
    p_notes,
    null
  )
  returning id into v_reading_id;

  -- Get updated meter reading
  select current_reading into v_current_reading
  from app.asset_meters
  where id = p_meter_id;

  -- Check usage-based PM schedules (same as user-facing RPC)
  for v_pm_schedule in
    select ps.*
    from app.pm_schedules ps
    where ps.tenant_id = p_tenant_id
      and ps.trigger_type = 'usage'
      and ps.is_active = true
      and ps.auto_generate = true
      and (ps.trigger_config->>'meter_id')::uuid = p_meter_id
  loop
    v_threshold := (v_pm_schedule.trigger_config->>'threshold')::numeric;

    if v_threshold is not null and v_current_reading >= v_threshold then
      if pm.is_pm_due(v_pm_schedule) and pm.check_pm_dependencies(v_pm_schedule.id) then
        perform pm.generate_pm_work_order(v_pm_schedule.id);
      end if;
    end if;
  end loop;

  return v_reading_id;
end;
$$;

comment on function public.rpc_record_meter_reading_automated(uuid, uuid, numeric, timestamptz, text) is
  'Records a meter reading with reading_type = automated and recorded_by = null. For use by the ingest-meter-reading Edge Function after API key validation. Granted to service_role only.';

revoke all on function public.rpc_record_meter_reading_automated(uuid, uuid, numeric, timestamptz, text) from public;
grant execute on function public.rpc_record_meter_reading_automated(uuid, uuid, numeric, timestamptz, text) to service_role;

-- ============================================================================
-- Update last_used_at for API key (service role only)
-- ============================================================================
-- Edge Function calls this after validating the key to bump last_used_at.
-- We use an RPC so we don't need to grant update on app.tenant_api_keys to service_role
-- with a policy that allows updating any row; this RPC only updates by key_hash.

create or replace function public.rpc_tenant_api_key_touch(p_key_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update app.tenant_api_keys
  set last_used_at = pg_catalog.now()
  where id = p_key_id;
end;
$$;

comment on function public.rpc_tenant_api_key_touch(uuid) is
  'Updates last_used_at for the given API key. For use by Edge Function with service role only.';

revoke all on function public.rpc_tenant_api_key_touch(uuid) from public;
grant execute on function public.rpc_tenant_api_key_touch(uuid) to service_role;
