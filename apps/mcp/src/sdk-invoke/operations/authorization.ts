import { z } from 'zod';
import type { SdkOperationDef } from '../types.js';
import { ann } from '../annotations.js';
import { emptyArgs, uuid } from '../zod-common.js';

export const authorizationOperations: Record<string, SdkOperationDef> = {
  'authorization.list_permissions': {
    description: 'List global permissions catalog.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.authorization.listPermissions();
    },
  },
  'authorization.list_role_permissions': {
    description: 'List role-permission mappings for the tenant.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.authorization.listRolePermissions();
    },
  },
  'authorization.list_tenant_roles': {
    description: 'List roles for the tenant.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.authorization.listTenantRoles();
    },
  },
  'authorization.list_user_tenant_roles': {
    description: 'List user–role assignments for the tenant.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.authorization.listUserTenantRoles();
    },
  },
  'authorization.list_profiles': {
    description: 'List profiles for the tenant.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.authorization.listProfiles();
    },
  },
  'authorization.assign_permission_to_role': {
    description: 'Assign a permission to a role.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      role_key: z.string().min(1),
      permission_key: z.string().min(1),
    }),
    async invoke(client, args) {
      const p = z.object({ tenant_id: uuid, role_key: z.string(), permission_key: z.string() }).parse(args);
      await client.authorization.assignPermissionToRole({
        tenantId: p.tenant_id,
        roleKey: p.role_key,
        permissionKey: p.permission_key,
      });
      return { ok: true };
    },
  },
  'authorization.revoke_permission_from_role': {
    description: 'Revoke a permission from a role.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      role_key: z.string().min(1),
      permission_key: z.string().min(1),
    }),
    async invoke(client, args) {
      const p = z.object({ tenant_id: uuid, role_key: z.string(), permission_key: z.string() }).parse(args);
      await client.authorization.revokePermissionFromRole({
        tenantId: p.tenant_id,
        roleKey: p.role_key,
        permissionKey: p.permission_key,
      });
      return { ok: true };
    },
  },
  'authorization.grant_scope': {
    description: 'Grant a scope to a user.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      user_id: uuid,
      scope_type: z.string().min(1),
      scope_value: z.string().nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          user_id: uuid,
          scope_type: z.string(),
          scope_value: z.string().nullable().optional(),
        })
        .parse(args);
      await client.authorization.grantScope({
        tenantId: p.tenant_id,
        userId: p.user_id,
        scopeType: p.scope_type,
        scopeValue: p.scope_value ?? null,
      });
      return { ok: true };
    },
  },
  'authorization.revoke_scope': {
    description: 'Revoke a scope from a user.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      user_id: uuid,
      scope_type: z.string().min(1),
      scope_value: z.string().nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          user_id: uuid,
          scope_type: z.string(),
          scope_value: z.string().nullable().optional(),
        })
        .parse(args);
      await client.authorization.revokeScope({
        tenantId: p.tenant_id,
        userId: p.user_id,
        scopeType: p.scope_type,
        scopeValue: p.scope_value ?? null,
      });
      return { ok: true };
    },
  },
  'authorization.has_permission': {
    description: 'Check if the current user has a permission in a tenant.',
    annotations: ann.read,
    inputSchema: z.object({
      tenant_id: uuid,
      permission_key: z.string().min(1),
    }),
    async invoke(client, args) {
      const p = z.object({ tenant_id: uuid, permission_key: z.string() }).parse(args);
      return client.authorization.hasPermission({
        tenantId: p.tenant_id,
        permissionKey: p.permission_key,
      });
    },
  },
  'authorization.get_user_permissions': {
    description: 'Get permission keys for the current user in a tenant.',
    annotations: ann.read,
    inputSchema: z.object({ tenant_id: uuid }),
    async invoke(client, args) {
      const { tenant_id } = z.object({ tenant_id: uuid }).parse(args);
      return client.authorization.getUserPermissions({ tenantId: tenant_id });
    },
  },
};
