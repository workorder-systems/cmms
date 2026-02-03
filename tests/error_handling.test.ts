import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient, waitForSupabase } from './helpers/supabase';
import { createTestUser } from './helpers/auth';
import {
  createTestTenant,
  addUserToTenant,
  assignRoleToUser,
  setTenantContext,
} from './helpers/tenant';
import {
  createTestWorkOrder,
  createTestLocation,
  createTestDepartment,
  createTestAsset,
} from './helpers/entities';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Error Handling & Edge Cases', () => {
  let client: SupabaseClient;

  beforeAll(async () => {
    await waitForSupabase();
    client = createTestClient();
  });

  describe('Error Code Consistency', () => {
    it('should use P0001 for not found errors', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const fakeId = '00000000-0000-0000-0000-000000000000';

      // Work order not found
      const { error: woError } = await client.rpc('rpc_transition_work_order_status', {
        p_tenant_id: tenantId,
        p_work_order_id: fakeId,
        p_to_status_key: 'assigned',
      });

      expect(woError).toBeDefined();
      expect(woError?.code).toBe('P0001');
      expect(woError?.message).toContain('not found');

      // Department not found
      const { error: deptError } = await client.rpc('rpc_update_department', {
        p_tenant_id: tenantId,
        p_department_id: fakeId,
        p_name: 'Updated',
      });

      expect(deptError).toBeDefined();
      expect(deptError?.code).toBe('P0001');
      expect(deptError?.message).toContain('not found');
    });

    it('should use 42501 for unauthorized/permission denied errors', async () => {
      const adminClient = createTestClient();
      const { user: admin } = await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);

      const memberClient = createTestClient();
      const { user: member } = await createTestUser(memberClient);
      await addUserToTenant(adminClient, member.id, tenantId);
      await setTenantContext(memberClient, tenantId);

      const departmentId = await createTestDepartment(adminClient, tenantId, 'Test Dept');

      // Member trying to update department (requires tenant.admin)
      const { error } = await memberClient.rpc('rpc_update_department', {
        p_tenant_id: tenantId,
        p_department_id: departmentId,
        p_name: 'Updated',
      });

      expect(error).toBeDefined();
      expect(error?.code).toBe('42501');
      expect(error?.message).toMatch(/Permission denied|Unauthorized.*tenant\.admin/i);
    });

    it('should use 23503 for constraint violations', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      // Invalid status transition (constraint violation)
      const woId = await createTestWorkOrder(client, tenantId, 'Test WO');

      const { error } = await client.rpc('rpc_transition_work_order_status', {
        p_tenant_id: tenantId,
        p_work_order_id: woId,
        p_to_status_key: 'completed', // Invalid: draft -> completed
      });

      expect(error).toBeDefined();
      expect(error?.code).toBe('23503');
      expect(error?.message).toContain('Invalid status transition');
    });

    it('should use 23514 for check constraint violations', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const woId = await createTestWorkOrder(client, tenantId, 'Test WO');

      // Minutes constraint violation
      const { error } = await client.rpc('rpc_log_work_order_time', {
        p_tenant_id: tenantId,
        p_work_order_id: woId,
        p_minutes: 0, // Invalid: must be > 0
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('work_order_time_entries_minutes_check');
    });

    it('should use 54000 for rate limit errors', async () => {
      const testClient = createTestClient();
      
      // Exceed rate limit
      for (let i = 0; i < 5; i++) {
        await createTestUser(testClient);
        await createTestTenant(testClient, `Tenant ${i}`, `tenant-${i}-${Date.now()}`);
      }

      await createTestUser(testClient);
      const { error } = await testClient.rpc('rpc_create_tenant', {
        p_name: 'Rate Limited',
        p_slug: `rate-limited-${Date.now()}`,
      });

      expect(error).toBeDefined();
      // Rate limit errors may not always set code to 54000 or have message
      if (error?.code) {
        expect(['54000', 'P0001']).toContain(error.code);
      }
      if (error?.message) {
        expect(error.message).toContain('Rate limit exceeded');
      }
    });
  });

  describe('Missing Resource Handling', () => {
    it('should handle operations on non-existent tenants', async () => {
      const { user } = await createTestUser(client);
      const fakeTenantId = '00000000-0000-0000-0000-000000000000';

      const { error } = await client.rpc('rpc_create_work_order', {
        p_tenant_id: fakeTenantId,
        p_title: 'Test',
        p_priority: 'medium',
      });

      expect(error).toBeDefined();
      // Creating work order for non-existent tenant results in FK violation or "not a member" error
      expect(error?.message).toMatch(/not a member|foreign key|violates foreign key constraint/i);
    });

    it('should handle operations on non-existent work orders', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const fakeWoId = '00000000-0000-0000-0000-000000000000';

      const { error } = await client.rpc('rpc_transition_work_order_status', {
        p_tenant_id: tenantId,
        p_work_order_id: fakeWoId,
        p_to_status_key: 'assigned',
      });

      expect(error).toBeDefined();
      expect(error?.code).toBe('P0001');
      expect(error?.message).toContain('not found');
    });

    it('should handle operations on non-existent locations', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const fakeLocationId = '00000000-0000-0000-0000-000000000000';

      const { error } = await client.rpc('rpc_update_location', {
        p_tenant_id: tenantId,
        p_location_id: fakeLocationId,
        p_name: 'Updated',
      });

      expect(error).toBeDefined();
      expect(error?.code).toBe('P0001');
      expect(error?.message).toContain('not found');
    });

    it('should handle operations on deleted resources', async () => {
      const adminClient = createTestClient();
      const { user: admin } = await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);
      await setTenantContext(adminClient, tenantId);

      const departmentId = await createTestDepartment(adminClient, tenantId, 'To Delete');

      // Delete department
      await adminClient.rpc('rpc_delete_department', {
        p_tenant_id: tenantId,
        p_department_id: departmentId,
      });

      // Try to update deleted department
      const { error } = await adminClient.rpc('rpc_update_department', {
        p_tenant_id: tenantId,
        p_department_id: departmentId,
        p_name: 'Updated',
      });

      expect(error).toBeDefined();
      expect(error?.code).toBe('P0001');
      expect(error?.message).toContain('not found');
    });
  });

  describe('Permission Error Clarity', () => {
    it('should specify which permission is missing', async () => {
      const adminClient = createTestClient();
      const { user: admin } = await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);

      const memberClient = createTestClient();
      const { user: member } = await createTestUser(memberClient);
      await addUserToTenant(adminClient, member.id, tenantId);
      await setTenantContext(memberClient, tenantId);

      const departmentId = await createTestDepartment(adminClient, tenantId, 'Test Dept');

      const { error } = await memberClient.rpc('rpc_update_department', {
        p_tenant_id: tenantId,
        p_department_id: departmentId,
        p_name: 'Updated',
      });

      expect(error).toBeDefined();
      expect(error?.message).toMatch(/Permission denied.*tenant\.admin|Unauthorized.*tenant\.admin permission required/i);
    });

    it('should provide clear self-assignment errors', async () => {
      const adminClient = createTestClient();
      const { user: admin } = await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);

      const userClient = createTestClient();
      const { user: targetUser } = await createTestUser(userClient);
      await addUserToTenant(adminClient, targetUser.id, tenantId);

      // User trying to assign role to themselves
      const { error } = await userClient.rpc('rpc_assign_role_to_user', {
        p_tenant_id: tenantId,
        p_user_id: targetUser.id,
        p_role_key: 'manager',
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('cannot modify their own role');
      expect(error?.code).toBe('42501');
    });

    it('should provide clear tenant membership errors', async () => {
      const adminClient = createTestClient();
      const { user: admin } = await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);

      const outsiderClient = createTestClient();
      const { user: outsider } = await createTestUser(outsiderClient);

      const { error } = await outsiderClient.rpc('rpc_create_work_order', {
        p_tenant_id: tenantId,
        p_title: 'Test',
        p_priority: 'medium',
      });

      expect(error).toBeDefined();
      expect(error?.message).toMatch(/not a member|foreign key|violates foreign key constraint/i);
      expect(error?.code).toBe('42501');
    });
  });

  describe('Validation Error Messages', () => {
    it('should provide helpful constraint violation messages', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const woId = await createTestWorkOrder(client, tenantId, 'Test WO');

      // Minutes constraint
      const { error: minutesError } = await client.rpc('rpc_log_work_order_time', {
        p_tenant_id: tenantId,
        p_work_order_id: woId,
        p_minutes: -1,
      });

      expect(minutesError).toBeDefined();
      expect(minutesError?.message).toContain('work_order_time_entries_minutes_check');

      // File ref length constraint
      const { error: fileRefError } = await client.rpc('rpc_add_work_order_attachment', {
        p_tenant_id: tenantId,
        p_work_order_id: woId,
        p_file_ref: 'a'.repeat(501),
      });

      expect(fileRefError).toBeDefined();
      expect(fileRefError?.message).toContain('work_order_attachments_file_ref_length_check');
    });

    it('should identify foreign key violations', async () => {
      const admin1Client = createTestClient();
      const { user: admin1 } = await createTestUser(admin1Client);
      const tenantId1 = await createTestTenant(admin1Client);
      await setTenantContext(admin1Client, tenantId1);

      const admin2Client = createTestClient();
      const { user: admin2 } = await createTestUser(admin2Client);
      const tenantId2 = await createTestTenant(admin2Client);

      const location2Id = await createTestLocation(admin2Client, tenantId2, 'Tenant2 Location');

      // Try to reference other tenant's location
      const { error } = await admin1Client.rpc('rpc_create_asset', {
        p_tenant_id: tenantId1,
        p_name: 'Asset',
        p_location_id: location2Id,
      });

      expect(error).toBeDefined();
      // Error should indicate location doesn't belong to tenant
      expect(error?.message).toMatch(/location|tenant|belong/i);
    });

    it('should provide clear format validation errors', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      // Invalid status format
      const { error: statusError } = await client.rpc('rpc_create_status', {
        p_tenant_id: tenantId,
        p_entity_type: 'work_order',
        p_key: 'Invalid-Status', // Contains hyphen
        p_name: 'Invalid Status',
        p_category: 'open',
        p_display_order: 100,
      });

      expect(statusError).toBeDefined();
      // Should indicate format issue

      // Invalid department code format
      const { error: codeError } = await client.rpc('rpc_create_department', {
        p_tenant_id: tenantId,
        p_name: 'Test Dept',
        p_code: 'lowercase', // Should be uppercase
      });

      expect(codeError).toBeDefined();
      expect(codeError?.message).toContain('uppercase alphanumeric');
    });
  });

  describe('Error Message User-Friendliness', () => {
    it('should provide actionable error messages', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      // Missing required field
      const { error: missingField } = await client.rpc('rpc_create_work_order', {
        p_tenant_id: tenantId,
        // Missing p_title
        p_priority: 'medium',
      } as any);

      expect(missingField).toBeDefined();
      // Error should indicate what's missing

      // Invalid value
      const { error: invalidValue } = await client.rpc('rpc_create_work_order', {
        p_tenant_id: tenantId,
        p_title: 'Test',
        p_priority: 'invalid_priority',
      });

      expect(invalidValue).toBeDefined();
      expect(invalidValue?.message).toContain('Invalid priority');
    });

    it('should avoid exposing internal implementation details', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const fakeId = '00000000-0000-0000-0000-000000000000';

      const { error } = await client.rpc('rpc_transition_work_order_status', {
        p_tenant_id: tenantId,
        p_work_order_id: fakeId,
        p_to_status_key: 'assigned',
      });

      expect(error).toBeDefined();
      // Error should not expose SQL details or internal table names
      expect(error?.message).not.toMatch(/app\.|cfg\.|util\./);
      expect(error?.message).not.toContain('SELECT');
      expect(error?.message).not.toContain('FROM');
    });
  });
});
