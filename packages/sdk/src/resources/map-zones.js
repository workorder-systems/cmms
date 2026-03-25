import { normalizeError } from '../errors.js';
import { callRpc } from '../unwrap.js';
const rpc = (supabase) => supabase.rpc.bind(supabase);
export function createMapZonesResource(supabase) {
    return {
        async list() {
            const { data, error } = await supabase.from('v_map_zones').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        async getById(id) {
            const { data, error } = await supabase.from('v_map_zones').select('*').eq('id', id).maybeSingle();
            if (error)
                throw normalizeError(error);
            return data;
        },
        async create(params) {
            return callRpc(rpc(supabase), 'rpc_create_map_zone', {
                p_tenant_id: params.tenantId,
                p_name: params.name,
                p_geometry: params.geometry,
                p_location_id: params.locationId ?? null,
            });
        },
        async update(params) {
            return callRpc(rpc(supabase), 'rpc_update_map_zone', {
                p_tenant_id: params.tenantId,
                p_zone_id: params.zoneId,
                p_name: params.name ?? null,
                p_geometry: params.geometry ?? null,
                p_location_id: params.locationId ?? null,
            });
        },
        async delete(tenantId, zoneId) {
            return callRpc(rpc(supabase), 'rpc_delete_map_zone', {
                p_tenant_id: tenantId,
                p_zone_id: zoneId,
            });
        },
    };
}
