import { normalizeError } from '../errors.js';
import { callRpc } from '../unwrap.js';
const rpc = (supabase) => supabase.rpc.bind(supabase);
export function createDepartmentsResource(supabase) {
    return {
        async list() {
            const { data, error } = await supabase.from('v_departments').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        async getById(id) {
            const { data, error } = await supabase.from('v_departments').select('*').eq('id', id).maybeSingle();
            if (error)
                throw normalizeError(error);
            return data;
        },
        async create(params) {
            return callRpc(rpc(supabase), 'rpc_create_department', {
                p_tenant_id: params.tenantId,
                p_name: params.name,
                p_description: params.description ?? null,
                p_code: params.code ?? null,
            });
        },
        async update(params) {
            return callRpc(rpc(supabase), 'rpc_update_department', {
                p_tenant_id: params.tenantId,
                p_department_id: params.departmentId,
                p_name: params.name ?? null,
                p_description: params.description ?? null,
                p_code: params.code ?? null,
            });
        },
        async delete(tenantId, departmentId) {
            return callRpc(rpc(supabase), 'rpc_delete_department', { p_tenant_id: tenantId, p_department_id: departmentId });
        },
        /** Bulk import departments. Returns created ids and per-row errors. */
        async bulkImport(params) {
            const raw = await callRpc(rpc(supabase), 'rpc_bulk_import_departments', {
                p_tenant_id: params.tenantId,
                p_rows: params.rows,
            });
            const data = raw;
            return {
                created_ids: data.created_ids ?? [],
                errors: data.errors ?? [],
            };
        },
    };
}
