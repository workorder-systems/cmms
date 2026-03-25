import { normalizeError } from '../errors.js';
import { callRpc } from '../unwrap.js';
const rpc = (supabase) => supabase.rpc.bind(supabase);
export function createTenantApiKeysResource(supabase) {
    return {
        /**
         * Create a new tenant-scoped API key. The raw key is returned once and cannot be retrieved later.
         * Requires tenant.admin. Rate limited to 10/minute per user per tenant.
         */
        async create(tenantId, name) {
            const raw = await callRpc(rpc(supabase), 'rpc_create_tenant_api_key', {
                p_tenant_id: tenantId,
                p_name: name,
            });
            return raw;
        },
        /**
         * List API keys for the tenant (metadata only; no secrets).
         * Requires tenant.admin.
         */
        async list(tenantId) {
            const { data, error } = await supabase.rpc('rpc_list_tenant_api_keys', {
                p_tenant_id: tenantId,
            });
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /**
         * Revoke (delete) a tenant API key. Requires tenant.admin.
         */
        async revoke(tenantId, keyId) {
            return callRpc(rpc(supabase), 'rpc_revoke_tenant_api_key', {
                p_tenant_id: tenantId,
                p_key_id: keyId,
            });
        },
    };
}
