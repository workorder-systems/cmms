import { normalizeError } from '../errors.js';
import { callRpc } from '../unwrap.js';
const rpc = (supabase) => supabase.rpc.bind(supabase);
/**
 * Tenants resource: list tenants, create tenant, invite users, assign roles.
 * Set tenant context (client.setTenant) before other tenant-scoped operations.
 */
export function createTenantsResource(supabase) {
    return {
        /** List tenants the current user is a member of (v_tenants). */
        async list() {
            const { data, error } = await supabase.from('v_tenants').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** Get a single tenant by id. */
        async getById(id) {
            const { data, error } = await supabase.from('v_tenants').select('*').eq('id', id).maybeSingle();
            if (error)
                throw normalizeError(error);
            return data;
        },
        /** Create a new tenant. Returns the new tenant UUID. */
        async create(params) {
            return callRpc(rpc(supabase), 'rpc_create_tenant', {
                p_name: params.name,
                p_slug: params.slug,
            });
        },
        /** Invite a user to a tenant with a role. */
        async inviteUser(params) {
            return callRpc(rpc(supabase), 'rpc_invite_user_to_tenant', {
                p_tenant_id: params.tenantId,
                p_invitee_email: params.inviteeEmail,
                p_role_key: params.roleKey,
            });
        },
        /** Assign a role to a user in a tenant. */
        async assignRole(params) {
            return callRpc(rpc(supabase), 'rpc_assign_role_to_user', {
                p_tenant_id: params.tenantId,
                p_user_id: params.userId,
                p_role_key: params.roleKey,
            });
        },
        /** Remove a user from a tenant. Requires tenant.member.remove permission. Caller cannot remove themselves. */
        async removeMember(params) {
            return callRpc(rpc(supabase), 'rpc_remove_member_from_tenant', {
                p_tenant_id: params.tenantId,
                p_user_id: params.userId,
            });
        },
    };
}
