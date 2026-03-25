import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import type { DbClient } from '@workorder-systems/sdk';
import { jsonResult, jsonToolError, jsonToolTry } from './json-tool-result.js';
import { MCP_SERVER_INSTRUCTIONS } from './mcp-instructions.js';
import { MCP_PACKAGE_VERSION } from './server-version.js';
import { registerSdkInvokeTools } from './sdk-invoke/register-sdk-invoke.js';
import { callEmbedSearch, type EmbedSearchTransportContext } from './embed-search-client.js';
import {
  cmmsSimilarPastTextInputSchema,
  entitySearchInputSchema,
  semanticSearchTextInputSchema,
  setActiveTenantInputSchema,
  workOrdersCreateInputSchema,
  workOrdersGetInputSchema,
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
          'tenants_list, then set_active_tenant',
          'entity_search for assets, parts, and locations',
          ...(options?.embedSearch
            ? [
                'similar_past_work_orders / semantic_search (text-in embed-search; optional detail_level)',
              ]
            : []),
          'work_orders_get when you need one work order in full',
          'sdk_catalog and sdk_invoke for other SDK operations',
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
        'Switch tenant context (rpc_set_tenant_context). Updates user metadata; tenant-scoped views read tenant_id from the JWT — refresh the OAuth access token after this when using HTTP MCP, or rely on stdio refresh when WORKORDER_SYSTEMS_REFRESH_TOKEN is set.',
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
