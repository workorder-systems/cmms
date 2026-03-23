import { z } from 'zod';
import type { SdkOperationDef } from '../types.js';
import { ann } from '../annotations.js';
import { emptyArgs, uuid } from '../zod-common.js';

const triggerConfig = z.record(z.unknown());
const checklistItems = z.array(z.record(z.unknown())).nullable().optional();

export const pmOperations: Record<string, SdkOperationDef> = {
  'pm.list_templates': {
    description: 'List PM templates.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.pm.listTemplates();
    },
  },
  'pm.list_template_checklist_items': {
    description: 'List PM template checklist items.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.pm.listTemplateChecklistItems();
    },
  },
  'pm.list_schedules': {
    description: 'List PM schedules.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.pm.listSchedules();
    },
  },
  'pm.list_due': {
    description: 'List due PMs.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.pm.listDue();
    },
  },
  'pm.list_overdue': {
    description: 'List overdue PMs.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.pm.listOverdue();
    },
  },
  'pm.list_upcoming': {
    description: 'List upcoming PMs.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.pm.listUpcoming();
    },
  },
  'pm.list_history': {
    description: 'List PM history.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.pm.listHistory();
    },
  },
  'pm.create_template': {
    description: 'Create a PM template.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      name: z.string().min(1),
      trigger_type: z.string().min(1),
      trigger_config: triggerConfig,
      description: z.string().nullable().optional(),
      estimated_hours: z.number().nullable().optional(),
      work_order_title: z.string().nullable().optional(),
      work_order_description: z.string().nullable().optional(),
      work_order_estimated_hours: z.number().nullable().optional(),
      work_order_priority: z.string().nullable().optional(),
      checklist_items: checklistItems,
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          name: z.string(),
          trigger_type: z.string(),
          trigger_config: triggerConfig,
          description: z.string().nullable().optional(),
          estimated_hours: z.number().nullable().optional(),
          work_order_title: z.string().nullable().optional(),
          work_order_description: z.string().nullable().optional(),
          work_order_estimated_hours: z.number().nullable().optional(),
          work_order_priority: z.string().nullable().optional(),
          checklist_items: checklistItems,
        })
        .parse(args);
      return client.pm.createTemplate({
        tenantId: p.tenant_id,
        name: p.name,
        triggerType: p.trigger_type,
        triggerConfig: p.trigger_config,
        description: p.description ?? null,
        estimatedHours: p.estimated_hours ?? null,
        workOrderTitle: p.work_order_title ?? null,
        workOrderDescription: p.work_order_description ?? null,
        workOrderEstimatedHours: p.work_order_estimated_hours ?? null,
        workOrderPriority: p.work_order_priority ?? null,
        checklistItems: p.checklist_items ?? null,
      });
    },
  },
  'pm.update_template': {
    description: 'Update a PM template.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      template_id: uuid,
      name: z.string().nullable().optional(),
      trigger_config: triggerConfig.nullable().optional(),
      description: z.string().nullable().optional(),
      estimated_hours: z.number().nullable().optional(),
      work_order_title: z.string().nullable().optional(),
      work_order_description: z.string().nullable().optional(),
      work_order_estimated_hours: z.number().nullable().optional(),
      work_order_priority: z.string().nullable().optional(),
      checklist_items: checklistItems,
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          template_id: uuid,
          name: z.string().nullable().optional(),
          trigger_config: triggerConfig.nullable().optional(),
          description: z.string().nullable().optional(),
          estimated_hours: z.number().nullable().optional(),
          work_order_title: z.string().nullable().optional(),
          work_order_description: z.string().nullable().optional(),
          work_order_estimated_hours: z.number().nullable().optional(),
          work_order_priority: z.string().nullable().optional(),
          checklist_items: checklistItems,
        })
        .parse(args);
      await client.pm.updateTemplate({
        tenantId: p.tenant_id,
        templateId: p.template_id,
        name: p.name ?? null,
        triggerConfig: p.trigger_config ?? null,
        description: p.description ?? null,
        estimatedHours: p.estimated_hours ?? null,
        workOrderTitle: p.work_order_title ?? null,
        workOrderDescription: p.work_order_description ?? null,
        workOrderEstimatedHours: p.work_order_estimated_hours ?? null,
        workOrderPriority: p.work_order_priority ?? null,
        checklistItems: p.checklist_items ?? null,
      });
      return { ok: true };
    },
  },
  'pm.create_schedule': {
    description: 'Create a PM schedule.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      asset_id: uuid,
      title: z.string().min(1),
      trigger_type: z.string().min(1),
      trigger_config: triggerConfig,
      description: z.string().nullable().optional(),
      estimated_hours: z.number().nullable().optional(),
      auto_generate: z.boolean().nullable().optional(),
      work_order_title: z.string().nullable().optional(),
      work_order_description: z.string().nullable().optional(),
      work_order_estimated_hours: z.number().nullable().optional(),
      work_order_priority: z.string().nullable().optional(),
      template_id: uuid.nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          asset_id: uuid,
          title: z.string(),
          trigger_type: z.string(),
          trigger_config: triggerConfig,
          description: z.string().nullable().optional(),
          estimated_hours: z.number().nullable().optional(),
          auto_generate: z.boolean().nullable().optional(),
          work_order_title: z.string().nullable().optional(),
          work_order_description: z.string().nullable().optional(),
          work_order_estimated_hours: z.number().nullable().optional(),
          work_order_priority: z.string().nullable().optional(),
          template_id: uuid.nullable().optional(),
        })
        .parse(args);
      return client.pm.createSchedule({
        tenantId: p.tenant_id,
        assetId: p.asset_id,
        title: p.title,
        triggerType: p.trigger_type,
        triggerConfig: p.trigger_config,
        description: p.description ?? null,
        estimatedHours: p.estimated_hours ?? null,
        autoGenerate: p.auto_generate ?? null,
        workOrderTitle: p.work_order_title ?? null,
        workOrderDescription: p.work_order_description ?? null,
        workOrderEstimatedHours: p.work_order_estimated_hours ?? null,
        workOrderPriority: p.work_order_priority ?? null,
        templateId: p.template_id ?? null,
      });
    },
  },
  'pm.update_schedule': {
    description: 'Update a PM schedule.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      pm_schedule_id: uuid,
      title: z.string().nullable().optional(),
      trigger_config: triggerConfig.nullable().optional(),
      description: z.string().nullable().optional(),
      estimated_hours: z.number().nullable().optional(),
      is_active: z.boolean().nullable().optional(),
      auto_generate: z.boolean().nullable().optional(),
      work_order_title: z.string().nullable().optional(),
      work_order_description: z.string().nullable().optional(),
      work_order_estimated_hours: z.number().nullable().optional(),
      work_order_priority: z.string().nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          pm_schedule_id: uuid,
          title: z.string().nullable().optional(),
          trigger_config: triggerConfig.nullable().optional(),
          description: z.string().nullable().optional(),
          estimated_hours: z.number().nullable().optional(),
          is_active: z.boolean().nullable().optional(),
          auto_generate: z.boolean().nullable().optional(),
          work_order_title: z.string().nullable().optional(),
          work_order_description: z.string().nullable().optional(),
          work_order_estimated_hours: z.number().nullable().optional(),
          work_order_priority: z.string().nullable().optional(),
        })
        .parse(args);
      await client.pm.updateSchedule({
        tenantId: p.tenant_id,
        pmScheduleId: p.pm_schedule_id,
        title: p.title ?? null,
        triggerConfig: p.trigger_config ?? null,
        description: p.description ?? null,
        estimatedHours: p.estimated_hours ?? null,
        isActive: p.is_active ?? null,
        autoGenerate: p.auto_generate ?? null,
        workOrderTitle: p.work_order_title ?? null,
        workOrderDescription: p.work_order_description ?? null,
        workOrderEstimatedHours: p.work_order_estimated_hours ?? null,
        workOrderPriority: p.work_order_priority ?? null,
      });
      return { ok: true };
    },
  },
  'pm.delete_schedule': {
    description: 'Delete a PM schedule.',
    annotations: ann.destructive,
    inputSchema: z.object({
      tenant_id: uuid,
      pm_schedule_id: uuid,
    }),
    async invoke(client, args) {
      const p = z.object({ tenant_id: uuid, pm_schedule_id: uuid }).parse(args);
      await client.pm.deleteSchedule({ tenantId: p.tenant_id, pmScheduleId: p.pm_schedule_id });
      return { ok: true };
    },
  },
  'pm.create_dependency': {
    description: 'Create a PM schedule dependency.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      pm_schedule_id: uuid,
      depends_on_pm_id: uuid,
      dependency_type: z.string().nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          pm_schedule_id: uuid,
          depends_on_pm_id: uuid,
          dependency_type: z.string().nullable().optional(),
        })
        .parse(args);
      return client.pm.createDependency({
        tenantId: p.tenant_id,
        pmScheduleId: p.pm_schedule_id,
        dependsOnPmId: p.depends_on_pm_id,
        dependencyType: p.dependency_type ?? null,
      });
    },
  },
  'pm.generate_due_pms': {
    description: 'Generate due PMs.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      limit: z.number().int().positive().nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z.object({ tenant_id: uuid, limit: z.number().int().positive().nullable().optional() }).parse(args);
      return client.pm.generateDuePms({ tenantId: p.tenant_id, limit: p.limit ?? null });
    },
  },
  'pm.trigger_manual_pm': {
    description: 'Trigger a manual PM for a schedule.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      pm_schedule_id: uuid,
    }),
    async invoke(client, args) {
      const p = z.object({ tenant_id: uuid, pm_schedule_id: uuid }).parse(args);
      return client.pm.triggerManualPm({ tenantId: p.tenant_id, pmScheduleId: p.pm_schedule_id });
    },
  },
};
