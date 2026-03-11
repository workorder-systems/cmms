import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient, waitForSupabase } from './helpers/supabase';
import { createTestUser } from './helpers/auth';
import { createTestTenant, addUserToTenant, setTenantContext } from './helpers/tenant';
import {
  createTestLocation,
  createTestDepartment,
  createTestAsset,
} from './helpers/entities';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Assets', () => {
  let client: SupabaseClient;

  beforeAll(async () => {
    await waitForSupabase();
    client = createTestClient();
  });

  describe('Creating assets', () => {
    it('should create an asset record in the registry', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      const assetId = await createTestAsset(client, tenantId, 'HVAC Unit #5');

      expect(assetId).toBeDefined();
      expect(typeof assetId).toBe('string');

      await setTenantContext(client, tenantId);
      const { data: asset, error } = await client
        .from('v_assets')
        .select('*')
        .eq('id', assetId)
        .single();

      expect(error).toBeNull();
      expect(asset).toBeDefined();
      expect(asset.name).toBe('HVAC Unit #5');
      expect(asset.tenant_id).toBe(tenantId);
      expect(asset.status).toBe('active');
    });

    it('should create an asset assigned to a site (location)', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const locationId = await createTestLocation(client, tenantId, 'Building A');

      const assetId = await createTestAsset(
        client,
        tenantId,
        'Asset with Location',
        locationId
      );

      // Verify location assignment
      await setTenantContext(client, tenantId);
      const { data: asset } = await client
        .from('v_assets')
        .select('*')
        .eq('id', assetId)
        .single();

      expect(asset.location_id).toBe(locationId);
    });

    it('should create an asset assigned to a maintenance department', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const departmentId = await createTestDepartment(client, tenantId, 'Engineering');

      const assetId = await createTestAsset(
        client,
        tenantId,
        'Asset with Department',
        undefined,
        departmentId
      );

      // Verify department assignment
      await setTenantContext(client, tenantId);
      const { data: asset } = await client
        .from('v_assets')
        .select('*')
        .eq('id', assetId)
        .single();

      expect(asset.department_id).toBe(departmentId);
    });
  });

  describe('Tenant validation', () => {
    it('should reject assets whose location belongs to a different tenant', async () => {
      const tenantId1 = await createTestTenant(client);
      const tenantId2 = await createTestTenant(client);

      const locationId = await createTestLocation(client, tenantId1, 'Location');

      // Try to create asset in tenant2 with location from tenant1
      const { data, error } = await client.rpc('rpc_create_asset', {
        p_tenant_id: tenantId2,
        p_name: 'Asset',
        p_location_id: locationId,
        p_status: 'active',
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('same tenant');
    });

    it('should reject assets whose department belongs to a different tenant', async () => {
      const tenantId1 = await createTestTenant(client);
      const tenantId2 = await createTestTenant(client);

      const departmentId = await createTestDepartment(client, tenantId1, 'Department');

      // Try to create asset in tenant2 with department from tenant1
      const { data, error } = await client.rpc('rpc_create_asset', {
        p_tenant_id: tenantId2,
        p_name: 'Asset',
        p_department_id: departmentId,
        p_status: 'active',
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('same tenant');
    });
  });

  describe('Asset status validation', () => {
    it('should reject asset creation when status is not in the status catalog', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      // Try to create asset with invalid status
      const { data, error } = await client.rpc('rpc_create_asset', {
        p_tenant_id: tenantId,
        p_name: 'Asset',
        p_status: 'invalid_status',
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('status catalog');
    });

    it('should accept asset creation when status is in the catalog', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      // Default statuses should include 'active'
      const assetId = await createTestAsset(
        client,
        tenantId,
        'Asset',
        undefined,
        undefined,
        undefined,
        'active'
      );

      expect(assetId).toBeDefined();
    });
  });

  describe('Asset number uniqueness', () => {
    it('should enforce asset_number uniqueness per tenant', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      await createTestAsset(
        client,
        tenantId,
        'Asset 1',
        undefined,
        undefined,
        'ASSET-001'
      );

      // Try to create another asset with same asset_number
      const { data, error } = await client.rpc('rpc_create_asset', {
        p_tenant_id: tenantId,
        p_name: 'Asset 2',
        p_asset_number: 'ASSET-001',
        p_status: 'active',
      });

      expect(error).toBeDefined();
      expect(error?.code).toBe('23505'); // Unique violation
    });

    it('should allow same asset_number in different tenants', async () => {
      const client1 = createTestClient();
      await createTestUser(client1);
      const tenantId1 = await createTestTenant(client1);
      await setTenantContext(client1, tenantId1);

      const client2 = createTestClient();
      await createTestUser(client2);
      const tenantId2 = await createTestTenant(client2);
      await setTenantContext(client2, tenantId2);

      const asset1 = await createTestAsset(
        client1,
        tenantId1,
        'Asset 1',
        undefined,
        undefined,
        'SHARED-001'
      );
      const asset2 = await createTestAsset(
        client2,
        tenantId2,
        'Asset 2',
        undefined,
        undefined,
        'SHARED-001'
      );

      expect(asset1).toBeDefined();
      expect(asset2).toBeDefined();
    });
  });

  describe('Asset Updates', () => {
    it('should update asset name', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      const assetId = await createTestAsset(client, tenantId, 'Old Name');

      const { error } = await client.rpc('rpc_update_asset', {
        p_tenant_id: tenantId,
        p_asset_id: assetId,
        p_name: 'New Name',
      });

      expect(error).toBeNull();

      await setTenantContext(client, tenantId);
      const { data: asset } = await client
        .from('v_assets')
        .select('*')
        .eq('id', assetId)
        .single();

      expect(asset.name).toBe('New Name');
      expect(asset.updated_at).toBeDefined();
    });

    it('should update asset status', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      const assetId = await createTestAsset(
        client,
        tenantId,
        'Asset',
        undefined,
        undefined,
        undefined,
        'active'
      );

      const { error } = await client.rpc('rpc_update_asset', {
        p_tenant_id: tenantId,
        p_asset_id: assetId,
        p_status: 'inactive',
      });

      expect(error).toBeNull();

      await setTenantContext(client, tenantId);
      const { data: asset } = await client
        .from('v_assets')
        .select('*')
        .eq('id', assetId)
        .single();

      expect(asset.status).toBe('inactive');
    });
  });

  describe('Asset lifecycle and costs', () => {
    it('should query v_asset_costs and v_asset_lifecycle_alerts without error', async () => {
      await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const { error: costsError } = await client.from('v_asset_costs').select('asset_id').limit(1);
      expect(costsError).toBeNull();

      const { error: alertsError } = await client.from('v_asset_lifecycle_alerts').select('asset_id').limit(1);
      expect(alertsError).toBeNull();
    });

    it('should query v_projects without error', async () => {
      await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const { data, error } = await client.from('v_projects').select('id, tenant_id').limit(5);
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('Asset Deletion', () => {
    it('should delete asset', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      const assetId = await createTestAsset(client, tenantId, 'To Delete');

      const { error } = await client.rpc('rpc_delete_asset', {
        p_tenant_id: tenantId,
        p_asset_id: assetId,
      });

      expect(error).toBeNull();

      await setTenantContext(client, tenantId);
      const { data: asset } = await client
        .from('v_assets')
        .select('*')
        .eq('id', assetId)
        .single();

      expect(asset).toBeNull();
    });
  });
});
