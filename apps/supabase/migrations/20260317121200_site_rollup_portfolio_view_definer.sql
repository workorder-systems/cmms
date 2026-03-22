-- Migration: Fix permission denied for mv_site_summary when querying v_site_rollup / v_portfolio_overview
--
-- Cause: public.v_site_rollup and public.v_portfolio_overview use security_invoker = true
-- but select from materialized views (mv_site_summary, mv_tenant_overview) on which
-- select was revoked from anon/authenticated. With security_invoker, the calling role
-- must have select on underlying objects, so the query fails.
--
-- Fix: Use security_invoker = false (definer/owner rights) for these wrapper views so
-- they execute with the view owner's privileges and can read the mat views. Tenant
-- isolation is still enforced by the view definition (where tenant_id = authz.get_current_tenant_id()).
-- Affected: public.v_site_rollup, public.v_portfolio_overview

create or replace view public.v_site_rollup
with (security_invoker = false)
as
select *
from public.mv_site_summary
where tenant_id = authz.get_current_tenant_id();

create or replace view public.v_portfolio_overview
with (security_invoker = false)
as
select
  t.tenant_id,
  t.tenant_name,
  t.slug,
  t.member_count,
  t.location_count,
  t.asset_count,
  t.work_order_count,
  t.active_work_order_count,
  t.overdue_work_order_count,
  t.first_work_order_at,
  t.last_work_order_at,
  t.tenant_created_at,
  s.site_id,
  s.site_name,
  s.site_code,
  s.building_count,
  s.floor_count,
  s.room_count,
  s.zone_count,
  s.asset_count as site_asset_count,
  s.active_asset_count as site_active_asset_count,
  s.work_order_count as site_work_order_count,
  s.active_work_order_count as site_active_work_order_count
from public.mv_tenant_overview t
left join public.mv_site_summary s on s.tenant_id = t.tenant_id
where t.tenant_id = authz.get_current_tenant_id();
