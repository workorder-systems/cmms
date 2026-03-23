import { z } from 'zod';
import type { SdkOperationDef } from '../types.js';
import { ann } from '../annotations.js';
import { uuid } from '../zod-common.js';

const setTenantArgs = z.object({ tenant_id: uuid });

export const tenantContextOperations: Record<string, SdkOperationDef> = {
  'tenant_context.set': {
    description: 'Set active tenant (rpc_set_tenant_context). Same as set_active_tenant MCP tool; refresh JWT after use.',
    annotations: ann.write,
    inputSchema: setTenantArgs,
    async invoke(client, args) {
      const { tenant_id } = setTenantArgs.parse(args);
      await client.setTenant(tenant_id);
      return { ok: true, tenant_id };
    },
  },
  'tenant_context.clear': {
    description: 'Clear tenant context (rpc_clear_tenant_context).',
    annotations: ann.write,
    inputSchema: z.object({}).strict(),
    async invoke(client) {
      await client.clearTenant();
      return { ok: true };
    },
  },
};
