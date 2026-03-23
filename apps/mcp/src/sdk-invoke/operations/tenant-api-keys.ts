import { z } from 'zod';
import type { SdkOperationDef } from '../types.js';
import { ann } from '../annotations.js';
import { uuid } from '../zod-common.js';

export const tenantApiKeysOperations: Record<string, SdkOperationDef> = {
  'tenant_api_keys.create': {
    description: 'Create a tenant API key (secret returned once).',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      name: z.string().min(1),
    }),
    async invoke(client, args) {
      const p = z.object({ tenant_id: uuid, name: z.string() }).parse(args);
      return client.tenantApiKeys.create(p.tenant_id, p.name);
    },
  },
  'tenant_api_keys.list': {
    description: 'List tenant API keys (metadata only).',
    annotations: ann.read,
    inputSchema: z.object({ tenant_id: uuid }),
    async invoke(client, args) {
      const { tenant_id } = z.object({ tenant_id: uuid }).parse(args);
      return client.tenantApiKeys.list(tenant_id);
    },
  },
  'tenant_api_keys.revoke': {
    description: 'Revoke a tenant API key.',
    annotations: ann.destructive,
    inputSchema: z.object({
      tenant_id: uuid,
      key_id: uuid,
    }),
    async invoke(client, args) {
      const p = z.object({ tenant_id: uuid, key_id: uuid }).parse(args);
      await client.tenantApiKeys.revoke(p.tenant_id, p.key_id);
      return { ok: true };
    },
  },
};
