import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient, waitForSupabase } from './helpers/supabase';
import { createTestUser } from './helpers/auth';
import {
  createTestTenant,
  addUserToTenant,
  assignRoleToUser,
  setTenantContext,
} from './helpers/tenant';
import { createTestLocation, createTestWorkOrder } from './helpers/entities';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('RLS Policies', () => {
  let client: SupabaseClient;

  beforeAll(async () => {
    await waitForSupabase();
    client = createTestClient();
  });

  describe('Anonymous Access', () => {
    it('should prevent anonymous users from accessing tenant data', async () => {
      const ownerClient = createTestClient();
      await createTestUser(ownerClient);
      const tenantId = await createTestTenant(ownerClient);
      await setTenantContext(ownerClient, tenantId);
      const locationId = await createTestLocation(ownerClient, tenantId, 'Location');

      // Anonymous client (no auth)
      const anonClient = createTestClient();

      const { data, error } = await anonClient
        .from('v_locations')
        .select('*')
        .eq('id', locationId);

      expect(error).toBeNull();
      expect(data.length).toBe(0);
    });
  });

  describe('Tenant Isolation', () => {
    it('should only allow users to see their tenant data', async () => {
      const client1 = createTestClient();
      await createTestUser(client1);
      const tenantId1 = await createTestTenant(client1);
      await setTenantContext(client1, tenantId1);

      const client2 = createTestClient();
      await createTestUser(client2);
      const tenantId2 = await createTestTenant(client2);
      await setTenantContext(client2, tenantId2);

      const location1 = await createTestLocation(client1, tenantId1, 'Location 1');
      const location2 = await createTestLocation(client2, tenantId2, 'Location 2');

      const { data: locations, error } = await client1
        .from('v_locations')
        .select('*')
        .in('id', [location1, location2]);

      expect(error).toBeNull();
      expect(locations.length).toBe(1);
      expect(locations[0].id).toBe(location1);
    });

    it('should prevent users from inserting into other tenants', async () => {
      const ownerClient1 = createTestClient();
      await createTestUser(ownerClient1);
      const tenantId1 = await createTestTenant(ownerClient1);

      const ownerClient2 = createTestClient();
      await createTestUser(ownerClient2);
      const tenantId2 = await createTestTenant(ownerClient2);

      const { error } = await ownerClient2.rpc('rpc_create_location', {
        p_tenant_id: tenantId1,
        p_name: 'Unauthorized Location',
        p_description: null,
        p_parent_location_id: null,
        p_location_type: 'site',
        p_code: null,
        p_address_line: null,
        p_external_id: null,
      });

      expect(error).toBeDefined();
      expect(error?.code).toBe('42501');
    });

    it('should prevent users from updating other tenants data', async () => {
      const ownerClient1 = createTestClient();
      await createTestUser(ownerClient1);
      const tenantId1 = await createTestTenant(ownerClient1);
      await setTenantContext(ownerClient1, tenantId1);

      const ownerClient2 = createTestClient();
      await createTestUser(ownerClient2);
      const tenantId2 = await createTestTenant(ownerClient2);

      const location1 = await createTestLocation(ownerClient1, tenantId1, 'Location');

      const { error } = await ownerClient2.rpc('rpc_update_location', {
        p_tenant_id: tenantId2,
        p_location_id: location1,
        p_name: 'Unauthorized Update',
        p_description: null,
        p_parent_location_id: null,
        p_location_type: null,
        p_code: null,
        p_address_line: null,
        p_external_id: null,
      });

      expect(error).toBeDefined();
    });

    it('should prevent users from deleting other tenants data', async () => {
      const ownerClient1 = createTestClient();
      await createTestUser(ownerClient1);
      const tenantId1 = await createTestTenant(ownerClient1);
      await setTenantContext(ownerClient1, tenantId1);

      const ownerClient2 = createTestClient();
      await createTestUser(ownerClient2);
      const tenantId2 = await createTestTenant(ownerClient2);

      const location1 = await createTestLocation(ownerClient1, tenantId1, 'Location');

      // Try to delete tenant1's location as tenant2 admin
      const { error } = await ownerClient2.rpc('rpc_delete_location', {
        p_tenant_id: tenantId2,
        p_location_id: location1,
      });

      expect(error).toBeDefined();
    });
  });

  describe('Permission-Based Access', () => {
    it('should allow users with workorder.view to see work orders', async () => {
      const adminClient = createTestClient();
      const { user: admin } = await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);

      const memberClient = createTestClient();
      const { user: member } = await createTestUser(memberClient);
      await addUserToTenant(adminClient, member.id, tenantId);
      await assignRoleToUser(adminClient, member.id, tenantId, 'member');

      const woId = await createTestWorkOrder(adminClient, tenantId, 'Work Order');

      await setTenantContext(memberClient, tenantId);

      // Member should see work order (has workorder.view permission)
      const { data: workOrders, error } = await memberClient
        .from('v_work_orders')
        .select('*')
        .eq('id', woId);

      expect(error).toBeNull();
      expect(workOrders.length).toBe(1);
    });
  });
});
