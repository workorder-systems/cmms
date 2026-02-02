-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Migration: Fix Circular RLS Dependency in tenant_memberships Policy
--
-- Problem: The tenant_memberships_select_combined policy queries tenant_memberships
-- from within its own policy, causing infinite recursion with SECURITY INVOKER views.
--
-- Solution: Use authz.is_tenant_member() which is SECURITY DEFINER and can bypass RLS,
-- breaking the circular dependency.

drop policy if exists tenant_memberships_select_combined on app.tenant_memberships;

create policy tenant_memberships_select_combined 
  on app.tenant_memberships 
  for select 
  to authenticated 
  using (
    user_id = (select auth.uid())
    or authz.is_tenant_member((select auth.uid()), tenant_id)
  );

comment on policy tenant_memberships_select_combined on app.tenant_memberships is 
  'Allows users to see their own memberships and memberships in tenants they belong to. Uses authz.is_tenant_member() (SECURITY DEFINER) to avoid circular RLS dependency.';
