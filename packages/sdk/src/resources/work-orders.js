import { normalizeError } from '../errors.js';
import { callRpc } from '../unwrap.js';
const rpc = (supabase) => supabase.rpc.bind(supabase);
/**
 * Work orders resource: list, get, create, portal requests, SLA views/RPCs, transition status, complete, log time, attachments.
 * Set tenant context (client.setTenant) before tenant-scoped operations.
 */
export function createWorkOrdersResource(supabase) {
    return {
        /** List work orders for the current tenant (v_work_orders). Excludes draft by default to reduce noise; use listIncludingDraft() if needed. */
        async list() {
            const { data, error } = await supabase.from('v_work_orders').select('*').neq('status', 'draft');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** List work orders including draft (v_work_orders). Use when the caller needs draft work orders. */
        async listIncludingDraft() {
            const { data, error } = await supabase.from('v_work_orders').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** Get a single work order by id. */
        async getById(id) {
            const { data, error } = await supabase.from('v_work_orders').select('*').eq('id', id).maybeSingle();
            if (error)
                throw normalizeError(error);
            return data;
        },
        async listSummary(options) {
            const limit = Math.min(Math.max(options?.limit ?? 50, 1), 200);
            let query = supabase
                .from('v_work_orders')
                .select('id,title,status,priority,due_date,assigned_to,assigned_to_name,asset_id,location_id,project_id,updated_at')
                .order('updated_at', { ascending: false })
                .limit(limit);
            if (!options?.includeDraft) {
                query = query.neq('status', 'draft');
            }
            const { data, error } = await query;
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        async getSummary(id) {
            const { data, error } = await supabase
                .from('v_work_orders')
                .select('id,title,status,priority,due_date,assigned_to,assigned_to_name,asset_id,location_id,project_id,description,updated_at')
                .eq('id', id)
                .maybeSingle();
            if (error)
                throw normalizeError(error);
            return data;
        },
        /** Create a work order. Returns the new work order UUID. */
        async create(params) {
            return callRpc(rpc(supabase), 'rpc_create_work_order', {
                p_tenant_id: params.tenantId,
                p_title: params.title,
                p_description: params.description ?? null,
                p_priority: params.priority ?? 'medium',
                p_maintenance_type: params.maintenanceType ?? null,
                p_assigned_to: params.assignedTo ?? null,
                p_location_id: params.locationId ?? null,
                p_asset_id: params.assetId ?? null,
                p_due_date: params.dueDate ?? null,
                p_pm_schedule_id: params.pmScheduleId ?? null,
                p_project_id: params.projectId ?? null,
                p_client_request_id: params.clientRequestId ?? null,
            });
        },
        /** Bulk import work orders. Status/priority set on insert (no transition). Returns created ids and per-row errors. */
        async bulkImport(params) {
            const raw = await callRpc(rpc(supabase), 'rpc_bulk_import_work_orders', {
                p_tenant_id: params.tenantId,
                p_rows: params.rows,
            });
            const data = raw;
            return {
                created_ids: data.created_ids ?? [],
                errors: data.errors ?? [],
            };
        },
        /** Transition work order to a new status. */
        async transitionStatus(params) {
            return callRpc(rpc(supabase), 'rpc_transition_work_order_status', {
                p_tenant_id: params.tenantId,
                p_work_order_id: params.workOrderId,
                p_to_status_key: params.toStatusKey,
            });
        },
        /** Complete a work order (transition to completed). */
        async complete(params) {
            return callRpc(rpc(supabase), 'rpc_complete_work_order', {
                p_tenant_id: params.tenantId,
                p_work_order_id: params.workOrderId,
                p_cause: params.cause ?? null,
                p_resolution: params.resolution ?? null,
            });
        },
        /** Log time on a work order. Optional GPS (latitude, longitude, accuracyMetres) for mobile. Returns the time entry UUID. */
        async logTime(params) {
            return callRpc(rpc(supabase), 'rpc_log_work_order_time', {
                p_tenant_id: params.tenantId,
                p_work_order_id: params.workOrderId,
                p_minutes: params.minutes,
                p_entry_date: params.entryDate ?? null,
                p_user_id: params.userId ?? null,
                p_description: params.description ?? null,
                p_latitude: params.latitude ?? null,
                p_longitude: params.longitude ?? null,
                p_accuracy_metres: params.accuracyMetres ?? null,
            });
        },
        /** Update label and/or kind for a work order attachment. Attachments are created by uploading to Storage bucket "attachments"; use listAttachments to get ids. */
        async updateAttachmentMetadata(params) {
            return callRpc(rpc(supabase), 'rpc_update_entity_attachment_metadata', {
                p_attachment_id: params.attachmentId,
                p_label: params.label ?? null,
                p_kind: params.kind ?? null,
            });
        },
        /** List attachments for a work order (v_work_order_attachments). Use bucket_id and storage_path with supabase.storage.from(bucket_id).createSignedUrl(storage_path) for download. */
        async listAttachments(workOrderId) {
            const { data, error } = await supabase
                .from('v_work_order_attachments')
                .select('*')
                .eq('work_order_id', workOrderId);
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** Portal: submit a request (same as end-user CMMS request form). Returns new work order UUID. */
        async createRequest(params) {
            return callRpc(rpc(supabase), 'rpc_create_work_order_request', {
                p_tenant_id: params.tenantId,
                p_title: params.title,
                p_description: params.description ?? null,
                p_priority: params.priority ?? 'medium',
                p_maintenance_type: params.maintenanceType ?? null,
                p_location_id: params.locationId ?? null,
                p_asset_id: params.assetId ?? null,
                p_due_date: params.dueDate ?? null,
            });
        },
        /** Portal: list work orders the current user submitted (`v_my_work_order_requests`). Requires `workorder.request.view.own`. */
        async listMyRequests() {
            const { data, error } = await supabase.from('v_my_work_order_requests').select('*').order('created_at', {
                ascending: false,
            });
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** Maintenance requests for the tenant (`v_maintenance_requests`). */
        async listMaintenanceRequests() {
            const { data, error } = await supabase.from('v_maintenance_requests').select('*').order('created_at', {
                ascending: false,
            });
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** Portal: maintenance requests created by the current user (`v_my_maintenance_requests`). */
        async listMyMaintenanceRequests() {
            const { data, error } = await supabase.from('v_my_maintenance_requests').select('*').order('created_at', {
                ascending: false,
            });
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** Create a maintenance request row only (draft or submitted). Returns request id. */
        async createMaintenanceRequest(params) {
            return callRpc(rpc(supabase), 'rpc_create_maintenance_request', {
                p_tenant_id: params.tenantId,
                p_title: params.title,
                p_description: params.description ?? null,
                p_priority: params.priority ?? 'medium',
                p_maintenance_type: params.maintenanceType ?? null,
                p_location_id: params.locationId ?? null,
                p_asset_id: params.assetId ?? null,
                p_due_date: params.dueDate ?? null,
                p_status: params.status ?? 'submitted',
            });
        },
        /** Convert a submitted maintenance request to a work order (`rpc_convert_maintenance_request_to_work_order`). Requires `workorder.edit`. */
        async convertMaintenanceRequestToWorkOrder(tenantId, requestId) {
            return callRpc(rpc(supabase), 'rpc_convert_maintenance_request_to_work_order', {
                p_tenant_id: tenantId,
                p_request_id: requestId,
            });
        },
        /** SLA dashboard: all work orders in the tenant with breach flags (`v_work_order_sla_status`). */
        async listSlaStatus() {
            const { data, error } = await supabase.from('v_work_order_sla_status').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** Coordinator queue: non-final work orders that have SLA due times (`v_work_orders_sla_open`). */
        async listSlaOpenQueue() {
            const { data, error } = await supabase.from('v_work_orders_sla_open').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** Communication events for a work order (`v_work_order_comms`). */
        async listComms(workOrderId) {
            const { data, error } = await supabase
                .from('v_work_order_comms')
                .select('*')
                .eq('work_order_id', workOrderId)
                .order('created_at', { ascending: true });
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** Append a communication event (`rpc_add_work_order_comms_event`). */
        async addCommsEvent(params) {
            return callRpc(rpc(supabase), 'rpc_add_work_order_comms_event', {
                p_tenant_id: params.tenantId,
                p_work_order_id: params.workOrderId,
                p_body: params.body,
                p_channel: params.channel ?? null,
                p_metadata: params.metadata ?? null,
            });
        },
        /** SLA status for a single work order, or null if not visible. */
        async getSlaStatus(workOrderId) {
            const { data, error } = await supabase
                .from('v_work_order_sla_status')
                .select('*')
                .eq('work_order_id', workOrderId)
                .maybeSingle();
            if (error)
                throw normalizeError(error);
            return data;
        },
        /** First response / acknowledgment for SLA. */
        async acknowledge(params) {
            await callRpc(rpc(supabase), 'rpc_acknowledge_work_order', {
                p_tenant_id: params.tenantId,
                p_work_order_id: params.workOrderId,
            });
        },
        /** Admin: create or update SLA rule for priority (+ optional maintenance type). Returns rule UUID. */
        async upsertSlaRule(params) {
            return callRpc(rpc(supabase), 'rpc_upsert_work_order_sla_rule', {
                p_tenant_id: params.tenantId,
                p_priority_key: params.priorityKey,
                p_maintenance_type_key: params.maintenanceTypeKey ?? null,
                p_response_interval: params.responseInterval ?? null,
                p_resolution_interval: params.resolutionInterval ?? null,
                p_is_active: params.isActive ?? null,
                p_rule_id: params.ruleId ?? null,
            });
        },
    };
}
