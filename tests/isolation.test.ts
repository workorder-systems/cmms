import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient, waitForSupabase } from './helpers/supabase';
import { createTestUser } from './helpers/auth';
import {
  createTestTenant,
  addUserToTenant,
  setTenantContext,
} from './helpers/tenant';
import {
  createTestLocation,
  createTestDepartment,
  createTestAsset,
  createTestWorkOrder,
} from './helpers/entities';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Multi-Tenant Isolation', () => {
  let client: SupabaseClient;

  beforeAll(async () => {
    await waitForSupabase();
    client = createTestClient();
  });

  describe('Data Isolation', () => {
    it('should isolate data between two tenants with different users', async () => {
      const clientA = createTestClient();
      await createTestUser(clientA);
      const tenantIdA = await createTestTenant(clientA);
      await setTenantContext(clientA, tenantIdA);

      const clientB = createTestClient();
      await createTestUser(clientB);
      const tenantIdB = await createTestTenant(clientB);
      await setTenantContext(clientB, tenantIdB);

      const locationA = await createTestLocation(clientA, tenantIdA, 'Location A');
      const locationB = await createTestLocation(clientB, tenantIdB, 'Location B');

      // User A should only see Tenant A's data (use view)
      const { data: locationsA } = await clientA
        .from('v_locations')
        .select('*')
        .in('id', [locationA, locationB]);

      expect(locationsA.length).toBe(1);
      expect(locationsA[0].id).toBe(locationA);

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
      const client1 = createTestClient();
      await createTestUser(client1);
      const tenantId1 = await createTestTenant(client1);

      const client2 = createTestClient();
      await createTestUser(client2);
      const tenantId2 = await createTestTenant(client2);

      const location1 = await createTestLocation(client1, tenantId1, 'Building A');
      const location2 = await createTestLocation(client2, tenantId2, 'Building A');

      const dept1 = await createTestDepartment(client1, tenantId1, 'Engineering');
      const dept2 = await createTestDepartment(client2, tenantId2, 'Engineering');

      const asset1 = await createTestAsset(client1, tenantId1, 'HVAC Unit #1');
      const asset2 = await createTestAsset(client2, tenantId2, 'HVAC Unit #1');

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
      const client1 = createTestClient();
      await createTestUser(client1);
      const tenantId1 = await createTestTenant(client1);
      await setTenantContext(client1, tenantId1);

      const client2 = createTestClient();
      await createTestUser(client2);
      const tenantId2 = await createTestTenant(client2);
      await setTenantContext(client2, tenantId2);

      const location1 = await createTestLocation(client1, tenantId1, 'Location 1');
      const dept1 = await createTestDepartment(client1, tenantId1, 'Dept 1');
      const asset1 = await createTestAsset(client1, tenantId1, 'Asset 1');
      const wo1 = await createTestWorkOrder(client1, tenantId1, 'Work Order 1');

      const location2 = await createTestLocation(client2, tenantId2, 'Location 2');
      const dept2 = await createTestDepartment(client2, tenantId2, 'Dept 2');
      const asset2 = await createTestAsset(client2, tenantId2, 'Asset 2');
      const wo2 = await createTestWorkOrder(client2, tenantId2, 'Work Order 2');

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
