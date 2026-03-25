import { normalizeError } from '../errors.js';
import { callRpc } from '../unwrap.js';
const rpc = (supabase) => supabase.rpc.bind(supabase);
/**
 * Catalogs resource: statuses, priorities, maintenance types, and status transitions.
 * Uses v_status_catalogs, v_priority_catalogs, v_maintenance_type_catalogs, v_status_transitions and related RPCs.
 */
export function createCatalogsResource(supabase) {
    return {
        /** List status catalog entries for the current tenant (v_status_catalogs). */
        async listStatuses() {
            const { data, error } = await supabase.from('v_status_catalogs').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** List priority catalog entries for the current tenant (v_priority_catalogs). */
        async listPriorities() {
            const { data, error } = await supabase.from('v_priority_catalogs').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** List maintenance type catalog entries for the current tenant (v_maintenance_type_catalogs). */
        async listMaintenanceTypes() {
            const { data, error } = await supabase.from('v_maintenance_type_catalogs').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** List allowed status transitions for the current tenant (v_status_transitions). */
        async listStatusTransitions() {
            const { data, error } = await supabase.from('v_status_transitions').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** Create a status for an entity type. Requires tenant.admin. Returns status key (string). */
        async createStatus(params) {
            return callRpc(rpc(supabase), 'rpc_create_status', {
                p_tenant_id: params.tenantId,
                p_entity_type: params.entityType,
                p_key: params.key,
                p_name: params.name,
                p_category: params.category,
                p_color: params.color ?? null,
                p_display_order: params.displayOrder,
                p_icon: params.icon ?? null,
            });
        },
        /** Create a status transition. Requires tenant.admin. Returns transition id (string). */
        async createStatusTransition(params) {
            return callRpc(rpc(supabase), 'rpc_create_status_transition', {
                p_tenant_id: params.tenantId,
                p_entity_type: params.entityType,
                p_from_status_key: params.fromStatusKey,
                p_to_status_key: params.toStatusKey,
                p_required_permission: params.requiredPermission ?? null,
                p_guard_condition: params.guardCondition ?? null,
            });
        },
        /** Create a priority. Requires tenant.admin. Returns priority key (string). */
        async createPriority(params) {
            return callRpc(rpc(supabase), 'rpc_create_priority', {
                p_tenant_id: params.tenantId,
                p_entity_type: params.entityType,
                p_key: params.key,
                p_name: params.name,
                p_weight: params.weight,
                p_display_order: params.displayOrder,
                p_color: params.color ?? null,
            });
        },
        /** Create a maintenance type. Requires tenant.admin. Returns maintenance type key (string). */
        async createMaintenanceType(params) {
            return callRpc(rpc(supabase), 'rpc_create_maintenance_type', {
                p_tenant_id: params.tenantId,
                p_key: params.key,
                p_name: params.name,
                p_category: params.category,
                p_description: params.description ?? null,
                p_display_order: params.displayOrder ?? null,
                p_color: params.color ?? null,
                p_icon: params.icon ?? null,
            });
        },
        /** Get workflow graph for an entity type. Returns JSON graph of valid status transitions. */
        async getWorkflowGraph(tenantId, entityType) {
            return callRpc(rpc(supabase), 'rpc_get_workflow_graph', {
                p_tenant_id: tenantId,
                p_entity_type: entityType,
            });
        },
    };
}
