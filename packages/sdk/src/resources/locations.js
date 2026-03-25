import { normalizeError } from '../errors.js';
import { callRpc } from '../unwrap.js';
const rpc = (supabase) => supabase.rpc.bind(supabase);
export function createLocationsResource(supabase) {
    return {
        async list() {
            const { data, error } = await supabase.from('v_locations').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        async getById(id) {
            const { data, error } = await supabase.from('v_locations').select('*').eq('id', id).maybeSingle();
            if (error)
                throw normalizeError(error);
            return data;
        },
        async create(params) {
            return callRpc(rpc(supabase), 'rpc_create_location', {
                p_tenant_id: params.tenantId,
                p_name: params.name,
                p_description: params.description ?? null,
                p_parent_location_id: params.parentLocationId ?? null,
                p_location_type: params.locationType ?? 'site',
                p_code: params.code ?? null,
                p_address_line: params.addressLine ?? null,
                p_external_id: params.externalId ?? null,
                p_latitude: params.latitude ?? null,
                p_longitude: params.longitude ?? null,
            });
        },
        async update(params) {
            return callRpc(rpc(supabase), 'rpc_update_location', {
                p_tenant_id: params.tenantId,
                p_location_id: params.locationId,
                p_name: params.name ?? null,
                p_description: params.description ?? null,
                p_parent_location_id: params.parentLocationId ?? null,
                p_location_type: params.locationType ?? null,
                p_code: params.code ?? null,
                p_address_line: params.addressLine ?? null,
                p_external_id: params.externalId ?? null,
                p_latitude: params.latitude ?? null,
                p_longitude: params.longitude ?? null,
                p_clear_position: params.clearPosition ?? false,
            });
        },
        async delete(tenantId, locationId) {
            return callRpc(rpc(supabase), 'rpc_delete_location', { p_tenant_id: tenantId, p_location_id: locationId });
        },
        /** Bulk import locations. Returns created ids and per-row errors. */
        async bulkImport(params) {
            const rows = params.rows.map((r) => ({
                name: r.name,
                description: r.description ?? null,
                parent_location_id: r.parent_location_id ?? null,
                location_type: r.location_type ?? null,
                code: r.code ?? null,
                address_line: r.address_line ?? null,
                external_id: r.external_id ?? null,
            }));
            const raw = await callRpc(rpc(supabase), 'rpc_bulk_import_locations', {
                p_tenant_id: params.tenantId,
                p_rows: rows,
            });
            const data = raw;
            return {
                created_ids: data.created_ids ?? [],
                errors: data.errors ?? [],
            };
        },
    };
}
