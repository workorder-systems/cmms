import { normalizeError } from '../errors.js';
import { callRpc } from '../unwrap.js';
const rpc = (supabase) => supabase.rpc.bind(supabase);
/**
 * Safety and compliance resource: inspection templates, schedules, runs, incidents, and corrective actions.
 * Uses v_inspection_* and v_incident* views and related RPCs. Set tenant context before listing or calling RPCs.
 */
export function createSafetyComplianceResource(supabase) {
    return {
        /** List inspection templates for the current tenant (v_inspection_templates). */
        async listTemplates() {
            const { data, error } = await supabase.from('v_inspection_templates').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** List inspection template checklist items (v_inspection_template_items). */
        async listTemplateItems() {
            const { data, error } = await supabase.from('v_inspection_template_items').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** List inspection schedules (v_inspection_schedules). */
        async listSchedules() {
            const { data, error } = await supabase.from('v_inspection_schedules').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** List inspection runs (v_inspection_runs). */
        async listRuns() {
            const { data, error } = await supabase.from('v_inspection_runs').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** List inspection run items (v_inspection_run_items). */
        async listRunItems() {
            const { data, error } = await supabase.from('v_inspection_run_items').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** List incidents (v_incidents). */
        async listIncidents() {
            const { data, error } = await supabase.from('v_incidents').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** List incident actions (v_incident_actions). */
        async listIncidentActions() {
            const { data, error } = await supabase.from('v_incident_actions').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** Create an inspection template. Requires tenant.admin. Returns template UUID. */
        async createTemplate(params) {
            return callRpc(rpc(supabase), 'rpc_create_inspection_template', {
                p_tenant_id: params.tenantId,
                p_name: params.name,
                p_description: params.description ?? null,
                p_category: params.category ?? null,
                p_trigger_config: params.triggerConfig ?? null,
                p_checklist_items: params.checklistItems?.map((item) => ({
                    description: item.description,
                    required: item.required ?? false,
                })) ?? null,
            });
        },
        /** Update an inspection template. Requires tenant.admin. */
        async updateTemplate(params) {
            return callRpc(rpc(supabase), 'rpc_update_inspection_template', {
                p_tenant_id: params.tenantId,
                p_template_id: params.templateId,
                p_name: params.name ?? null,
                p_description: params.description ?? null,
                p_category: params.category ?? null,
                p_trigger_config: params.triggerConfig ?? null,
                p_checklist_items: params.checklistItems?.map((item) => ({
                    description: item.description,
                    required: item.required ?? false,
                })) ?? null,
            });
        },
        /** Create an inspection schedule. Returns schedule UUID. At least one of assetId or locationId required. */
        async createSchedule(params) {
            return callRpc(rpc(supabase), 'rpc_create_inspection_schedule', {
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
        async updateSchedule(params) {
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
        async createRun(params) {
            return callRpc(rpc(supabase), 'rpc_create_inspection_run', {
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
        async updateRun(params) {
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
        async completeRun(params) {
            return callRpc(rpc(supabase), 'rpc_complete_inspection_run', {
                p_tenant_id: params.tenantId,
                p_run_id: params.runId,
                p_item_results: params.itemResults ?? null,
            });
        },
        /** Create an incident. Returns incident UUID. */
        async createIncident(params) {
            return callRpc(rpc(supabase), 'rpc_create_incident', {
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
        async updateIncident(params) {
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
        async closeIncident(params) {
            return callRpc(rpc(supabase), 'rpc_close_incident', {
                p_tenant_id: params.tenantId,
                p_incident_id: params.incidentId,
                p_status: params.status ?? 'closed',
            });
        },
        /** Create a corrective/preventive/containment action for an incident. Returns action UUID. */
        async createIncidentAction(params) {
            return callRpc(rpc(supabase), 'rpc_create_incident_action', {
                p_tenant_id: params.tenantId,
                p_incident_id: params.incidentId,
                p_description: params.description,
                p_action_type: params.actionType ?? 'corrective',
                p_due_date: params.dueDate ?? null,
                p_assigned_to: params.assignedTo ?? null,
            });
        },
        /** Update an incident action. */
        async updateIncidentAction(params) {
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
        async completeIncidentAction(params) {
            return callRpc(rpc(supabase), 'rpc_complete_incident_action', {
                p_tenant_id: params.tenantId,
                p_action_id: params.actionId,
            });
        },
        /** Compliance: inspection history in date range with pass/fail counts. Optional asset/location filter. */
        async complianceInspectionHistory(params) {
            const { data, error } = await rpc(supabase)('rpc_compliance_inspection_history', {
                p_tenant_id: params.tenantId,
                p_from_date: params.fromDate,
                p_to_date: params.toDate,
                p_asset_id: params.assetId ?? null,
                p_location_id: params.locationId ?? null,
            });
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** Compliance: incident report in date range with action counts. Optional severity filter. */
        async complianceIncidentReport(params) {
            const { data, error } = await rpc(supabase)('rpc_compliance_incident_report', {
                p_tenant_id: params.tenantId,
                p_from_date: params.fromDate,
                p_to_date: params.toDate,
                p_severity: params.severity ?? null,
            });
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
    };
}
