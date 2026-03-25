import { normalizeError } from '../errors.js';
import { callRpc } from '../unwrap.js';
const rpc = (supabase) => supabase.rpc.bind(supabase);
/**
 * Field operations: tool catalog (CRUD via RPC + list view), checkouts/returns, shift handover logbook.
 */
export function createFieldOperationsResource(supabase) {
    return {
        /** Requires `tool.manage`. Returns new tool UUID. */
        async createTool(params) {
            return callRpc(rpc(supabase), 'rpc_create_tool', {
                p_tenant_id: params.tenantId,
                p_name: params.name,
                p_asset_tag: params.assetTag ?? null,
                p_serial_number: params.serialNumber ?? null,
                p_status: params.status ?? null,
            });
        },
        /** Requires `tool.manage`. Cannot set non-`available` status while the tool has an open checkout. */
        async updateTool(params) {
            await callRpc(rpc(supabase), 'rpc_update_tool', {
                p_tenant_id: params.tenantId,
                p_tool_id: params.toolId,
                p_name: params.name ?? null,
                p_asset_tag: params.assetTag ?? null,
                p_serial_number: params.serialNumber ?? null,
                p_status: params.status ?? null,
            });
        },
        async listTools() {
            const { data, error } = await supabase.from('v_tools').select('*').order('name');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        async listToolCheckouts() {
            const { data, error } = await supabase.from('v_tool_checkouts').select('*').order('checked_out_at', {
                ascending: false,
            });
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        async listShiftHandovers() {
            const { data, error } = await supabase.from('v_shift_handovers').select('*').order('created_at', {
                ascending: false,
            });
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        async checkoutTool(params) {
            return callRpc(rpc(supabase), 'rpc_checkout_tool', {
                p_tenant_id: params.tenantId,
                p_tool_id: params.toolId,
                p_checked_out_to_user_id: params.checkedOutToUserId,
                p_work_order_id: params.workOrderId ?? null,
                p_due_at: params.dueAt ?? null,
                p_notes: params.notes ?? null,
            });
        },
        async returnTool(params) {
            await callRpc(rpc(supabase), 'rpc_return_tool', {
                p_tenant_id: params.tenantId,
                p_checkout_id: params.checkoutId,
            });
        },
        async createShiftHandover(params) {
            return callRpc(rpc(supabase), 'rpc_create_shift_handover', {
                p_tenant_id: params.tenantId,
                p_location_id: params.locationId,
                p_to_user_id: params.toUserId,
                p_shift_started_at: params.shiftStartedAt,
                p_shift_ended_at: params.shiftEndedAt,
                p_summary: params.summary ?? null,
            });
        },
        async submitShiftHandover(params) {
            await callRpc(rpc(supabase), 'rpc_submit_shift_handover', {
                p_tenant_id: params.tenantId,
                p_handover_id: params.handoverId,
            });
        },
        async acknowledgeShiftHandover(params) {
            await callRpc(rpc(supabase), 'rpc_acknowledge_shift_handover', {
                p_tenant_id: params.tenantId,
                p_handover_id: params.handoverId,
            });
        },
        async addShiftHandoverItem(params) {
            return callRpc(rpc(supabase), 'rpc_add_shift_handover_item', {
                p_tenant_id: params.tenantId,
                p_handover_id: params.handoverId,
                p_body: params.body,
                p_priority: params.priority ?? null,
                p_work_order_id: params.workOrderId ?? null,
            });
        },
    };
}
