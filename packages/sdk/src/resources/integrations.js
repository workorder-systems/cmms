import { normalizeError } from '../errors.js';
import { callRpc } from '../unwrap.js';
const rpc = (supabase) => supabase.rpc.bind(supabase);
/**
 * Integration mappings and outbound event queue. Requires `integration.manage` (typically admin).
 * Set tenant context before listing views.
 */
export function createIntegrationsResource(supabase) {
    return {
        async listExternalIds() {
            const { data, error } = await supabase.from('v_integration_external_ids').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        async listOutboundEvents(limit = 100) {
            const { data, error } = await supabase
                .from('v_outbound_integration_events')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        async upsertExternalId(params) {
            return callRpc(rpc(supabase), 'rpc_upsert_integration_external_id', {
                p_tenant_id: params.tenantId,
                p_entity_type: params.entityType,
                p_entity_id: params.entityId,
                p_system_key: params.systemKey,
                p_external_id: params.externalId,
                p_metadata: params.metadata ?? null,
            });
        },
        async deleteExternalId(tenantId, entityType, entityId, systemKey) {
            return callRpc(rpc(supabase), 'rpc_delete_integration_external_id', {
                p_tenant_id: tenantId,
                p_entity_type: entityType,
                p_entity_id: entityId,
                p_system_key: systemKey,
            });
        },
        async enqueueEvent(params) {
            return callRpc(rpc(supabase), 'rpc_enqueue_integration_event', {
                p_tenant_id: params.tenantId,
                p_event_type: params.eventType,
                p_payload: params.payload,
                p_entity_type: params.entityType ?? null,
                p_entity_id: params.entityId ?? null,
            });
        },
    };
}
