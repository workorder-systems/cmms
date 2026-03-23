-- SPDX-License-Identifier: AGPL-3.0-or-later
--
-- Purpose: Optional scannable barcodes on assets and parts; public resolve RPCs for
--          mobile/kiosk flows. Resolution order is documented in each RPC.
--
-- Affected: app.assets, app.parts, unique partial indexes, public.v_assets, public.v_parts,
--           app.v_parts_with_stock, public.v_mobile_assets, rpc_create_asset, rpc_update_asset,
--           rpc_create_part, rpc_update_part, new rpc_resolve_asset_by_scan_code and
--           rpc_resolve_part_by_scan_code.
--
-- Rollback: non-trivial (drop columns after dependent views/RPCs); prefer forward fix.

-- ============================================================================
-- 1. Columns and constraints (trimmed values enforced at RPC layer)
-- ============================================================================

alter table app.assets
  add column barcode text null;

comment on column app.assets.barcode is
  'Optional scannable id (QR/barcode payload) unique per tenant when set. Distinct from asset_number; use resolve RPC for lookup order.';

alter table app.assets
  add constraint assets_barcode_length_check check (
    barcode is null
    or (length(trim(barcode)) >= 1 and length(barcode) <= 100)
  );

alter table app.parts
  add column barcode text null;

comment on column app.parts.barcode is
  'Optional scannable id unique per tenant when set. Distinct from part_number; use resolve RPC for lookup order.';

alter table app.parts
  add constraint parts_barcode_length_check check (
    barcode is null
    or (length(trim(barcode)) >= 1 and length(barcode) <= 100)
  );

create unique index assets_tenant_barcode_unique_idx
  on app.assets (tenant_id, barcode)
  where barcode is not null;

create unique index parts_tenant_barcode_unique_idx
  on app.parts (tenant_id, barcode)
  where barcode is not null;

-- ============================================================================
-- 2. Replace asset and part RPCs (add optional p_barcode; drop old signatures)
-- ============================================================================

drop function if exists public.rpc_create_asset(uuid, text, text, text, uuid, uuid, text);

create or replace function public.rpc_create_asset(
  p_tenant_id uuid,
  p_name text,
  p_description text default null,
  p_asset_number text default null,
  p_location_id uuid default null,
  p_department_id uuid default null,
  p_status text default 'active',
  p_barcode text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_asset_id uuid;
  v_barcode text;
begin
  v_user_id := authz.validate_authenticated();

  perform util.check_rate_limit('asset_create', null, 50, 1, v_user_id, p_tenant_id);

  if not authz.is_tenant_member(v_user_id, p_tenant_id) then
    raise exception using
      message = 'Unauthorized: User is not a member of this tenant',
      errcode = '42501';
  end if;

  if length(p_name) < 1 or length(p_name) > 255 then
    raise exception using
      message = 'Asset name must be between 1 and 255 characters',
      errcode = '23514';
  end if;

  v_barcode := nullif(trim(p_barcode), '');

  insert into app.assets (
    tenant_id,
    name,
    description,
    asset_number,
    location_id,
    department_id,
    status,
    barcode
  )
  values (
    p_tenant_id,
    p_name,
    p_description,
    p_asset_number,
    p_location_id,
    p_department_id,
    p_status,
    v_barcode
  )
  returning id into v_asset_id;

  return v_asset_id;
end;
$$;

comment on function public.rpc_create_asset(uuid, text, text, text, uuid, uuid, text, text) is
  'Creates a new asset. Optional p_barcode for scan labels (unique per tenant when set). Rate limited.';

revoke all on function public.rpc_create_asset(uuid, text, text, text, uuid, uuid, text, text) from public;
grant execute on function public.rpc_create_asset(uuid, text, text, text, uuid, uuid, text, text) to authenticated;

drop function if exists public.rpc_update_asset(uuid, uuid, text, text, text, uuid, uuid, text);

create or replace function public.rpc_update_asset(
  p_tenant_id uuid,
  p_asset_id uuid,
  p_name text default null,
  p_description text default null,
  p_asset_number text default null,
  p_location_id uuid default null,
  p_department_id uuid default null,
  p_status text default null,
  p_barcode text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_asset_tenant_id uuid;
begin
  v_user_id := authz.validate_authenticated();

  perform util.check_rate_limit('asset_update', null, 50, 1, v_user_id, p_tenant_id);

  if not authz.is_tenant_member(v_user_id, p_tenant_id) then
    raise exception using
      message = 'Unauthorized: User is not a member of this tenant',
      errcode = '42501';
  end if;

  select tenant_id into v_asset_tenant_id
  from app.assets
  where id = p_asset_id;

  if v_asset_tenant_id is null then
    raise exception using
      message = 'Asset not found',
      errcode = 'P0001';
  end if;

  if v_asset_tenant_id != p_tenant_id then
    raise exception using
      message = 'Unauthorized: Asset does not belong to this tenant',
      errcode = '42501';
  end if;

  if p_name is not null and (length(p_name) < 1 or length(p_name) > 255) then
    raise exception using
      message = 'Asset name must be between 1 and 255 characters',
      errcode = '23514';
  end if;

  update app.assets
  set
    name = coalesce(p_name, name),
    description = coalesce(p_description, description),
    asset_number = coalesce(p_asset_number, asset_number),
    location_id = coalesce(p_location_id, location_id),
    department_id = coalesce(p_department_id, department_id),
    status = coalesce(p_status, status),
    barcode = case
      when p_barcode is not null then nullif(trim(p_barcode), '')
      else barcode
    end,
    updated_at = pg_catalog.now()
  where id = p_asset_id;
end;
$$;

comment on function public.rpc_update_asset(uuid, uuid, text, text, text, uuid, uuid, text, text) is
  'Updates an existing asset. Pass p_barcode as empty string to clear barcode. Rate limited.';

revoke all on function public.rpc_update_asset(uuid, uuid, text, text, text, uuid, uuid, text, text) from public;
grant execute on function public.rpc_update_asset(uuid, uuid, text, text, text, uuid, uuid, text, text) to authenticated;

drop function if exists public.rpc_create_part(uuid, text, text, text, text, uuid, text, numeric, numeric, numeric, integer);

create or replace function public.rpc_create_part(
  p_tenant_id uuid,
  p_part_number text,
  p_name text default null,
  p_description text default null,
  p_unit text default 'each',
  p_preferred_supplier_id uuid default null,
  p_external_id text default null,
  p_reorder_point numeric default null,
  p_min_quantity numeric default null,
  p_max_quantity numeric default null,
  p_lead_time_days integer default null,
  p_barcode text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_part_id uuid;
  v_barcode text;
begin
  perform authz.rpc_setup(p_tenant_id, 'part.create');
  if p_part_number is null or length(trim(p_part_number)) < 1 then
    raise exception using message = 'part_number is required', errcode = '23514';
  end if;
  v_barcode := nullif(trim(p_barcode), '');
  insert into app.parts (
    tenant_id, part_number, name, description, unit, preferred_supplier_id, external_id,
    reorder_point, min_quantity, max_quantity, lead_time_days, barcode
  )
  values (
    p_tenant_id, trim(p_part_number), nullif(trim(p_name), ''), p_description,
    coalesce(nullif(trim(p_unit), ''), 'each'), p_preferred_supplier_id, nullif(trim(p_external_id), ''),
    p_reorder_point, p_min_quantity, p_max_quantity, p_lead_time_days, v_barcode
  )
  returning id into v_part_id;
  return v_part_id;
end;
$$;

comment on function public.rpc_create_part(uuid, text, text, text, text, uuid, text, numeric, numeric, numeric, integer, text) is
  'Creates a part. Optional p_barcode for scan labels (unique per tenant when set). Requires part.create.';

revoke all on function public.rpc_create_part(uuid, text, text, text, text, uuid, text, numeric, numeric, numeric, integer, text) from public;
grant execute on function public.rpc_create_part(uuid, text, text, text, text, uuid, text, numeric, numeric, numeric, integer, text) to authenticated;

drop function if exists public.rpc_update_part(uuid, uuid, text, text, text, text, uuid, text, numeric, numeric, numeric, integer, boolean);

create or replace function public.rpc_update_part(
  p_tenant_id uuid,
  p_part_id uuid,
  p_part_number text default null,
  p_name text default null,
  p_description text default null,
  p_unit text default null,
  p_preferred_supplier_id uuid default null,
  p_external_id text default null,
  p_reorder_point numeric default null,
  p_min_quantity numeric default null,
  p_max_quantity numeric default null,
  p_lead_time_days integer default null,
  p_is_active boolean default null,
  p_barcode text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_part_tenant_id uuid;
begin
  perform authz.rpc_setup(p_tenant_id, 'part.edit');
  select tenant_id into v_part_tenant_id from app.parts where id = p_part_id;
  if v_part_tenant_id is null or v_part_tenant_id != p_tenant_id then
    raise exception using message = 'Part not found or wrong tenant', errcode = '23503';
  end if;
  update app.parts
  set
    part_number = coalesce(nullif(trim(p_part_number), ''), part_number),
    name = coalesce(p_name, name),
    description = coalesce(p_description, description),
    unit = coalesce(nullif(trim(p_unit), ''), unit),
    preferred_supplier_id = coalesce(p_preferred_supplier_id, preferred_supplier_id),
    external_id = case when p_external_id is not null then nullif(trim(p_external_id), '') else external_id end,
    reorder_point = coalesce(p_reorder_point, reorder_point),
    min_quantity = coalesce(p_min_quantity, min_quantity),
    max_quantity = coalesce(p_max_quantity, max_quantity),
    lead_time_days = coalesce(p_lead_time_days, lead_time_days),
    is_active = coalesce(p_is_active, is_active),
    barcode = case
      when p_barcode is not null then nullif(trim(p_barcode), '')
      else barcode
    end,
    updated_at = pg_catalog.now()
  where id = p_part_id;
end;
$$;

comment on function public.rpc_update_part(uuid, uuid, text, text, text, text, uuid, text, numeric, numeric, numeric, integer, boolean, text) is
  'Updates a part. Pass p_barcode as empty string to clear. Requires part.edit.';

revoke all on function public.rpc_update_part(uuid, uuid, text, text, text, text, uuid, text, numeric, numeric, numeric, integer, boolean, text) from public;
grant execute on function public.rpc_update_part(uuid, uuid, text, text, text, text, uuid, text, numeric, numeric, numeric, integer, boolean, text) to authenticated;

-- ============================================================================
-- 3. Resolve RPCs (trim input; deterministic match order)
-- ============================================================================

-- Match order: 1) barcode column 2) asset_number (legacy / human id).
create or replace function public.rpc_resolve_asset_by_scan_code(
  p_tenant_id uuid,
  p_code text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trim text;
  v_id uuid;
begin
  perform authz.rpc_setup(p_tenant_id, 'asset.view');
  v_trim := trim(coalesce(p_code, ''));
  if v_trim = '' then
    return null;
  end if;

  select a.id into v_id
  from app.assets a
  where a.tenant_id = p_tenant_id
    and a.barcode is not null
    and a.barcode = v_trim
  limit 1;

  if v_id is not null then
    return v_id;
  end if;

  select a.id into v_id
  from app.assets a
  where a.tenant_id = p_tenant_id
    and a.asset_number is not null
    and a.asset_number = v_trim
  limit 1;

  return v_id;
end;
$$;

comment on function public.rpc_resolve_asset_by_scan_code(uuid, text) is
  'Resolves a scanned string to an asset id: barcode first, then asset_number. Requires asset.view. Returns null if not found.';

revoke all on function public.rpc_resolve_asset_by_scan_code(uuid, text) from public;
grant execute on function public.rpc_resolve_asset_by_scan_code(uuid, text) to authenticated;

-- Match order: 1) barcode 2) part_number 3) external_id (ERP label).
create or replace function public.rpc_resolve_part_by_scan_code(
  p_tenant_id uuid,
  p_code text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trim text;
  v_id uuid;
begin
  perform authz.rpc_setup(p_tenant_id, 'part.view');
  v_trim := trim(coalesce(p_code, ''));
  if v_trim = '' then
    return null;
  end if;

  select p.id into v_id
  from app.parts p
  where p.tenant_id = p_tenant_id
    and p.barcode is not null
    and p.barcode = v_trim
  limit 1;
  if v_id is not null then
    return v_id;
  end if;

  select p.id into v_id
  from app.parts p
  where p.tenant_id = p_tenant_id
    and p.part_number = v_trim
  limit 1;
  if v_id is not null then
    return v_id;
  end if;

  select p.id into v_id
  from app.parts p
  where p.tenant_id = p_tenant_id
    and p.external_id is not null
    and p.external_id = v_trim
  limit 1;

  return v_id;
end;
$$;

comment on function public.rpc_resolve_part_by_scan_code(uuid, text) is
  'Resolves a scanned string to a part id: barcode, then part_number, then external_id. Requires part.view. Returns null if not found.';

revoke all on function public.rpc_resolve_part_by_scan_code(uuid, text) from public;
grant execute on function public.rpc_resolve_part_by_scan_code(uuid, text) to authenticated;

-- ============================================================================
-- 4. Views: v_assets, v_parts, v_parts_with_stock, v_mobile_assets
-- ============================================================================

create or replace view public.v_assets
with (security_invoker = true)
as
select
  a.id,
  a.tenant_id,
  a.name,
  a.description,
  a.asset_number,
  a.location_id,
  a.department_id,
  a.status,
  a.created_at,
  a.updated_at,
  a.commissioned_at,
  a.end_of_life_estimate,
  a.decommissioned_at,
  a.replaced_by_asset_id,
  a.replacement_of_asset_id,
  a.warranty_expires_at,
  a.service_contract_expires_at,
  a.planned_replacement_date,
  a.barcode
from app.assets a
where a.tenant_id = authz.get_current_tenant_id();

comment on view public.v_assets is
  'Assets view scoped to the current tenant context. Includes barcode for floor scanning. Uses SECURITY INVOKER.';

create or replace view public.v_parts
with (security_invoker = true)
as
select
  id,
  tenant_id,
  part_number,
  name,
  description,
  unit,
  preferred_supplier_id,
  external_id,
  reorder_point,
  min_quantity,
  max_quantity,
  lead_time_days,
  is_active,
  created_at,
  updated_at,
  barcode
from app.parts;

comment on view public.v_parts is 'Parts catalog including optional barcode. Tenant-scoped via RLS.';

create or replace view app.v_parts_with_stock
with (security_invoker = true)
as
select
  p.id,
  p.tenant_id,
  p.part_number,
  p.name,
  p.description,
  p.unit,
  p.preferred_supplier_id,
  p.external_id,
  p.reorder_point,
  p.min_quantity,
  p.max_quantity,
  p.lead_time_days,
  p.is_active,
  p.created_at,
  p.updated_at,
  coalesce(stock.on_hand, 0) as total_on_hand,
  coalesce(res.reserved, 0) as total_reserved,
  (coalesce(stock.on_hand, 0) - coalesce(res.reserved, 0)) as available,
  p.barcode
from
  app.parts p
left join (
  select part_id, sum(quantity) as on_hand
  from app.stock_levels
  group by part_id
) stock on stock.part_id = p.id
left join (
  select part_id, sum(quantity) as reserved
  from app.part_reservations
  where status = 'reserved'
  group by part_id
) res on res.part_id = p.id;

create or replace view public.v_mobile_assets
with (security_invoker = true)
as
select
  a.id,
  a.tenant_id,
  a.name,
  a.asset_number,
  a.location_id,
  a.status,
  a.updated_at,
  a.barcode
from app.assets a
where a.tenant_id = authz.get_current_tenant_id();

comment on view public.v_mobile_assets is
  'Minimal asset columns for mobile sync including barcode. Tenant-scoped.';
