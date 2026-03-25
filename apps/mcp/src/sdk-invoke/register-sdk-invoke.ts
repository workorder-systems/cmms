import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { DbClient } from '@workorder-systems/sdk';
import { jsonResult, jsonToolTry } from '../json-tool-result.js';
import { sdkInvokeInputSchema } from '../schemas.js';
import { isSdkOperationVisibleInCatalog, type CatalogFilterContext } from './catalog-filter.js';
import { SDK_OPERATION_IDS, SDK_OPERATION_REGISTRY } from './registry.js';
import { getSessionTenantId } from './session-tenant.js';
import type { SdkOperationDef } from './types.js';
import { ann } from './annotations.js';

export type SdkInvokeRegisterOptions = {
  /** Same JWT as PostgREST (HTTP MCP); required for correct tenant when the client has no auth session. */
  getBearerAccessToken?: () => Promise<string | undefined>;
  /**
   * Mirrors HTTP/stdio embed-search configuration: when false, vector-similarity semantic_search
   * operations are hidden from sdk_catalog for non-admin members (tenant.admin still sees the full registry).
   */
  embeddingEdgeConfigured?: boolean;
};

async function loadCatalogFilterContext(
  client: DbClient,
  options?: {
    getBearerAccessToken?: () => Promise<string | undefined>;
    embeddingEdgeConfigured?: boolean;
  }
): Promise<CatalogFilterContext> {
  const bearer = await options?.getBearerAccessToken?.();
  const tenantId = await getSessionTenantId(client, bearer);
  let permissionSet = new Set<string>();
  if (tenantId) {
    try {
      const keys = await client.authorization.getUserPermissions({ tenantId });
      permissionSet = new Set(keys ?? []);
    } catch {
      permissionSet = new Set();
    }
  }
  return {
    tenantId,
    permissionSet,
    embeddingEdgeConfigured: options?.embeddingEdgeConfigured ?? false,
  };
}

function inputJsonSchema(def: SdkOperationDef): Record<string, unknown> {
  try {
    return zodToJsonSchema(def.inputSchema, { $refStrategy: 'none' }) as Record<string, unknown>;
  } catch {
    return { type: 'object' };
  }
}

/**
 * Registers sdk_catalog and sdk_invoke tools backed by {@link SDK_OPERATION_REGISTRY}.
 */
export function registerSdkInvokeTools(
  server: McpServer,
  getClient: () => Promise<DbClient>,
  invokeOptions?: SdkInvokeRegisterOptions
): void {
  server.registerTool(
    'sdk_catalog',
    {
      title: 'SDK operations catalog',
      description:
        'Lists sdk_invoke operations available for the current session: tenant JWT context and RBAC permission keys from the database. Without a tenant in the session, only global operations (e.g. tenants.list, tenant_context) are listed. tenant.admin sees the full registry. Vector-similarity semantic_search.* RPCs are omitted unless WORKORDER_SYSTEMS_EMBED_SEARCH_URL is configured (non-admin).',
      annotations: ann.read,
    },
    async () =>
      jsonToolTry(async () => {
        const client = await getClient();
        const ctx = await loadCatalogFilterContext(client, {
          getBearerAccessToken: invokeOptions?.getBearerAccessToken,
          embeddingEdgeConfigured: invokeOptions?.embeddingEdgeConfigured,
        });
        const visibleIds = SDK_OPERATION_IDS.filter((operation_id) => {
          const def = SDK_OPERATION_REGISTRY[operation_id];
          return def && isSdkOperationVisibleInCatalog(operation_id, def, ctx);
        });
        return {
          tenant_id_in_session: ctx.tenantId ?? null,
          visible_operation_count: visibleIds.length,
          registry_operation_count: SDK_OPERATION_IDS.length,
          operations: visibleIds.map((operation_id) => {
            const def = SDK_OPERATION_REGISTRY[operation_id]!;
            return {
              operation_id,
              description: def.description,
              annotations: def.annotations,
              args_json_schema: inputJsonSchema(def),
            };
          }),
        };
      })
  );

  server.registerTool(
    'sdk_invoke',
    {
      title: 'Invoke SDK operation',
      description:
        'Call one DbClient operation by operation_id. Same allow-list as sdk_catalog for this session (tenant JWT + permissions).',
      inputSchema: sdkInvokeInputSchema,
      annotations: ann.write,
    },
    async (raw) =>
      jsonToolTry(async () => {
        const { operation_id, args } = sdkInvokeInputSchema.parse(raw);
        const def = SDK_OPERATION_REGISTRY[operation_id];
        if (!def) {
          throw new Error(
            `Unknown operation_id: ${operation_id}. Call sdk_catalog for operation ids visible to your session.`
          );
        }
        const client = await getClient();
        const ctx = await loadCatalogFilterContext(client, {
          getBearerAccessToken: invokeOptions?.getBearerAccessToken,
          embeddingEdgeConfigured: invokeOptions?.embeddingEdgeConfigured,
        });
        if (!isSdkOperationVisibleInCatalog(operation_id, def, ctx)) {
          throw new Error(
            `Operation not allowed for the current session: ${operation_id}. Call sdk_catalog after set_active_tenant (and token refresh) if this should be available.`
          );
        }
        return def.invoke(client, args);
      })
  );
}
