-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Migration: Grant SELECT on Underlying Tables for SECURITY INVOKER Views
--
-- With SECURITY INVOKER views, the querying user's privileges are used when accessing
-- underlying tables. PostgreSQL requires SELECT permission on underlying tables before
-- RLS policies can be evaluated. This migration grants SELECT on all tables used by views
-- to authenticated and anon roles. RLS policies will enforce security.
--
-- Rationale:
-- - SECURITY DEFINER views used the view owner's privileges (postgres), so no grants needed
-- - SECURITY INVOKER views use the querying user's privileges, so grants are required
-- - RLS policies on these tables will still enforce tenant isolation and access control
-- - This is safe because RLS is the security boundary, not table-level permissions

-- ============================================================================
-- Core Application Tables
-- ============================================================================

grant select on app.tenants to authenticated;
grant select on app.tenants to anon;

grant select on app.locations to authenticated;
grant select on app.locations to anon;

grant select on app.departments to authenticated;
grant select on app.departments to anon;

grant select on app.assets to authenticated;
grant select on app.assets to anon;

grant select on app.work_orders to authenticated;
grant select on app.work_orders to anon;

-- ============================================================================
-- Work Order Related Tables
-- ============================================================================

grant select on app.work_order_time_entries to authenticated;
grant select on app.work_order_time_entries to anon;

grant select on app.work_order_attachments to authenticated;
grant select on app.work_order_attachments to anon;

-- ============================================================================
-- Meter and PM System Tables
-- ============================================================================

grant select on app.asset_meters to authenticated;
grant select on app.asset_meters to anon;

grant select on app.meter_readings to authenticated;
grant select on app.meter_readings to anon;

grant select on app.pm_schedules to authenticated;
grant select on app.pm_schedules to anon;

grant select on cfg.pm_templates to authenticated;
grant select on cfg.pm_templates to anon;

grant select on cfg.pm_template_checklist_items to authenticated;
grant select on cfg.pm_template_checklist_items to anon;

grant select on app.pm_history to authenticated;
grant select on app.pm_history to anon;

-- ============================================================================
-- Configuration Tables (used by catalog views)
-- ============================================================================

grant select on cfg.maintenance_type_catalogs to authenticated;
grant select on cfg.maintenance_type_catalogs to anon;

grant select on cfg.status_catalogs to authenticated;
grant select on cfg.status_catalogs to anon;

grant select on cfg.priority_catalogs to authenticated;
grant select on cfg.priority_catalogs to anon;

grant select on cfg.status_transitions to authenticated;
grant select on cfg.status_transitions to anon;

grant select on cfg.tenant_roles to authenticated;
grant select on cfg.tenant_roles to anon;

grant select on cfg.permissions to authenticated;
grant select on cfg.permissions to anon;

grant select on cfg.tenant_role_permissions to authenticated;
grant select on cfg.tenant_role_permissions to anon;

-- ============================================================================
-- Roles and Permissions Tables
-- ============================================================================

grant select on app.user_tenant_roles to authenticated;
grant select on app.user_tenant_roles to anon;

-- ============================================================================
-- Audit Tables (if used by views)
-- ============================================================================

grant select on audit.entity_changes to authenticated;
grant select on audit.entity_changes to anon;

grant select on cfg.audit_retention_configs to authenticated;
grant select on cfg.audit_retention_configs to anon;

grant select on audit.permission_changes to authenticated;
grant select on audit.permission_changes to anon;

-- ============================================================================
-- Integration Tables (if used by views)
-- ============================================================================

grant select on int.plugins to authenticated;
grant select on int.plugins to anon;

grant select on int.plugin_installations to authenticated;
grant select on int.plugin_installations to anon;

-- ============================================================================
-- Schema Usage Grants (if not already granted)
-- ============================================================================

grant usage on schema cfg to authenticated;
grant usage on schema cfg to anon;

grant usage on schema audit to authenticated;
grant usage on schema audit to anon;

grant usage on schema int to authenticated;
grant usage on schema int to anon;
