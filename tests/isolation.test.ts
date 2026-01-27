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
  setTenantContext,
} from './helpers/tenant';
import {
  createTestLocation,
  createTestDepartment,
  createTestDepartmentDirect,
  createTestAsset,
  createTestWorkOrder,
  createTestWorkOrderDirect,
} from './helpers/entities';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Multi-Tenant Isolation', () => {
  let client: SupabaseClient;
  let serviceClient: SupabaseClient;

  beforeAll(async () => {
    await waitForSupabase();
    client = createTestClient();
    serviceClient = createServiceRoleClient();
  });

  describe('Data Isolation', () => {
    it('should isolate data between two tenants with different users', async () => {
      const { user: userA } = await createTestUser(client);
      const tenantIdA = await createTestTenant(client);

      const { user: userB } = await createTestUser(client);
      const tenantIdB = await createTestTenant(client);

      // Create entities in both tenants
      const locationA = await createTestLocation(
        serviceClient,
        tenantIdA,
        'Location A'
      );
      const locationB = await createTestLocation(
        serviceClient,
        tenantIdB,
        'Location B'
      );

      // Sign in as User A
      const clientA = createTestClient();
      const { error: signInErrA } = await clientA.auth.signInWithPassword({
        email: getUserEmail(userA),
        password: TEST_PASSWORD,
      });
      expect(signInErrA).toBeNull();
      await setTenantContext(clientA, tenantIdA);

      // User A should only see Tenant A's data (use view)
      const { data: locationsA } = await clientA
        .from('v_locations')
        .select('*')
        .in('id', [locationA, locationB]);

      expect(locationsA.length).toBe(1);
      expect(locationsA[0].id).toBe(locationA);

      // Sign in as User B
      const clientB = createTestClient();
      const { error: signInErrB } = await clientB.auth.signInWithPassword({
        email: getUserEmail(userB),
        password: TEST_PASSWORD,
      });
      expect(signInErrB).toBeNull();
      await setTenantContext(clientB, tenantIdB);

      // User B should only see Tenant B's data (use view)
      const { data: locationsB } = await clientB
        .from('v_locations')
        .select('*')
        .in('id', [locationA, locationB]);

      expect(locationsB.length).toBe(1);
      expect(locationsB[0].id).toBe(locationB);
    });

    it('should allow same-named entities in different tenants', async () => {
      const tenantId1 = await createTestTenant(client);
      const tenantId2 = await createTestTenant(client);

      // Create entities with same names in different tenants
      const location1 = await createTestLocation(
        serviceClient,
        tenantId1,
        'Building A'
      );
      const location2 = await createTestLocation(
        serviceClient,
        tenantId2,
        'Building A'
      );

      const dept1 = await createTestDepartmentDirect(
        serviceClient,
        tenantId1,
        'Engineering'
      );
      const dept2 = await createTestDepartmentDirect(
        serviceClient,
        tenantId2,
        'Engineering'
      );

      const asset1 = await createTestAsset(
        serviceClient,
        tenantId1,
        'HVAC Unit #1'
      );
      const asset2 = await createTestAsset(
        serviceClient,
        tenantId2,
        'HVAC Unit #1'
      );

      // All should be created successfully
      expect(location1).toBeDefined();
      expect(location2).toBeDefined();
      expect(dept1).toBeDefined();
      expect(dept2).toBeDefined();
      expect(asset1).toBeDefined();
      expect(asset2).toBeDefined();

      // They should have different IDs
      expect(location1).not.toBe(location2);
      expect(dept1).not.toBe(dept2);
      expect(asset1).not.toBe(asset2);
    });

    it('should verify complete isolation across all entity types', async () => {
      const { user: user1 } = await createTestUser(client);
      const tenantId1 = await createTestTenant(client);

      const { user: user2 } = await createTestUser(client);
      const tenantId2 = await createTestTenant(client);

      // Create all entity types in tenant1
      const location1 = await createTestLocation(
        serviceClient,
        tenantId1,
        'Location 1'
      );
      const dept1 = await createTestDepartmentDirect(
        serviceClient,
        tenantId1,
        'Dept 1'
      );
      const asset1 = await createTestAsset(serviceClient, tenantId1, 'Asset 1');
      const wo1 = await createTestWorkOrderDirect(serviceClient, tenantId1, 'Work Order 1');

      // Create all entity types in tenant2
      const location2 = await createTestLocation(
        serviceClient,
        tenantId2,
        'Location 2'
      );
      const dept2 = await createTestDepartmentDirect(
        serviceClient,
        tenantId2,
        'Dept 2'
      );
      const asset2 = await createTestAsset(serviceClient, tenantId2, 'Asset 2');
      const wo2 = await createTestWorkOrderDirect(serviceClient, tenantId2, 'Work Order 2');

      // Sign in as user1
      const client1 = createTestClient();
      const { error: signInErr } = await client1.auth.signInWithPassword({
        email: getUserEmail(user1),
        password: TEST_PASSWORD,
      });
      expect(signInErr).toBeNull();
      await setTenantContext(client1, tenantId1);

      // User1 should only see tenant1 entities (use views)
      const { data: locations } = await client1
        .from('v_locations')
        .select('*')
        .in('id', [location1, location2]);
      expect(locations.length).toBe(1);
      expect(locations[0].id).toBe(location1);

      const { data: departments } = await client1
        .from('v_departments')
        .select('*')
        .in('id', [dept1, dept2]);
      expect(departments.length).toBe(1);
      expect(departments[0].id).toBe(dept1);

      const { data: assets } = await client1
        .from('v_assets')
        .select('*')
        .in('id', [asset1, asset2]);
      expect(assets.length).toBe(1);
      expect(assets[0].id).toBe(asset1);

      const { data: workOrders } = await client1
        .from('v_work_orders')
        .select('*')
        .in('id', [wo1, wo2]);
      expect(workOrders.length).toBe(1);
      expect(workOrders[0].id).toBe(wo1);
    });
  });
});
