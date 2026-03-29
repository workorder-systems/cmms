import { z } from 'zod';
import type { SdkOperationDef } from '../types.js';
import { ann } from '../annotations.js';
import { emptyArgs, uuid } from '../zod-common.js';
import { workOrdersCreateInputSchema } from '../../schemas.js';

const bulkImportRow = z
  .object({
    title: z.string().min(1),
    description: z.string().nullable().optional(),
    cause: z.string().nullable().optional(),
    resolution: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    priority: z.string().nullable().optional(),
    due_date: z.string().nullable().optional(),
  })
  .passthrough();

export const workOrdersOperations: Record<string, SdkOperationDef> = {
  'work_orders.list': {
    description: 'List work orders for the tenant (excludes draft by default).',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.workOrders.list();
    },
  },
  'work_orders.list_including_draft': {
    description: 'List work orders including draft status.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.workOrders.listIncludingDraft();
    },
  },
  'work_orders.get_by_id': {
    description: 'Get one work order by id.',
    annotations: ann.read,
    inputSchema: z.object({ id: uuid }),
    async invoke(client, args) {
      const { id } = z.object({ id: uuid }).parse(args);
      return client.workOrders.getById(id);
    },
  },
  'work_orders.create': {
    description: 'Create a work order (rpc_create_work_order). Supports optional client_request_id for retry-safe automation.',
    annotations: ann.write,
    inputSchema: workOrdersCreateInputSchema,
    async invoke(client, args) {
      const a = workOrdersCreateInputSchema.parse(args);
      return client.workOrders.create({
        tenantId: a.tenant_id,
        title: a.title,
        description: a.description ?? null,
        priority: a.priority,
        maintenanceType: a.maintenance_type ?? null,
        assignedTo: a.assigned_to ?? null,
        locationId: a.location_id ?? null,
        assetId: a.asset_id ?? null,
        dueDate: a.due_date ?? null,
        pmScheduleId: a.pm_schedule_id ?? null,
        projectId: a.project_id ?? null,
        clientRequestId: a.client_request_id ?? null,
      });
    },
  },
  'work_orders.bulk_import': {
    description: 'Bulk import work orders.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      rows: z.array(bulkImportRow),
    }),
    async invoke(client, args) {
      const p = z.object({ tenant_id: uuid, rows: z.array(bulkImportRow) }).parse(args);
      return client.workOrders.bulkImport({
        tenantId: p.tenant_id,
        rows: p.rows,
      });
    },
  },
  'work_orders.transition_status': {
    description: 'Transition work order to a new status.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      work_order_id: uuid,
      to_status_key: z.string().min(1),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          work_order_id: uuid,
          to_status_key: z.string(),
        })
        .parse(args);
      await client.workOrders.transitionStatus({
        tenantId: p.tenant_id,
        workOrderId: p.work_order_id,
        toStatusKey: p.to_status_key,
      });
      return { ok: true };
    },
  },
  'work_orders.complete': {
    description: 'Complete a work order.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      work_order_id: uuid,
      cause: z.string().nullable().optional(),
      resolution: z.string().nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          work_order_id: uuid,
          cause: z.string().nullable().optional(),
          resolution: z.string().nullable().optional(),
        })
        .parse(args);
      await client.workOrders.complete({
        tenantId: p.tenant_id,
        workOrderId: p.work_order_id,
        cause: p.cause ?? null,
        resolution: p.resolution ?? null,
      });
      return { ok: true };
    },
  },
  'work_orders.log_time': {
    description: 'Log time on a work order.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      work_order_id: uuid,
      minutes: z.number(),
      entry_date: z.string().nullable().optional(),
      user_id: uuid.nullable().optional(),
      description: z.string().nullable().optional(),
      latitude: z.number().nullable().optional(),
      longitude: z.number().nullable().optional(),
      accuracy_metres: z.number().nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          work_order_id: uuid,
          minutes: z.number(),
          entry_date: z.string().nullable().optional(),
          user_id: uuid.nullable().optional(),
          description: z.string().nullable().optional(),
          latitude: z.number().nullable().optional(),
          longitude: z.number().nullable().optional(),
          accuracy_metres: z.number().nullable().optional(),
        })
        .parse(args);
      return client.workOrders.logTime({
        tenantId: p.tenant_id,
        workOrderId: p.work_order_id,
        minutes: p.minutes,
        entryDate: p.entry_date ?? null,
        userId: p.user_id ?? null,
        description: p.description ?? null,
        latitude: p.latitude ?? null,
        longitude: p.longitude ?? null,
        accuracyMetres: p.accuracy_metres ?? null,
      });
    },
  },
  'work_orders.update_attachment_metadata': {
    description: 'Update attachment label/kind for a work order attachment.',
    annotations: ann.write,
    inputSchema: z.object({
      attachment_id: uuid,
      label: z.string().nullable().optional(),
      kind: z.string().nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          attachment_id: uuid,
          label: z.string().nullable().optional(),
          kind: z.string().nullable().optional(),
        })
        .parse(args);
      await client.workOrders.updateAttachmentMetadata({
        attachmentId: p.attachment_id,
        label: p.label ?? null,
        kind: p.kind ?? null,
      });
      return { ok: true };
    },
  },
  'work_orders.list_attachments': {
    description: 'List attachments for a work order.',
    annotations: ann.read,
    inputSchema: z.object({ work_order_id: uuid }),
    async invoke(client, args) {
      const { work_order_id } = z.object({ work_order_id: uuid }).parse(args);
      return client.workOrders.listAttachments(work_order_id);
    },
  },
  'work_orders.create_request': {
    description: 'Portal: create a work order request.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      title: z.string().min(1),
      description: z.string().nullable().optional(),
      priority: z.string().optional(),
      maintenance_type: z.string().nullable().optional(),
      location_id: uuid.nullable().optional(),
      asset_id: uuid.nullable().optional(),
      due_date: z.string().nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          title: z.string(),
          description: z.string().nullable().optional(),
          priority: z.string().optional(),
          maintenance_type: z.string().nullable().optional(),
          location_id: uuid.nullable().optional(),
          asset_id: uuid.nullable().optional(),
          due_date: z.string().nullable().optional(),
        })
        .parse(args);
      return client.workOrders.createRequest({
        tenantId: p.tenant_id,
        title: p.title,
        description: p.description ?? null,
        priority: p.priority,
        maintenanceType: p.maintenance_type ?? null,
        locationId: p.location_id ?? null,
        assetId: p.asset_id ?? null,
        dueDate: p.due_date ?? null,
      });
    },
  },
  'work_orders.list_my_requests': {
    description: 'Portal: list work order requests submitted by the current user.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.workOrders.listMyRequests();
    },
  },
  'work_orders.list_maintenance_requests': {
    description: 'List maintenance requests for the tenant.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.workOrders.listMaintenanceRequests();
    },
  },
  'work_orders.list_my_maintenance_requests': {
    description: 'Portal: list maintenance requests for the current user.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.workOrders.listMyMaintenanceRequests();
    },
  },
  'work_orders.create_maintenance_request': {
    description: 'Create a maintenance request (draft or submitted).',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      title: z.string().min(1),
      description: z.string().nullable().optional(),
      priority: z.string().optional(),
      maintenance_type: z.string().nullable().optional(),
      location_id: uuid.nullable().optional(),
      asset_id: uuid.nullable().optional(),
      due_date: z.string().nullable().optional(),
      status: z.enum(['draft', 'submitted']).optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          title: z.string(),
          description: z.string().nullable().optional(),
          priority: z.string().optional(),
          maintenance_type: z.string().nullable().optional(),
          location_id: uuid.nullable().optional(),
          asset_id: uuid.nullable().optional(),
          due_date: z.string().nullable().optional(),
          status: z.enum(['draft', 'submitted']).optional(),
        })
        .parse(args);
      return client.workOrders.createMaintenanceRequest({
        tenantId: p.tenant_id,
        title: p.title,
        description: p.description ?? null,
        priority: p.priority,
        maintenanceType: p.maintenance_type ?? null,
        locationId: p.location_id ?? null,
        assetId: p.asset_id ?? null,
        dueDate: p.due_date ?? null,
        status: p.status,
      });
    },
  },
  'work_orders.convert_maintenance_request_to_work_order': {
    description: 'Convert a maintenance request to a work order.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      request_id: uuid,
    }),
    async invoke(client, args) {
      const p = z.object({ tenant_id: uuid, request_id: uuid }).parse(args);
      return client.workOrders.convertMaintenanceRequestToWorkOrder(p.tenant_id, p.request_id);
    },
  },
  'work_orders.list_sla_status': {
    description: 'SLA dashboard: all work orders with breach flags.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.workOrders.listSlaStatus();
    },
  },
  'work_orders.list_sla_open_queue': {
    description: 'Coordinator queue: non-final work orders with SLA due times.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.workOrders.listSlaOpenQueue();
    },
  },
  'work_orders.list_comms': {
    description: 'Communication events for a work order.',
    annotations: ann.read,
    inputSchema: z.object({ work_order_id: uuid }),
    async invoke(client, args) {
      const { work_order_id } = z.object({ work_order_id: uuid }).parse(args);
      return client.workOrders.listComms(work_order_id);
    },
  },
  'work_orders.add_comms_event': {
    description: 'Append a communication event to a work order.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      work_order_id: uuid,
      body: z.string().min(1),
      channel: z.string().nullable().optional(),
      metadata: z.record(z.unknown()).nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          work_order_id: uuid,
          body: z.string(),
          channel: z.string().nullable().optional(),
          metadata: z.record(z.unknown()).nullable().optional(),
        })
        .parse(args);
      return client.workOrders.addCommsEvent({
        tenantId: p.tenant_id,
        workOrderId: p.work_order_id,
        body: p.body,
        channel: p.channel ?? null,
        metadata: p.metadata ?? null,
      });
    },
  },
  'work_orders.get_sla_status': {
    description: 'SLA status for a single work order.',
    annotations: ann.read,
    inputSchema: z.object({ work_order_id: uuid }),
    async invoke(client, args) {
      const { work_order_id } = z.object({ work_order_id: uuid }).parse(args);
      return client.workOrders.getSlaStatus(work_order_id);
    },
  },
  'work_orders.acknowledge': {
    description: 'Acknowledge a work order for SLA tracking.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      work_order_id: uuid,
    }),
    async invoke(client, args) {
      const p = z.object({ tenant_id: uuid, work_order_id: uuid }).parse(args);
      await client.workOrders.acknowledge({ tenantId: p.tenant_id, workOrderId: p.work_order_id });
      return { ok: true };
    },
  },
  'work_orders.upsert_sla_rule': {
    description: 'Create or update an SLA rule for priority (optional maintenance type).',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      priority_key: z.string().min(1),
      maintenance_type_key: z.string().nullable().optional(),
      response_interval: z.string().nullable().optional(),
      resolution_interval: z.string().nullable().optional(),
      is_active: z.boolean().nullable().optional(),
      rule_id: uuid.nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          priority_key: z.string(),
          maintenance_type_key: z.string().nullable().optional(),
          response_interval: z.string().nullable().optional(),
          resolution_interval: z.string().nullable().optional(),
          is_active: z.boolean().nullable().optional(),
          rule_id: uuid.nullable().optional(),
        })
        .parse(args);
      return client.workOrders.upsertSlaRule({
        tenantId: p.tenant_id,
        priorityKey: p.priority_key,
        maintenanceTypeKey: p.maintenance_type_key ?? null,
        responseInterval: p.response_interval ?? null,
        resolutionInterval: p.resolution_interval ?? null,
        isActive: p.is_active ?? null,
        ruleId: p.rule_id ?? null,
      });
    },
  },
};
