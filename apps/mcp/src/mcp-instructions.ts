/**
 * Server `instructions` sent to MCP clients on initialize (helps agents use tools correctly).
 */
export const MCP_SERVER_INSTRUCTIONS = `
CMMS over Supabase (user JWT). Full API parity with @workorder-systems/sdk via generic tools.

Recommended flow:
1. Call tenants_list to see organizations the user can access.
2. Call set_active_tenant with the tenant UUID (rpc_set_tenant_context). OAuth clients may need tenant grants.
3. After switching tenant, HTTP/OAuth clients must refresh the access token so the JWT includes tenant_id; stdio with refresh token may refresh automatically.
4. Call sdk_catalog to list every operation_id and JSON Schema for args (snake_case keys map to the SDK).
5. Call sdk_invoke with { "operation_id": "<id>", "args": { ... } } for any SDK method. Use args: {} for parameterless reads like work_orders.list.

Convenience tools (same SDK underneath): work_orders_list, work_orders_get, work_orders_create.

High-privilege operations (authorization, tenant API keys, plugins) follow RLS and JWT permissions—same as using the SDK in an app.
`.trim();
