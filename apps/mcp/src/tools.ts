import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import type { DbClient, TenantRow } from '@workorder-systems/sdk';
import { jsonCompactResult, jsonCompactToolError, jsonResult, jsonToolError, jsonToolTry } from './json-tool-result.js';
import { MCP_SERVER_INSTRUCTIONS } from './mcp-instructions.js';
import { MCP_PACKAGE_VERSION } from './server-version.js';
import { registerSdkInvokeTools } from './sdk-invoke/register-sdk-invoke.js';
import { getSessionTenantId } from './sdk-invoke/session-tenant.js';
import { callEmbedSearch, type EmbedSearchTransportContext } from './embed-search-client.js';
import { toStructuredToolError } from './tool-errors.js';
import {
  cmmsSimilarPastTextInputSchema,
  entitySearchInputSchema,
  partsListSummaryInputSchema,
  pmSchedulesListSummaryInputSchema,
  resolveActiveTenantInputSchema,
  semanticSearchTextInputSchema,
  setActiveTenantInputSchema,
  workflowBundleInputSchema,
  workOrdersCreateInputSchema,
  workOrdersGetInputSchema,
  workOrdersGetSummaryInputSchema,
  workOrdersListSummaryInputSchema,
  assetsListSummaryInputSchema,
} from './schemas.js';

/** Optional: call Supabase Edge embed-search with the same user JWT (text-in similarity). */
export type EmbedSearchContext = EmbedSearchTransportContext;

/** Hints for clients (MCP tool annotations are non-authoritative). */
const toolAnn = {
  readTenantData: { readOnlyHint: true, openWorldHint: true } satisfies ToolAnnotations,
  writeTenantContext: { readOnlyHint: false, destructiveHint: false, openWorldHint: true } satisfies ToolAnnotations,
  writeWorkOrder: { readOnlyHint: false, destructiveHint: false, openWorldHint: true } satisfies ToolAnnotations,
} as const;

const TENANT_REQUIRED_GUIDANCE = {
  ok: false,
  error: {
    message: 'Tenant context required before using this tenant-scoped tool.',
    code: 'TENANT_CONTEXT_REQUIRED',
    details:
      'Call resolve_active_tenant first. If it suggests or requires a tenant, call set_active_tenant and ensure the access token is refreshed so the JWT includes tenant_id.',
    hint: 'HTTP MCP clients should send X-Supabase-Refresh-Token so set_active_tenant can refresh the access token in-request.',
  },
  next_actions: [
    'Call resolve_active_tenant.',
    'If needed, call set_active_tenant with the chosen tenant_id.',
    'Retry this tool after the JWT has tenant_id.',
  ],
} as const;

const WORKFLOW_BUNDLES = {
  tenant_bootstrap: {
    bundle_id: 'tenant_bootstrap',
    purpose: 'Resolve tenant context before tenant-scoped reads or writes.',
    recommended_tools: ['resolve_active_tenant', 'set_active_tenant', 'tenants_list'],
    when_to_use:
      'At the beginning of a session, after OAuth reconnects, or whenever tenant-scoped tools return tenant-context guidance.',
    when_not_to_use: 'When tenant_id is already present in the JWT/session and tenant-scoped tools are working.',
  },
  work_order_intake: {
    bundle_id: 'work_order_intake',
    purpose: 'Resolve entities and create a work order safely from automation.',
    recommended_tools: [
      'resolve_active_tenant',
      'set_active_tenant',
      'entity_search',
      'assets_list_summary',
      'parts_list_summary',
      'work_orders_create',
    ],
    when_to_use:
      'When creating a work order from natural language intent, especially if assets or locations must be disambiguated first.',
    when_not_to_use:
      'When you already have canonical asset_id / location_id values and only need the generic sdk_invoke surface.',
  },
  work_order_lookup: {
    bundle_id: 'work_order_lookup',
    purpose: 'Browse and inspect work orders with summary-first reads.',
    recommended_tools: ['work_orders_list_summary', 'work_orders_get_summary', 'work_orders_get'],
    when_to_use: 'When selecting or disambiguating a work order before opening full detail.',
    when_not_to_use: 'When you already know the exact work order id and need full fields immediately.',
  },
  maintenance_lookup: {
    bundle_id: 'maintenance_lookup',
    purpose: 'Browse assets, parts, and PM schedules with token-efficient reads.',
    recommended_tools: ['assets_list_summary', 'parts_list_summary', 'pm_schedules_list_summary'],
    when_to_use: 'When agents need lightweight lists for selection, routing, or follow-up clarification.',
    when_not_to_use: 'When analytics/reporting summaries or raw sdk_invoke operations are a better fit.',
  },
} as const;

type WorkflowBundleId = keyof typeof WORKFLOW_BUNDLES;

async function requireTenantContext(
  client: DbClient,
  getBearerAccessToken?: () => Promise<string | undefined>
): Promise<string | undefined> {
  const bearer = await getBearerAccessToken?.();
  return getSessionTenantId(client, bearer);
}

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
    'workflow_bundle_guide',
    {
      title: 'Workflow bundle guide',
      description:
        'Curated workflow bundles for common agent tasks such as tenant bootstrap, work-order intake, and maintenance lookup.',
      inputSchema: workflowBundleInputSchema,
      annotations: toolAnn.readTenantData,
    },
    async (raw) => {
      try {
        const { bundle_id } = workflowBundleInputSchema.parse(raw);
        if (bundle_id) {
          return jsonResult(WORKFLOW_BUNDLES[bundle_id as WorkflowBundleId]);
        }
        return jsonResult({
          bundles: Object.values(WORKFLOW_BUNDLES),
        });
      } catch (err) {
        return jsonToolError(toStructuredToolError(err));
      }
    }
  );

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
        return jsonCompactToolError(toStructuredToolError(e));
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
        const tenantId = await requireTenantContext(client, options?.getMcpBearerAccessToken);
        if (!tenantId) {
          throw TENANT_REQUIRED_GUIDANCE.error;
        }
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
        const tenantId = await requireTenantContext(client, options?.getMcpBearerAccessToken);
        if (!tenantId) {
          return jsonCompactResult(TENANT_REQUIRED_GUIDANCE);
        }
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
          return jsonCompactToolError(toStructuredToolError(error));
        }
        return jsonCompactResult({
          ok: true,
          tenant_id: tenantId,
          returned_count: (data ?? []).length,
          rows: data ?? [],
          next_actions: [
            'Pick a work_order_id and call work_orders_get_summary (or work_orders_get for full fields).',
          ],
        });
      } catch (e) {
        return jsonCompactToolError(toStructuredToolError(e));
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
        const tenantId = await requireTenantContext(client, options?.getMcpBearerAccessToken);
        if (!tenantId) {
          throw TENANT_REQUIRED_GUIDANCE.error;
        }
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
        const tenantId = await requireTenantContext(client, options?.getMcpBearerAccessToken);
        if (!tenantId) {
          return jsonCompactResult(TENANT_REQUIRED_GUIDANCE);
        }
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
          return jsonCompactToolError(toStructuredToolError(error));
        }
        return jsonCompactResult({
          ok: true,
          tenant_id: tenantId,
          work_order_id: args.work_order_id,
          row: data ?? null,
          next_actions: ['Call work_orders_get if you need full text fields (cause, resolution, SLA fields, etc.).'],
        });
      } catch (e) {
        return jsonCompactToolError(toStructuredToolError(e));
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
          clientRequestId: args.client_request_id ?? null,
        });
        return { work_order_id: id };
      })
  );

  server.registerTool(
    'assets_list_summary',
    {
      title: 'List assets (summary)',
      description:
        'Token-efficient asset list for the active tenant. Returns asset ids, names, identifiers, and location hints for selection/disambiguation.',
      inputSchema: assetsListSummaryInputSchema,
      annotations: toolAnn.readTenantData,
    },
    async (raw) => {
      try {
        const client = await getClient();
        const tenantId = await requireTenantContext(client, options?.getMcpBearerAccessToken);
        if (!tenantId) {
          return jsonCompactResult(TENANT_REQUIRED_GUIDANCE);
        }
        const args = assetsListSummaryInputSchema.parse(raw);
        const limit = args.limit ?? 50;
        const { data, error } = await client.supabase
          .from('v_assets')
          .select('id,name,asset_number,barcode,status,location_id,updated_at')
          .order('updated_at', { ascending: false })
          .limit(limit);
        if (error) {
          return jsonCompactToolError(toStructuredToolError(error));
        }
        return jsonCompactResult({
          ok: true,
          tenant_id: tenantId,
          returned_count: (data ?? []).length,
          rows: data ?? [],
          next_actions: ['Use entity_search or sdk_invoke for richer asset detail when needed.'],
        });
      } catch (err) {
        return jsonCompactToolError(toStructuredToolError(err));
      }
    }
  );

  server.registerTool(
    'parts_list_summary',
    {
      title: 'List parts (summary)',
      description:
        'Token-efficient parts list for the active tenant. Returns part ids, names, numbers, barcode, and supplier hints for selection/disambiguation.',
      inputSchema: partsListSummaryInputSchema,
      annotations: toolAnn.readTenantData,
    },
    async (raw) => {
      try {
        const client = await getClient();
        const tenantId = await requireTenantContext(client, options?.getMcpBearerAccessToken);
        if (!tenantId) {
          return jsonCompactResult(TENANT_REQUIRED_GUIDANCE);
        }
        const args = partsListSummaryInputSchema.parse(raw);
        const limit = args.limit ?? 50;
        const rows = await client.partsInventory.listParts();
        return jsonCompactResult({
          ok: true,
          tenant_id: tenantId,
          returned_count: rows.slice(0, limit).length,
          rows: rows.slice(0, limit).map((row) => ({
            id: row.id,
            name: row.name,
            part_number: row.part_number,
            barcode: row.barcode ?? null,
            preferred_supplier_id: row.preferred_supplier_id,
            updated_at: row.updated_at,
          })),
          next_actions: ['Use entity_search or sdk_invoke for richer inventory detail when needed.'],
        });
      } catch (err) {
        return jsonCompactToolError(toStructuredToolError(err));
      }
    }
  );

  server.registerTool(
    'pm_schedules_list_summary',
    {
      title: 'List PM schedules (summary)',
      description:
        'Token-efficient PM schedule list for the active tenant. Returns ids, titles, asset references, next due date, and active status.',
      inputSchema: pmSchedulesListSummaryInputSchema,
      annotations: toolAnn.readTenantData,
    },
    async (raw) => {
      try {
        const client = await getClient();
        const tenantId = await requireTenantContext(client, options?.getMcpBearerAccessToken);
        if (!tenantId) {
          return jsonCompactResult(TENANT_REQUIRED_GUIDANCE);
        }
        const args = pmSchedulesListSummaryInputSchema.parse(raw);
        const limit = args.limit ?? 50;
        const rows = await client.pm.listSchedules();
        return jsonCompactResult({
          ok: true,
          tenant_id: tenantId,
          returned_count: rows.slice(0, limit).length,
          rows: rows.slice(0, limit).map((row) => ({
            id: row.id,
            title: row.title,
            asset_id: row.asset_id,
            asset_name: row.asset_name,
            next_due_date: row.next_due_date,
            is_active: row.is_active,
            is_overdue: row.is_overdue,
            updated_at: row.updated_at,
          })),
          next_actions: ['Use sdk_invoke for full PM schedule detail or generation actions.'],
        });
      } catch (err) {
        return jsonCompactToolError(toStructuredToolError(err));
      }
    }
  );

  server.registerTool(
    'workflow_bundle_guide',
    {
      title: 'Workflow bundle guide',
      description:
        'Curated workflow-oriented MCP tool bundles for common tenant bootstrap, work order intake, and maintenance lookup flows.',
      inputSchema: workflowBundleInputSchema,
      annotations: toolAnn.readTenantData,
    },
    async (raw) => {
      try {
        const { bundle_id } = workflowBundleInputSchema.parse(raw);
        if (!bundle_id) {
          return jsonCompactResult({
            bundles: Object.values(WORKFLOW_BUNDLES),
          });
        }
        return jsonCompactResult(WORKFLOW_BUNDLES[bundle_id as WorkflowBundleId]);
      } catch (err) {
        return jsonCompactToolError(toStructuredToolError(err));
      }
    }
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
          'assets_list_summary / parts_list_summary / pm_schedules_list_summary for adjacent maintenance selection',
          'work_orders_list_summary / work_orders_get_summary; work_orders_get for full fields',
          'workflow_bundle_guide for curated bundle recommendations',
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
        const tenantId = await requireTenantContext(client, options?.getMcpBearerAccessToken);
        if (!tenantId) {
          throw TENANT_REQUIRED_GUIDANCE.error;
        }
        return client.semanticSearch.searchEntityCandidatesV2({
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
          return jsonToolError(toStructuredToolError(e));
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
          return jsonToolError(toStructuredToolError(e));
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
        return jsonToolError(toStructuredToolError(err));
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
