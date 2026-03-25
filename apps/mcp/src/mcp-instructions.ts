/**
 * Server `instructions` sent to MCP clients on initialize (helps agents use tools correctly).
 */
export const MCP_SERVER_INSTRUCTIONS = `
CMMS backed by Supabase. Use the host connection’s session for auth.

Operating rules (important):
- Always call tools with arguments that match the tool's JSON schema exactly. If you're unsure, inspect the tool schema and then call it.
- Never assume a tool takes { tenant_id: ... } unless the schema says so. Some tools use active tenant context and accept only an id.
- After switching tenants, the JWT must include tenant_id (Supabase issues it on refresh). HTTP MCP can refresh in the same request when the client sends X-Supabase-Refresh-Token (Supabase refresh_token). If refresh is unavailable, reconnect OAuth or pass a new Bearer token.

Typical flow:
1. Call tenants_list, pick the right tenant, then call set_active_tenant with { tenant_id } (uuid).
2. If set_active_tenant returns new_access_token, the HTTP server already uses it for later tools in that request when refresh ran. If tenant-scoped reads are still empty, ensure the MCP client sends X-Supabase-Refresh-Token (or refresh OAuth and retry).
3. Use entity_search to resolve asset_id / location_id / part_id before creating work.
4. Use work_orders_create to create a work order (this tool takes an explicit tenant_id).
5. Use work_orders_list and work_orders_get to read work orders (these use the active tenant JWT context):
   - work_orders_list takes no args.
   - work_orders_get takes only { work_order_id } (no tenant_id).
6. When WORKORDER_SYSTEMS_EMBED_SEARCH_URL is set on the server, use similar_past_work_orders or semantic_search for text-in similarity over indexed embeddings; otherwise use entity_search and list/get tools.
7. Use sdk_catalog (filtered by session tenant + role permissions) and sdk_invoke for other operations.

Also available: work_orders_list, work_orders_create, workflow_guide.

Access is enforced by RLS and JWT permissions.
`.trim();
