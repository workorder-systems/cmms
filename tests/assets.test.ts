import { describe, it, expect, beforeAll } from 'vitest';
import {
  createTestClient,
  createServiceRoleClient,
  waitForSupabase,
} from './helpers/supabase';
import { createTestUser } from './helpers/auth';
import { createTestTenant, addUserToTenant, setTenantContext } from './helpers/tenant';
import {
  createTestLocation,
  createTestDepartment,
  createTestDepartmentDirect,
  createTestAsset,
} from './helpers/entities';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Assets', () => {
  let client: SupabaseClient;
  let serviceClient: SupabaseClient;

  beforeAll(async () => {
    await waitForSupabase();
    client = createTestClient();
    serviceClient = createServiceRoleClient();
  });

  describe('Creating assets', () => {
    it('should create an asset record in the registry', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      const assetId = await createTestAsset(serviceClient, tenantId, 'HVAC Unit #5');

      expect(assetId).toBeDefined();
      expect(typeof assetId).toBe('string');

      // Verify asset exists
      const { data: asset, error } = await serviceClient
        .schema('app')
        .from('assets')
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
      const locationId = await createTestLocation(
        serviceClient,
        tenantId,
        'Building A'
      );

      const assetId = await createTestAsset(
        serviceClient,
        tenantId,
        'Asset with Location',
        locationId
      );

      // Verify location assignment
      const { data: asset } = await serviceClient
        .schema('app')
        .from('assets')
        .select('*')
        .eq('id', assetId)
        .single();

      expect(asset.location_id).toBe(locationId);
    });

    it('should create an asset assigned to a maintenance department', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const departmentId = await createTestDepartmentDirect(serviceClient, tenantId, 'Engineering');

      const assetId = await createTestAsset(
        serviceClient,
        tenantId,
        'Asset with Department',
        undefined,
        departmentId
      );

      // Verify department assignment
      const { data: asset } = await serviceClient
        .schema('app')
        .from('assets')
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

      const locationId = await createTestLocation(
        serviceClient,
        tenantId1,
        'Location'
      );

      // Try to create asset in tenant2 with location from tenant1
      const { data, error } = await serviceClient
        .schema('app')
        .from('assets')
        .insert({
          tenant_id: tenantId2,
          name: 'Asset',
          location_id: locationId,
          status: 'active',
        })
        .select('id')
        .single();

      expect(error).toBeDefined();
      expect(error?.message).toContain('same tenant');
    });

    it('should reject assets whose department belongs to a different tenant', async () => {
      const tenantId1 = await createTestTenant(client);
      const tenantId2 = await createTestTenant(client);

      const departmentId = await createTestDepartmentDirect(serviceClient, tenantId1, 'Department');

      // Try to create asset in tenant2 with department from tenant1
      const { data, error } = await serviceClient
        .schema('app')
        .from('assets')
        .insert({
          tenant_id: tenantId2,
          name: 'Asset',
          department_id: departmentId,
          status: 'active',
        })
        .select('id')
        .single();

      expect(error).toBeDefined();
      expect(error?.message).toContain('same tenant');
    });
  });

  describe('Asset status validation', () => {
    it('should reject asset creation when status is not in the status catalog', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      // Try to create asset with invalid status
      const { data, error } = await serviceClient
        .schema('app')
        .from('assets')
        .insert({
          tenant_id: tenantId,
          name: 'Asset',
          status: 'invalid_status',
        })
        .select('id')
        .single();

      expect(error).toBeDefined();
      expect(error?.message).toContain('status catalog');
    });

    it('should accept asset creation when status is in the catalog', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      // Default statuses should include 'active'
      const assetId = await createTestAsset(
        serviceClient,
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
        serviceClient,
        tenantId,
        'Asset 1',
        undefined,
        undefined,
        'ASSET-001'
      );

      // Try to create another asset with same asset_number
      const { data, error } = await serviceClient
        .schema('app')
        .from('assets')
        .insert({
          tenant_id: tenantId,
          name: 'Asset 2',
          asset_number: 'ASSET-001',
          status: 'active',
        })
        .select('id')
        .single();

      expect(error).toBeDefined();
      expect(error?.code).toBe('23505'); // Unique violation
    });

    it('should allow same asset_number in different tenants', async () => {
      await createTestUser(client);
      const tenantId1 = await createTestTenant(client);
      await createTestUser(client);
      const tenantId2 = await createTestTenant(client);

      const asset1 = await createTestAsset(
        serviceClient,
        tenantId1,
        'Asset 1',
        undefined,
        undefined,
        'SHARED-001'
      );
      const asset2 = await createTestAsset(
        serviceClient,
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

      const assetId = await createTestAsset(serviceClient, tenantId, 'Old Name');

      const { error } = await client.rpc('rpc_update_asset', {
        p_tenant_id: tenantId,
        p_asset_id: assetId,
        p_name: 'New Name',
      });

      expect(error).toBeNull();

      // Verify update
      const { data: asset } = await serviceClient
        .schema('app')
        .from('assets')
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
        serviceClient,
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

      // Verify status update
      const { data: asset } = await serviceClient
        .schema('app')
        .from('assets')
        .select('*')
        .eq('id', assetId)
        .single();

      expect(asset.status).toBe('inactive');
    });
  });

  describe('Asset Deletion', () => {
    it('should delete asset', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      const assetId = await createTestAsset(serviceClient, tenantId, 'To Delete');

      const { error } = await client.rpc('rpc_delete_asset', {
        p_tenant_id: tenantId,
        p_asset_id: assetId,
      });

      expect(error).toBeNull();

      // Verify deletion
      const { data: asset } = await serviceClient
        .schema('app')
        .from('assets')
        .select('*')
        .eq('id', assetId)
        .single();

      expect(asset).toBeNull();
    });
  });
});
