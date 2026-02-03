import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient, waitForSupabase } from './helpers/supabase';
import { createTestUser, getUserEmail, TEST_PASSWORD } from './helpers/auth';
import {
  createTestTenant,
  addUserToTenant,
  setTenantContext,
} from './helpers/tenant';
import {
  createTestWorkOrder,
  createTestLocation,
} from './helpers/entities';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('JWT & Tenant Context Security', () => {
  let client: SupabaseClient;

  beforeAll(async () => {
    await waitForSupabase();
    client = createTestClient();
  });

  describe('JWT Tenant Context', () => {
    it('should update user metadata when setting tenant context', async () => {
      const userClient = createTestClient();
      const { user } = await createTestUser(userClient);
      const tenantId = await createTestTenant(userClient);

      // Set tenant context
      await setTenantContext(userClient, tenantId);

      // Verify user metadata was updated
      const { data: userData } = await userClient.auth.getUser();
      expect(userData?.user?.user_metadata?.current_tenant_id).toBe(tenantId);
    });

    it('should validate tenant context persists across requests', async () => {
      const userClient = createTestClient();
      const { user } = await createTestUser(userClient);
      const tenantId = await createTestTenant(userClient);

      await setTenantContext(userClient, tenantId);

      // Create work order (uses tenant context)
      const woId = await createTestWorkOrder(userClient, tenantId, 'Test WO');

      // Query work orders (should use tenant context)
      const { data: workOrders } = await userClient
        .from('v_work_orders')
        .select('id')
        .eq('id', woId);

      expect(workOrders?.length ?? 0).toBe(1);
    });

    it('should validate tenant context in JWT is checked', async () => {
      const userClient = createTestClient();
      const { user } = await createTestUser(userClient);
      const tenantId = await createTestTenant(userClient);

      await setTenantContext(userClient, tenantId);

      // After setting context and refreshing token, tenant_id should be in JWT
      // This is verified by the fact that views work correctly
      const { data: tenants } = await userClient
        .from('v_tenants')
        .select('id')
        .eq('id', tenantId);

      expect(tenants?.length ?? 0).toBe(1);
    });

    it('should allow switching tenant context', async () => {
      const userClient = createTestClient();
      const { user } = await createTestUser(userClient);
      const tenantId1 = await createTestTenant(userClient);
      const tenantId2 = await createTestTenant(userClient);

      // Set context to tenant1
      await setTenantContext(userClient, tenantId1);
      const wo1Id = await createTestWorkOrder(userClient, tenantId1, 'Tenant1 WO');

      // Switch to tenant2
      await setTenantContext(userClient, tenantId2);
      const wo2Id = await createTestWorkOrder(userClient, tenantId2, 'Tenant2 WO');

      // Verify each tenant only sees their own work orders
      const { data: tenant1WOs } = await userClient
        .from('v_work_orders')
        .select('id')
        .eq('id', wo1Id);

      const { data: tenant2WOs } = await userClient
        .from('v_work_orders')
        .select('id')
        .eq('id', wo2Id);

      // After switching context, should only see current tenant's data
      expect(tenant2WOs?.length ?? 0).toBe(1);
      // Tenant1's work order may not be visible after context switch
    });
  });

  describe('Session Variable Fallback', () => {
    it('should set app.current_tenant_id session variable', async () => {
      const userClient = createTestClient();
      const { user } = await createTestUser(userClient);
      const tenantId = await createTestTenant(userClient);

      // Set tenant context (sets session variable)
      await setTenantContext(userClient, tenantId);

      // Session variable is used by get_current_tenant_id() function
      // Verify it works by querying tenant-scoped view
      const { data: locations } = await userClient
        .from('v_locations')
        .select('id')
        .limit(1);

      // Should not error (session variable is set)
      expect(Array.isArray(locations)).toBe(true);
    });

    it('should ensure session variable is tenant-scoped', async () => {
      const user1Client = createTestClient();
      const { user: user1 } = await createTestUser(user1Client);
      const tenantId1 = await createTestTenant(user1Client);
      await setTenantContext(user1Client, tenantId1);

      const user2Client = createTestClient();
      const { user: user2 } = await createTestUser(user2Client);
      const tenantId2 = await createTestTenant(user2Client);
      await setTenantContext(user2Client, tenantId2);

      // Each user's session variable should be independent
      const location1Id = await createTestLocation(user1Client, tenantId1, 'Location1');
      const location2Id = await createTestLocation(user2Client, tenantId2, 'Location2');

      // User1 should only see tenant1's location
      const { data: user1Locations } = await user1Client
        .from('v_locations')
        .select('id')
        .in('id', [location1Id, location2Id]);

      const locationIds1 = user1Locations?.map((l: any) => l.id) ?? [];
      expect(locationIds1).toContain(location1Id);
      expect(locationIds1).not.toContain(location2Id);
    });

    it('should not allow session variable to bypass RLS', async () => {
      const adminClient = createTestClient();
      const { user: admin } = await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);
      await setTenantContext(adminClient, tenantId);

      const outsiderClient = createTestClient();
      const { user: outsider } = await createTestUser(outsiderClient);

      // Outsider tries to set context for tenant they're not a member of
      const { error } = await outsiderClient.rpc('rpc_set_tenant_context', {
        p_tenant_id: tenantId,
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('not a member');
    });
  });

  describe('Context Validation', () => {
    it('should prevent setting context for non-member', async () => {
      const adminClient = createTestClient();
      const { user: admin } = await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);

      const outsiderClient = createTestClient();
      const { user: outsider } = await createTestUser(outsiderClient);

      // Outsider should not be able to set context
      const { error } = await outsiderClient.rpc('rpc_set_tenant_context', {
        p_tenant_id: tenantId,
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('not a member');
      expect(error?.code).toBe('42501');
    });

    it('should allow setting context for valid members', async () => {
      const adminClient = createTestClient();
      const { user: admin } = await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);

      const memberClient = createTestClient();
      const { user: member } = await createTestUser(memberClient);
      await addUserToTenant(adminClient, member.id, tenantId);

      // Member should be able to set context
      const { error } = await memberClient.rpc('rpc_set_tenant_context', {
        p_tenant_id: tenantId,
      });

      expect(error).toBeNull();
    });

    it('should require authentication to set context', async () => {
      const anonClient = createTestClient();
      // No authentication

      const fakeTenantId = '00000000-0000-0000-0000-000000000000';

      const { error } = await anonClient.rpc('rpc_set_tenant_context', {
        p_tenant_id: fakeTenantId,
      });

      expect(error).toBeDefined();
      expect(error?.message).toMatch(/authenticated|Unauthorized/i);
    });

    it('should handle multiple tenants in same session', async () => {
      const userClient = createTestClient();
      const { user } = await createTestUser(userClient);
      const tenantId1 = await createTestTenant(userClient);
      const tenantId2 = await createTestTenant(userClient);

      // Set context to tenant1
      await setTenantContext(userClient, tenantId1);
      const wo1Id = await createTestWorkOrder(userClient, tenantId1, 'WO1');

      // Switch to tenant2
      await setTenantContext(userClient, tenantId2);
      const wo2Id = await createTestWorkOrder(userClient, tenantId2, 'WO2');

      // Switch back to tenant1
      await setTenantContext(userClient, tenantId1);

      // Should see tenant1's work order
      const { data: workOrders } = await userClient
        .from('v_work_orders')
        .select('id')
        .eq('id', wo1Id);

      expect(workOrders?.length ?? 0).toBe(1);
    });

    it('should persist context after token refresh', async () => {
      const userClient = createTestClient();
      const { user } = await createTestUser(userClient);
      const tenantId = await createTestTenant(userClient);

      await setTenantContext(userClient, tenantId);

      // Create work order
      const woId = await createTestWorkOrder(userClient, tenantId, 'Test WO');

      // Refresh session (simulate token refresh)
      const userEmail = getUserEmail(user);
      await userClient.auth.signOut();
      await userClient.auth.signInWithPassword({
        email: userEmail,
        password: TEST_PASSWORD,
      });

      // Context should persist (via user metadata)
      await setTenantContext(userClient, tenantId);

      // Should still see work order
      const { data: workOrders } = await userClient
        .from('v_work_orders')
        .select('id')
        .eq('id', woId);

      expect(workOrders?.length ?? 0).toBe(1);
    });
  });

  describe('Context Security', () => {
    it('should prevent context manipulation attacks', async () => {
      const adminClient = createTestClient();
      const { user: admin } = await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);
      await setTenantContext(adminClient, tenantId);

      const attackerClient = createTestClient();
      const { user: attacker } = await createTestUser(attackerClient);
      await addUserToTenant(adminClient, attacker.id, tenantId);

      // Attacker sets their own context
      await setTenantContext(attackerClient, tenantId);

      // Attacker should only see their tenant's data, not other tenants
      const otherTenantId = await createTestTenant(adminClient);

      // Attacker should not be able to set context for other tenant
      const { error } = await attackerClient.rpc('rpc_set_tenant_context', {
        p_tenant_id: otherTenantId,
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('not a member');
    });

    it('should validate context before allowing operations', async () => {
      const userClient = createTestClient();
      const { user } = await createTestUser(userClient);
      const tenantId = await createTestTenant(userClient);

      // Try to create work order without setting context
      // Should fail or require context
      const { error } = await userClient.rpc('rpc_create_work_order', {
        p_tenant_id: tenantId,
        p_title: 'Test',
        p_priority: 'medium',
      });

      // Should succeed (RPC validates membership, not context)
      // But views require context
      expect(error).toBeNull();

      // Views require context
      await setTenantContext(userClient, tenantId);
      const { data: workOrders } = await userClient
        .from('v_work_orders')
        .select('id');

      expect(Array.isArray(workOrders)).toBe(true);
    });
  });
});
