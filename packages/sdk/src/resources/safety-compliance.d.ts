import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.js';
/** Row from v_inspection_templates view. */
export type InspectionTemplateRow = Database['public']['Views'] extends {
    v_inspection_templates: {
        Row: infer R;
    };
} ? R : Record<string, unknown>;
/** Row from v_inspection_template_items view. */
export type InspectionTemplateItemRow = Database['public']['Views'] extends {
    v_inspection_template_items: {
        Row: infer R;
    };
} ? R : Record<string, unknown>;
/** Row from v_inspection_schedules view. */
export type InspectionScheduleRow = Database['public']['Views'] extends {
    v_inspection_schedules: {
        Row: infer R;
    };
} ? R : Record<string, unknown>;
/** Row from v_inspection_runs view. */
export type InspectionRunRow = Database['public']['Views'] extends {
    v_inspection_runs: {
        Row: infer R;
    };
} ? R : Record<string, unknown>;
/** Row from v_inspection_run_items view. */
export type InspectionRunItemRow = Database['public']['Views'] extends {
    v_inspection_run_items: {
        Row: infer R;
    };
} ? R : Record<string, unknown>;
/** Row from v_incidents view. */
export type IncidentRow = Database['public']['Views'] extends {
    v_incidents: {
        Row: infer R;
    };
} ? R : Record<string, unknown>;
/** Row from v_incident_actions view. */
export type IncidentActionRow = Database['public']['Views'] extends {
    v_incident_actions: {
        Row: infer R;
    };
} ? R : Record<string, unknown>;
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
/**
 * Safety and compliance resource: inspection templates, schedules, runs, incidents, and corrective actions.
 * Uses v_inspection_* and v_incident* views and related RPCs. Set tenant context before listing or calling RPCs.
 */
export declare function createSafetyComplianceResource(supabase: SupabaseClient<Database>): {
    /** List inspection templates for the current tenant (v_inspection_templates). */
    listTemplates(): Promise<InspectionTemplateRow[]>;
    /** List inspection template checklist items (v_inspection_template_items). */
    listTemplateItems(): Promise<InspectionTemplateItemRow[]>;
    /** List inspection schedules (v_inspection_schedules). */
    listSchedules(): Promise<InspectionScheduleRow[]>;
    /** List inspection runs (v_inspection_runs). */
    listRuns(): Promise<InspectionRunRow[]>;
    /** List inspection run items (v_inspection_run_items). */
    listRunItems(): Promise<InspectionRunItemRow[]>;
    /** List incidents (v_incidents). */
    listIncidents(): Promise<IncidentRow[]>;
    /** List incident actions (v_incident_actions). */
    listIncidentActions(): Promise<IncidentActionRow[]>;
    /** Create an inspection template. Requires tenant.admin. Returns template UUID. */
    createTemplate(params: CreateInspectionTemplateParams): Promise<string>;
    /** Update an inspection template. Requires tenant.admin. */
    updateTemplate(params: UpdateInspectionTemplateParams): Promise<void>;
    /** Create an inspection schedule. Returns schedule UUID. At least one of assetId or locationId required. */
    createSchedule(params: CreateInspectionScheduleParams): Promise<string>;
    /** Update an inspection schedule. */
    updateSchedule(params: UpdateInspectionScheduleParams): Promise<void>;
    /** Create an inspection run. Returns run UUID. At least one of assetId or locationId required. */
    createRun(params: CreateInspectionRunParams): Promise<string>;
    /** Update an inspection run. */
    updateRun(params: UpdateInspectionRunParams): Promise<void>;
    /** Complete an inspection run and optionally submit item results. */
    completeRun(params: CompleteInspectionRunParams): Promise<void>;
    /** Create an incident. Returns incident UUID. */
    createIncident(params: CreateIncidentParams): Promise<string>;
    /** Update an incident. */
    updateIncident(params: UpdateIncidentParams): Promise<void>;
    /** Close or resolve an incident. */
    closeIncident(params: CloseIncidentParams): Promise<void>;
    /** Create a corrective/preventive/containment action for an incident. Returns action UUID. */
    createIncidentAction(params: CreateIncidentActionParams): Promise<string>;
    /** Update an incident action. */
    updateIncidentAction(params: UpdateIncidentActionParams): Promise<void>;
    /** Mark an incident action as completed. */
    completeIncidentAction(params: CompleteIncidentActionParams): Promise<void>;
    /** Compliance: inspection history in date range with pass/fail counts. Optional asset/location filter. */
    complianceInspectionHistory(params: ComplianceInspectionHistoryParams): Promise<ComplianceInspectionHistoryRow[]>;
    /** Compliance: incident report in date range with action counts. Optional severity filter. */
    complianceIncidentReport(params: ComplianceIncidentReportParams): Promise<ComplianceIncidentReportRow[]>;
};
export type SafetyComplianceResource = ReturnType<typeof createSafetyComplianceResource>;
//# sourceMappingURL=safety-compliance.d.ts.map