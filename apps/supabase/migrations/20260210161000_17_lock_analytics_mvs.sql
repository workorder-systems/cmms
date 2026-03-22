-- 20260210161000_17_lock_analytics_mvs.sql
--
-- Purpose
-- -------
-- Harden analytics materialized views so they are not directly exposed via
-- the Data APIs. Access should go through curated v_* views instead.
--
-- Linter warnings addressed:
-- - materialized_view_in_api for:
--     public.mv_work_order_summary
--     public.mv_asset_summary
--     public.mv_location_summary
--     public.mv_tenant_overview

-- Revoke direct SELECT from anon/authenticated. Dashboard and API clients
-- should use v_dashboard_* or other curated views instead.

revoke select on public.mv_work_order_summary from anon, authenticated;
revoke select on public.mv_asset_summary from anon, authenticated;
revoke select on public.mv_location_summary from anon, authenticated;
revoke select on public.mv_tenant_overview from anon, authenticated;

