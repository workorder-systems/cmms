import { describe, it, expect, beforeAll } from 'vitest';
import {
  createTestClient,
  createServiceRoleClient,
  waitForSupabase,
} from './helpers/supabase';
import { createTestUser, TEST_PASSWORD, getUserEmail } from './helpers/auth';
import {
  createTestTenant,
  addUserToTenant,
  assignRoleToUser,
} from './helpers/tenant';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Authorization & Roles', () => {
  let client: SupabaseClient;
  let serviceClient: SupabaseClient;

  beforeAll(async () => {
    await waitForSupabase();
    client = createTestClient();
    serviceClient = createServiceRoleClient();
  });

  describe('Default Roles', () => {
    it('should have admin and member roles for new tenant', async () => {
      await createTestUser(client);
      const tenantId = await createTestTenant(client);

      const { data: roles, error } = await serviceClient
        .schema('cfg')
        .from('tenant_roles')
        .select('*')
        .eq('tenant_id', tenantId)
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

      // Get admin role
      const { data: adminRole } = await serviceClient
        .schema('cfg')
        .from('tenant_roles')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('key', 'admin')
        .single();

      expect(adminRole).toBeDefined();

      // Get all permissions for admin role
      const { data: permissions, error } = await serviceClient
        .schema('cfg')
        .from('tenant_role_permissions')
        .select('permissions!inner(key)')
        .eq('tenant_role_id', adminRole!.id);

      expect(error).toBeNull();
      expect(permissions).toBeDefined();
      expect(permissions).not.toBeNull();
      expect(permissions!.length).toBeGreaterThan(0);

      // Admin should have tenant.admin permission
      const permissionKeys = permissions!.map((p: any) => p.permissions.key);
      expect(permissionKeys).toContain('tenant.admin');
    });

    it('should have member role with view permissions only', async () => {
      await createTestUser(client);
      const tenantId = await createTestTenant(client);

      // Get member role
      const { data: memberRole } = await serviceClient
        .schema('cfg')
        .from('tenant_roles')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('key', 'member')
        .single();

      expect(memberRole).toBeDefined();

      // Get permissions for member role
      const { data: permissions, error } = await serviceClient
        .schema('cfg')
        .from('tenant_role_permissions')
        .select('permissions!inner(key)')
        .eq('tenant_role_id', memberRole!.id);

      expect(error).toBeNull();
      expect(permissions).toBeDefined();
      expect(permissions).not.toBeNull();

      // All member permissions should be view permissions
      const permissionKeys = permissions!.map((p: any) => p.permissions.key);
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
      await addUserToTenant(serviceClient, member.id, tenantId);

      // Assign member role
      const { error } = await adminClient.rpc('rpc_assign_role_to_user', {
        p_tenant_id: tenantId,
        p_user_id: member.id,
        p_role_key: 'member',
      });

      expect(error).toBeNull();

      // Verify role assignment
      const { data: roleAssignment, error: checkError } = await serviceClient
        .schema('app')
        .from('user_tenant_roles')
        .select('*')
        .eq('user_id', member.id)
        .eq('tenant_id', tenantId)
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
      await addUserToTenant(serviceClient, member.id, tenantId);

      // Assign role using helper
      await assignRoleToUser(serviceClient, member.id, tenantId, 'member');

      // Verify assignment (row exists for user/tenant)
      const { data: assignment, error } = await serviceClient
        .schema('app')
        .from('user_tenant_roles')
        .select('*')
        .eq('user_id', member.id)
        .eq('tenant_id', tenantId)
        .single();

      expect(error).toBeNull();
      expect(assignment).toBeDefined();
    });
  });

  describe('Permission Inheritance', () => {
    it('should inherit permissions through roles', async () => {
      const { user: admin } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      const { user: member } = await createTestUser(client);
      await addUserToTenant(serviceClient, member.id, tenantId);
      await assignRoleToUser(serviceClient, member.id, tenantId, 'member');

      // Check permissions using RPC (would need to be implemented)
      // For now, verify through role-permission mapping
      const { data: memberRole } = await serviceClient
        .schema('cfg')
        .from('tenant_roles')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('key', 'member')
        .single();

      const { data: permissions } = await serviceClient
        .schema('cfg')
        .from('tenant_role_permissions')
        .select('permissions!inner(key)')
        .eq('tenant_role_id', memberRole!.id);

      expect(permissions).toBeDefined();
      expect(permissions).not.toBeNull();
      expect(permissions!.length).toBeGreaterThan(0);
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
      const { user: admin } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      const { user: member } = await createTestUser(client);
      await addUserToTenant(serviceClient, member.id, tenantId);
      await assignRoleToUser(serviceClient, member.id, tenantId, 'member');

      // Sign in as member (who doesn't have tenant.admin)
      const memberClient = createTestClient();
      const { error: signInErr } = await memberClient.auth.signInWithPassword({
        email: getUserEmail(member),
        password: TEST_PASSWORD,
      });
      expect(signInErr).toBeNull();

      const { user: anotherUser } = await createTestUser(client);
      await addUserToTenant(serviceClient, anotherUser.id, tenantId);

      // Member should not be able to assign roles
      const { data, error } = await memberClient.rpc('rpc_assign_role_to_user', {
        p_tenant_id: tenantId,
        p_user_id: anotherUser.id,
        p_role_key: 'member',
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('Permission denied');
    });
  });
});
