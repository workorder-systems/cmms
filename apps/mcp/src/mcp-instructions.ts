/**
 * Server `instructions` sent to MCP clients on initialize (helps agents use tools correctly).
 */
export const MCP_SERVER_INSTRUCTIONS = `
Work Order Systems (CMMS) over Supabase.

Typical flow:
1. Call tenants_list to see organizations the user can access.
2. Call set_active_tenant with the tenant UUID (rpc_set_tenant_context). Tenant-scoped data uses tenant_id JWT claims.
3. After switching tenant, HTTP/OAuth clients must refresh the access token so the JWT includes tenant_id; stdio with refresh token may refresh automatically.
4. Use work_orders_list, work_orders_get, and work_orders_create as needed within that tenant.

OAuth clients may need tenant grants for the chosen tenant. If lists are empty after set_active_tenant, refresh tokens or verify membership.
`.trim();
