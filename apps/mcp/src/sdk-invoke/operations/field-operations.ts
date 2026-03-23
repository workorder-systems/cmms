import { z } from 'zod';
import type { SdkOperationDef } from '../types.js';
import { ann } from '../annotations.js';
import { emptyArgs, uuid } from '../zod-common.js';

export const fieldOperationsOperations: Record<string, SdkOperationDef> = {
  'field_ops.create_tool': {
    description: 'Create a tool catalog row.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      name: z.string().min(1),
      asset_tag: z.string().nullable().optional(),
      serial_number: z.string().nullable().optional(),
      status: z.string().nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          name: z.string(),
          asset_tag: z.string().nullable().optional(),
          serial_number: z.string().nullable().optional(),
          status: z.string().nullable().optional(),
        })
        .parse(args);
      return client.fieldOps.createTool({
        tenantId: p.tenant_id,
        name: p.name,
        assetTag: p.asset_tag ?? null,
        serialNumber: p.serial_number ?? null,
        status: p.status ?? null,
      });
    },
  },
  'field_ops.update_tool': {
    description: 'Update a tool.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      tool_id: uuid,
      name: z.string().nullable().optional(),
      asset_tag: z.string().nullable().optional(),
      serial_number: z.string().nullable().optional(),
      status: z.string().nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          tool_id: uuid,
          name: z.string().nullable().optional(),
          asset_tag: z.string().nullable().optional(),
          serial_number: z.string().nullable().optional(),
          status: z.string().nullable().optional(),
        })
        .parse(args);
      await client.fieldOps.updateTool({
        tenantId: p.tenant_id,
        toolId: p.tool_id,
        name: p.name ?? null,
        assetTag: p.asset_tag ?? null,
        serialNumber: p.serial_number ?? null,
        status: p.status ?? null,
      });
      return { ok: true };
    },
  },
  'field_ops.list_tools': {
    description: 'List tools.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.fieldOps.listTools();
    },
  },
  'field_ops.list_tool_checkouts': {
    description: 'List tool checkouts.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.fieldOps.listToolCheckouts();
    },
  },
  'field_ops.list_shift_handovers': {
    description: 'List shift handovers.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.fieldOps.listShiftHandovers();
    },
  },
  'field_ops.checkout_tool': {
    description: 'Check out a tool.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      tool_id: uuid,
      checked_out_to_user_id: uuid,
      work_order_id: uuid.nullable().optional(),
      due_at: z.string().nullable().optional(),
      notes: z.string().nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          tool_id: uuid,
          checked_out_to_user_id: uuid,
          work_order_id: uuid.nullable().optional(),
          due_at: z.string().nullable().optional(),
          notes: z.string().nullable().optional(),
        })
        .parse(args);
      return client.fieldOps.checkoutTool({
        tenantId: p.tenant_id,
        toolId: p.tool_id,
        checkedOutToUserId: p.checked_out_to_user_id,
        workOrderId: p.work_order_id ?? null,
        dueAt: p.due_at ?? null,
        notes: p.notes ?? null,
      });
    },
  },
  'field_ops.return_tool': {
    description: 'Return a checked-out tool.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      checkout_id: uuid,
    }),
    async invoke(client, args) {
      const p = z.object({ tenant_id: uuid, checkout_id: uuid }).parse(args);
      await client.fieldOps.returnTool({ tenantId: p.tenant_id, checkoutId: p.checkout_id });
      return { ok: true };
    },
  },
  'field_ops.create_shift_handover': {
    description: 'Create a shift handover.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      location_id: uuid,
      to_user_id: uuid,
      shift_started_at: z.string().min(1),
      shift_ended_at: z.string().min(1),
      summary: z.string().nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          location_id: uuid,
          to_user_id: uuid,
          shift_started_at: z.string(),
          shift_ended_at: z.string(),
          summary: z.string().nullable().optional(),
        })
        .parse(args);
      return client.fieldOps.createShiftHandover({
        tenantId: p.tenant_id,
        locationId: p.location_id,
        toUserId: p.to_user_id,
        shiftStartedAt: p.shift_started_at,
        shiftEndedAt: p.shift_ended_at,
        summary: p.summary ?? null,
      });
    },
  },
  'field_ops.submit_shift_handover': {
    description: 'Submit a shift handover.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      handover_id: uuid,
    }),
    async invoke(client, args) {
      const p = z.object({ tenant_id: uuid, handover_id: uuid }).parse(args);
      await client.fieldOps.submitShiftHandover({ tenantId: p.tenant_id, handoverId: p.handover_id });
      return { ok: true };
    },
  },
  'field_ops.acknowledge_shift_handover': {
    description: 'Acknowledge a shift handover.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      handover_id: uuid,
    }),
    async invoke(client, args) {
      const p = z.object({ tenant_id: uuid, handover_id: uuid }).parse(args);
      await client.fieldOps.acknowledgeShiftHandover({ tenantId: p.tenant_id, handoverId: p.handover_id });
      return { ok: true };
    },
  },
  'field_ops.add_shift_handover_item': {
    description: 'Add an item to a shift handover.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      handover_id: uuid,
      body: z.string().min(1),
      priority: z.string().nullable().optional(),
      work_order_id: uuid.nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          handover_id: uuid,
          body: z.string(),
          priority: z.string().nullable().optional(),
          work_order_id: uuid.nullable().optional(),
        })
        .parse(args);
      return client.fieldOps.addShiftHandoverItem({
        tenantId: p.tenant_id,
        handoverId: p.handover_id,
        body: p.body,
        priority: p.priority ?? null,
        workOrderId: p.work_order_id ?? null,
      });
    },
  },
};
