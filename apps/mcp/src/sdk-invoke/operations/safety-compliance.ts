import { z } from 'zod';
import type { SdkOperationDef } from '../types.js';
import { ann } from '../annotations.js';
import { emptyArgs, uuid } from '../zod-common.js';

const triggerConfig = z.record(z.unknown()).nullable().optional();

const checklistItem = z.object({
  description: z.string().min(1),
  required: z.boolean().optional(),
});

const itemResult = z.object({
  template_item_id: uuid,
  result: z.enum(['pass', 'fail', 'na', 'not_checked']).optional(),
  notes: z.string().nullable().optional(),
});

export const safetyComplianceOperations: Record<string, SdkOperationDef> = {
  'safety_compliance.list_templates': {
    description: 'List inspection templates.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.safetyCompliance.listTemplates();
    },
  },
  'safety_compliance.list_template_items': {
    description: 'List inspection template checklist items.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.safetyCompliance.listTemplateItems();
    },
  },
  'safety_compliance.list_schedules': {
    description: 'List inspection schedules.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.safetyCompliance.listSchedules();
    },
  },
  'safety_compliance.list_runs': {
    description: 'List inspection runs.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.safetyCompliance.listRuns();
    },
  },
  'safety_compliance.list_run_items': {
    description: 'List inspection run items.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.safetyCompliance.listRunItems();
    },
  },
  'safety_compliance.list_incidents': {
    description: 'List incidents.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.safetyCompliance.listIncidents();
    },
  },
  'safety_compliance.list_incident_actions': {
    description: 'List incident actions.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.safetyCompliance.listIncidentActions();
    },
  },
  'safety_compliance.create_template': {
    description: 'Create inspection template.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      name: z.string().min(1),
      description: z.string().nullable().optional(),
      category: z.string().nullable().optional(),
      trigger_config: triggerConfig,
      checklist_items: z.array(checklistItem).nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          name: z.string(),
          description: z.string().nullable().optional(),
          category: z.string().nullable().optional(),
          trigger_config: triggerConfig,
          checklist_items: z.array(checklistItem).nullable().optional(),
        })
        .parse(args);
      return client.safetyCompliance.createTemplate({
        tenantId: p.tenant_id,
        name: p.name,
        description: p.description ?? null,
        category: p.category ?? null,
        triggerConfig: p.trigger_config ?? null,
        checklistItems: p.checklist_items ?? null,
      });
    },
  },
  'safety_compliance.update_template': {
    description: 'Update inspection template.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      template_id: uuid,
      name: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
      category: z.string().nullable().optional(),
      trigger_config: triggerConfig,
      checklist_items: z.array(checklistItem).nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          template_id: uuid,
          name: z.string().nullable().optional(),
          description: z.string().nullable().optional(),
          category: z.string().nullable().optional(),
          trigger_config: triggerConfig,
          checklist_items: z.array(checklistItem).nullable().optional(),
        })
        .parse(args);
      await client.safetyCompliance.updateTemplate({
        tenantId: p.tenant_id,
        templateId: p.template_id,
        name: p.name ?? null,
        description: p.description ?? null,
        category: p.category ?? null,
        triggerConfig: p.trigger_config ?? null,
        checklistItems: p.checklist_items ?? null,
      });
      return { ok: true };
    },
  },
  'safety_compliance.create_schedule': {
    description: 'Create inspection schedule.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      template_id: uuid,
      title: z.string().min(1),
      asset_id: uuid.nullable().optional(),
      location_id: uuid.nullable().optional(),
      trigger_config: triggerConfig,
      next_due_at: z.string().nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          template_id: uuid,
          title: z.string(),
          asset_id: uuid.nullable().optional(),
          location_id: uuid.nullable().optional(),
          trigger_config: triggerConfig,
          next_due_at: z.string().nullable().optional(),
        })
        .parse(args);
      return client.safetyCompliance.createSchedule({
        tenantId: p.tenant_id,
        templateId: p.template_id,
        title: p.title,
        assetId: p.asset_id ?? null,
        locationId: p.location_id ?? null,
        triggerConfig: p.trigger_config ?? null,
        nextDueAt: p.next_due_at ?? null,
      });
    },
  },
  'safety_compliance.update_schedule': {
    description: 'Update inspection schedule.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      schedule_id: uuid,
      title: z.string().nullable().optional(),
      asset_id: uuid.nullable().optional(),
      location_id: uuid.nullable().optional(),
      trigger_config: triggerConfig,
      next_due_at: z.string().nullable().optional(),
      is_active: z.boolean().nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          schedule_id: uuid,
          title: z.string().nullable().optional(),
          asset_id: uuid.nullable().optional(),
          location_id: uuid.nullable().optional(),
          trigger_config: triggerConfig,
          next_due_at: z.string().nullable().optional(),
          is_active: z.boolean().nullable().optional(),
        })
        .parse(args);
      await client.safetyCompliance.updateSchedule({
        tenantId: p.tenant_id,
        scheduleId: p.schedule_id,
        title: p.title ?? null,
        assetId: p.asset_id ?? null,
        locationId: p.location_id ?? null,
        triggerConfig: p.trigger_config ?? null,
        nextDueAt: p.next_due_at ?? null,
        isActive: p.is_active ?? null,
      });
      return { ok: true };
    },
  },
  'safety_compliance.create_run': {
    description: 'Create inspection run.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      template_id: uuid.nullable().optional(),
      inspection_schedule_id: uuid.nullable().optional(),
      work_order_id: uuid.nullable().optional(),
      asset_id: uuid.nullable().optional(),
      location_id: uuid.nullable().optional(),
      scheduled_at: z.string().nullable().optional(),
      notes: z.string().nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          template_id: uuid.nullable().optional(),
          inspection_schedule_id: uuid.nullable().optional(),
          work_order_id: uuid.nullable().optional(),
          asset_id: uuid.nullable().optional(),
          location_id: uuid.nullable().optional(),
          scheduled_at: z.string().nullable().optional(),
          notes: z.string().nullable().optional(),
        })
        .parse(args);
      return client.safetyCompliance.createRun({
        tenantId: p.tenant_id,
        templateId: p.template_id ?? null,
        inspectionScheduleId: p.inspection_schedule_id ?? null,
        workOrderId: p.work_order_id ?? null,
        assetId: p.asset_id ?? null,
        locationId: p.location_id ?? null,
        scheduledAt: p.scheduled_at ?? null,
        notes: p.notes ?? null,
      });
    },
  },
  'safety_compliance.update_run': {
    description: 'Update inspection run.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      run_id: uuid,
      status: z.string().nullable().optional(),
      scheduled_at: z.string().nullable().optional(),
      started_at: z.string().nullable().optional(),
      notes: z.string().nullable().optional(),
      conducted_by: z.string().nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          run_id: uuid,
          status: z.string().nullable().optional(),
          scheduled_at: z.string().nullable().optional(),
          started_at: z.string().nullable().optional(),
          notes: z.string().nullable().optional(),
          conducted_by: z.string().nullable().optional(),
        })
        .parse(args);
      await client.safetyCompliance.updateRun({
        tenantId: p.tenant_id,
        runId: p.run_id,
        status: p.status ?? null,
        scheduledAt: p.scheduled_at ?? null,
        startedAt: p.started_at ?? null,
        notes: p.notes ?? null,
        conductedBy: p.conducted_by ?? null,
      });
      return { ok: true };
    },
  },
  'safety_compliance.complete_run': {
    description: 'Complete inspection run with optional item results.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      run_id: uuid,
      item_results: z.array(itemResult).nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          run_id: uuid,
          item_results: z.array(itemResult).nullable().optional(),
        })
        .parse(args);
      await client.safetyCompliance.completeRun({
        tenantId: p.tenant_id,
        runId: p.run_id,
        itemResults: p.item_results ?? null,
      });
      return { ok: true };
    },
  },
  'safety_compliance.create_incident': {
    description: 'Create an incident.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      title: z.string().min(1),
      type: z.enum(['incident', 'near_miss', 'event']).optional(),
      severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
      description: z.string().nullable().optional(),
      occurred_at: z.string().nullable().optional(),
      location_id: uuid.nullable().optional(),
      asset_id: uuid.nullable().optional(),
      work_order_id: uuid.nullable().optional(),
      metadata: z.record(z.unknown()).nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          title: z.string(),
          type: z.enum(['incident', 'near_miss', 'event']).optional(),
          severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
          description: z.string().nullable().optional(),
          occurred_at: z.string().nullable().optional(),
          location_id: uuid.nullable().optional(),
          asset_id: uuid.nullable().optional(),
          work_order_id: uuid.nullable().optional(),
          metadata: z.record(z.unknown()).nullable().optional(),
        })
        .parse(args);
      return client.safetyCompliance.createIncident({
        tenantId: p.tenant_id,
        title: p.title,
        type: p.type,
        severity: p.severity,
        description: p.description ?? null,
        occurredAt: p.occurred_at ?? null,
        locationId: p.location_id ?? null,
        assetId: p.asset_id ?? null,
        workOrderId: p.work_order_id ?? null,
        metadata: p.metadata ?? null,
      });
    },
  },
  'safety_compliance.update_incident': {
    description: 'Update an incident.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      incident_id: uuid,
      title: z.string().nullable().optional(),
      type: z.enum(['incident', 'near_miss', 'event']).nullable().optional(),
      severity: z.enum(['low', 'medium', 'high', 'critical']).nullable().optional(),
      description: z.string().nullable().optional(),
      occurred_at: z.string().nullable().optional(),
      status: z.enum(['open', 'investigating', 'resolved', 'closed']).nullable().optional(),
      location_id: uuid.nullable().optional(),
      asset_id: uuid.nullable().optional(),
      work_order_id: uuid.nullable().optional(),
      metadata: z.record(z.unknown()).nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          incident_id: uuid,
          title: z.string().nullable().optional(),
          type: z.enum(['incident', 'near_miss', 'event']).nullable().optional(),
          severity: z.enum(['low', 'medium', 'high', 'critical']).nullable().optional(),
          description: z.string().nullable().optional(),
          occurred_at: z.string().nullable().optional(),
          status: z.enum(['open', 'investigating', 'resolved', 'closed']).nullable().optional(),
          location_id: uuid.nullable().optional(),
          asset_id: uuid.nullable().optional(),
          work_order_id: uuid.nullable().optional(),
          metadata: z.record(z.unknown()).nullable().optional(),
        })
        .parse(args);
      await client.safetyCompliance.updateIncident({
        tenantId: p.tenant_id,
        incidentId: p.incident_id,
        title: p.title ?? null,
        type: p.type ?? null,
        severity: p.severity ?? null,
        description: p.description ?? null,
        occurredAt: p.occurred_at ?? null,
        status: p.status ?? null,
        locationId: p.location_id ?? null,
        assetId: p.asset_id ?? null,
        workOrderId: p.work_order_id ?? null,
        metadata: p.metadata ?? null,
      });
      return { ok: true };
    },
  },
  'safety_compliance.close_incident': {
    description: 'Close or resolve an incident.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      incident_id: uuid,
      status: z.enum(['resolved', 'closed']).optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          incident_id: uuid,
          status: z.enum(['resolved', 'closed']).optional(),
        })
        .parse(args);
      await client.safetyCompliance.closeIncident({
        tenantId: p.tenant_id,
        incidentId: p.incident_id,
        status: p.status,
      });
      return { ok: true };
    },
  },
  'safety_compliance.create_incident_action': {
    description: 'Create incident action.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      incident_id: uuid,
      description: z.string().min(1),
      action_type: z.enum(['corrective', 'preventive', 'containment']).optional(),
      due_date: z.string().nullable().optional(),
      assigned_to: z.string().nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          incident_id: uuid,
          description: z.string(),
          action_type: z.enum(['corrective', 'preventive', 'containment']).optional(),
          due_date: z.string().nullable().optional(),
          assigned_to: z.string().nullable().optional(),
        })
        .parse(args);
      return client.safetyCompliance.createIncidentAction({
        tenantId: p.tenant_id,
        incidentId: p.incident_id,
        description: p.description,
        actionType: p.action_type,
        dueDate: p.due_date ?? null,
        assignedTo: p.assigned_to ?? null,
      });
    },
  },
  'safety_compliance.update_incident_action': {
    description: 'Update incident action.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      action_id: uuid,
      description: z.string().nullable().optional(),
      due_date: z.string().nullable().optional(),
      assigned_to: z.string().nullable().optional(),
      status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          action_id: uuid,
          description: z.string().nullable().optional(),
          due_date: z.string().nullable().optional(),
          assigned_to: z.string().nullable().optional(),
          status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).nullable().optional(),
        })
        .parse(args);
      await client.safetyCompliance.updateIncidentAction({
        tenantId: p.tenant_id,
        actionId: p.action_id,
        description: p.description ?? null,
        dueDate: p.due_date ?? null,
        assignedTo: p.assigned_to ?? null,
        status: p.status ?? null,
      });
      return { ok: true };
    },
  },
  'safety_compliance.complete_incident_action': {
    description: 'Complete incident action.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      action_id: uuid,
    }),
    async invoke(client, args) {
      const p = z.object({ tenant_id: uuid, action_id: uuid }).parse(args);
      await client.safetyCompliance.completeIncidentAction({
        tenantId: p.tenant_id,
        actionId: p.action_id,
      });
      return { ok: true };
    },
  },
  'safety_compliance.compliance_inspection_history': {
    description: 'Compliance inspection history report.',
    annotations: ann.read,
    inputSchema: z.object({
      tenant_id: uuid,
      from_date: z.string().min(1),
      to_date: z.string().min(1),
      asset_id: uuid.nullable().optional(),
      location_id: uuid.nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          from_date: z.string(),
          to_date: z.string(),
          asset_id: uuid.nullable().optional(),
          location_id: uuid.nullable().optional(),
        })
        .parse(args);
      return client.safetyCompliance.complianceInspectionHistory({
        tenantId: p.tenant_id,
        fromDate: p.from_date,
        toDate: p.to_date,
        assetId: p.asset_id ?? null,
        locationId: p.location_id ?? null,
      });
    },
  },
  'safety_compliance.compliance_incident_report': {
    description: 'Compliance incident report.',
    annotations: ann.read,
    inputSchema: z.object({
      tenant_id: uuid,
      from_date: z.string().min(1),
      to_date: z.string().min(1),
      severity: z.enum(['low', 'medium', 'high', 'critical']).nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          from_date: z.string(),
          to_date: z.string(),
          severity: z.enum(['low', 'medium', 'high', 'critical']).nullable().optional(),
        })
        .parse(args);
      return client.safetyCompliance.complianceIncidentReport({
        tenantId: p.tenant_id,
        fromDate: p.from_date,
        toDate: p.to_date,
        severity: p.severity ?? null,
      });
    },
  },
};
