import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { DbClient } from '@workorder-systems/sdk';
import { jsonResult, jsonToolTry } from '../json-tool-result.js';
import { sdkInvokeInputSchema } from '../schemas.js';
import { SDK_OPERATION_IDS, SDK_OPERATION_REGISTRY } from './registry.js';
import type { SdkOperationDef } from './types.js';
import { ann } from './annotations.js';

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
export function registerSdkInvokeTools(server: McpServer, getClient: () => Promise<DbClient>): void {
  server.registerTool(
    'sdk_catalog',
    {
      title: 'SDK operations catalog',
      description:
        'List all sdk_invoke operation_id values with descriptions, MCP hints, and JSON Schema for args. Call this before sdk_invoke to discover valid operations.',
      annotations: ann.read,
    },
    async () =>
      jsonResult({
        operation_count: SDK_OPERATION_IDS.length,
        operations: SDK_OPERATION_IDS.map((operation_id) => {
          const def = SDK_OPERATION_REGISTRY[operation_id]!;
          return {
            operation_id,
            description: def.description,
            annotations: def.annotations,
            args_json_schema: inputJsonSchema(def),
          };
        }),
      })
  );

  server.registerTool(
    'sdk_invoke',
    {
      title: 'Invoke SDK operation',
      description:
        'Call one @workorder-systems/sdk DbClient operation by operation_id (see sdk_catalog). Uses the signed-in user JWT; raw supabase access is not exposed.',
      inputSchema: sdkInvokeInputSchema,
      annotations: ann.write,
    },
    async (raw) =>
      jsonToolTry(async () => {
        const { operation_id, args } = sdkInvokeInputSchema.parse(raw);
        const def = SDK_OPERATION_REGISTRY[operation_id];
        if (!def) {
          throw new Error(
            `Unknown operation_id: ${operation_id}. Call sdk_catalog for valid ids (${SDK_OPERATION_IDS.length} operations).`
          );
        }
        const client = await getClient();
        return def.invoke(client, args);
      })
  );
}
