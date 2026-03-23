import { z } from 'zod';
import type { SdkOperationDef } from '../types.js';
import { ann } from '../annotations.js';
import { emptyArgs, uuid } from '../zod-common.js';

export const catalogsOperations: Record<string, SdkOperationDef> = {
  'catalogs.list_statuses': {
    description: 'List status catalog entries.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.catalogs.listStatuses();
    },
  },
  'catalogs.list_priorities': {
    description: 'List priority catalog entries.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.catalogs.listPriorities();
    },
  },
  'catalogs.list_maintenance_types': {
    description: 'List maintenance type catalog entries.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.catalogs.listMaintenanceTypes();
    },
  },
  'catalogs.list_status_transitions': {
    description: 'List allowed status transitions.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.catalogs.listStatusTransitions();
    },
  },
  'catalogs.create_status': {
    description: 'Create a status for an entity type.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      entity_type: z.string().min(1),
      key: z.string().min(1),
      name: z.string().min(1),
      category: z.string().min(1),
      color: z.string().nullable().optional(),
      display_order: z.number().int(),
      icon: z.string().nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          entity_type: z.string(),
          key: z.string(),
          name: z.string(),
          category: z.string(),
          color: z.string().nullable().optional(),
          display_order: z.number().int(),
          icon: z.string().nullable().optional(),
        })
        .parse(args);
      return client.catalogs.createStatus({
        tenantId: p.tenant_id,
        entityType: p.entity_type,
        key: p.key,
        name: p.name,
        category: p.category,
        color: p.color ?? null,
        displayOrder: p.display_order,
        icon: p.icon ?? null,
      });
    },
  },
  'catalogs.create_status_transition': {
    description: 'Create a status transition.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      entity_type: z.string().min(1),
      from_status_key: z.string().min(1),
      to_status_key: z.string().min(1),
      required_permission: z.string().nullable().optional(),
      guard_condition: z.record(z.unknown()).nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          entity_type: z.string(),
          from_status_key: z.string(),
          to_status_key: z.string(),
          required_permission: z.string().nullable().optional(),
          guard_condition: z.record(z.unknown()).nullable().optional(),
        })
        .parse(args);
      return client.catalogs.createStatusTransition({
        tenantId: p.tenant_id,
        entityType: p.entity_type,
        fromStatusKey: p.from_status_key,
        toStatusKey: p.to_status_key,
        requiredPermission: p.required_permission ?? null,
        guardCondition: p.guard_condition ?? null,
      });
    },
  },
  'catalogs.create_priority': {
    description: 'Create a priority.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      entity_type: z.string().min(1),
      key: z.string().min(1),
      name: z.string().min(1),
      weight: z.number(),
      display_order: z.number().int(),
      color: z.string().nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          entity_type: z.string(),
          key: z.string(),
          name: z.string(),
          weight: z.number(),
          display_order: z.number().int(),
          color: z.string().nullable().optional(),
        })
        .parse(args);
      return client.catalogs.createPriority({
        tenantId: p.tenant_id,
        entityType: p.entity_type,
        key: p.key,
        name: p.name,
        weight: p.weight,
        displayOrder: p.display_order,
        color: p.color ?? null,
      });
    },
  },
  'catalogs.create_maintenance_type': {
    description: 'Create a maintenance type.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      key: z.string().min(1),
      name: z.string().min(1),
      category: z.string().min(1),
      description: z.string().nullable().optional(),
      display_order: z.number().nullable().optional(),
      color: z.string().nullable().optional(),
      icon: z.string().nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          key: z.string(),
          name: z.string(),
          category: z.string(),
          description: z.string().nullable().optional(),
          display_order: z.number().nullable().optional(),
          color: z.string().nullable().optional(),
          icon: z.string().nullable().optional(),
        })
        .parse(args);
      return client.catalogs.createMaintenanceType({
        tenantId: p.tenant_id,
        key: p.key,
        name: p.name,
        category: p.category,
        description: p.description ?? null,
        displayOrder: p.display_order ?? null,
        color: p.color ?? null,
        icon: p.icon ?? null,
      });
    },
  },
  'catalogs.get_workflow_graph': {
    description: 'Get workflow graph JSON for an entity type.',
    annotations: ann.read,
    inputSchema: z.object({
      tenant_id: uuid,
      entity_type: z.string().min(1),
    }),
    async invoke(client, args) {
      const p = z.object({ tenant_id: uuid, entity_type: z.string() }).parse(args);
      return client.catalogs.getWorkflowGraph(p.tenant_id, p.entity_type);
    },
  },
};
