import { z } from 'zod';
import type { SdkOperationDef } from '../types.js';
import { ann } from '../annotations.js';
import { emptyArgs, uuid } from '../zod-common.js';

export const mobileFieldOperations: Record<string, SdkOperationDef> = {
  'mobile.sync': {
    description: 'Mobile offline sync payload (rpc_mobile_sync).',
    annotations: ann.read,
    inputSchema: z.object({
      tenant_id: uuid,
      updated_after: z.string().nullable().optional(),
      limit: z.number().int().positive().max(2000).optional(),
      technician_id: uuid.nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          updated_after: z.string().nullable().optional(),
          limit: z.number().int().positive().max(2000).optional(),
          technician_id: uuid.nullable().optional(),
        })
        .parse(args);
      return client.mobile.sync({
        tenantId: p.tenant_id,
        updatedAfter: p.updated_after ?? null,
        limit: p.limit,
        technicianId: p.technician_id ?? null,
      });
    },
  },
  'mobile.start_work_order': {
    description: 'Start a work order (in progress + check-in).',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      work_order_id: uuid,
      latitude: z.number().nullable().optional(),
      longitude: z.number().nullable().optional(),
      accuracy_metres: z.number().nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          work_order_id: uuid,
          latitude: z.number().nullable().optional(),
          longitude: z.number().nullable().optional(),
          accuracy_metres: z.number().nullable().optional(),
        })
        .parse(args);
      return client.mobile.startWorkOrder({
        tenantId: p.tenant_id,
        workOrderId: p.work_order_id,
        latitude: p.latitude ?? null,
        longitude: p.longitude ?? null,
        accuracyMetres: p.accuracy_metres ?? null,
      });
    },
  },
  'mobile.stop_work_order': {
    description: 'Stop work (time, note, complete, GPS).',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      work_order_id: uuid,
      complete: z.boolean().optional(),
      minutes: z.number().nullable().optional(),
      note: z.string().nullable().optional(),
      latitude: z.number().nullable().optional(),
      longitude: z.number().nullable().optional(),
      accuracy_metres: z.number().nullable().optional(),
      cause: z.string().nullable().optional(),
      resolution: z.string().nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          work_order_id: uuid,
          complete: z.boolean().optional(),
          minutes: z.number().nullable().optional(),
          note: z.string().nullable().optional(),
          latitude: z.number().nullable().optional(),
          longitude: z.number().nullable().optional(),
          accuracy_metres: z.number().nullable().optional(),
          cause: z.string().nullable().optional(),
          resolution: z.string().nullable().optional(),
        })
        .parse(args);
      await client.mobile.stopWorkOrder({
        tenantId: p.tenant_id,
        workOrderId: p.work_order_id,
        complete: p.complete,
        minutes: p.minutes ?? null,
        note: p.note ?? null,
        latitude: p.latitude ?? null,
        longitude: p.longitude ?? null,
        accuracyMetres: p.accuracy_metres ?? null,
        cause: p.cause ?? null,
        resolution: p.resolution ?? null,
      });
      return { ok: true };
    },
  },
  'mobile.add_note': {
    description: 'Add a work order note.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      work_order_id: uuid,
      body: z.string().min(1),
      latitude: z.number().nullable().optional(),
      longitude: z.number().nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          work_order_id: uuid,
          body: z.string(),
          latitude: z.number().nullable().optional(),
          longitude: z.number().nullable().optional(),
        })
        .parse(args);
      return client.mobile.addNote({
        tenantId: p.tenant_id,
        workOrderId: p.work_order_id,
        body: p.body,
        latitude: p.latitude ?? null,
        longitude: p.longitude ?? null,
      });
    },
  },
  'mobile.register_entity_attachment': {
    description: 'Register a file as an attachment on an entity.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      entity_type: z.string().min(1),
      entity_id: uuid,
      file_id: z.string().min(1),
      label: z.string().nullable().optional(),
      kind: z.string().nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          entity_type: z.string(),
          entity_id: uuid,
          file_id: z.string(),
          label: z.string().nullable().optional(),
          kind: z.string().nullable().optional(),
        })
        .parse(args);
      return client.mobile.registerEntityAttachment({
        tenantId: p.tenant_id,
        entityType: p.entity_type,
        entityId: p.entity_id,
        fileId: p.file_id,
        label: p.label ?? null,
        kind: p.kind ?? null,
      });
    },
  },
  'mobile.list_mobile_work_orders': {
    description: 'List v_mobile_work_orders.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.mobile.listMobileWorkOrders();
    },
  },
  'mobile.list_mobile_assets': {
    description: 'List v_mobile_assets.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.mobile.listMobileAssets();
    },
  },
  'mobile.list_mobile_locations': {
    description: 'List v_mobile_locations.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.mobile.listMobileLocations();
    },
  },
  'mobile.list_mobile_time_entries': {
    description: 'List v_mobile_work_order_time_entries.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.mobile.listMobileTimeEntries();
    },
  },
  'mobile.list_mobile_attachments': {
    description: 'List v_mobile_work_order_attachments.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.mobile.listMobileAttachments();
    },
  },
  'mobile.list_mobile_check_ins': {
    description: 'List v_mobile_work_order_check_ins.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.mobile.listMobileCheckIns();
    },
  },
  'mobile.list_mobile_notes': {
    description: 'List v_mobile_work_order_notes.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.mobile.listMobileNotes();
    },
  },
};
