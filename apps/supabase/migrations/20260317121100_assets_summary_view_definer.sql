-- 20260317121100_assets_summary_view_definer.sql
--
-- Purpose: Fix "permission denied for materialized view mv_asset_summary" on
--   v_assets_summary (and the same for other summary views). Migration
--   20260210161000_17 revoked SELECT on the MVs from anon/authenticated;
--   the v_* summary views use security invoker, so callers no longer had
--   permission to read the underlying MV.
--
-- Change: Switch v_work_orders_summary, v_assets_summary, v_locations_summary,
--   and v_tenants_overview to SECURITY DEFINER so they run with the view
--   owner's privileges and can read the locked MVs. Rows remain tenant-scoped
--   via authz.get_current_tenant_id() and membership checks.

create or replace view public.v_work_orders_summary
with (security_invoker = false)
as
select *
from public.mv_work_order_summary
where tenant_id = authz.get_current_tenant_id();

comment on view public.v_work_orders_summary is
  'Tenant-scoped work orders summary. Returns data for current tenant context only. Filters materialized view by tenant. Uses SECURITY DEFINER so the view can read the locked MV while returning only tenant-scoped rows.';

create or replace view public.v_assets_summary
with (security_invoker = false)
as
select *
from public.mv_asset_summary
where tenant_id = authz.get_current_tenant_id();

comment on view public.v_assets_summary is
  'Tenant-scoped assets summary. Returns data for current tenant context only. Filters materialized view by tenant. Uses SECURITY DEFINER so the view can read the locked MV while returning only tenant-scoped rows.';

create or replace view public.v_locations_summary
with (security_invoker = false)
as
select *
from public.mv_location_summary
where tenant_id = authz.get_current_tenant_id();

comment on view public.v_locations_summary is
  'Tenant-scoped locations summary. Returns data for current tenant context only. Filters materialized view by tenant. Uses SECURITY DEFINER so the view can read the locked MV while returning only tenant-scoped rows.';

create or replace view public.v_tenants_overview
with (security_invoker = false)
as
select *
from public.mv_tenant_overview
where tenant_id = authz.get_current_tenant_id()
  and exists (
    select 1
    from app.tenant_memberships
    where tenant_id = mv_tenant_overview.tenant_id
      and user_id = (select auth.uid())
  );

comment on view public.v_tenants_overview is
  'Tenant overview for current tenant. Only accessible to tenant members. Filters materialized view by tenant and membership. Uses SECURITY DEFINER so the view can read the locked MV while returning only tenant-scoped rows.';
