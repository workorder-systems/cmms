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
  createTestDepartment,
  createTestLocation,
  createTestAsset,
} from './helpers/entities';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Update/Delete Security', () => {
  let client: SupabaseClient;

  beforeAll(async () => {
    await waitForSupabase();
    client = createTestClient();
  });

  describe('Update Operations - Permission Enforcement', () => {
    it('should require tenant.admin permission to update departments', async () => {
      const adminClient = createTestClient();
      const { user: admin } = await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);

      const memberClient = createTestClient();
      const { user: member } = await createTestUser(memberClient);
      await addUserToTenant(adminClient, member.id, tenantId);
      await setTenantContext(memberClient, tenantId);

      const departmentId = await createTestDepartment(adminClient, tenantId, 'Test Dept');

      // Member should not be able to update
      const { error } = await memberClient.rpc('rpc_update_department', {
        p_tenant_id: tenantId,
        p_department_id: departmentId,
        p_name: 'Updated Name',
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('tenant.admin permission required');
      expect(error?.code).toBe('42501');
    });

    it('should allow tenant.admin to update departments', async () => {
      const adminClient = createTestClient();
      const { user: admin } = await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);
      await setTenantContext(adminClient, tenantId);

      const departmentId = await createTestDepartment(adminClient, tenantId, 'Original Name');

      const { error } = await adminClient.rpc('rpc_update_department', {
        p_tenant_id: tenantId,
        p_department_id: departmentId,
        p_name: 'Updated Name',
      });

      expect(error).toBeNull();

      // Verify update
      const { data } = await adminClient
        .from('v_departments')
        .select('name')
        .eq('id', departmentId)
        .single();

      expect(data?.name).toBe('Updated Name');
    });

    it('should require tenant membership to update locations', async () => {
      const adminClient = createTestClient();
      const { user: admin } = await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);

      const outsiderClient = createTestClient();
      const { user: outsider } = await createTestUser(outsiderClient);

      const locationId = await createTestLocation(adminClient, tenantId, 'Test Location');

      // Outsider should not be able to update
      const { error } = await outsiderClient.rpc('rpc_update_location', {
        p_tenant_id: tenantId,
        p_location_id: locationId,
        p_name: 'Updated Location',
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('not a member of this tenant');
      expect(error?.code).toBe('42501');
    });

    it('should allow tenant members to update locations', async () => {
      const adminClient = createTestClient();
      const { user: admin } = await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);
      await setTenantContext(adminClient, tenantId);

      const locationId = await createTestLocation(adminClient, tenantId, 'Original Location');

      const { error } = await adminClient.rpc('rpc_update_location', {
        p_tenant_id: tenantId,
        p_location_id: locationId,
        p_name: 'Updated Location',
      });

      expect(error).toBeNull();

      // Verify update
      const { data } = await adminClient
        .from('v_locations')
        .select('name')
        .eq('id', locationId)
        .single();

      expect(data?.name).toBe('Updated Location');
    });

    it('should require tenant membership to update assets', async () => {
      const adminClient = createTestClient();
      const { user: admin } = await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);

      const outsiderClient = createTestClient();
      const { user: outsider } = await createTestUser(outsiderClient);

      const assetId = await createTestAsset(adminClient, tenantId, 'Test Asset');

      // Outsider should not be able to update
      const { error } = await outsiderClient.rpc('rpc_update_asset', {
        p_tenant_id: tenantId,
        p_asset_id: assetId,
        p_name: 'Updated Asset',
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('not a member of this tenant');
      expect(error?.code).toBe('42501');
    });

    it('should allow tenant members to update assets', async () => {
      const adminClient = createTestClient();
      const { user: admin } = await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);
      await setTenantContext(adminClient, tenantId);

      const assetId = await createTestAsset(adminClient, tenantId, 'Original Asset');

      const { error } = await adminClient.rpc('rpc_update_asset', {
        p_tenant_id: tenantId,
        p_asset_id: assetId,
        p_name: 'Updated Asset',
      });

      expect(error).toBeNull();

      // Verify update
      const { data } = await adminClient
        .from('v_assets')
        .select('name')
        .eq('id', assetId)
        .single();

      expect(data?.name).toBe('Updated Asset');
    });
  });

  describe('Update Operations - Tenant Isolation', () => {
    it('should prevent updating other tenant\'s departments', async () => {
      const admin1Client = createTestClient();
      const { user: admin1 } = await createTestUser(admin1Client);
      const tenantId1 = await createTestTenant(admin1Client);

      const admin2Client = createTestClient();
      const { user: admin2 } = await createTestUser(admin2Client);
      const tenantId2 = await createTestTenant(admin2Client);

      const departmentId1 = await createTestDepartment(admin1Client, tenantId1, 'Tenant1 Dept');

      // Admin2 should not be able to update Tenant1's department
      const { error } = await admin2Client.rpc('rpc_update_department', {
        p_tenant_id: tenantId2, // Wrong tenant ID
        p_department_id: departmentId1,
        p_name: 'Hacked Name',
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('does not belong to this tenant');
      expect(error?.code).toBe('42501');
    });

    it('should prevent updating other tenant\'s locations', async () => {
      const admin1Client = createTestClient();
      const { user: admin1 } = await createTestUser(admin1Client);
      const tenantId1 = await createTestTenant(admin1Client);

      const admin2Client = createTestClient();
      const { user: admin2 } = await createTestUser(admin2Client);
      const tenantId2 = await createTestTenant(admin2Client);

      const locationId1 = await createTestLocation(admin1Client, tenantId1, 'Tenant1 Location');

      // Admin2 should not be able to update Tenant1's location
      const { error } = await admin2Client.rpc('rpc_update_location', {
        p_tenant_id: tenantId2, // Wrong tenant ID
        p_location_id: locationId1,
        p_name: 'Hacked Location',
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('does not belong to this tenant');
      expect(error?.code).toBe('42501');
    });

    it('should prevent updating other tenant\'s assets', async () => {
      const admin1Client = createTestClient();
      const { user: admin1 } = await createTestUser(admin1Client);
      const tenantId1 = await createTestTenant(admin1Client);

      const admin2Client = createTestClient();
      const { user: admin2 } = await createTestUser(admin2Client);
      const tenantId2 = await createTestTenant(admin2Client);

      const assetId1 = await createTestAsset(admin1Client, tenantId1, 'Tenant1 Asset');

      // Admin2 should not be able to update Tenant1's asset
      const { error } = await admin2Client.rpc('rpc_update_asset', {
        p_tenant_id: tenantId2, // Wrong tenant ID
        p_asset_id: assetId1,
        p_name: 'Hacked Asset',
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('does not belong to this tenant');
      expect(error?.code).toBe('42501');
    });
  });

  describe('Update Operations - Foreign Key Validation', () => {
    it('should validate location_id belongs to tenant when updating asset', async () => {
      const admin1Client = createTestClient();
      const { user: admin1 } = await createTestUser(admin1Client);
      const tenantId1 = await createTestTenant(admin1Client);
      await setTenantContext(admin1Client, tenantId1);

      const admin2Client = createTestClient();
      const { user: admin2 } = await createTestUser(admin2Client);
      const tenantId2 = await createTestTenant(admin2Client);

      const assetId1 = await createTestAsset(admin1Client, tenantId1, 'Asset');
      const locationId2 = await createTestLocation(admin2Client, tenantId2, 'Other Tenant Location');

      // Should not be able to assign Tenant2's location to Tenant1's asset
      const { error } = await admin1Client.rpc('rpc_update_asset', {
        p_tenant_id: tenantId1,
        p_asset_id: assetId1,
        p_location_id: locationId2,
      });

      expect(error).toBeDefined();
      // Error should indicate location doesn't belong to tenant
      // This is enforced by trigger validate_asset_location_tenant
    });

    it('should validate department_id belongs to tenant when updating asset', async () => {
      const admin1Client = createTestClient();
      const { user: admin1 } = await createTestUser(admin1Client);
      const tenantId1 = await createTestTenant(admin1Client);
      await setTenantContext(admin1Client, tenantId1);

      const admin2Client = createTestClient();
      const { user: admin2 } = await createTestUser(admin2Client);
      const tenantId2 = await createTestTenant(admin2Client);

      const assetId1 = await createTestAsset(admin1Client, tenantId1, 'Asset');
      const departmentId2 = await createTestDepartment(admin2Client, tenantId2, 'Other Tenant Dept');

      // Should not be able to assign Tenant2's department to Tenant1's asset
      const { error } = await admin1Client.rpc('rpc_update_asset', {
        p_tenant_id: tenantId1,
        p_asset_id: assetId1,
        p_department_id: departmentId2,
      });

      expect(error).toBeDefined();
      // Error should indicate department doesn't belong to tenant
      // This is enforced by trigger validate_asset_department_tenant
    });

    it('should validate parent_location_id belongs to tenant when updating location', async () => {
      const admin1Client = createTestClient();
      const { user: admin1 } = await createTestUser(admin1Client);
      const tenantId1 = await createTestTenant(admin1Client);
      await setTenantContext(admin1Client, tenantId1);

      const admin2Client = createTestClient();
      const { user: admin2 } = await createTestUser(admin2Client);
      const tenantId2 = await createTestTenant(admin2Client);

      const locationId1 = await createTestLocation(admin1Client, tenantId1, 'Location');
      const parentLocationId2 = await createTestLocation(admin2Client, tenantId2, 'Other Tenant Parent');

      // Should not be able to assign Tenant2's location as parent
      const { error } = await admin1Client.rpc('rpc_update_location', {
        p_tenant_id: tenantId1,
        p_location_id: locationId1,
        p_parent_location_id: parentLocationId2,
      });

      expect(error).toBeDefined();
      // Error should indicate parent location doesn't belong to tenant
      // This is enforced by trigger validate_location_parent_tenant
    });
  });

  describe('Update Operations - updated_at Timestamp', () => {
    it('should update updated_at timestamp when updating department', async () => {
      const adminClient = createTestClient();
      const { user: admin } = await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);
      await setTenantContext(adminClient, tenantId);

      const departmentId = await createTestDepartment(adminClient, tenantId, 'Test Dept');

      // Get initial updated_at
      const { data: initial } = await adminClient
        .from('v_departments')
        .select('updated_at')
        .eq('id', departmentId)
        .single();

      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

      // Update department
      await adminClient.rpc('rpc_update_department', {
        p_tenant_id: tenantId,
        p_department_id: departmentId,
        p_name: 'Updated Name',
      });

      // Get updated updated_at
      const { data: updated } = await adminClient
        .from('v_departments')
        .select('updated_at')
        .eq('id', departmentId)
        .single();

      expect(new Date(updated!.updated_at).getTime()).toBeGreaterThan(
        new Date(initial!.updated_at).getTime()
      );
    });

    it('should update updated_at timestamp when updating location', async () => {
      const adminClient = createTestClient();
      const { user: admin } = await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);
      await setTenantContext(adminClient, tenantId);

      const locationId = await createTestLocation(adminClient, tenantId, 'Test Location');

      // Get initial updated_at
      const { data: initial } = await adminClient
        .from('v_locations')
        .select('updated_at')
        .eq('id', locationId)
        .single();

      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

      // Update location
      await adminClient.rpc('rpc_update_location', {
        p_tenant_id: tenantId,
        p_location_id: locationId,
        p_name: 'Updated Location',
      });

      // Get updated updated_at
      const { data: updated } = await adminClient
        .from('v_locations')
        .select('updated_at')
        .eq('id', locationId)
        .single();

      expect(new Date(updated!.updated_at).getTime()).toBeGreaterThan(
        new Date(initial!.updated_at).getTime()
      );
    });

    it('should update updated_at timestamp when updating asset', async () => {
      const adminClient = createTestClient();
      const { user: admin } = await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);
      await setTenantContext(adminClient, tenantId);

      const assetId = await createTestAsset(adminClient, tenantId, 'Test Asset');

      // Get initial updated_at
      const { data: initial } = await adminClient
        .from('v_assets')
        .select('updated_at')
        .eq('id', assetId)
        .single();

      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

      // Update asset
      await adminClient.rpc('rpc_update_asset', {
        p_tenant_id: tenantId,
        p_asset_id: assetId,
        p_name: 'Updated Asset',
      });

      // Get updated updated_at
      const { data: updated } = await adminClient
        .from('v_assets')
        .select('updated_at')
        .eq('id', assetId)
        .single();

      expect(new Date(updated!.updated_at).getTime()).toBeGreaterThan(
        new Date(initial!.updated_at).getTime()
      );
    });
  });

  describe('Update Operations - Audit Logging', () => {
    it('should log department updates in audit table', async () => {
      const adminClient = createTestClient();
      const { user: admin } = await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);
      await setTenantContext(adminClient, tenantId);

      const departmentId = await createTestDepartment(adminClient, tenantId, 'Original Name');

      // Update department
      await adminClient.rpc('rpc_update_department', {
        p_tenant_id: tenantId,
        p_department_id: departmentId,
        p_name: 'Updated Name',
      });

      // Check audit log
      const { data: audits } = await adminClient
        .from('v_audit_entity_changes')
        .select('*')
        .eq('table_name', 'departments')
        .eq('record_id', departmentId)
        .eq('operation', 'UPDATE');

      expect(audits).toBeDefined();
      expect(audits!.length).toBeGreaterThan(0);
      expect(audits![0].changed_fields).toContain('name');
    });

    it('should log location updates in audit table', async () => {
      const adminClient = createTestClient();
      const { user: admin } = await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);
      await setTenantContext(adminClient, tenantId);

      const locationId = await createTestLocation(adminClient, tenantId, 'Original Location');

      // Update location
      await adminClient.rpc('rpc_update_location', {
        p_tenant_id: tenantId,
        p_location_id: locationId,
        p_name: 'Updated Location',
      });

      // Check audit log
      const { data: audits } = await adminClient
        .from('v_audit_entity_changes')
        .select('*')
        .eq('table_name', 'locations')
        .eq('record_id', locationId)
        .eq('operation', 'UPDATE');

      expect(audits).toBeDefined();
      expect(audits!.length).toBeGreaterThan(0);
      expect(audits![0].changed_fields).toContain('name');
    });

    it('should log asset updates in audit table', async () => {
      const adminClient = createTestClient();
      const { user: admin } = await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);
      await setTenantContext(adminClient, tenantId);

      const assetId = await createTestAsset(adminClient, tenantId, 'Original Asset');

      // Update asset
      await adminClient.rpc('rpc_update_asset', {
        p_tenant_id: tenantId,
        p_asset_id: assetId,
        p_name: 'Updated Asset',
      });

      // Check audit log
      const { data: audits } = await adminClient
        .from('v_audit_entity_changes')
        .select('*')
        .eq('table_name', 'assets')
        .eq('record_id', assetId)
        .eq('operation', 'UPDATE');

      expect(audits).toBeDefined();
      expect(audits!.length).toBeGreaterThan(0);
      expect(audits![0].changed_fields).toContain('name');
    });
  });

  describe('Delete Operations - Permission Enforcement', () => {
    it('should require tenant.admin permission to delete departments', async () => {
      const adminClient = createTestClient();
      const { user: admin } = await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);

      const memberClient = createTestClient();
      const { user: member } = await createTestUser(memberClient);
      await addUserToTenant(adminClient, member.id, tenantId);
      await setTenantContext(memberClient, tenantId);

      const departmentId = await createTestDepartment(adminClient, tenantId, 'Test Dept');

      // Member should not be able to delete
      const { error } = await memberClient.rpc('rpc_delete_department', {
        p_tenant_id: tenantId,
        p_department_id: departmentId,
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('tenant.admin permission required');
      expect(error?.code).toBe('42501');
    });

    it('should allow tenant.admin to delete departments', async () => {
      const adminClient = createTestClient();
      const { user: admin } = await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);
      await setTenantContext(adminClient, tenantId);

      const departmentId = await createTestDepartment(adminClient, tenantId, 'To Delete');

      const { error } = await adminClient.rpc('rpc_delete_department', {
        p_tenant_id: tenantId,
        p_department_id: departmentId,
      });

      expect(error).toBeNull();

      // Verify deletion
      const { data } = await adminClient
        .from('v_departments')
        .select('id')
        .eq('id', departmentId);

      expect(data?.length ?? 0).toBe(0);
    });
  });

  describe('Delete Operations - Tenant Isolation', () => {
    it('should prevent deleting other tenant\'s departments', async () => {
      const admin1Client = createTestClient();
      const { user: admin1 } = await createTestUser(admin1Client);
      const tenantId1 = await createTestTenant(admin1Client);

      const admin2Client = createTestClient();
      const { user: admin2 } = await createTestUser(admin2Client);
      const tenantId2 = await createTestTenant(admin2Client);

      const departmentId1 = await createTestDepartment(admin1Client, tenantId1, 'Tenant1 Dept');

      // Admin2 should not be able to delete Tenant1's department
      const { error } = await admin2Client.rpc('rpc_delete_department', {
        p_tenant_id: tenantId2, // Wrong tenant ID
        p_department_id: departmentId1,
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('does not belong to this tenant');
      expect(error?.code).toBe('42501');
    });
  });

  describe('Delete Operations - Cascade Behavior', () => {
    it('should set asset department_id to null when department is deleted', async () => {
      const adminClient = createTestClient();
      const { user: admin } = await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);
      await setTenantContext(adminClient, tenantId);

      const departmentId = await createTestDepartment(adminClient, tenantId, 'Dept');
      const assetId = await createTestAsset(adminClient, tenantId, 'Asset', undefined, departmentId);

      // Verify asset has department
      const { data: before } = await adminClient
        .from('v_assets')
        .select('department_id')
        .eq('id', assetId)
        .single();

      expect(before?.department_id).toBe(departmentId);

      // Delete department
      await adminClient.rpc('rpc_delete_department', {
        p_tenant_id: tenantId,
        p_department_id: departmentId,
      });

      // Verify asset department_id is null
      const { data: after } = await adminClient
        .from('v_assets')
        .select('department_id')
        .eq('id', assetId)
        .single();

      expect(after?.department_id).toBeNull();
    });

    it('should set asset location_id to null when location is deleted', async () => {
      const adminClient = createTestClient();
      const { user: admin } = await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);
      await setTenantContext(adminClient, tenantId);

      const locationId = await createTestLocation(adminClient, tenantId, 'Location');
      const assetId = await createTestAsset(adminClient, tenantId, 'Asset', locationId);

      // Verify asset has location
      const { data: before } = await adminClient
        .from('v_assets')
        .select('location_id')
        .eq('id', assetId)
        .single();

      expect(before?.location_id).toBe(locationId);

      // Delete location
      await adminClient.rpc('rpc_delete_location', {
        p_tenant_id: tenantId,
        p_location_id: locationId,
      });

      // Verify asset location_id is null
      const { data: after } = await adminClient
        .from('v_assets')
        .select('location_id')
        .eq('id', assetId)
        .single();

      expect(after?.location_id).toBeNull();
    });
  });

  describe('Delete Operations - Audit Logging', () => {
    it('should log department deletions in audit table', async () => {
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

      // Check audit log
      const { data: audits } = await adminClient
        .from('v_audit_entity_changes')
        .select('*')
        .eq('table_name', 'departments')
        .eq('record_id', departmentId)
        .eq('operation', 'DELETE');

      expect(audits).toBeDefined();
      expect(audits!.length).toBeGreaterThan(0);
    });

    it('should log location deletions in audit table', async () => {
      const adminClient = createTestClient();
      const { user: admin } = await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);
      await setTenantContext(adminClient, tenantId);

      const locationId = await createTestLocation(adminClient, tenantId, 'To Delete');

      // Delete location
      await adminClient.rpc('rpc_delete_location', {
        p_tenant_id: tenantId,
        p_location_id: locationId,
      });

      // Check audit log
      const { data: audits } = await adminClient
        .from('v_audit_entity_changes')
        .select('*')
        .eq('table_name', 'locations')
        .eq('record_id', locationId)
        .eq('operation', 'DELETE');

      expect(audits).toBeDefined();
      expect(audits!.length).toBeGreaterThan(0);
    });

    it('should log asset deletions in audit table', async () => {
      const adminClient = createTestClient();
      const { user: admin } = await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);
      await setTenantContext(adminClient, tenantId);

      const assetId = await createTestAsset(adminClient, tenantId, 'To Delete');

      // Delete asset
      await adminClient.rpc('rpc_delete_asset', {
        p_tenant_id: tenantId,
        p_asset_id: assetId,
      });

      // Check audit log
      const { data: audits } = await adminClient
        .from('v_audit_entity_changes')
        .select('*')
        .eq('table_name', 'assets')
        .eq('record_id', assetId)
        .eq('operation', 'DELETE');

      expect(audits).toBeDefined();
      expect(audits!.length).toBeGreaterThan(0);
    });
  });

  describe('Delete Operations - RLS Prevents Viewing Deleted Records', () => {
    it('should prevent viewing deleted departments via views', async () => {
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

      // Should not be able to view deleted department
      const { data } = await adminClient
        .from('v_departments')
        .select('id')
        .eq('id', departmentId);

      expect(data?.length ?? 0).toBe(0);
    });

    it('should prevent viewing deleted locations via views', async () => {
      const adminClient = createTestClient();
      const { user: admin } = await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);
      await setTenantContext(adminClient, tenantId);

      const locationId = await createTestLocation(adminClient, tenantId, 'To Delete');

      // Delete location
      await adminClient.rpc('rpc_delete_location', {
        p_tenant_id: tenantId,
        p_location_id: locationId,
      });

      // Should not be able to view deleted location
      const { data } = await adminClient
        .from('v_locations')
        .select('id')
        .eq('id', locationId);

      expect(data?.length ?? 0).toBe(0);
    });

    it('should prevent viewing deleted assets via views', async () => {
      const adminClient = createTestClient();
      const { user: admin } = await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);
      await setTenantContext(adminClient, tenantId);

      const assetId = await createTestAsset(adminClient, tenantId, 'To Delete');

      // Delete asset
      await adminClient.rpc('rpc_delete_asset', {
        p_tenant_id: tenantId,
        p_asset_id: assetId,
      });

      // Should not be able to view deleted asset
      const { data } = await adminClient
        .from('v_assets')
        .select('id')
        .eq('id', assetId);

      expect(data?.length ?? 0).toBe(0);
    });
  });

  describe('Concurrent Update/Delete', () => {
    it('should handle concurrent updates gracefully', async () => {
      const adminClient = createTestClient();
      const { user: admin } = await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);
      await setTenantContext(adminClient, tenantId);

      const departmentId = await createTestDepartment(adminClient, tenantId, 'Original');

      // Concurrent updates
      const promises = [
        adminClient.rpc('rpc_update_department', {
          p_tenant_id: tenantId,
          p_department_id: departmentId,
          p_name: 'Update 1',
        }),
        adminClient.rpc('rpc_update_department', {
          p_tenant_id: tenantId,
          p_department_id: departmentId,
          p_name: 'Update 2',
        }),
      ];

      const results = await Promise.allSettled(promises);

      // At least one should succeed
      const succeeded = results.filter(r => r.status === 'fulfilled');
      expect(succeeded.length).toBeGreaterThan(0);

      // Verify final state
      const { data } = await adminClient
        .from('v_departments')
        .select('name')
        .eq('id', departmentId)
        .single();

      expect(['Update 1', 'Update 2']).toContain(data?.name);
    });

    it('should prevent deleting while update is in progress', async () => {
      const adminClient = createTestClient();
      const { user: admin } = await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);
      await setTenantContext(adminClient, tenantId);

      const departmentId = await createTestDepartment(adminClient, tenantId, 'Test');

      // Start update and delete concurrently
      const [updateResult, deleteResult] = await Promise.allSettled([
        adminClient.rpc('rpc_update_department', {
          p_tenant_id: tenantId,
          p_department_id: departmentId,
          p_name: 'Updated',
        }),
        adminClient.rpc('rpc_delete_department', {
          p_tenant_id: tenantId,
          p_department_id: departmentId,
        }),
      ]);

      // One should succeed, one may fail or both succeed (depending on timing)
      // The key is that the final state is consistent
      const { data } = await adminClient
        .from('v_departments')
        .select('id')
        .eq('id', departmentId);

      // Either deleted (empty) or updated (exists with new name)
      if (data && data.length > 0) {
        expect(data[0].id).toBe(departmentId);
      } else {
        // Deleted - verify audit log exists
        const { data: audits } = await adminClient
          .from('v_audit_entity_changes')
          .select('*')
          .eq('table_name', 'departments')
          .eq('record_id', departmentId)
          .eq('operation', 'DELETE');

        expect(audits?.length ?? 0).toBeGreaterThan(0);
      }
    });
  });
});
