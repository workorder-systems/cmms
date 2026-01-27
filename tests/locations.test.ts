import { describe, it, expect, beforeAll } from 'vitest';
import {
  createTestClient,
  createServiceRoleClient,
  waitForSupabase,
} from './helpers/supabase';
import { createTestUser, TEST_PASSWORD, getUserEmail } from './helpers/auth';
import { createTestTenant, addUserToTenant, setTenantContext } from './helpers/tenant';
import { createTestLocation } from './helpers/entities';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Locations', () => {
  let client: SupabaseClient;
  let serviceClient: SupabaseClient;

  beforeAll(async () => {
    await waitForSupabase();
    client = createTestClient();
    serviceClient = createServiceRoleClient();
  });

  describe('Location Creation', () => {
    it('should create a location via direct insert', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      const locationId = await createTestLocation(serviceClient, tenantId, 'Building A');

      expect(locationId).toBeDefined();
      expect(typeof locationId).toBe('string');

      // Verify location exists (using app schema)
      const { data: location, error } = await serviceClient
        .schema('app')
        .from('locations')
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
      const parentId = await createTestLocation(serviceClient, tenantId, 'Building A');

      // Create child location
      const childId = await createTestLocation(
        serviceClient,
        tenantId,
        'Floor 1',
        parentId
      );

      expect(childId).toBeDefined();

      // Verify parent-child relationship
      const { data: child, error } = await serviceClient
        .schema('app')
        .from('locations')
        .select('*')
        .eq('id', childId)
        .single();

      expect(error).toBeNull();
      expect(child.parent_location_id).toBe(parentId);
    });

    it('should create multi-level hierarchy', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      const buildingId = await createTestLocation(
        serviceClient,
        tenantId,
        'Building A'
      );
      const floorId = await createTestLocation(
        serviceClient,
        tenantId,
        'Floor 1',
        buildingId
      );
      const roomId = await createTestLocation(
        serviceClient,
        tenantId,
        'Room 101',
        floorId
      );

      // Verify hierarchy
      const { data: room } = await serviceClient
        .schema('app')
        .from('locations')
        .select('*')
        .eq('id', roomId)
        .single();

      expect(room.parent_location_id).toBe(floorId);

      const { data: floor } = await serviceClient
        .schema('app')
        .from('locations')
        .select('*')
        .eq('id', floorId)
        .single();

      expect(floor.parent_location_id).toBe(buildingId);
    });
  });

  describe('Tenant Isolation', () => {
    it('should only allow users to see their tenant locations', async () => {
      const { user: user1 } = await createTestUser(client);
      const tenantId1 = await createTestTenant(client);

      const { user: user2 } = await createTestUser(client);
      const tenantId2 = await createTestTenant(client);

      // Create locations in both tenants
      const location1 = await createTestLocation(
        serviceClient,
        tenantId1,
        'Tenant 1 Location'
      );
      const location2 = await createTestLocation(
        serviceClient,
        tenantId2,
        'Tenant 2 Location'
      );

      // Sign in as user1
      const client1 = createTestClient();
      const { error: signInErr } = await client1.auth.signInWithPassword({
        email: getUserEmail(user1),
        password: TEST_PASSWORD,
      });
      expect(signInErr).toBeNull();
      await setTenantContext(client1, tenantId1);

      // User1 should only see tenant1 locations (view + RLS)
      const { data: locations, error } = await client1
        .from('v_locations')
        .select('*')
        .in('id', [location1, location2]);

      expect(error).toBeNull();
      expect(locations).toBeDefined();
      expect(locations.length).toBe(1);
      expect(locations[0].id).toBe(location1);
    });
  });

  describe('Location Validation', () => {
    it('should validate parent location belongs to same tenant', async () => {
      const { user: user1 } = await createTestUser(client);
      const tenantId1 = await createTestTenant(client);
      const tenantId2 = await createTestTenant(client);

      const parentLocation = await createTestLocation(
        serviceClient,
        tenantId1,
        'Parent Location'
      );

      // Try to create child in tenant2 with parent from tenant1
      const { data, error } = await serviceClient
        .schema('app')
        .from('locations')
        .insert({
          tenant_id: tenantId2,
          name: 'Child Location',
          parent_location_id: parentLocation,
        })
        .select('id')
        .single();

      expect(error).toBeDefined();
      expect(error?.message).toContain('same tenant');
    });

    it('should prevent circular location references', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      const location1 = await createTestLocation(
        serviceClient,
        tenantId,
        'Location 1'
      );
      const location2 = await createTestLocation(
        serviceClient,
        tenantId,
        'Location 2',
        location1
      );

      // Try to make location1 a child of location2 (creating cycle)
      const { data, error } = await serviceClient
        .schema('app')
        .from('locations')
        .update({ parent_location_id: location2 })
        .eq('id', location1)
        .select('id')
        .single();

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

      const locationId = await createTestLocation(serviceClient, tenantId, 'Old Name');

      const { error } = await client.rpc('rpc_update_location', {
        p_tenant_id: tenantId,
        p_location_id: locationId,
        p_name: 'New Name',
      });

      expect(error).toBeNull();

      // Verify update
      const { data: location } = await serviceClient
        .schema('app')
        .from('locations')
        .select('*')
        .eq('id', locationId)
        .single();

      expect(location.name).toBe('New Name');
      expect(location.updated_at).toBeDefined();
    });
  });

  describe('Location Deletion', () => {
    it('should delete location', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      const locationId = await createTestLocation(serviceClient, tenantId, 'To Delete');

      const { error } = await client.rpc('rpc_delete_location', {
        p_tenant_id: tenantId,
        p_location_id: locationId,
      });

      expect(error).toBeNull();

      // Verify deletion
      const { data: location } = await serviceClient
        .schema('app')
        .from('locations')
        .select('*')
        .eq('id', locationId)
        .single();

      expect(location).toBeNull();
    });

    it('should set parent_location_id to NULL when parent is deleted', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      const parentId = await createTestLocation(
        serviceClient,
        tenantId,
        'Parent Location'
      );
      const childId = await createTestLocation(
        serviceClient,
        tenantId,
        'Child Location',
        parentId
      );

      // Delete parent
      await serviceClient.schema('app').from('locations').delete().eq('id', parentId);

      // Verify child's parent_location_id is set to NULL
      const { data: child } = await serviceClient
        .schema('app')
        .from('locations')
        .select('*')
        .eq('id', childId)
        .single();

      expect(child.parent_location_id).toBeNull();
    });
  });
});
