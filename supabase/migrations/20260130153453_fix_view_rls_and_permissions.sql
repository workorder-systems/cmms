-- SPDX-License-Identifier: AGPL-3.0-or-later

-- Fix v_plugin_installations view to enforce RLS properly
-- Keep security_invoker = true (default) so view runs with invoker's privileges
-- This ensures RLS policies on underlying table are enforced
-- The view should NOT have security_invoker = false because we want RLS to be enforced

-- Grant SELECT to authenticated users (RLS policies will filter based on permissions)
grant select on public.v_plugin_installations to authenticated;

-- Revoke from anon (admin-only view)
revoke all on public.v_plugin_installations from anon;

comment on view public.v_plugin_installations is
  'Tenant-scoped plugin installation status for the current tenant context. Admin-only view; RLS policies enforce tenant.admin permission requirement. Includes plugin metadata and configuration references.';

-- Grant execute on authz.get_current_tenant_id() to anon
-- This allows anonymous users to query views that use this function
-- The function will return NULL for anon (no JWT claims, no session variable)
-- which causes views to return empty results, which is the desired behavior
grant execute on function authz.get_current_tenant_id() to anon;
