import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { DbClient } from '@workorder-systems/sdk';
import {
  setActiveTenantInputSchema,
  workOrdersCreateInputSchema,
  workOrdersGetInputSchema,
} from './schemas.js';

function jsonResult(data: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

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
  server.registerTool(
    'tenants_list',
    {
      description:
        'List organizations (tenants) the signed-in user belongs to. Use set_active_tenant before tenant-scoped reads/writes.',
    },
    async () => {
      const client = await getClient();
      const rows = await client.tenants.list();
      return jsonResult(rows);
    }
  );

  server.registerTool(
    'work_orders_list',
    {
      description:
        'List work orders for the active tenant (JWT tenant_id claim). Excludes draft by default. Call set_active_tenant first if needed, then refresh the OAuth session if views are empty.',
    },
    async () => {
      const client = await getClient();
      const rows = await client.workOrders.list();
      return jsonResult(rows);
    }
  );

  server.registerTool(
    'work_orders_get',
    {
      description: 'Fetch one work order by id within the active tenant context.',
      inputSchema: workOrdersGetInputSchema.shape,
    },
    async (args) => {
      const client = await getClient();
      const row = await client.workOrders.getById(args.work_order_id);
      return jsonResult(row);
    }
  );

  server.registerTool(
    'work_orders_create',
    {
      description: 'Create a work order in the given tenant via rpc_create_work_order (requires permissions).',
      inputSchema: workOrdersCreateInputSchema.shape,
    },
    async (args) => {
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
      return jsonResult({ work_order_id: id });
    }
  );

  server.registerTool(
    'set_active_tenant',
    {
      description:
        'Switch tenant context (rpc_set_tenant_context). Updates user metadata; tenant-scoped views read tenant_id from the JWT — refresh the OAuth access token after this when using HTTP MCP, or rely on stdio refresh when WORKORDER_SYSTEMS_REFRESH_TOKEN is set.',
      inputSchema: setActiveTenantInputSchema.shape,
    },
    async (args) => {
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
    }
  );
}

export function createWorkOrderSystemsMcpServer(
  getClient: () => Promise<DbClient>,
  toolOptions?: RegisterToolsOptions
): McpServer {
  const server = new McpServer({
    name: 'work-order-systems',
    title: 'Work Order Systems',
    version: '0.1.0',
    description:
      'CMMS work orders and tenants via Supabase (JWT). Call tenants_list, then set_active_tenant before tenant-scoped tools; refresh OAuth or session after switching tenant so the JWT includes tenant_id.',
  });
  registerTools(server, getClient, toolOptions);
  return server;
}
