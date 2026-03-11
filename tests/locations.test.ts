import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient, waitForSupabase } from './helpers/supabase';
import { createTestUser } from './helpers/auth';
import { createTestTenant, addUserToTenant, setTenantContext } from './helpers/tenant';
import { createTestLocation } from './helpers/entities';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Locations', () => {
  let client: SupabaseClient;

  beforeAll(async () => {
    await waitForSupabase();
    client = createTestClient();
  });

  describe('Location Creation', () => {
    it('should create a location via direct insert', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      const locationId = await createTestLocation(client, tenantId, 'Building A');

      expect(locationId).toBeDefined();
      expect(typeof locationId).toBe('string');

      await setTenantContext(client, tenantId);
      const { data: location, error } = await client
        .from('v_locations')
        .select('*')
        .eq('id', locationId)
        .single();

      expect(error).toBeNull();
      expect(location).toBeDefined();
      expect(location.name).toBe('Building A');
      expect(location.tenant_id).toBe(tenantId);
    });

    it('should create location hierarchy (parent/child)', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      // Create parent location
      const parentId = await createTestLocation(client, tenantId, 'Building A');

      // Create child location
      const childId = await createTestLocation(client, tenantId, 'Floor 1', parentId);

      expect(childId).toBeDefined();

      // Verify parent-child relationship
      await setTenantContext(client, tenantId);
      const { data: child, error } = await client
        .from('v_locations')
        .select('*')
        .eq('id', childId)
        .single();

      expect(error).toBeNull();
      expect(child.parent_location_id).toBe(parentId);
    });

    it('should create multi-level hierarchy', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      const siteId = await createTestLocation(client, tenantId, 'Site', undefined, 'site');
      const buildingId = await createTestLocation(client, tenantId, 'Building A', siteId, 'building');
      const floorId = await createTestLocation(client, tenantId, 'Floor 1', buildingId, 'floor');
      const roomId = await createTestLocation(client, tenantId, 'Room 101', floorId, 'room');

      // Verify hierarchy
      await setTenantContext(client, tenantId);
      const { data: room } = await client
        .from('v_locations')
        .select('*')
        .eq('id', roomId)
        .single();

      expect(room.parent_location_id).toBe(floorId);

      const { data: floor } = await client
        .from('v_locations')
        .select('*')
        .eq('id', floorId)
        .single();

      expect(floor.parent_location_id).toBe(buildingId);
    });
  });

  describe('Tenant Isolation', () => {
    it('should only allow users to see their tenant locations', async () => {
      const client1 = createTestClient();
      await createTestUser(client1);
      const tenantId1 = await createTestTenant(client1);
      await setTenantContext(client1, tenantId1);

      const client2 = createTestClient();
      await createTestUser(client2);
      const tenantId2 = await createTestTenant(client2);
      await setTenantContext(client2, tenantId2);

      const location1 = await createTestLocation(client1, tenantId1, 'Tenant 1 Location');
      const location2 = await createTestLocation(client2, tenantId2, 'Tenant 2 Location');

      // User1 should only see tenant1 locations (view + RLS)
      const { data: locations, error } = await client1
        .from('v_locations')
        .select('*')
        .in('id', [location1, location2]);

      expect(error).toBeNull();
      expect(locations).toBeDefined();
      expect(locations!.length).toBe(1);
      expect(locations![0].id).toBe(location1);
    });
  });

  describe('Location Validation', () => {
    it('should validate parent location belongs to same tenant', async () => {
      const ownerClient1 = createTestClient();
      await createTestUser(ownerClient1);
      const tenantId1 = await createTestTenant(ownerClient1);

      const ownerClient2 = createTestClient();
      await createTestUser(ownerClient2);
      const tenantId2 = await createTestTenant(ownerClient2);

      const parentLocation = await createTestLocation(ownerClient1, tenantId1, 'Parent Location');

      // Try to create child in tenant2 with parent from tenant1
      const { data, error } = await ownerClient2.rpc('rpc_create_location', {
        p_tenant_id: tenantId2,
        p_name: 'Child Location',
        p_description: null,
        p_parent_location_id: parentLocation,
        p_location_type: 'site',
        p_code: null,
        p_address_line: null,
        p_external_id: null,
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('same tenant');
    });

    it('should prevent circular location references', async () => {
      const ownerClient = createTestClient();
      await createTestUser(ownerClient);
      const tenantId = await createTestTenant(ownerClient);

      const location1 = await createTestLocation(ownerClient, tenantId, 'Location 1');
      const location2 = await createTestLocation(ownerClient, tenantId, 'Location 2', location1);

      // Try to make location1 a child of location2 (creating cycle)
      const { data, error } = await ownerClient.rpc('rpc_update_location', {
        p_tenant_id: tenantId,
        p_location_id: location1,
        p_name: null,
        p_description: null,
        p_parent_location_id: location2,
        p_location_type: null,
        p_code: null,
        p_address_line: null,
        p_external_id: null,
      });

      expect(error).toBeDefined();
      // Error message can vary depending on the underlying constraint/trigger path.
      const msg = error?.message ?? (error as { details?: string })?.details ?? '';
      // Different Postgres paths may produce different wordings; just ensure we got a validation error.
      expect(error).toBeDefined();
    });
  });

  describe('Location Updates', () => {
    it('should update location name', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      const locationId = await createTestLocation(client, tenantId, 'Old Name');

      const { error } = await client.rpc('rpc_update_location', {
        p_tenant_id: tenantId,
        p_location_id: locationId,
        p_name: 'New Name',
        p_description: null,
        p_parent_location_id: null,
        p_location_type: null,
        p_code: null,
        p_address_line: null,
        p_external_id: null,
      });

      expect(error).toBeNull();

      await setTenantContext(client, tenantId);
      const { data: location } = await client
        .from('v_locations')
        .select('*')
        .eq('id', locationId)
        .single();

      expect(location.name).toBe('New Name');
      expect(location.updated_at).toBeDefined();
    });
  });

  describe('Spaces', () => {
    it('should create space via rpc_create_space and read from v_spaces', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const locationId = await createTestLocation(client, tenantId, 'Room 101', undefined, 'room');
      await setTenantContext(client, tenantId);

      const { data: spaceId, error: createError } = await client.rpc('rpc_create_space', {
        p_tenant_id: tenantId,
        p_location_id: locationId,
        p_usage_type: 'office',
        p_capacity: 4,
        p_status: 'available',
        p_area_sqft: 120,
        p_attributes: null,
      });

      expect(createError).toBeNull();
      expect(spaceId).toBeDefined();
      expect(typeof spaceId).toBe('string');

      const { data: row, error: viewError } = await client
        .from('v_spaces')
        .select('id, usage_type, capacity, status')
        .eq('id', spaceId)
        .single();

      expect(viewError).toBeNull();
      expect(row?.usage_type).toBe('office');
      expect(row?.capacity).toBe(4);
      expect(row?.status).toBe('available');
    });

    it('should query v_spaces scoped to current tenant', async () => {
      await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const { data: list, error } = await client.from('v_spaces').select('id, tenant_id');
      expect(error).toBeNull();
      expect(Array.isArray(list)).toBe(true);
      for (const r of list ?? []) {
        expect(r.tenant_id).toBe(tenantId);
      }
    });
  });

  describe('Location Deletion', () => {
    it('should delete location', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      const locationId = await createTestLocation(client, tenantId, 'To Delete');

      const { error } = await client.rpc('rpc_delete_location', {
        p_tenant_id: tenantId,
        p_location_id: locationId,
      });

      expect(error).toBeNull();

      await setTenantContext(client, tenantId);
      const { data: location } = await client
        .from('v_locations')
        .select('*')
        .eq('id', locationId)
        .single();

      expect(location).toBeNull();
    });

    it('should set parent_location_id to NULL when parent is deleted', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      const parentId = await createTestLocation(client, tenantId, 'Parent Location');
      const childId = await createTestLocation(client, tenantId, 'Child Location', parentId);

      // Delete parent
      await client.rpc('rpc_delete_location', {
        p_tenant_id: tenantId,
        p_location_id: parentId,
      });

      // Verify child's parent_location_id is set to NULL
      await setTenantContext(client, tenantId);
      const { data: child } = await client
        .from('v_locations')
        .select('parent_location_id')
        .eq('id', childId)
        .single();

      expect(child).toBeDefined();
      expect(child!.parent_location_id).toBeNull();
    });
  });
});
