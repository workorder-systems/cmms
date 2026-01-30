-- SPDX-License-Identifier: AGPL-3.0-or-later

-- Grant SELECT to anon role on tenant-scoped views
-- This allows anonymous users to query views without getting permission errors
-- Views will return empty results for anonymous users because authz.get_current_tenant_id() returns NULL
-- This matches expected behavior: anonymous users see no data, not errors

grant select on public.v_locations to anon;
grant select on public.v_assets to anon;
grant select on public.v_work_orders to anon;
grant select on public.v_tenants to anon;

comment on view public.v_locations is 
  'Locations view scoped to the current tenant context. Clients must set tenant context via rpc_set_tenant_context. Underlying table RLS still applies. Used by frontend to list and display locations. Anonymous users can query but will receive empty results.';

comment on view public.v_assets is 
  'Assets view scoped to the current tenant context. Clients must set tenant context via rpc_set_tenant_context. Underlying table RLS still applies. Used by frontend to list and display assets. Anonymous users can query but will receive empty results.';

comment on view public.v_work_orders is 
  'Work orders view scoped to the current tenant context. Clients must set tenant context via rpc_set_tenant_context. Underlying table RLS still applies. Used by frontend to list and display work orders. Anonymous users can query but will receive empty results.';

comment on view public.v_tenants is 
  'Tenants the current user belongs to (via tenant_memberships). Used for tenant selection in UI. RLS on underlying tables ensures users only see tenants they are members of. Anonymous users can query but will receive empty results.';
