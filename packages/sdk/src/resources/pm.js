import { normalizeError } from '../errors.js';
import { callRpc } from '../unwrap.js';
const rpc = (supabase) => supabase.rpc.bind(supabase);
/**
 * PM resource: templates, schedules, due/overdue/upcoming PMs, and history.
 * Uses v_pm_templates, v_pm_template_checklist_items, v_pm_schedules, v_due_pms, v_overdue_pms, v_upcoming_pms, v_pm_history
 * and related RPCs.
 */
export function createPmResource(supabase) {
    return {
        /** List PM templates for the current tenant (v_pm_templates). */
        async listTemplates() {
            const { data, error } = await supabase.from('v_pm_templates').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** List checklist items across templates (v_pm_template_checklist_items). */
        async listTemplateChecklistItems() {
            const { data, error } = await supabase.from('v_pm_template_checklist_items').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** List PM schedules for the current tenant (v_pm_schedules). */
        async listSchedules() {
            const { data, error } = await supabase.from('v_pm_schedules').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** List due PMs (v_due_pms). */
        async listDue() {
            const { data, error } = await supabase.from('v_due_pms').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** List overdue PMs (v_overdue_pms). */
        async listOverdue() {
            const { data, error } = await supabase.from('v_overdue_pms').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** List upcoming PMs (v_upcoming_pms). */
        async listUpcoming() {
            const { data, error } = await supabase.from('v_upcoming_pms').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** List PM history (v_pm_history). */
        async listHistory() {
            const { data, error } = await supabase.from('v_pm_history').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** Create a PM template. Returns template UUID. */
        async createTemplate(params) {
            return callRpc(rpc(supabase), 'rpc_create_pm_template', {
                p_tenant_id: params.tenantId,
                p_name: params.name,
                p_trigger_type: params.triggerType,
                p_trigger_config: params.triggerConfig,
                p_description: params.description ?? null,
                p_estimated_hours: params.estimatedHours ?? null,
                p_wo_title: params.workOrderTitle ?? null,
                p_wo_description: params.workOrderDescription ?? null,
                p_wo_estimated_hours: params.workOrderEstimatedHours ?? null,
                p_wo_priority: params.workOrderPriority ?? null,
                p_checklist_items: params.checklistItems ?? null,
            });
        },
        /** Update a PM template. */
        async updateTemplate(params) {
            return callRpc(rpc(supabase), 'rpc_update_pm_template', {
                p_tenant_id: params.tenantId,
                p_template_id: params.templateId,
                p_name: params.name ?? null,
                p_trigger_config: params.triggerConfig ?? null,
                p_description: params.description ?? null,
                p_estimated_hours: params.estimatedHours ?? null,
                p_wo_title: params.workOrderTitle ?? null,
                p_wo_description: params.workOrderDescription ?? null,
                p_wo_estimated_hours: params.workOrderEstimatedHours ?? null,
                p_wo_priority: params.workOrderPriority ?? null,
                p_checklist_items: params.checklistItems ?? null,
            });
        },
        /** Create a PM schedule. Returns schedule UUID. */
        async createSchedule(params) {
            return callRpc(rpc(supabase), 'rpc_create_pm_schedule', {
                p_tenant_id: params.tenantId,
                p_asset_id: params.assetId,
                p_title: params.title,
                p_trigger_type: params.triggerType,
                p_trigger_config: params.triggerConfig,
                p_description: params.description ?? null,
                p_estimated_hours: params.estimatedHours ?? null,
                p_auto_generate: params.autoGenerate ?? null,
                p_wo_title: params.workOrderTitle ?? null,
                p_wo_description: params.workOrderDescription ?? null,
                p_wo_estimated_hours: params.workOrderEstimatedHours ?? null,
                p_wo_priority: params.workOrderPriority ?? null,
                p_template_id: params.templateId ?? null,
            });
        },
        /** Update a PM schedule. */
        async updateSchedule(params) {
            return callRpc(rpc(supabase), 'rpc_update_pm_schedule', {
                p_tenant_id: params.tenantId,
                p_pm_schedule_id: params.pmScheduleId,
                p_title: params.title ?? null,
                p_trigger_config: params.triggerConfig ?? null,
                p_description: params.description ?? null,
                p_estimated_hours: params.estimatedHours ?? null,
                p_is_active: params.isActive ?? null,
                p_auto_generate: params.autoGenerate ?? null,
                p_wo_title: params.workOrderTitle ?? null,
                p_wo_description: params.workOrderDescription ?? null,
                p_wo_estimated_hours: params.workOrderEstimatedHours ?? null,
                p_wo_priority: params.workOrderPriority ?? null,
            });
        },
        /** Delete a PM schedule. */
        async deleteSchedule(params) {
            return callRpc(rpc(supabase), 'rpc_delete_pm_schedule', {
                p_tenant_id: params.tenantId,
                p_pm_schedule_id: params.pmScheduleId,
            });
        },
        /** Create a PM dependency (schedule depends on another PM). Returns dependency UUID. */
        async createDependency(params) {
            return callRpc(rpc(supabase), 'rpc_create_pm_dependency', {
                p_tenant_id: params.tenantId,
                p_pm_schedule_id: params.pmScheduleId,
                p_depends_on_pm_id: params.dependsOnPmId,
                p_dependency_type: params.dependencyType ?? null,
            });
        },
        /** Generate due PMs. Returns number of generated PMs. */
        async generateDuePms(params) {
            return callRpc(rpc(supabase), 'rpc_generate_due_pms', {
                p_tenant_id: params.tenantId,
                p_limit: params.limit ?? null,
            });
        },
        /** Trigger a manual PM for a schedule. Returns work order UUID. */
        async triggerManualPm(params) {
            return callRpc(rpc(supabase), 'rpc_trigger_manual_pm', {
                p_tenant_id: params.tenantId,
                p_pm_schedule_id: params.pmScheduleId,
            });
        },
    };
}
