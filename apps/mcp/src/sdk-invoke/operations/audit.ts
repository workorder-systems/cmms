import type { SdkOperationDef } from '../types.js';
import { ann } from '../annotations.js';
import { emptyArgs } from '../zod-common.js';

export const auditOperations: Record<string, SdkOperationDef> = {
  'audit.list_entity_changes': {
    description: 'List audit entity changes.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.audit.listEntityChanges();
    },
  },
  'audit.list_permission_changes': {
    description: 'List audit permission changes.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.audit.listPermissionChanges();
    },
  },
  'audit.list_retention_configs': {
    description: 'List audit retention configs.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.audit.listRetentionConfigs();
    },
  },
};
