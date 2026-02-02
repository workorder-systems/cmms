-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Migration: Grant UPDATE and DELETE on Underlying Tables for SECURITY INVOKER Views
--
-- With SECURITY INVOKER views, UPDATE and DELETE operations on views require
-- the corresponding permissions on the underlying tables. This migration grants
-- UPDATE and DELETE permissions on tables that have views supporting these operations.
--
-- Rationale:
-- - SECURITY DEFINER views used the view owner's privileges (postgres), so no grants needed
-- - SECURITY INVOKER views use the querying user's privileges, so grants are required
-- - RLS policies on these tables will still enforce tenant isolation and access control
-- - This is safe because RLS is the security boundary, not table-level permissions
--
-- Tables that need UPDATE/DELETE:
-- - work_order_attachments: v_work_order_attachments supports updates/deletes
-- - work_order_time_entries: v_work_order_time_entries supports updates/deletes
-- - work_orders: v_work_orders supports updates (status transitions, assignments)
-- - assets: v_assets supports updates
-- - locations: v_locations supports updates
-- - departments: v_departments supports updates
-- - Other tables that may have updatable views

-- ============================================================================
-- Work Order Related Tables (updatable views)
-- ============================================================================

grant update on app.work_order_attachments to authenticated;
grant delete on app.work_order_attachments to authenticated;

grant update on app.work_order_time_entries to authenticated;
grant delete on app.work_order_time_entries to authenticated;

grant update on app.work_orders to authenticated;
grant delete on app.work_orders to authenticated;

-- ============================================================================
-- Core Application Tables (updatable views)
-- ============================================================================

grant update on app.assets to authenticated;
grant delete on app.assets to authenticated;

grant update on app.locations to authenticated;
grant delete on app.locations to authenticated;

grant update on app.departments to authenticated;
grant delete on app.departments to authenticated;

-- ============================================================================
-- Meter and PM System Tables (updatable views)
-- ============================================================================

grant update on app.asset_meters to authenticated;
grant delete on app.asset_meters to authenticated;

grant update on app.meter_readings to authenticated;
grant delete on app.meter_readings to authenticated;

grant update on app.pm_schedules to authenticated;
grant delete on app.pm_schedules to authenticated;

-- ============================================================================
-- Schema Usage Grants (for authz schema views/functions)
-- ============================================================================

grant usage on schema authz to authenticated;
grant usage on schema authz to anon;
