-- SPDX-License-Identifier: AGPL-3.0-or-later
--
-- Purpose: Expose app.asset_warranties to PostgREST (public schema) for read.
-- Context: Multi-row warranty history lives in app.asset_warranties (see
--          20260323120200_cmms_core_warranty_downtime.sql) and syncs
--          assets.warranty_expires_at via trigger; rpc_upsert_asset_warranty handles writes.
-- Affected: new view public.v_asset_warranties (select only).
--

create or replace view public.v_asset_warranties
with (security_invoker = true)
as
select
  w.id,
  w.tenant_id,
  w.asset_id,
  w.supplier_id,
  w.warranty_type,
  w.starts_on,
  w.expires_on,
  w.coverage_summary,
  w.external_reference,
  w.is_active,
  w.created_at,
  w.updated_at
from app.asset_warranties w
where w.tenant_id = authz.get_current_tenant_id();

comment on view public.v_asset_warranties is
  'Warranty rows per asset for the current tenant; assets.warranty_expires_at is the max active expires_on.';

grant select on public.v_asset_warranties to authenticated;
grant select on public.v_asset_warranties to anon;
