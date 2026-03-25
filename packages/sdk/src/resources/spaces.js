import { normalizeError } from '../errors.js';
import { callRpc } from '../unwrap.js';
const rpc = (supabase) => supabase.rpc.bind(supabase);
export function createSpacesResource(supabase) {
    return {
        async list() {
            const { data, error } = await supabase.from('v_spaces').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        async getById(id) {
            const { data, error } = await supabase.from('v_spaces').select('*').eq('id', id).maybeSingle();
            if (error)
                throw normalizeError(error);
            return data;
        },
        async getByLocationId(locationId) {
            const { data, error } = await supabase.from('v_spaces').select('*').eq('location_id', locationId).maybeSingle();
            if (error)
                throw normalizeError(error);
            return data;
        },
        async create(params) {
            return callRpc(rpc(supabase), 'rpc_create_space', {
                p_tenant_id: params.tenantId,
                p_location_id: params.locationId,
                p_usage_type: params.usageType ?? null,
                p_capacity: params.capacity ?? null,
                p_status: params.status ?? 'available',
                p_area_sqft: params.areaSqft ?? null,
                p_attributes: params.attributes ?? null,
            });
        },
        async update(params) {
            return callRpc(rpc(supabase), 'rpc_update_space', {
                p_tenant_id: params.tenantId,
                p_space_id: params.spaceId,
                p_usage_type: params.usageType ?? null,
                p_capacity: params.capacity ?? null,
                p_status: params.status ?? null,
                p_area_sqft: params.areaSqft ?? null,
                p_attributes: params.attributes ?? null,
            });
        },
        async delete(tenantId, spaceId) {
            return callRpc(rpc(supabase), 'rpc_delete_space', { p_tenant_id: tenantId, p_space_id: spaceId });
        },
    };
}
