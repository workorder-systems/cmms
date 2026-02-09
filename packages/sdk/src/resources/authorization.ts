import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.js';
import { normalizeError } from '../errors.js';
import { callRpc } from '../unwrap.js';

/** Row from v_permissions view (global permission catalog). */
export type PermissionRow = Database['public']['Views']['v_permissions'] extends { Row: infer R }
  ? R
  : Record<string, unknown>;

/** Row from v_role_permissions view (role → permission mappings per tenant). */
export type RolePermissionRow = Database['public']['Views']['v_role_permissions'] extends { Row: infer R }
  ? R
  : Record<string, unknown>;

/** Row from v_tenant_roles view (roles defined for a tenant). */
export type TenantRoleRow = Database['public']['Views']['v_tenant_roles'] extends { Row: infer R }
  ? R
  : Record<string, unknown>;

/** Row from v_user_tenant_roles view (users and roles per tenant). */
export type UserTenantRoleRow = Database['public']['Views']['v_user_tenant_roles'] extends { Row: infer R }
  ? R
  : Record<string, unknown>;

/** Row from v_profiles view (tenant-scoped user profiles). */
export type ProfileRow = Database['public']['Views']['v_profiles'] extends { Row: infer R }
  ? R
  : Record<string, unknown>;

/** Params for assigning a permission to a role. */
export interface AssignPermissionToRoleParams {
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

const rpc = (supabase: SupabaseClient<Database>) =>
  (supabase as unknown as { rpc: (n: string, p?: object) => Promise<{ data: unknown; error: unknown }> }).rpc.bind(
    supabase
  );

/**
 * Authorization resource: permissions, roles, scopes, and checks.
 * Uses v_permissions, v_role_permissions, v_tenant_roles, v_user_tenant_roles, v_profiles and related RPCs.
 */
export function createAuthorizationResource(supabase: SupabaseClient<Database>) {
  return {
    /** List global permissions (v_permissions). */
    async listPermissions(): Promise<PermissionRow[]> {
      const { data, error } = await supabase.from('v_permissions').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as PermissionRow[];
    },

    /** List role-permission mappings for the current tenant (v_role_permissions). Requires tenant context. */
    async listRolePermissions(): Promise<RolePermissionRow[]> {
      const { data, error } = await supabase.from('v_role_permissions').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as RolePermissionRow[];
    },

    /** List roles for the current tenant (v_tenant_roles). Requires tenant context. */
    async listTenantRoles(): Promise<TenantRoleRow[]> {
      const { data, error } = await supabase.from('v_tenant_roles').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as TenantRoleRow[];
    },

    /** List user–role assignments for the current tenant (v_user_tenant_roles). Requires tenant context. */
    async listUserTenantRoles(): Promise<UserTenantRoleRow[]> {
      const { data, error } = await supabase.from('v_user_tenant_roles').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as UserTenantRoleRow[];
    },

    /** List profiles for the current tenant (v_profiles). Requires tenant context. */
    async listProfiles(): Promise<ProfileRow[]> {
      const { data, error } = await supabase.from('v_profiles').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as ProfileRow[];
    },

    /** Assign a permission to a role in a tenant. Requires tenant.admin. */
    async assignPermissionToRole(params: AssignPermissionToRoleParams): Promise<void> {
      return callRpc(rpc(supabase), 'rpc_assign_permission_to_role', {
        p_tenant_id: params.tenantId,
        p_role_key: params.roleKey,
        p_permission_key: params.permissionKey,
      });
    },

    /** Grant a scope to a user (location/department). Requires tenant.admin. */
    async grantScope(params: GrantScopeParams): Promise<void> {
      return callRpc(rpc(supabase), 'rpc_grant_scope', {
        p_tenant_id: params.tenantId,
        p_user_id: params.userId,
        p_scope_type: params.scopeType,
        p_scope_value: params.scopeValue ?? null,
      });
    },

    /** Revoke a scope from a user. Requires tenant.admin. */
    async revokeScope(params: RevokeScopeParams): Promise<void> {
      return callRpc(rpc(supabase), 'rpc_revoke_scope', {
        p_tenant_id: params.tenantId,
        p_user_id: params.userId,
        p_scope_type: params.scopeType,
        p_scope_value: params.scopeValue ?? null,
      });
    },

    /** Check if the current user has a permission in a tenant. */
    async hasPermission(params: HasPermissionParams): Promise<boolean> {
      return callRpc<boolean>(rpc(supabase), 'rpc_has_permission', {
        p_tenant_id: params.tenantId,
        p_permission_key: params.permissionKey,
      });
    },

    /** Get permissions for the current user in a tenant. */
    async getUserPermissions(params: GetUserPermissionsParams): Promise<string[]> {
      return callRpc<string[]>(rpc(supabase), 'rpc_get_user_permissions', {
        p_tenant_id: params.tenantId,
      });
    },
  };
}

export type AuthorizationResource = ReturnType<typeof createAuthorizationResource>;

