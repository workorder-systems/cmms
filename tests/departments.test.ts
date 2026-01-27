import { describe, it, expect, beforeAll } from 'vitest';
import {
  createTestClient,
  createServiceRoleClient,
  waitForSupabase,
} from './helpers/supabase';
import { createTestUser, TEST_PASSWORD, getUserEmail } from './helpers/auth';
import { createTestTenant, addUserToTenant, setTenantContext } from './helpers/tenant';
import { createTestDepartment, createTestDepartmentDirect, createTestAsset } from './helpers/entities';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Departments', () => {
  let client: SupabaseClient;
  let serviceClient: SupabaseClient;

  beforeAll(async () => {
    await waitForSupabase();
    client = createTestClient();
    serviceClient = createServiceRoleClient();
  });

  describe('Department Creation', () => {
    it('should create department via rpc_create_department', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      const departmentId = await createTestDepartment(
        client,
        tenantId,
        'Engineering'
      );

      expect(departmentId).toBeDefined();
      expect(typeof departmentId).toBe('string');

      // Verify department exists
      const { data: department, error } = await serviceClient
        .schema('app')
        .from('departments')
        .select('*')
        .eq('id', departmentId)
        .single();

      expect(error).toBeNull();
      expect(department).toBeDefined();
      expect(department.name).toBe('Engineering');
      expect(department.tenant_id).toBe(tenantId);
    });

    it('should create department with code', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      const departmentId = await createTestDepartment(
        client,
        tenantId,
        'Maintenance',
        'MAINT'
      );

      // Verify department with code
      const { data: department } = await serviceClient
        .schema('app')
        .from('departments')
        .select('*')
        .eq('id', departmentId)
        .single();

      expect(department.code).toBe('MAINT');
    });
  });

  describe('Department Code Validation', () => {
    it('should enforce department code uniqueness per tenant', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      await createTestDepartment(client, tenantId, 'Dept 1', 'CODE1');

      // Try to create another department with same code
      const { data, error } = await client.rpc('rpc_create_department', {
        p_tenant_id: tenantId,
        p_name: 'Dept 2',
        p_code: 'CODE1',
      });

      expect(error).toBeDefined();
      expect(error?.code).toBe('23505'); // Unique violation
    });

    it('should allow same code in different tenants', async () => {
      const tenantId1 = await createTestTenant(client);
      const tenantId2 = await createTestTenant(client);

      const dept1 = await createTestDepartment(
        client,
        tenantId1,
        'Dept 1',
        'SHARED_CODE'
      );
      const dept2 = await createTestDepartment(
        client,
        tenantId2,
        'Dept 2',
        'SHARED_CODE'
      );

      expect(dept1).toBeDefined();
      expect(dept2).toBeDefined();
    });

    it('should validate department code format', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      // Try invalid code format (lowercase, special chars)
      const { data, error } = await client.rpc('rpc_create_department', {
        p_tenant_id: tenantId,
        p_name: 'Invalid Dept',
        p_code: 'invalid-code!',
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('uppercase alphanumeric');
    });
  });

  describe('Tenant Isolation', () => {
    it('should only allow users to see their tenant departments', async () => {
      const { user: user1 } = await createTestUser(client);
      const tenantId1 = await createTestTenant(client);

      const { user: user2 } = await createTestUser(client);
      const tenantId2 = await createTestTenant(client);

      // Create departments in both tenants
      const dept1 = await createTestDepartmentDirect(serviceClient, tenantId1, 'Tenant 1 Dept');
      const dept2 = await createTestDepartmentDirect(serviceClient, tenantId2, 'Tenant 2 Dept');

      // Sign in as user1
      const client1 = createTestClient();
      const { error: signInErr } = await client1.auth.signInWithPassword({
        email: getUserEmail(user1),
        password: TEST_PASSWORD,
      });
      expect(signInErr).toBeNull();
      await setTenantContext(client1, tenantId1);

      // User1 should only see tenant1 departments (using view)
      const { data: departments, error } = await client1
        .from('v_departments')
        .select('*')
        .in('id', [dept1, dept2]);

      expect(error).toBeNull();
      expect(departments).toBeDefined();
      expect(departments.length).toBe(1);
      expect(departments[0].id).toBe(dept1);
    });
  });

  describe('Department Updates', () => {
    it('should update department via rpc_update_department', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      const departmentId = await createTestDepartment(
        client,
        tenantId,
        'Old Name'
      );

      const { error } = await client.rpc('rpc_update_department', {
        p_tenant_id: tenantId,
        p_department_id: departmentId,
        p_name: 'New Name',
      });

      expect(error).toBeNull();

      // Verify update
      const { data: department } = await serviceClient
        .schema('app')
        .from('departments')
        .select('*')
        .eq('id', departmentId)
        .single();

      expect(department.name).toBe('New Name');
      expect(department.updated_at).toBeDefined();
    });

    it('should update department code', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      const departmentId = await createTestDepartment(
        client,
        tenantId,
        'Department',
        'OLD'
      );

      const { error } = await client.rpc('rpc_update_department', {
        p_tenant_id: tenantId,
        p_department_id: departmentId,
        p_code: 'NEW',
      });

      expect(error).toBeNull();

      // Verify code update
      const { data: department } = await serviceClient
        .schema('app')
        .from('departments')
        .select('*')
        .eq('id', departmentId)
        .single();

      expect(department.code).toBe('NEW');
    });
  });

  describe('Department Deletion', () => {
    it('should delete department via rpc_delete_department', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      const departmentId = await createTestDepartment(
        client,
        tenantId,
        'To Delete'
      );

      const { error } = await client.rpc('rpc_delete_department', {
        p_tenant_id: tenantId,
        p_department_id: departmentId,
      });

      expect(error).toBeNull();

      // Verify deletion
      const { data: department } = await serviceClient
        .schema('app')
        .from('departments')
        .select('*')
        .eq('id', departmentId)
        .single();

      expect(department).toBeNull();
    });

    it('should set asset.department_id to NULL when department is deleted', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      const departmentId = await createTestDepartment(
        client,
        tenantId,
        'Department'
      );
      const assetId = await createTestAsset(
        serviceClient,
        tenantId,
        'Asset',
        undefined,
        departmentId
      );

      // Delete department
      await client.rpc('rpc_delete_department', {
        p_tenant_id: tenantId,
        p_department_id: departmentId,
      });

      // Verify asset's department_id is set to NULL
      const { data: asset } = await serviceClient
        .schema('app')
        .from('assets')
        .select('*')
        .eq('id', assetId)
        .single();

      expect(asset.department_id).toBeNull();
    });
  });
});
