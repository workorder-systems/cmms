import { normalizeError } from '../errors.js';
import { callRpc } from '../unwrap.js';
const rpc = (supabase) => supabase.rpc.bind(supabase);
export function createProjectsResource(supabase) {
    return {
        /** List projects for the current tenant. */
        async list() {
            const { data, error } = await supabase.from('v_projects').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** Get a project by id. */
        async getById(id) {
            const { data, error } = await supabase.from('v_projects').select('*').eq('id', id).maybeSingle();
            if (error)
                throw normalizeError(error);
            return data;
        },
        /** Create a project. Requires project.manage. Returns project id. */
        async create(params) {
            return callRpc(rpc(supabase), 'rpc_create_project', {
                p_tenant_id: params.tenantId,
                p_name: params.name,
                p_code: params.code ?? null,
                p_description: params.description ?? null,
            });
        },
        /** Update a project. Requires project.manage. */
        async update(params) {
            return callRpc(rpc(supabase), 'rpc_update_project', {
                p_tenant_id: params.tenantId,
                p_project_id: params.projectId,
                p_name: params.name ?? null,
                p_code: params.code ?? null,
                p_description: params.description ?? null,
            });
        },
        /** Delete a project. Requires project.manage. */
        async delete(tenantId, projectId) {
            return callRpc(rpc(supabase), 'rpc_delete_project', {
                p_tenant_id: tenantId,
                p_project_id: projectId,
            });
        },
    };
}
