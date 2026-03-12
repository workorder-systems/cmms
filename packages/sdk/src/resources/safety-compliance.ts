import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.js';
import { normalizeError } from '../errors.js';
import { callRpc } from '../unwrap.js';

/** Row from v_inspection_templates view. */
export type InspectionTemplateRow =
  Database['public']['Views'] extends { v_inspection_templates: { Row: infer R } }
    ? R
    : Record<string, unknown>;

/** Row from v_inspection_template_items view. */
export type InspectionTemplateItemRow =
  Database['public']['Views'] extends { v_inspection_template_items: { Row: infer R } }
    ? R
    : Record<string, unknown>;

/** Row from v_inspection_schedules view. */
export type InspectionScheduleRow =
  Database['public']['Views'] extends { v_inspection_schedules: { Row: infer R } }
    ? R
    : Record<string, unknown>;

/** Row from v_inspection_runs view. */
export type InspectionRunRow =
  Database['public']['Views'] extends { v_inspection_runs: { Row: infer R } }
    ? R
    : Record<string, unknown>;

/** Row from v_inspection_run_items view. */
export type InspectionRunItemRow =
  Database['public']['Views'] extends { v_inspection_run_items: { Row: infer R } }
    ? R
    : Record<string, unknown>;

/** Row from v_incidents view. */
export type IncidentRow =
  Database['public']['Views'] extends { v_incidents: { Row: infer R } } ? R : Record<string, unknown>;

/** Row from v_incident_actions view. */
export type IncidentActionRow =
  Database['public']['Views'] extends { v_incident_actions: { Row: infer R } }
    ? R
    : Record<string, unknown>;

/** One row from rpc_compliance_inspection_history. */
export type ComplianceInspectionHistoryRow = {
  run_id: string;
  template_name: string | null;
  asset_name: string | null;
  location_name: string | null;
  status: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
  conducted_by_name: string | null;
  pass_count: number;
  fail_count: number;
  na_count: number;
  not_checked_count: number;
};

/** One row from rpc_compliance_incident_report. */
export type ComplianceIncidentReportRow = {
  incident_id: string;
  type: string | null;
  severity: string | null;
  title: string | null;
  occurred_at: string | null;
  status: string | null;
  closed_at: string | null;
  action_count: number;
  action_pending_count: number;
  action_completed_count: number;
};

/** Checklist item for create/update inspection template. */
export interface InspectionChecklistItemInput {
  description: string;
  required?: boolean;
}

/** Params for creating an inspection template. */
export interface CreateInspectionTemplateParams {
  tenantId: string;
  name: string;
  description?: string | null;
  category?: string | null;
  triggerConfig?: Record<string, unknown> | null;
  checklistItems?: InspectionChecklistItemInput[] | null;
}

/** Params for updating an inspection template. */
export interface UpdateInspectionTemplateParams {
  tenantId: string;
  templateId: string;
  name?: string | null;
  description?: string | null;
  category?: string | null;
  triggerConfig?: Record<string, unknown> | null;
  checklistItems?: InspectionChecklistItemInput[] | null;
}

/** Params for creating an inspection schedule. */
export interface CreateInspectionScheduleParams {
  tenantId: string;
  templateId: string;
  title: string;
  assetId?: string | null;
  locationId?: string | null;
  triggerConfig?: Record<string, unknown> | null;
  nextDueAt?: string | null;
}

/** Params for updating an inspection schedule. */
export interface UpdateInspectionScheduleParams {
  tenantId: string;
  scheduleId: string;
  title?: string | null;
  assetId?: string | null;
  locationId?: string | null;
  triggerConfig?: Record<string, unknown> | null;
  nextDueAt?: string | null;
  isActive?: boolean | null;
}

/** Params for creating an inspection run. */
export interface CreateInspectionRunParams {
  tenantId: string;
  templateId?: string | null;
  inspectionScheduleId?: string | null;
  workOrderId?: string | null;
  assetId?: string | null;
  locationId?: string | null;
  scheduledAt?: string | null;
  notes?: string | null;
}

/** Params for updating an inspection run. */
export interface UpdateInspectionRunParams {
  tenantId: string;
  runId: string;
  status?: string | null;
  scheduledAt?: string | null;
  startedAt?: string | null;
  notes?: string | null;
  conductedBy?: string | null;
}

/** One item result for completing an inspection run. */
export interface InspectionRunItemResultInput {
  template_item_id: string;
  result?: 'pass' | 'fail' | 'na' | 'not_checked';
  notes?: string | null;
}

/** Params for completing an inspection run. */
export interface CompleteInspectionRunParams {
  tenantId: string;
  runId: string;
  itemResults?: InspectionRunItemResultInput[] | null;
}

/** Params for creating an incident. */
export interface CreateIncidentParams {
  tenantId: string;
  title: string;
  type?: 'incident' | 'near_miss' | 'event';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  description?: string | null;
  occurredAt?: string | null;
  locationId?: string | null;
  assetId?: string | null;
  workOrderId?: string | null;
  metadata?: Record<string, unknown> | null;
}

/** Params for updating an incident. */
export interface UpdateIncidentParams {
  tenantId: string;
  incidentId: string;
  title?: string | null;
  type?: 'incident' | 'near_miss' | 'event' | null;
  severity?: 'low' | 'medium' | 'high' | 'critical' | null;
  description?: string | null;
  occurredAt?: string | null;
  status?: 'open' | 'investigating' | 'resolved' | 'closed' | null;
  locationId?: string | null;
  assetId?: string | null;
  workOrderId?: string | null;
  metadata?: Record<string, unknown> | null;
}

/** Params for closing an incident. */
export interface CloseIncidentParams {
  tenantId: string;
  incidentId: string;
  status?: 'resolved' | 'closed';
}

/** Params for creating an incident action. */
export interface CreateIncidentActionParams {
  tenantId: string;
  incidentId: string;
  description: string;
  actionType?: 'corrective' | 'preventive' | 'containment';
  dueDate?: string | null;
  assignedTo?: string | null;
}

/** Params for updating an incident action. */
export interface UpdateIncidentActionParams {
  tenantId: string;
  actionId: string;
  description?: string | null;
  dueDate?: string | null;
  assignedTo?: string | null;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled' | null;
}

/** Params for completing an incident action. */
export interface CompleteIncidentActionParams {
  tenantId: string;
  actionId: string;
}

/** Params for compliance inspection history. */
export interface ComplianceInspectionHistoryParams {
  tenantId: string;
  fromDate: string;
  toDate: string;
  assetId?: string | null;
  locationId?: string | null;
}

/** Params for compliance incident report. */
export interface ComplianceIncidentReportParams {
  tenantId: string;
  fromDate: string;
  toDate: string;
  severity?: 'low' | 'medium' | 'high' | 'critical' | null;
}

const rpc = (supabase: SupabaseClient<Database>) =>
  (supabase as unknown as { rpc: (n: string, p?: object) => Promise<{ data: unknown; error: unknown }> }).rpc.bind(
    supabase
  );

/**
 * Safety and compliance resource: inspection templates, schedules, runs, incidents, and corrective actions.
 * Uses v_inspection_* and v_incident* views and related RPCs. Set tenant context before listing or calling RPCs.
 */
export function createSafetyComplianceResource(supabase: SupabaseClient<Database>) {
  return {
    /** List inspection templates for the current tenant (v_inspection_templates). */
    async listTemplates(): Promise<InspectionTemplateRow[]> {
      const { data, error } = await supabase.from('v_inspection_templates').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as InspectionTemplateRow[];
    },

    /** List inspection template checklist items (v_inspection_template_items). */
    async listTemplateItems(): Promise<InspectionTemplateItemRow[]> {
      const { data, error } = await supabase.from('v_inspection_template_items').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as InspectionTemplateItemRow[];
    },

    /** List inspection schedules (v_inspection_schedules). */
    async listSchedules(): Promise<InspectionScheduleRow[]> {
      const { data, error } = await supabase.from('v_inspection_schedules').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as InspectionScheduleRow[];
    },

    /** List inspection runs (v_inspection_runs). */
    async listRuns(): Promise<InspectionRunRow[]> {
      const { data, error } = await supabase.from('v_inspection_runs').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as InspectionRunRow[];
    },

    /** List inspection run items (v_inspection_run_items). */
    async listRunItems(): Promise<InspectionRunItemRow[]> {
      const { data, error } = await supabase.from('v_inspection_run_items').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as InspectionRunItemRow[];
    },

    /** List incidents (v_incidents). */
    async listIncidents(): Promise<IncidentRow[]> {
      const { data, error } = await supabase.from('v_incidents').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as IncidentRow[];
    },

    /** List incident actions (v_incident_actions). */
    async listIncidentActions(): Promise<IncidentActionRow[]> {
      const { data, error } = await supabase.from('v_incident_actions').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as IncidentActionRow[];
    },

    /** Create an inspection template. Requires tenant.admin. Returns template UUID. */
    async createTemplate(params: CreateInspectionTemplateParams): Promise<string> {
      return callRpc<string>(rpc(supabase), 'rpc_create_inspection_template', {
        p_tenant_id: params.tenantId,
        p_name: params.name,
        p_description: params.description ?? null,
        p_category: params.category ?? null,
        p_trigger_config: params.triggerConfig ?? null,
        p_checklist_items:
          params.checklistItems?.map((item) => ({
            description: item.description,
            required: item.required ?? false,
          })) ?? null,
      });
    },

    /** Update an inspection template. Requires tenant.admin. */
    async updateTemplate(params: UpdateInspectionTemplateParams): Promise<void> {
      return callRpc(rpc(supabase), 'rpc_update_inspection_template', {
        p_tenant_id: params.tenantId,
        p_template_id: params.templateId,
        p_name: params.name ?? null,
        p_description: params.description ?? null,
        p_category: params.category ?? null,
        p_trigger_config: params.triggerConfig ?? null,
        p_checklist_items:
          params.checklistItems?.map((item) => ({
            description: item.description,
            required: item.required ?? false,
          })) ?? null,
      });
    },

    /** Create an inspection schedule. Returns schedule UUID. At least one of assetId or locationId required. */
    async createSchedule(params: CreateInspectionScheduleParams): Promise<string> {
      return callRpc<string>(rpc(supabase), 'rpc_create_inspection_schedule', {
        p_tenant_id: params.tenantId,
        p_template_id: params.templateId,
        p_title: params.title,
        p_asset_id: params.assetId ?? null,
        p_location_id: params.locationId ?? null,
        p_trigger_config: params.triggerConfig ?? null,
        p_next_due_at: params.nextDueAt ?? null,
      });
    },

    /** Update an inspection schedule. */
    async updateSchedule(params: UpdateInspectionScheduleParams): Promise<void> {
      return callRpc(rpc(supabase), 'rpc_update_inspection_schedule', {
        p_tenant_id: params.tenantId,
        p_schedule_id: params.scheduleId,
        p_title: params.title ?? null,
        p_asset_id: params.assetId ?? null,
        p_location_id: params.locationId ?? null,
        p_trigger_config: params.triggerConfig ?? null,
        p_next_due_at: params.nextDueAt ?? null,
        p_is_active: params.isActive ?? null,
      });
    },

    /** Create an inspection run. Returns run UUID. At least one of assetId or locationId required. */
    async createRun(params: CreateInspectionRunParams): Promise<string> {
      return callRpc<string>(rpc(supabase), 'rpc_create_inspection_run', {
        p_tenant_id: params.tenantId,
        p_template_id: params.templateId ?? null,
        p_inspection_schedule_id: params.inspectionScheduleId ?? null,
        p_work_order_id: params.workOrderId ?? null,
        p_asset_id: params.assetId ?? null,
        p_location_id: params.locationId ?? null,
        p_scheduled_at: params.scheduledAt ?? null,
        p_notes: params.notes ?? null,
      });
    },

    /** Update an inspection run. */
    async updateRun(params: UpdateInspectionRunParams): Promise<void> {
      return callRpc(rpc(supabase), 'rpc_update_inspection_run', {
        p_tenant_id: params.tenantId,
        p_run_id: params.runId,
        p_status: params.status ?? null,
        p_scheduled_at: params.scheduledAt ?? null,
        p_started_at: params.startedAt ?? null,
        p_notes: params.notes ?? null,
        p_conducted_by: params.conductedBy ?? null,
      });
    },

    /** Complete an inspection run and optionally submit item results. */
    async completeRun(params: CompleteInspectionRunParams): Promise<void> {
      return callRpc(rpc(supabase), 'rpc_complete_inspection_run', {
        p_tenant_id: params.tenantId,
        p_run_id: params.runId,
        p_item_results: params.itemResults ?? null,
      });
    },

    /** Create an incident. Returns incident UUID. */
    async createIncident(params: CreateIncidentParams): Promise<string> {
      return callRpc<string>(rpc(supabase), 'rpc_create_incident', {
        p_tenant_id: params.tenantId,
        p_title: params.title,
        p_type: params.type ?? 'incident',
        p_severity: params.severity ?? 'medium',
        p_description: params.description ?? null,
        p_occurred_at: params.occurredAt ?? null,
        p_location_id: params.locationId ?? null,
        p_asset_id: params.assetId ?? null,
        p_work_order_id: params.workOrderId ?? null,
        p_metadata: params.metadata ?? null,
      });
    },

    /** Update an incident. */
    async updateIncident(params: UpdateIncidentParams): Promise<void> {
      return callRpc(rpc(supabase), 'rpc_update_incident', {
        p_tenant_id: params.tenantId,
        p_incident_id: params.incidentId,
        p_title: params.title ?? null,
        p_type: params.type ?? null,
        p_severity: params.severity ?? null,
        p_description: params.description ?? null,
        p_occurred_at: params.occurredAt ?? null,
        p_status: params.status ?? null,
        p_location_id: params.locationId ?? null,
        p_asset_id: params.assetId ?? null,
        p_work_order_id: params.workOrderId ?? null,
        p_metadata: params.metadata ?? null,
      });
    },

    /** Close or resolve an incident. */
    async closeIncident(params: CloseIncidentParams): Promise<void> {
      return callRpc(rpc(supabase), 'rpc_close_incident', {
        p_tenant_id: params.tenantId,
        p_incident_id: params.incidentId,
        p_status: params.status ?? 'closed',
      });
    },

    /** Create a corrective/preventive/containment action for an incident. Returns action UUID. */
    async createIncidentAction(params: CreateIncidentActionParams): Promise<string> {
      return callRpc<string>(rpc(supabase), 'rpc_create_incident_action', {
        p_tenant_id: params.tenantId,
        p_incident_id: params.incidentId,
        p_description: params.description,
        p_action_type: params.actionType ?? 'corrective',
        p_due_date: params.dueDate ?? null,
        p_assigned_to: params.assignedTo ?? null,
      });
    },

    /** Update an incident action. */
    async updateIncidentAction(params: UpdateIncidentActionParams): Promise<void> {
      return callRpc(rpc(supabase), 'rpc_update_incident_action', {
        p_tenant_id: params.tenantId,
        p_action_id: params.actionId,
        p_description: params.description ?? null,
        p_due_date: params.dueDate ?? null,
        p_assigned_to: params.assignedTo ?? null,
        p_status: params.status ?? null,
      });
    },

    /** Mark an incident action as completed. */
    async completeIncidentAction(params: CompleteIncidentActionParams): Promise<void> {
      return callRpc(rpc(supabase), 'rpc_complete_incident_action', {
        p_tenant_id: params.tenantId,
        p_action_id: params.actionId,
      });
    },

    /** Compliance: inspection history in date range with pass/fail counts. Optional asset/location filter. */
    async complianceInspectionHistory(
      params: ComplianceInspectionHistoryParams
    ): Promise<ComplianceInspectionHistoryRow[]> {
      const { data, error } = await rpc(supabase)('rpc_compliance_inspection_history', {
        p_tenant_id: params.tenantId,
        p_from_date: params.fromDate,
        p_to_date: params.toDate,
        p_asset_id: params.assetId ?? null,
        p_location_id: params.locationId ?? null,
      });
      if (error) throw normalizeError(error as import('@supabase/supabase-js').PostgrestError);
      return (data ?? []) as ComplianceInspectionHistoryRow[];
    },

    /** Compliance: incident report in date range with action counts. Optional severity filter. */
    async complianceIncidentReport(
      params: ComplianceIncidentReportParams
    ): Promise<ComplianceIncidentReportRow[]> {
      const { data, error } = await rpc(supabase)('rpc_compliance_incident_report', {
        p_tenant_id: params.tenantId,
        p_from_date: params.fromDate,
        p_to_date: params.toDate,
        p_severity: params.severity ?? null,
      });
      if (error) throw normalizeError(error as import('@supabase/supabase-js').PostgrestError);
      return (data ?? []) as ComplianceIncidentReportRow[];
    },
  };
}

export type SafetyComplianceResource = ReturnType<typeof createSafetyComplianceResource>;
