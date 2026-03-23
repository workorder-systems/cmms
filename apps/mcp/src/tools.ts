import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import type { DbClient } from '@workorder-systems/sdk';
import { jsonResult, jsonToolError, jsonToolTry } from './json-tool-result.js';
import { MCP_SERVER_INSTRUCTIONS } from './mcp-instructions.js';
import { MCP_PACKAGE_VERSION } from './server-version.js';
import { registerSdkInvokeTools } from './sdk-invoke/register-sdk-invoke.js';
import {
  setActiveTenantInputSchema,
  workOrdersCreateInputSchema,
  workOrdersGetInputSchema,
} from './schemas.js';

/** Hints for clients (MCP tool annotations are non-authoritative). */
const toolAnn = {
  readTenantData: { readOnlyHint: true, openWorldHint: true } satisfies ToolAnnotations,
  writeTenantContext: { readOnlyHint: false, destructiveHint: false, openWorldHint: true } satisfies ToolAnnotations,
  writeWorkOrder: { readOnlyHint: false, destructiveHint: false, openWorldHint: true } satisfies ToolAnnotations,
} as const;

export type RegisterToolsOptions = {
  /**
   * When true, after rpc_set_tenant_context the server attempts supabase.auth.refreshSession()
   * so the next JWT includes tenant_id (requires refresh token in session — stdio with WORKORDER_SYSTEMS_REFRESH_TOKEN).
   */
  tryRefreshAccessTokenAfterSetTenant?: () => Promise<boolean>;
};

/**
 * Registers CMMS tools on the given MCP server. All calls use the user JWT from getClient().
 */
export function registerTools(
  server: McpServer,
  getClient: () => Promise<DbClient>,
  options?: RegisterToolsOptions
): void {
  registerSdkInvokeTools(server, getClient);

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
        let refreshed = false;
        if (options?.tryRefreshAccessTokenAfterSetTenant) {
          try {
            refreshed = await options.tryRefreshAccessTokenAfterSetTenant();
          } catch {
            refreshed = false;
          }
        }
        return jsonResult({
          ok: true,
          tenant_id: args.tenant_id,
          access_token_refreshed: refreshed,
          note: refreshed
            ? 'Session refreshed; JWT should include tenant_id for subsequent tool calls.'
            : 'If work_orders_list returns empty or errors, obtain a new access token (OAuth refresh) so JWT claims include tenant_id.',
        });
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
        'CMMS via Supabase JWT: use tenants_list and set_active_tenant, refresh OAuth token for tenant_id, then sdk_catalog + sdk_invoke for full @workorder-systems/sdk coverage (explicit work order tools remain for convenience).',
    },
    {
      instructions: MCP_SERVER_INSTRUCTIONS,
    }
  );
  registerTools(server, getClient, toolOptions);
  return server;
}
