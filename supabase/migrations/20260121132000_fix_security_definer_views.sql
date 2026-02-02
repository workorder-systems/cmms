-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Migration: Fix SECURITY DEFINER Views to SECURITY INVOKER
-- 
-- This migration changes all views from SECURITY DEFINER (security_invoker = false)
-- to SECURITY INVOKER (security_invoker = true) to properly enforce RLS policies.
--
-- Rationale:
-- - SECURITY DEFINER views run with the view owner's privileges, potentially bypassing RLS
-- - SECURITY INVOKER views run with the querying user's privileges, enforcing RLS correctly
-- - This aligns with ADR 0003: "RLS is the primary tenant boundary"
-- - See docs/security-definer-views-research.md for detailed security analysis
--
-- All views filter by tenant_id using authz.get_current_tenant_id(), which requires
-- tenant context to be set via rpc_set_tenant_context. RLS policies on underlying
-- tables provide additional security enforcement. This is the correct security model.

-- ============================================================================
-- Core Application Views
-- ============================================================================

alter view public.v_work_orders set (security_invoker = true);
alter view public.v_assets set (security_invoker = true);
alter view public.v_locations set (security_invoker = true);
alter view public.v_tenants set (security_invoker = true);
alter view public.v_departments set (security_invoker = true);

-- ============================================================================
-- Roles and Permissions Views
-- ============================================================================

alter view public.v_tenant_roles set (security_invoker = true);
alter view public.v_user_tenant_roles set (security_invoker = true);
alter view public.v_permissions set (security_invoker = true);
alter view public.v_role_permissions set (security_invoker = true);

-- ============================================================================
-- Meter and PM System Views
-- ============================================================================

alter view public.v_asset_meters set (security_invoker = true);
alter view public.v_meter_readings set (security_invoker = true);
alter view public.v_pm_schedules set (security_invoker = true);
alter view public.v_pm_templates set (security_invoker = true);
alter view public.v_pm_template_checklist_items set (security_invoker = true);
alter view public.v_due_pms set (security_invoker = true);
alter view public.v_overdue_pms set (security_invoker = true);
alter view public.v_upcoming_pms set (security_invoker = true);
alter view public.v_pm_history set (security_invoker = true);

-- ============================================================================
-- Dashboard Views
-- ============================================================================

alter view public.v_dashboard_open_work_orders set (security_invoker = true);
alter view public.v_dashboard_overdue_work_orders set (security_invoker = true);
alter view public.v_dashboard_mttr_metrics set (security_invoker = true);
alter view public.v_dashboard_metrics set (security_invoker = true);
alter view public.v_dashboard_work_orders_by_status set (security_invoker = true);
alter view public.v_dashboard_work_orders_by_maintenance_type set (security_invoker = true);

-- ============================================================================
-- Catalog Views
-- ============================================================================

alter view public.v_maintenance_type_catalogs set (security_invoker = true);
alter view public.v_status_catalogs set (security_invoker = true);
alter view public.v_priority_catalogs set (security_invoker = true);
alter view public.v_status_transitions set (security_invoker = true);

-- ============================================================================
-- Work Order Related Views
-- ============================================================================

alter view public.v_work_order_attachments set (security_invoker = true);
alter view public.v_work_order_time_entries set (security_invoker = true);
alter view public.v_work_orders_summary set (security_invoker = true);

-- ============================================================================
-- Summary Views
-- ============================================================================

alter view public.v_assets_summary set (security_invoker = true);
alter view public.v_locations_summary set (security_invoker = true);
alter view public.v_tenants_overview set (security_invoker = true);

-- ============================================================================
-- Audit Views
-- ============================================================================

alter view public.v_audit_entity_changes set (security_invoker = true);
alter view public.v_audit_retention_configs set (security_invoker = true);
alter view public.v_audit_permission_changes set (security_invoker = true);

-- ============================================================================
-- Plugin Views
-- ============================================================================

alter view public.v_plugins set (security_invoker = true);
alter view public.v_plugin_installations set (security_invoker = true);

-- ============================================================================
-- Diagnostic Views
-- ============================================================================

alter view public.v_rls_policy_stats set (security_invoker = true);

-- ============================================================================
-- Comments
-- ============================================================================

comment on view public.v_work_orders is 
  'Work orders view scoped to the current tenant context. Uses SECURITY INVOKER to enforce RLS policies correctly. Clients must set tenant context via rpc_set_tenant_context. Underlying table RLS still applies.';

comment on view public.v_assets is 
  'Assets view scoped to the current tenant context. Uses SECURITY INVOKER to enforce RLS policies correctly. Clients must set tenant context via rpc_set_tenant_context. Underlying table RLS still applies.';

comment on view public.v_locations is 
  'Locations view scoped to the current tenant context. Uses SECURITY INVOKER to enforce RLS policies correctly. Clients must set tenant context via rpc_set_tenant_context. Underlying table RLS still applies.';

comment on view public.v_tenants is 
  'Tenants the current user belongs to (via tenant_memberships). Uses SECURITY INVOKER to enforce RLS policies correctly. RLS on underlying tables ensures users only see tenants they are members of. Anonymous users can query but will receive empty results.';

comment on view public.v_departments is 
  'Departments view scoped to the current tenant context. Uses SECURITY INVOKER to enforce RLS policies correctly. Clients must set tenant context via rpc_set_tenant_context. Underlying table RLS still applies.';
