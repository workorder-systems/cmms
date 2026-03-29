/**
 * Server `instructions` sent to MCP clients on initialize (helps agents use tools correctly).
 */
export const MCP_SERVER_INSTRUCTIONS = `
CMMS backed by Supabase. Use the host connection’s session for auth.

Operating rules (important):
- Always call tools with arguments that match the tool's JSON schema exactly. If you're unsure, inspect the tool schema and then call it. Parameterless tools still accept {} when the client requires a JSON object.
- Never assume a tool takes { tenant_id: ... } unless the schema says so. Most reads use JWT tenant_id only; work_orders_create is an exception and requires an explicit tenant_id — use the tenant_id from resolve_active_tenant (or tenants_list) after the user’s org is known.
- After switching tenants, the JWT must include tenant_id (Supabase issues it on refresh). HTTP MCP can refresh in the same request when the client sends X-Supabase-Refresh-Token (Supabase refresh_token). If refresh is unavailable, reconnect OAuth or pass a new Bearer token.
- Prefer token-efficient reads first (summary tools) and only fetch full records when the user asks for details.
- work_orders_list and work_orders_list_summary exclude status=draft by default. Pass include_draft: true when the user asks for drafts, intake, or unpublished work orders. Equivalent SDK invoke: work_orders.list_including_draft.
- Empty list results can mean no data yet or filters excluding rows (e.g. drafts). Do not assume the tenant is wrong until you have tried include_draft or confirmed with the user.
- Do not guess when disambiguation is required (multiple tenants, multiple entity candidates). Ask the user to choose.
- Treat structured tool errors as machine-usable: inspect error.code / details / hint / next_actions before retrying.
- When creating work orders programmatically, pass client_request_id so retries return the same work_order_id instead of creating duplicates.

Typical flow:
1. Call resolve_active_tenant.
   - If it returns needs_user_input=true, ask the user which tenant to use (use the provided candidates), then call set_active_tenant.
   - If it returns needs_set_active_tenant=true, call set_active_tenant with the suggested tenant_id.
2. After set_active_tenant: if the response includes new_access_token, use it for subsequent tool calls (JWT includes tenant_id). If tenant-scoped reads are still empty, ensure the MCP client sends X-Supabase-Refresh-Token (or refresh OAuth and retry).
3. Use entity_search to resolve asset_id / location_id / part_id before creating work. If multiple plausible candidates are returned, ask the user to pick one.
4. Use summary tools first for lightweight selection: work_orders_list_summary / work_orders_get_summary, assets_list_summary, parts_list_summary, pm_schedules_list_summary. Use full detail only when needed.
5. Use work_orders_create to create a work order (requires tenant_id plus title; other fields optional). For automation/retries, include client_request_id. Before writes, restate intent and required fields; ask the user for missing/ambiguous inputs.
6. When WORKORDER_SYSTEMS_EMBED_SEARCH_URL is set on the server, use similar_past_work_orders or semantic_search for text-in similarity over indexed embeddings; otherwise use entity_search and list/get tools.
7. Prefer workflow_bundle first when you want a curated workflow. Otherwise prefer sdk_catalog_compact first. Call sdk_operation_schema only when you need the exact args schema. Use sdk_invoke for operations without a dedicated tool (same allow-list as the catalog; permissions still apply).

Also available: tenants_list, set_active_tenant, work_orders_list, work_orders_get, work_orders_create, assets_list_summary, parts_list_summary, pm_schedules_list_summary, workflow_bundle, workflow_guide, sdk_catalog, sdk_invoke.

Access is enforced by RLS and JWT permissions.
`.trim();
