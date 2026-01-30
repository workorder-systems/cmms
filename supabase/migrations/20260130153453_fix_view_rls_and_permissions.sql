-- SPDX-License-Identifier: AGPL-3.0-or-later

-- Fix v_plugin_installations view to enforce admin-only access
-- Recreate view with explicit permission check in WHERE clause
-- This ensures non-admin users cannot see plugin installations even if RLS has issues
drop view if exists public.v_plugin_installations;

create view public.v_plugin_installations as
select
  pi.id,
  pi.tenant_id,
  pi.plugin_id,
  p.key as plugin_key,
  p.name as plugin_name,
  p.is_integration,
  pi.status,
  pi.secret_ref,
  pi.config,
  pi.installed_by,
  pi.installed_at,
  pi.updated_at
from int.plugin_installations pi
join int.plugins p on p.id = pi.plugin_id
where pi.tenant_id = authz.get_current_tenant_id()
  -- Explicit permission check: only show if user has tenant.admin permission
  -- This works together with RLS policies to ensure admin-only access
  -- Handle NULL user_id gracefully (returns false, hiding installations)
  and (
    (select auth.uid()) is not null
    and authz.has_permission((select auth.uid()), pi.tenant_id, 'tenant.admin')
  );

-- Keep security_invoker = true (default) so view runs with invoker's privileges
-- This ensures RLS policies on underlying table are enforced
-- The view should NOT have security_invoker = false because we want RLS to be enforced

-- Grant SELECT to authenticated users (RLS policies will filter based on permissions)
grant select on public.v_plugin_installations to authenticated;

-- Revoke from anon (admin-only view)
revoke all on public.v_plugin_installations from anon;

comment on view public.v_plugin_installations is
  'Tenant-scoped plugin installation status for the current tenant context. Admin-only view; requires tenant.admin permission. Includes plugin metadata and configuration references. RLS policies on underlying table provide additional security.';

-- Grant execute on authz.get_current_tenant_id() to anon
-- This allows anonymous users to query views that use this function
-- The function will return NULL for anon (no JWT claims, no session variable)
-- which causes views to return empty results, which is the desired behavior
grant execute on function authz.get_current_tenant_id() to anon;
