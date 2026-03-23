import { z } from 'zod';
import type { SdkOperationDef } from '../types.js';
import { ann } from '../annotations.js';
import { emptyArgs, uuid } from '../zod-common.js';

export const pluginsOperations: Record<string, SdkOperationDef> = {
  'plugins.list': {
    description: 'List available plugins (catalog).',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.plugins.list();
    },
  },
  'plugins.get_by_id': {
    description: 'Get one plugin by id.',
    annotations: ann.read,
    inputSchema: z.object({ id: uuid }),
    async invoke(client, args) {
      const { id } = z.object({ id: uuid }).parse(args);
      return client.plugins.getById(id);
    },
  },
  'plugins.list_installations': {
    description: 'List plugin installations for the tenant.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.plugins.listInstallations();
    },
  },
  'plugins.install': {
    description: 'Install a plugin for the tenant.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      plugin_key: z.string().min(1),
      secret_ref: z.string().nullable().optional(),
      config: z.record(z.unknown()).nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          plugin_key: z.string(),
          secret_ref: z.string().nullable().optional(),
          config: z.record(z.unknown()).nullable().optional(),
        })
        .parse(args);
      return client.plugins.install({
        tenantId: p.tenant_id,
        pluginKey: p.plugin_key,
        secretRef: p.secret_ref ?? null,
        config: p.config ?? null,
      });
    },
  },
  'plugins.update_installation': {
    description: 'Update a plugin installation.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      installation_id: uuid,
      status: z.string().nullable().optional(),
      secret_ref: z.string().nullable().optional(),
      config: z.record(z.unknown()).nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          installation_id: uuid,
          status: z.string().nullable().optional(),
          secret_ref: z.string().nullable().optional(),
          config: z.record(z.unknown()).nullable().optional(),
        })
        .parse(args);
      await client.plugins.updateInstallation({
        tenantId: p.tenant_id,
        installationId: p.installation_id,
        status: p.status ?? null,
        secretRef: p.secret_ref ?? null,
        config: p.config ?? null,
      });
      return { ok: true };
    },
  },
  'plugins.uninstall': {
    description: 'Uninstall a plugin installation.',
    annotations: ann.destructive,
    inputSchema: z.object({
      tenant_id: uuid,
      installation_id: uuid,
    }),
    async invoke(client, args) {
      const p = z.object({ tenant_id: uuid, installation_id: uuid }).parse(args);
      await client.plugins.uninstall({ tenantId: p.tenant_id, installationId: p.installation_id });
      return { ok: true };
    },
  },
  'plugins.list_webhook_subscriptions': {
    description: 'List plugin webhook subscriptions.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.plugins.listWebhookSubscriptions();
    },
  },
  'plugins.list_recent_deliveries': {
    description: 'Recent outbound webhook delivery metadata.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.plugins.listRecentDeliveries();
    },
  },
  'plugins.upsert_webhook_subscription': {
    description: 'Create or update a webhook subscription allowlist.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      installation_id: uuid,
      table_schema: z.string().min(1),
      table_name: z.string().min(1),
      operations: z.array(z.string()),
      changed_fields_allowlist: z.array(z.string()).nullable().optional(),
      include_payload: z.boolean().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          installation_id: uuid,
          table_schema: z.string(),
          table_name: z.string(),
          operations: z.array(z.string()),
          changed_fields_allowlist: z.array(z.string()).nullable().optional(),
          include_payload: z.boolean().optional(),
        })
        .parse(args);
      return client.plugins.upsertWebhookSubscription({
        tenantId: p.tenant_id,
        installationId: p.installation_id,
        tableSchema: p.table_schema,
        tableName: p.table_name,
        operations: p.operations,
        changedFieldsAllowlist: p.changed_fields_allowlist ?? null,
        includePayload: p.include_payload ?? false,
      });
    },
  },
  'plugins.delete_webhook_subscription': {
    description: 'Delete a webhook subscription.',
    annotations: ann.destructive,
    inputSchema: z.object({
      tenant_id: uuid,
      subscription_id: uuid,
    }),
    async invoke(client, args) {
      const p = z.object({ tenant_id: uuid, subscription_id: uuid }).parse(args);
      await client.plugins.deleteWebhookSubscription({
        tenantId: p.tenant_id,
        subscriptionId: p.subscription_id,
      });
      return { ok: true };
    },
  },
  'plugins.process_deliveries': {
    description:
      'Run plugin delivery processor (rpc_process_plugin_deliveries). Typically requires service_role; may fail for normal users.',
    annotations: ann.write,
    inputSchema: z.object({
      batch_size: z.number().int().positive().optional(),
    }),
    async invoke(client, args) {
      const p = z.object({ batch_size: z.number().int().positive().optional() }).parse(args);
      return client.plugins.processDeliveries(p.batch_size);
    },
  },
};
