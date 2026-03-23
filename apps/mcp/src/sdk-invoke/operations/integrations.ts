import { z } from 'zod';
import type { SdkOperationDef } from '../types.js';
import { ann } from '../annotations.js';
import { emptyArgs, uuid } from '../zod-common.js';

export const integrationsOperations: Record<string, SdkOperationDef> = {
  'integrations.list_external_ids': {
    description: 'List integration external id mappings.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.integrations.listExternalIds();
    },
  },
  'integrations.list_outbound_events': {
    description: 'List outbound integration events.',
    annotations: ann.read,
    inputSchema: z.object({ limit: z.number().int().positive().optional() }),
    async invoke(client, args) {
      const { limit } = z.object({ limit: z.number().int().positive().optional() }).parse(args);
      return client.integrations.listOutboundEvents(limit ?? 100);
    },
  },
  'integrations.upsert_external_id': {
    description: 'Upsert an external system id mapping.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      entity_type: z.string().min(1),
      entity_id: uuid,
      system_key: z.string().min(1),
      external_id: z.string().min(1),
      metadata: z.record(z.unknown()).nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          entity_type: z.string(),
          entity_id: uuid,
          system_key: z.string(),
          external_id: z.string(),
          metadata: z.record(z.unknown()).nullable().optional(),
        })
        .parse(args);
      return client.integrations.upsertExternalId({
        tenantId: p.tenant_id,
        entityType: p.entity_type,
        entityId: p.entity_id,
        systemKey: p.system_key,
        externalId: p.external_id,
        metadata: p.metadata ?? null,
      });
    },
  },
  'integrations.delete_external_id': {
    description: 'Delete an external id mapping.',
    annotations: ann.destructive,
    inputSchema: z.object({
      tenant_id: uuid,
      entity_type: z.string().min(1),
      entity_id: uuid,
      system_key: z.string().min(1),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          entity_type: z.string(),
          entity_id: uuid,
          system_key: z.string(),
        })
        .parse(args);
      await client.integrations.deleteExternalId(
        p.tenant_id,
        p.entity_type,
        p.entity_id,
        p.system_key
      );
      return { ok: true };
    },
  },
  'integrations.enqueue_event': {
    description: 'Enqueue an outbound integration event.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      event_type: z.string().min(1),
      payload: z.record(z.unknown()),
      entity_type: z.string().nullable().optional(),
      entity_id: uuid.nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          event_type: z.string(),
          payload: z.record(z.unknown()),
          entity_type: z.string().nullable().optional(),
          entity_id: uuid.nullable().optional(),
        })
        .parse(args);
      return client.integrations.enqueueEvent({
        tenantId: p.tenant_id,
        eventType: p.event_type,
        payload: p.payload,
        entityType: p.entity_type ?? null,
        entityId: p.entity_id ?? null,
      });
    },
  },
};
