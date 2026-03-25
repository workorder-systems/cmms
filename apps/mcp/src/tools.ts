import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import type { DbClient, TenantRow } from '@workorder-systems/sdk';
import { jsonCompactResult, jsonCompactToolError, jsonResult, jsonToolError, jsonToolTry } from './json-tool-result.js';
import { MCP_SERVER_INSTRUCTIONS } from './mcp-instructions.js';
import { MCP_PACKAGE_VERSION } from './server-version.js';
import { registerSdkInvokeTools } from './sdk-invoke/register-sdk-invoke.js';
import { getSessionTenantId } from './sdk-invoke/session-tenant.js';
import { callEmbedSearch, type EmbedSearchTransportContext } from './embed-search-client.js';
import {
  cmmsSimilarPastTextInputSchema,
  entitySearchInputSchema,
  resolveActiveTenantInputSchema,
  semanticSearchTextInputSchema,
  setActiveTenantInputSchema,
  workOrdersCreateInputSchema,
  workOrdersGetInputSchema,
  workOrdersGetSummaryInputSchema,
  workOrdersListSummaryInputSchema,
} from './schemas.js';

/** Optional: call Supabase Edge embed-search with the same user JWT (text-in similarity). */
export type EmbedSearchContext = EmbedSearchTransportContext;

/** Hints for clients (MCP tool annotations are non-authoritative). */
const toolAnn = {
  readTenantData: { readOnlyHint: true, openWorldHint: true } satisfies ToolAnnotations,
  writeTenantContext: { readOnlyHint: false, destructiveHint: false, openWorldHint: true } satisfies ToolAnnotations,
  writeWorkOrder: { readOnlyHint: false, destructiveHint: false, openWorldHint: true } satisfies ToolAnnotations,
} as const;

export type RegisterToolsOptions = {
  /**
   * After rpc_set_tenant_context the server may refresh the session so the next JWT includes tenant_id.
   * This requires a refresh token-backed Supabase session (stdio has WORKORDER_SYSTEMS_REFRESH_TOKEN; HTTP may provide one).
   */
  tryRefreshAccessTokenAfterSetTenant?: () => Promise<
    | { refreshed: false }
    | { refreshed: true; access_token: string }
  >;
  /**
   * When set (requires WORKORDER_SYSTEMS_EMBED_SEARCH_URL), registers similar_past_work_orders,
   * semantic_search, and exposes vector-similarity sdk_invoke ops in sdk_catalog.
   */
  embedSearch?: EmbedSearchContext;
  /**
   * HTTP MCP: return the Bearer access token for this request so sdk_catalog / sdk_invoke resolve tenant_id
   * from the JWT (Supabase client may have no in-memory session when only global headers are set).
   */
  getMcpBearerAccessToken?: () => Promise<string | undefined>;
};

/**
 * Registers CMMS tools on the given MCP server. All calls use the user JWT from getClient().
 */
export function registerTools(
  server: McpServer,
  getClient: () => Promise<DbClient>,
  options?: RegisterToolsOptions
): void {
  registerSdkInvokeTools(server, getClient, {
    getBearerAccessToken: options?.getMcpBearerAccessToken,
    embeddingEdgeConfigured: Boolean(options?.embedSearch),
  });

  server.registerTool(
    'resolve_active_tenant',
    {
      title: 'Resolve active tenant',
      description:
        'Resolve which tenant to use. If a tenant is already present in the JWT/session, returns it. If the user belongs to exactly 1 tenant, suggests that tenant. If multiple, returns candidates and requires user choice.',
      inputSchema: resolveActiveTenantInputSchema,
      annotations: toolAnn.readTenantData,
    },
    async () => {
      try {
        const client = await getClient();
        const bearer = await options?.getMcpBearerAccessToken?.();
        const tenantId = await getSessionTenantId(client, bearer);
        if (tenantId) {
          return jsonCompactResult({
            ok: true,
            resolved: true,
            tenant_id: tenantId,
            needs_set_active_tenant: false,
            needs_user_input: false,
            candidates: [],
            next_actions: ['Proceed with tenant-scoped tools (tenant_id is already present in JWT/session).'],
          });
        }

        const tenants = await client.tenants.list();
        const candidates = (tenants ?? [])
          .map((t: TenantRow) => ({
            tenant_id: typeof t.id === 'string' ? t.id : null,
            name: typeof t.name === 'string' ? t.name : null,
            slug: typeof t.slug === 'string' ? t.slug : null,
          }))
          .filter((t) => typeof t.tenant_id === 'string' && t.tenant_id.length > 0);

        if (candidates.length === 0) {
          return jsonCompactToolError('No tenants found for the current user.');
        }

        if (candidates.length === 1) {
          const only = candidates[0]!;
          return jsonCompactResult({
            ok: true,
            resolved: true,
            tenant_id: only.tenant_id,
            needs_set_active_tenant: true,
            needs_user_input: false,
            candidates,
            next_actions: ['Call set_active_tenant with this tenant_id before tenant-scoped reads/writes.'],
          });
        }

        return jsonCompactResult({
          ok: true,
          resolved: false,
          tenant_id: null,
          needs_set_active_tenant: false,
          needs_user_input: true,
          candidates,
          next_actions: [
            'Ask the user which tenant to use (by name/slug), then call set_active_tenant with the chosen tenant_id.',
          ],
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        return jsonCompactToolError(message);
      }
    }
  );

  server.registerTool(
    'tenants_list',
    {
      title: 'List tenants',
      description:
        'List organizations (tenants) the signed-in user belongs to. Use set_active_tenant before tenant-scoped reads/writes.',
      annotations: toolAnn.readTenantData,
    },
    async () =>
      jsonToolTry(async () => {
        const client = await getClient();
        return client.tenants.list();
      })
  );

  server.registerTool(
    'work_orders_list',
    {
      title: 'List work orders',
      description:
        'List work orders for the active tenant (JWT tenant_id claim). Excludes draft by default. Call set_active_tenant first if needed, then refresh the OAuth session if views are empty.',
      annotations: toolAnn.readTenantData,
    },
    async () =>
      jsonToolTry(async () => {
        const client = await getClient();
        return client.workOrders.list();
      })
  );

  server.registerTool(
    'work_orders_list_summary',
    {
      title: 'List work orders (summary)',
      description:
        'Token-efficient list of work orders for the active tenant (JWT tenant_id claim). Returns only key fields for selection/disambiguation; use work_orders_get_summary or work_orders_get for details.',
      inputSchema: workOrdersListSummaryInputSchema,
      annotations: toolAnn.readTenantData,
    },
    async (raw) => {
      try {
        const client = await getClient();
        const args = workOrdersListSummaryInputSchema.parse(raw);
        const limit = args.limit ?? 50;
        const { data, error } = await client.supabase
          .from('v_work_orders')
          .select(
            [
              'id',
              'title',
              'status',
              'priority',
              'due_date',
              'assigned_to',
              'assigned_to_name',
              'asset_id',
              'location_id',
              'project_id',
              'created_at',
              'updated_at',
            ].join(',')
          )
          .neq('status', 'draft')
          .order('updated_at', { ascending: false })
          .limit(limit);
        if (error) {
          return jsonCompactToolError(error.message);
        }
        const bearer = await options?.getMcpBearerAccessToken?.();
        const tenantId = await getSessionTenantId(client, bearer);
        return jsonCompactResult({
          ok: true,
          tenant_id: tenantId ?? null,
          returned_count: (data ?? []).length,
          rows: data ?? [],
          next_actions: [
            'Pick a work_order_id and call work_orders_get_summary (or work_orders_get for full fields).',
          ],
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        return jsonCompactToolError(message);
      }
    }
  );

  server.registerTool(
    'work_orders_get',
    {
      title: 'Get work order',
      description: 'Fetch one work order by id within the active tenant context.',
      inputSchema: workOrdersGetInputSchema,
      annotations: toolAnn.readTenantData,
    },
    async (args) =>
      jsonToolTry(async () => {
        const client = await getClient();
        return client.workOrders.getById(args.work_order_id);
      })
  );

  server.registerTool(
    'work_orders_get_summary',
    {
      title: 'Get work order (summary)',
      description:
        'Token-efficient fetch of one work order by id. Returns key fields only; use work_orders_get for full details.',
      inputSchema: workOrdersGetSummaryInputSchema,
      annotations: toolAnn.readTenantData,
    },
    async (raw) => {
      try {
        const client = await getClient();
        const args = workOrdersGetSummaryInputSchema.parse(raw);
        const { data, error } = await client.supabase
          .from('v_work_orders')
          .select(
            [
              'id',
              'title',
              'status',
              'priority',
              'due_date',
              'assigned_to',
              'assigned_to_name',
              'asset_id',
              'location_id',
              'project_id',
              'description',
              'created_at',
              'updated_at',
            ].join(',')
          )
          .eq('id', args.work_order_id)
          .maybeSingle();
        if (error) {
          return jsonCompactToolError(error.message);
        }
        const bearer = await options?.getMcpBearerAccessToken?.();
        const tenantId = await getSessionTenantId(client, bearer);
        return jsonCompactResult({
          ok: true,
          tenant_id: tenantId ?? null,
          work_order_id: args.work_order_id,
          row: data ?? null,
          next_actions: ['Call work_orders_get if you need full text fields (cause, resolution, SLA fields, etc.).'],
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        return jsonCompactToolError(message);
      }
    }
  );

  server.registerTool(
    'work_orders_create',
    {
      title: 'Create work order',
      description: 'Create a work order in the given tenant via rpc_create_work_order (requires permissions).',
      inputSchema: workOrdersCreateInputSchema,
      annotations: toolAnn.writeWorkOrder,
    },
    async (args) =>
      jsonToolTry(async () => {
        const client = await getClient();
        const id = await client.workOrders.create({
          tenantId: args.tenant_id,
          title: args.title,
          description: args.description ?? null,
          priority: args.priority,
          maintenanceType: args.maintenance_type ?? null,
          assignedTo: args.assigned_to ?? null,
          locationId: args.location_id ?? null,
          assetId: args.asset_id ?? null,
          dueDate: args.due_date ?? null,
          pmScheduleId: args.pm_schedule_id ?? null,
          projectId: args.project_id ?? null,
        });
        return { work_order_id: id };
      })
  );

  server.registerTool(
    'workflow_guide',
    {
      title: 'Workflow guide',
      description:
        'Static suggested order of operations for this server (local only).',
      annotations: toolAnn.readTenantData,
    },
    async () =>
      jsonResult({
        steps: [
          'resolve_active_tenant, then set_active_tenant if needed',
          'entity_search for assets, parts, and locations (ask user if multiple candidates)',
          ...(options?.embedSearch
            ? [
                'similar_past_work_orders / semantic_search (text-in embed-search; optional detail_level)',
              ]
            : []),
          'work_orders_list_summary / work_orders_get_summary; work_orders_get for full fields',
          'sdk_catalog_compact, sdk_operation_schema as needed, sdk_invoke',
        ],
      })
  );

  server.registerTool(
    'entity_search',
    {
      title: 'Search entity candidates',
      description:
        'Match free text to assets, parts, and locations (aliases and names). Returns candidate rows for disambiguation.',
      inputSchema: entitySearchInputSchema,
      annotations: toolAnn.readTenantData,
    },
    async (args) =>
      jsonToolTry(async () => {
        const client = await getClient();
        const parsed = entitySearchInputSchema.parse(args);
        return client.semanticSearch.searchEntityCandidates({
          query: parsed.query,
          entityTypes: parsed.entity_types ?? null,
          limit: parsed.limit,
        });
      })
  );

  if (options?.embedSearch) {
    const es = options.embedSearch;

    server.registerTool(
      'similar_past_work_orders',
      {
        title: 'Similar past work orders',
        description:
          'Find similar completed work orders from a text query (embed-search). Default results are summary rows; use work_orders_get for full fields.',
        inputSchema: cmmsSimilarPastTextInputSchema,
        annotations: toolAnn.readTenantData,
      },
      async (args) => {
        try {
          const body = cmmsSimilarPastTextInputSchema.parse(args);
          const detailLevel = body.detail_level ?? 'summary';
          const out = await callEmbedSearch(es, {
            domain: 'work_orders',
            query_text: body.query_text,
            limit: body.limit,
            exclude_work_order_id: body.exclude_work_order_id,
            min_similarity: body.min_similarity,
            detail_level: detailLevel,
          });
          if (!out.ok) {
            return jsonToolError(out.message);
          }
          return jsonResult(out.data);
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          return jsonToolError(message);
        }
      }
    );

    server.registerTool(
      'semantic_search',
      {
        title: 'Semantic search',
        description:
          'Text-in similarity over work_orders, assets, or parts (embed-search). Requires indexed embeddings. Default detail_level is summary.',
        inputSchema: semanticSearchTextInputSchema,
        annotations: toolAnn.readTenantData,
      },
      async (args) => {
        try {
          const body = semanticSearchTextInputSchema.parse(args);
          const detailLevel = body.detail_level ?? 'summary';
          const payload: Record<string, unknown> = {
            domain: body.domain,
            query_text: body.query_text,
            limit: body.limit,
            min_similarity: body.min_similarity,
            detail_level: detailLevel,
          };
          if (body.domain === 'work_orders' && body.exclude_work_order_id) {
            payload.exclude_work_order_id = body.exclude_work_order_id;
          }
          const out = await callEmbedSearch(es, payload);
          if (!out.ok) {
            return jsonToolError(out.message);
          }
          return jsonResult(out.data);
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          return jsonToolError(message);
        }
      }
    );
  }

  server.registerTool(
    'set_active_tenant',
    {
      title: 'Set active tenant',
      description:
        'Switch tenant context (rpc_set_tenant_context). Updates user metadata; tenant_id on the JWT updates after Supabase refreshSession. HTTP: send X-Supabase-Refresh-Token with the Supabase refresh_token so the server can refresh in-request; stdio: set WORKORDER_SYSTEMS_REFRESH_TOKEN.',
      inputSchema: setActiveTenantInputSchema,
      annotations: toolAnn.writeTenantContext,
    },
    async (args) => {
      try {
        const client = await getClient();
        await client.setTenant(args.tenant_id);
        let refreshed: { refreshed: false } | { refreshed: true; access_token: string } = { refreshed: false };
        if (options?.tryRefreshAccessTokenAfterSetTenant) {
          try {
            refreshed = await options.tryRefreshAccessTokenAfterSetTenant();
          } catch {
            refreshed = { refreshed: false };
          }
        }
        return jsonResult(
          refreshed.refreshed
            ? {
                ok: true,
                tenant_id: args.tenant_id,
                access_token_refreshed: true,
                new_access_token: refreshed.access_token,
                note: 'Session refreshed; use new_access_token for subsequent tool calls (JWT includes tenant_id).',
              }
            : {
                ok: true,
                tenant_id: args.tenant_id,
                access_token_refreshed: false,
                note: 'If work_orders_list returns empty or errors, obtain a new access token (OAuth refresh) so JWT claims include tenant_id.',
              }
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonToolError(message);
      }
    }
  );
}

export function createWorkOrderSystemsMcpServer(
  getClient: () => Promise<DbClient>,
  toolOptions?: RegisterToolsOptions
): McpServer {
  const server = new McpServer(
    {
      name: 'mcp',
      title: 'MCP',
      version: MCP_PACKAGE_VERSION,
      description:
        'CMMS: tenants, tenant switch, work orders, entity and similarity search, plus sdk_catalog and sdk_invoke for the full SDK.',
    },
    {
      instructions: MCP_SERVER_INSTRUCTIONS,
    }
  );
  registerTools(server, getClient, toolOptions);
  return server;
}
