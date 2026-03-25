import { normalizeError } from '../errors.js';
import { callRpc } from '../unwrap.js';
const rpc = (supabase) => supabase.rpc.bind(supabase);
export function createMetersResource(supabase) {
    return {
        async list() {
            const { data, error } = await supabase.from('v_asset_meters').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        async getReadings() {
            const { data, error } = await supabase.from('v_meter_readings').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        async create(params) {
            return callRpc(rpc(supabase), 'rpc_create_meter', {
                p_tenant_id: params.tenantId,
                p_asset_id: params.assetId,
                p_meter_type: params.meterType,
                p_name: params.name,
                p_unit: params.unit,
                p_current_reading: params.currentReading ?? 0,
                p_reading_direction: params.readingDirection ?? 'increasing',
                p_decimal_places: params.decimalPlaces ?? 0,
                p_description: params.description ?? null,
            });
        },
        async update(params) {
            return callRpc(rpc(supabase), 'rpc_update_meter', {
                p_tenant_id: params.tenantId,
                p_meter_id: params.meterId,
                p_name: params.name ?? null,
                p_unit: params.unit ?? null,
                p_reading_direction: params.readingDirection ?? null,
                p_decimal_places: params.decimalPlaces ?? null,
                p_description: params.description ?? null,
                p_is_active: params.isActive ?? null,
            });
        },
        async recordReading(params) {
            return callRpc(rpc(supabase), 'rpc_record_meter_reading', {
                p_tenant_id: params.tenantId,
                p_meter_id: params.meterId,
                p_reading_value: params.readingValue,
                p_reading_date: params.readingDate ?? null,
                p_reading_type: params.readingType ?? 'manual',
                p_notes: params.notes ?? null,
            });
        },
        async delete(tenantId, meterId) {
            return callRpc(rpc(supabase), 'rpc_delete_meter', { p_tenant_id: tenantId, p_meter_id: meterId });
        },
    };
}
