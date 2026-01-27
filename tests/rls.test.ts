import { describe, it, expect, beforeAll } from 'vitest';
import {
  createTestClient,
  createServiceRoleClient,
  waitForSupabase,
} from './helpers/supabase';
import { createTestUser, TEST_PASSWORD, getUserEmail } from './helpers/auth';
import {
  createTestTenant,
  createTestTenantDirect,
  addUserToTenant,
  assignRoleToUser,
  setTenantContext,
} from './helpers/tenant';
import { createTestLocation, createTestWorkOrderDirect } from './helpers/entities';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('RLS Policies', () => {
  let client: SupabaseClient;
  let serviceClient: SupabaseClient;

  beforeAll(async () => {
    await waitForSupabase();
    client = createTestClient();
    serviceClient = createServiceRoleClient();
  });

  describe('Anonymous Access', () => {
    it('should prevent anonymous users from accessing tenant data', async () => {
      const tenantId = await createTestTenantDirect(serviceClient);
      const locationId = await createTestLocation(
        serviceClient,
        tenantId,
        'Location'
      );

      // Anonymous client (no auth)
      const anonClient = createTestClient();

      const { data, error } = await anonClient
        .schema('app')
        .from('locations')
        .select('*')
        .eq('id', locationId);

      // RLS should block access with insufficient privilege
      expect(error).toBeDefined();
      expect(error?.code).toBe('42501');
    });
  });

  describe('Tenant Isolation', () => {
    it('should only allow users to see their tenant data', async () => {
      const { user: user1 } = await createTestUser(client);
      const tenantId1 = await createTestTenant(client);

      const { user: user2 } = await createTestUser(client);
      const tenantId2 = await createTestTenant(client);

      const location1 = await createTestLocation(
        serviceClient,
        tenantId1,
        'Location 1'
      );
      const location2 = await createTestLocation(
        serviceClient,
        tenantId2,
        'Location 2'
      );

      // Sign in as user1
      const client1 = createTestClient();
      const { error: signInErr } = await client1.auth.signInWithPassword({
        email: getUserEmail(user1),
        password: TEST_PASSWORD,
      });
      expect(signInErr).toBeNull();
      await setTenantContext(client1, tenantId1);

      const { data: locations, error } = await client1
        .from('v_locations')
        .select('*')
        .in('id', [location1, location2]);

      expect(error).toBeNull();
      expect(locations.length).toBe(1);
      expect(locations[0].id).toBe(location1);
    });

    it('should prevent users from inserting into other tenants', async () => {
      const { user: user1 } = await createTestUser(client);
      const tenantId1 = await createTestTenant(client);

      const { user: user2 } = await createTestUser(client);
      const tenantId2 = await createTestTenant(client);
      await addUserToTenant(serviceClient, user2.id, tenantId2);

      // Sign in as user2
      const client2 = createTestClient();
      const { error: signInErr } = await client2.auth.signInWithPassword({
        email: getUserEmail(user2),
        password: TEST_PASSWORD,
      });
      expect(signInErr).toBeNull();
      await setTenantContext(client2, tenantId2);

      const { data, error } = await client2
        .schema('app')
        .from('locations')
        .insert({
          tenant_id: tenantId1,
          name: 'Unauthorized Location',
        })
        .select('id')
        .single();

      expect(error).toBeDefined();
      expect(error?.code).toBe('42501'); // Insufficient privilege
    });

    it('should prevent users from updating other tenants data', async () => {
      const { user: user1 } = await createTestUser(client);
      const tenantId1 = await createTestTenant(client);

      const { user: user2 } = await createTestUser(client);
      const tenantId2 = await createTestTenant(client);
      await addUserToTenant(serviceClient, user2.id, tenantId2);

      const location1 = await createTestLocation(
        serviceClient,
        tenantId1,
        'Location'
      );

      // Sign in as user2
      const client2 = createTestClient();
      const { error: signInErr } = await client2.auth.signInWithPassword({
        email: getUserEmail(user2),
        password: TEST_PASSWORD,
      });
      expect(signInErr).toBeNull();

      const { error } = await client2
        .schema('app')
        .from('locations')
        .update({ name: 'Unauthorized Update' })
        .eq('id', location1);

      expect(error).toBeDefined();
    });

    it('should prevent users from deleting other tenants data', async () => {
      const { user: user1 } = await createTestUser(client);
      const tenantId1 = await createTestTenant(client);

      const { user: user2 } = await createTestUser(client);
      const tenantId2 = await createTestTenant(client);
      await addUserToTenant(serviceClient, user2.id, tenantId2);

      const location1 = await createTestLocation(
        serviceClient,
        tenantId1,
        'Location'
      );

      // Sign in as user2
      const client2 = createTestClient();
      const { error: signInErr } = await client2.auth.signInWithPassword({
        email: getUserEmail(user2),
        password: TEST_PASSWORD,
      });
      expect(signInErr).toBeNull();

      // Try to delete tenant1's location
      const { error } = await client2
        .schema('app')
        .from('locations')
        .delete()
        .eq('id', location1);

      expect(error).toBeDefined();
    });
  });

  describe('Permission-Based Access', () => {
    it('should allow users with workorder.view to see work orders', async () => {
      const adminClient = createTestClient();
      const { user: admin } = await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);

      const memberBootstrapClient = createTestClient();
      const { user: member } = await createTestUser(memberBootstrapClient);
      await addUserToTenant(serviceClient, member.id, tenantId);
      await assignRoleToUser(serviceClient, member.id, tenantId, 'member');

      const woId = await createTestWorkOrderDirect(serviceClient, tenantId, 'Work Order');

      // Sign in as member
      const memberClient = createTestClient();
      const { error: signInErr } = await memberClient.auth.signInWithPassword({
        email: getUserEmail(member),
        password: TEST_PASSWORD,
      });
      expect(signInErr).toBeNull();
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
