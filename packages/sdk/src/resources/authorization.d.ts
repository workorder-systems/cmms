import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.js';
/** Row from v_permissions view (global permission catalog). */
export type PermissionRow = Database['public']['Views']['v_permissions'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
/** Row from v_role_permissions view (role → permission mappings per tenant). */
export type RolePermissionRow = Database['public']['Views']['v_role_permissions'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
/** Row from v_tenant_roles view (roles defined for a tenant). */
export type TenantRoleRow = Database['public']['Views']['v_tenant_roles'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
/** Row from v_user_tenant_roles view (users and roles per tenant). */
export type UserTenantRoleRow = Database['public']['Views']['v_user_tenant_roles'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
/** Row from v_profiles view (tenant-scoped user profiles). */
export type ProfileRow = Database['public']['Views']['v_profiles'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
/** Params for assigning a permission to a role. */
export interface AssignPermissionToRoleParams {
    tenantId: string;
    roleKey: string;
    permissionKey: string;
}
/** Params for revoking a permission from a role. */
export interface RevokePermissionFromRoleParams {
    tenantId: string;
    roleKey: string;
    permissionKey: string;
}
/** Params for granting a scope to a user. */
export interface GrantScopeParams {
    tenantId: string;
    userId: string;
    scopeType: string;
    scopeValue?: string | null;
}
/** Params for revoking a scope from a user. */
export interface RevokeScopeParams {
    tenantId: string;
    userId: string;
    scopeType: string;
    scopeValue?: string | null;
}
/** Params for hasPermission check. */
export interface HasPermissionParams {
    tenantId: string;
    permissionKey: string;
}
/** Params for getUserPermissions. */
export interface GetUserPermissionsParams {
    tenantId: string;
}
/**
 * Authorization resource: permissions, roles, scopes, and checks.
 * Uses v_permissions, v_role_permissions, v_tenant_roles, v_user_tenant_roles, v_profiles and related RPCs.
 */
export declare function createAuthorizationResource(supabase: SupabaseClient<Database>): {
    /** List global permissions (v_permissions). */
    listPermissions(): Promise<PermissionRow[]>;
    /** List role-permission mappings for the current tenant (v_role_permissions). Requires tenant context. */
    listRolePermissions(): Promise<RolePermissionRow[]>;
    /** List roles for the current tenant (v_tenant_roles). Requires tenant context. */
    listTenantRoles(): Promise<TenantRoleRow[]>;
    /** List user–role assignments for the current tenant (v_user_tenant_roles). Requires tenant context. */
    listUserTenantRoles(): Promise<UserTenantRoleRow[]>;
    /** List profiles for the current tenant (v_profiles). Requires tenant context. */
    listProfiles(): Promise<ProfileRow[]>;
    /** Assign a permission to a role in a tenant. Requires tenant.admin. */
    assignPermissionToRole(params: AssignPermissionToRoleParams): Promise<void>;
    /** Revoke a permission from a role in a tenant. Requires tenant.admin. */
    revokePermissionFromRole(params: RevokePermissionFromRoleParams): Promise<void>;
    /** Grant a scope to a user (location/department). Requires tenant.admin. */
    grantScope(params: GrantScopeParams): Promise<void>;
    /** Revoke a scope from a user. Requires tenant.admin. */
    revokeScope(params: RevokeScopeParams): Promise<void>;
    /** Check if the current user has a permission in a tenant. */
    hasPermission(params: HasPermissionParams): Promise<boolean>;
    /** Get permissions for the current user in a tenant. */
    getUserPermissions(params: GetUserPermissionsParams): Promise<string[]>;
};
export type AuthorizationResource = ReturnType<typeof createAuthorizationResource>;
//# sourceMappingURL=authorization.d.ts.map