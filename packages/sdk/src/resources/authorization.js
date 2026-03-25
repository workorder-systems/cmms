import { normalizeError } from '../errors.js';
import { callRpc } from '../unwrap.js';
const rpc = (supabase) => supabase.rpc.bind(supabase);
/**
 * Authorization resource: permissions, roles, scopes, and checks.
 * Uses v_permissions, v_role_permissions, v_tenant_roles, v_user_tenant_roles, v_profiles and related RPCs.
 */
export function createAuthorizationResource(supabase) {
    return {
        /** List global permissions (v_permissions). */
        async listPermissions() {
            const { data, error } = await supabase.from('v_permissions').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** List role-permission mappings for the current tenant (v_role_permissions). Requires tenant context. */
        async listRolePermissions() {
            const { data, error } = await supabase.from('v_role_permissions').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** List roles for the current tenant (v_tenant_roles). Requires tenant context. */
        async listTenantRoles() {
            const { data, error } = await supabase.from('v_tenant_roles').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** List user–role assignments for the current tenant (v_user_tenant_roles). Requires tenant context. */
        async listUserTenantRoles() {
            const { data, error } = await supabase.from('v_user_tenant_roles').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** List profiles for the current tenant (v_profiles). Requires tenant context. */
        async listProfiles() {
            const { data, error } = await supabase.from('v_profiles').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** Assign a permission to a role in a tenant. Requires tenant.admin. */
        async assignPermissionToRole(params) {
            return callRpc(rpc(supabase), 'rpc_assign_permission_to_role', {
                p_tenant_id: params.tenantId,
                p_role_key: params.roleKey,
                p_permission_key: params.permissionKey,
            });
        },
        /** Revoke a permission from a role in a tenant. Requires tenant.admin. */
        async revokePermissionFromRole(params) {
            return callRpc(rpc(supabase), 'rpc_revoke_permission_from_role', {
                p_tenant_id: params.tenantId,
                p_role_key: params.roleKey,
                p_permission_key: params.permissionKey,
            });
        },
        /** Grant a scope to a user (location/department). Requires tenant.admin. */
        async grantScope(params) {
            return callRpc(rpc(supabase), 'rpc_grant_scope', {
                p_tenant_id: params.tenantId,
                p_user_id: params.userId,
                p_scope_type: params.scopeType,
                p_scope_value: params.scopeValue ?? null,
            });
        },
        /** Revoke a scope from a user. Requires tenant.admin. */
        async revokeScope(params) {
            return callRpc(rpc(supabase), 'rpc_revoke_scope', {
                p_tenant_id: params.tenantId,
                p_user_id: params.userId,
                p_scope_type: params.scopeType,
                p_scope_value: params.scopeValue ?? null,
            });
        },
        /** Check if the current user has a permission in a tenant. */
        async hasPermission(params) {
            return callRpc(rpc(supabase), 'rpc_has_permission', {
                p_tenant_id: params.tenantId,
                p_permission_key: params.permissionKey,
            });
        },
        /** Get permissions for the current user in a tenant. */
        async getUserPermissions(params) {
            return callRpc(rpc(supabase), 'rpc_get_user_permissions', {
                p_tenant_id: params.tenantId,
            });
        },
    };
}
