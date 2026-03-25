import { normalizeError } from '../errors.js';
import { callRpc } from '../unwrap.js';
const rpc = (supabase) => supabase.rpc.bind(supabase);
/**
 * Mobile field resource: offline sync payload, start/stop job, add note, register attachment,
 * and lightweight list methods for v_mobile_* views. Set tenant context before use.
 */
export function createMobileFieldResource(supabase) {
    return {
        /**
         * Fetch a single JSON payload for mobile offline sync. Returns work_orders, assets, locations,
         * time_entries, attachments, check_ins, and notes. Use updatedAfter for incremental sync.
         */
        async sync(params) {
            const raw = await callRpc(rpc(supabase), 'rpc_mobile_sync', {
                p_tenant_id: params.tenantId,
                p_updated_after: params.updatedAfter ?? null,
                p_limit: params.limit ?? 500,
                p_technician_id: params.technicianId ?? null,
            });
            return raw;
        },
        /** Start a work order: transition to in_progress and create a check-in. Returns check-in id. */
        async startWorkOrder(params) {
            return callRpc(rpc(supabase), 'rpc_start_work_order', {
                p_tenant_id: params.tenantId,
                p_work_order_id: params.workOrderId,
                p_latitude: params.latitude ?? null,
                p_longitude: params.longitude ?? null,
                p_accuracy_metres: params.accuracyMetres ?? null,
            });
        },
        /** Stop work: optionally log time, add note, and/or complete the work order with cause/resolution and GPS. */
        async stopWorkOrder(params) {
            return callRpc(rpc(supabase), 'rpc_stop_work_order', {
                p_tenant_id: params.tenantId,
                p_work_order_id: params.workOrderId,
                p_complete: params.complete ?? true,
                p_minutes: params.minutes ?? null,
                p_note: params.note ?? null,
                p_latitude: params.latitude ?? null,
                p_longitude: params.longitude ?? null,
                p_accuracy_metres: params.accuracyMetres ?? null,
                p_cause: params.cause ?? null,
                p_resolution: params.resolution ?? null,
            });
        },
        /** Add a note to a work order. Returns note id. */
        async addNote(params) {
            return callRpc(rpc(supabase), 'rpc_add_work_order_note', {
                p_tenant_id: params.tenantId,
                p_work_order_id: params.workOrderId,
                p_body: params.body,
                p_latitude: params.latitude ?? null,
                p_longitude: params.longitude ?? null,
            });
        },
        /** Register an existing file (e.g. uploaded to Storage first) as an attachment on any supported entity. Returns attachment id. */
        async registerEntityAttachment(params) {
            return callRpc(rpc(supabase), 'rpc_register_entity_attachment', {
                p_tenant_id: params.tenantId,
                p_entity_type: params.entityType,
                p_entity_id: params.entityId,
                p_file_id: params.fileId,
                p_label: params.label ?? null,
                p_kind: params.kind ?? null,
            });
        },
        /** List minimal work orders for mobile (v_mobile_work_orders). Use updated_at for incremental sync. */
        async listMobileWorkOrders() {
            const { data, error } = await supabase.from('v_mobile_work_orders').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** List minimal assets for mobile (v_mobile_assets). */
        async listMobileAssets() {
            const { data, error } = await supabase.from('v_mobile_assets').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** List minimal locations for mobile (v_mobile_locations). */
        async listMobileLocations() {
            const { data, error } = await supabase.from('v_mobile_locations').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** List minimal time entries for mobile (v_mobile_work_order_time_entries). */
        async listMobileTimeEntries() {
            const { data, error } = await supabase.from('v_mobile_work_order_time_entries').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** List minimal work order attachments for mobile (v_mobile_work_order_attachments). */
        async listMobileAttachments() {
            const { data, error } = await supabase.from('v_mobile_work_order_attachments').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** List check-ins for mobile (v_mobile_work_order_check_ins). */
        async listMobileCheckIns() {
            const { data, error } = await supabase.from('v_mobile_work_order_check_ins').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** List work order notes for mobile (v_mobile_work_order_notes). */
        async listMobileNotes() {
            const { data, error } = await supabase.from('v_mobile_work_order_notes').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
    };
}
