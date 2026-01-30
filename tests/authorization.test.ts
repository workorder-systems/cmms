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
    it('should have admin, member, technician, and manager roles for new tenant', async () => {
      await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const { data: roles, error } = await client
        .from('v_tenant_roles')
        .select('*')
        .in('key', ['admin', 'member', 'technician', 'manager']);

      expect(error).toBeNull();
      expect(roles).toBeDefined();
      expect(roles).not.toBeNull();
      expect(roles!.length).toBe(4);

      const roleKeys = roles!.map((r: any) => r.key);
      expect(roleKeys).toContain('admin');
      expect(roleKeys).toContain('member');
      expect(roleKeys).toContain('technician');
      expect(roleKeys).toContain('manager');
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

  describe('Technician Role', () => {
    it('should have technician role with correct permissions', async () => {
      await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const { data: permissions, error } = await client
        .from('v_role_permissions')
        .select('permission_key')
        .eq('role_key', 'technician');

      expect(error).toBeNull();
      expect(permissions).toBeDefined();
      const permissionKeys = permissions!.map((p: any) => p.permission_key);
      expect(permissionKeys).toContain('workorder.view');
      expect(permissionKeys).toContain('workorder.complete.assigned');
      expect(permissionKeys).toContain('asset.view');
      expect(permissionKeys).toContain('location.view');
      expect(permissionKeys).not.toContain('workorder.create');
      expect(permissionKeys).not.toContain('tenant.admin');
    });

    it('should allow technician to view work orders', async () => {
      const adminClient = createTestClient();
      const { user: admin } = await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);

      const technicianClient = createTestClient();
      const { user: technician } = await createTestUser(technicianClient);
      await addUserToTenant(adminClient, technician.id, tenantId);
      await assignRoleToUser(adminClient, technician.id, tenantId, 'technician');

      const { data: workOrderId } = await adminClient.rpc('rpc_create_work_order', {
        p_tenant_id: tenantId,
        p_title: 'Test WO',
        p_priority: 'medium',
        p_assigned_to: technician.id,
      });

      await setTenantContext(technicianClient, tenantId);
      const { data: workOrders, error } = await technicianClient
        .from('v_work_orders')
        .select('*')
        .eq('id', workOrderId);

      expect(error).toBeNull();
      expect(workOrders).toBeDefined();
      expect(workOrders!.length).toBe(1);
    });

    it('should allow technician to complete assigned work orders', async () => {
      const adminClient = createTestClient();
      const { user: admin } = await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);

      const technicianClient = createTestClient();
      const { user: technician } = await createTestUser(technicianClient);
      await addUserToTenant(adminClient, technician.id, tenantId);
      await assignRoleToUser(adminClient, technician.id, tenantId, 'technician');

      const { data: workOrderId } = await adminClient.rpc('rpc_create_work_order', {
        p_tenant_id: tenantId,
        p_title: 'Assigned WO',
        p_priority: 'medium',
        p_assigned_to: technician.id,
      });

      // Transition to assigned first (draft -> assigned)
      await adminClient.rpc('rpc_transition_work_order_status', {
        p_tenant_id: tenantId,
        p_work_order_id: workOrderId,
        p_to_status_key: 'assigned',
      });

      // Set tenant context for technician
      await setTenantContext(technicianClient, tenantId);

      // Technicians can't transition to in_progress (requires workorder.edit which they don't have)
      // But they can complete directly from assigned if they have workorder.complete.any
      // However, technicians only have workorder.complete.assigned, so they need to be able to
      // transition to in_progress first. Since they can't, we need to have an admin transition
      // to in_progress, then technician can complete.
      await adminClient.rpc('rpc_transition_work_order_status', {
        p_tenant_id: tenantId,
        p_work_order_id: workOrderId,
        p_to_status_key: 'in_progress',
      });

      // Complete the work order (technician has workorder.complete.assigned permission)
      const { error } = await technicianClient.rpc('rpc_complete_work_order', {
        p_tenant_id: tenantId,
        p_work_order_id: workOrderId,
      });

      expect(error).toBeNull();
    });

    it('should prevent technician from creating work orders', async () => {
      const adminClient = createTestClient();
      const { user: admin } = await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);

      const technicianClient = createTestClient();
      const { user: technician } = await createTestUser(technicianClient);
      await addUserToTenant(adminClient, technician.id, tenantId);
      await assignRoleToUser(adminClient, technician.id, tenantId, 'technician');

      const { data, error } = await technicianClient.rpc('rpc_create_work_order', {
        p_tenant_id: tenantId,
        p_title: 'Test WO',
        p_priority: 'medium',
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('Permission denied');
    });
  });

  describe('Manager Role', () => {
    it('should have manager role with correct permissions', async () => {
      await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const { data: permissions, error } = await client
        .from('v_role_permissions')
        .select('permission_key')
        .eq('role_key', 'manager');

      expect(error).toBeNull();
      expect(permissions).toBeDefined();
      const permissionKeys = permissions!.map((p: any) => p.permission_key);
      expect(permissionKeys).toContain('workorder.create');
      expect(permissionKeys).toContain('workorder.edit');
      expect(permissionKeys).toContain('workorder.view');
      expect(permissionKeys).toContain('asset.create');
      expect(permissionKeys).toContain('asset.edit');
      expect(permissionKeys).toContain('location.create');
      expect(permissionKeys).not.toContain('tenant.admin');
    });

    it('should allow manager to create work orders', async () => {
      const adminClient = createTestClient();
      const { user: admin } = await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);

      const managerClient = createTestClient();
      const { user: manager } = await createTestUser(managerClient);
      await addUserToTenant(adminClient, manager.id, tenantId);
      await assignRoleToUser(adminClient, manager.id, tenantId, 'manager');

      const { data: workOrderId, error } = await managerClient.rpc('rpc_create_work_order', {
        p_tenant_id: tenantId,
        p_title: 'Manager Created WO',
        p_priority: 'medium',
      });

      expect(error).toBeNull();
      expect(workOrderId).toBeDefined();
    });

    it('should allow manager to manage assets', async () => {
      const adminClient = createTestClient();
      const { user: admin } = await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);

      const managerClient = createTestClient();
      const { user: manager } = await createTestUser(managerClient);
      await addUserToTenant(adminClient, manager.id, tenantId);
      await assignRoleToUser(adminClient, manager.id, tenantId, 'manager');

      const { data: assetId, error } = await managerClient.rpc('rpc_create_asset', {
        p_tenant_id: tenantId,
        p_name: 'Manager Asset',
      });

      expect(error).toBeNull();
      expect(assetId).toBeDefined();
    });

    it('should prevent manager from performing tenant administration', async () => {
      const adminClient = createTestClient();
      const { user: admin } = await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);

      const managerClient = createTestClient();
      const { user: manager } = await createTestUser(managerClient);
      await addUserToTenant(adminClient, manager.id, tenantId);
      await assignRoleToUser(adminClient, manager.id, tenantId, 'manager');

      const memberClient = createTestClient();
      const { user: member } = await createTestUser(memberClient);
      await addUserToTenant(adminClient, member.id, tenantId);

      // Manager should not be able to assign roles (requires tenant.admin)
      const { data, error } = await managerClient.rpc('rpc_assign_role_to_user', {
        p_tenant_id: tenantId,
        p_user_id: member.id,
        p_role_key: 'member',
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('Permission denied');
    });
  });
});
