import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient, waitForSupabase } from './helpers/supabase';
import { createTestUser } from './helpers/auth';
import {
  createTestTenant,
  addUserToTenant,
  assignRoleToUser,
  setTenantContext,
} from './helpers/tenant';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Authorization & Roles', () => {
  let client: SupabaseClient;

  beforeAll(async () => {
    await waitForSupabase();
    client = createTestClient();
  });

  describe('Default Roles', () => {
    it('should have admin and member roles for new tenant', async () => {
      await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const { data: roles, error } = await client
        .from('v_tenant_roles')
        .select('*')
        .in('key', ['admin', 'member']);

      expect(error).toBeNull();
      expect(roles).toBeDefined();
      expect(roles).not.toBeNull();
      expect(roles!.length).toBe(2);

      const roleKeys = roles!.map((r: any) => r.key);
      expect(roleKeys).toContain('admin');
      expect(roleKeys).toContain('member');
    });

    it('should have admin role with all permissions', async () => {
      await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const { data: permissions, error } = await client
        .from('v_role_permissions')
        .select('permission_key')
        .eq('role_key', 'admin');

      expect(error).toBeNull();
      expect(permissions).toBeDefined();
      expect(permissions).not.toBeNull();
      expect(permissions!.length).toBeGreaterThan(0);

      // Admin should have tenant.admin permission
      const permissionKeys = permissions!.map((p: any) => p.permission_key);
      expect(permissionKeys).toContain('tenant.admin');
    });

    it('should have member role with view permissions only', async () => {
      await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const { data: permissions, error } = await client
        .from('v_role_permissions')
        .select('permission_key')
        .eq('role_key', 'member');

      expect(error).toBeNull();
      expect(permissions).toBeDefined();
      expect(permissions).not.toBeNull();

      // All member permissions should be view permissions
      const permissionKeys = permissions!.map((p: any) => p.permission_key);
      permissionKeys.forEach((key: string) => {
        expect(key).toMatch(/\.view$/);
      });

      // Member should NOT have tenant.admin
      expect(permissionKeys).not.toContain('tenant.admin');
    });
  });

  describe('Role Assignment', () => {
    it('should assign role to user via rpc_assign_role_to_user', async () => {
      // Note: Use separate clients for different users to avoid session conflicts
      const adminClient = createTestClient();
      const { user: admin } = await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);

      const memberClient = createTestClient();
      const { user: member } = await createTestUser(memberClient);
      await addUserToTenant(adminClient, member.id, tenantId);

      // Assign member role
      const { error } = await adminClient.rpc('rpc_assign_role_to_user', {
        p_tenant_id: tenantId,
        p_user_id: member.id,
        p_role_key: 'member',
      });

      expect(error).toBeNull();

      await setTenantContext(memberClient, tenantId);
      const { data: roleAssignment, error: checkError } = await memberClient
        .from('v_user_tenant_roles')
        .select('tenant_id, role_key')
        .eq('tenant_id', tenantId)
        .eq('role_key', 'member')
        .single();

      expect(checkError).toBeNull();
      expect(roleAssignment).toBeDefined();
    });

    it('should verify role assignment in user_tenant_roles table', async () => {
      const adminClient = createTestClient();
      const { user: admin } = await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);

      const memberClient = createTestClient();
      const { user: member } = await createTestUser(memberClient);
      await addUserToTenant(adminClient, member.id, tenantId);

      // Assign role using helper
      await assignRoleToUser(adminClient, member.id, tenantId, 'member');

      await setTenantContext(memberClient, tenantId);
      const { data: assignment, error } = await memberClient
        .from('v_user_tenant_roles')
        .select('tenant_id, role_key')
        .eq('tenant_id', tenantId)
        .eq('role_key', 'member')
        .single();

      expect(error).toBeNull();
      expect(assignment).toBeDefined();
    });
  });

  describe('Permission Inheritance', () => {
    it('should inherit permissions through roles', async () => {
      const { user: admin } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      const memberClient = createTestClient();
      const { user: member } = await createTestUser(memberClient);
      await addUserToTenant(client, member.id, tenantId);
      await assignRoleToUser(client, member.id, tenantId, 'member');

      const { data: permissions, error } = await memberClient.rpc('rpc_get_user_permissions', {
        p_tenant_id: tenantId,
      });

      expect(error).toBeNull();
      expect(permissions).toBeDefined();
      expect(permissions.length).toBeGreaterThan(0);
    });
  });

  describe('Permission Checks', () => {
    it('should check if user has permission via authz.has_permission', async () => {
      const adminClient = createTestClient();
      const { user: admin } = await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);

      // Admin should have tenant.admin permission
      // PostgREST only exposes RPC functions in `public`; use wrapper.
      const { data: hasPermission, error } = await adminClient.rpc('rpc_has_permission', {
        p_tenant_id: tenantId,
        p_permission_key: 'tenant.admin',
      });

      expect(error).toBeNull();
      expect(hasPermission).toBe(true);
    });

    it('should get all user permissions via authz.get_user_permissions', async () => {
      const adminClient = createTestClient();
      const { user: admin } = await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);

      const { data: permissions, error } = await adminClient.rpc('rpc_get_user_permissions', {
        p_tenant_id: tenantId,
      });

      expect(error).toBeNull();
      expect(permissions).toBeDefined();
      expect(Array.isArray(permissions)).toBe(true);
      expect(permissions.length).toBeGreaterThan(0);
      expect(permissions).toContain('tenant.admin');
    });
  });

  describe('Security Invariants', () => {
    it('should prevent users from modifying their own roles', async () => {
      const { user: admin } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      // Try to assign role to self
      const { data, error } = await client.rpc('rpc_assign_role_to_user', {
        p_tenant_id: tenantId,
        p_user_id: admin.id, // Self
        p_role_key: 'member',
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('cannot modify their own role');
    });

    it('should require tenant.admin permission for role assignment', async () => {
      const adminClient = createTestClient();
      await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);

      const memberClient = createTestClient();
      const { user: member } = await createTestUser(memberClient);
      await addUserToTenant(adminClient, member.id, tenantId);
      await assignRoleToUser(adminClient, member.id, tenantId, 'member');

      const anotherClient = createTestClient();
      const { user: anotherUser } = await createTestUser(anotherClient);
      await addUserToTenant(adminClient, anotherUser.id, tenantId);

      // Member should not be able to assign roles
      const { error } = await memberClient.rpc('rpc_assign_role_to_user', {
        p_tenant_id: tenantId,
        p_user_id: anotherUser.id,
        p_role_key: 'member',
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('Permission denied');
    });
  });
});
