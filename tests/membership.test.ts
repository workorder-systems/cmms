import { describe, it, expect, beforeAll } from 'vitest';
import {
  createTestClient,
  createServiceRoleClient,
  waitForSupabase,
} from './helpers/supabase';
import { createTestUser, TEST_PASSWORD, getUserEmail } from './helpers/auth';
import { createTestTenant, addUserToTenant, setTenantContext } from './helpers/tenant';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Tenant Membership', () => {
  let client: SupabaseClient;
  let serviceClient: SupabaseClient;

  beforeAll(async () => {
    await waitForSupabase();
    client = createTestClient();
    serviceClient = createServiceRoleClient();
  });

  describe('Adding Users to Tenants', () => {
    it('should add user to tenant and create membership', async () => {
      const { user: owner } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      const { user: member } = await createTestUser(client);

      // Add member to tenant using service client (bypasses RLS)
      await addUserToTenant(serviceClient, member.id, tenantId);

      // Verify membership exists
      const { data: membership, error } = await serviceClient
        .schema('app')
        .from('tenant_memberships')
        .select('*')
        .eq('user_id', member.id)
        .eq('tenant_id', tenantId)
        .single();

      expect(error).toBeNull();
      expect(membership).toBeDefined();
      expect(membership.user_id).toBe(member.id);
      expect(membership.tenant_id).toBe(tenantId);
    });

    it('should allow user to see tenant after membership', async () => {
      const { user: owner } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      const { user: member } = await createTestUser(client);
      await addUserToTenant(serviceClient, member.id, tenantId);

      // Sign in as member
      const memberClient = createTestClient();
      const { error: signInError } = await memberClient.auth.signInWithPassword({
        email: getUserEmail(member),
        password: TEST_PASSWORD,
      });
      expect(signInError).toBeNull();

      // Set tenant context
      await setTenantContext(memberClient, tenantId);

      // Member should be able to see tenant (using view)
      const { data: tenants, error } = await memberClient
        .from('v_tenants')
        .select('*')
        .eq('id', tenantId);

      expect(error).toBeNull();
      expect(tenants).toBeDefined();
      expect(tenants.length).toBe(1);
      expect(tenants[0].id).toBe(tenantId);
    });

    it('should prevent user from seeing tenant before membership', async () => {
      const { user: owner } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      const { user: nonMember } = await createTestUser(client);

      // Sign in as non-member
      const nonMemberClient = createTestClient();
      const { error: signInError } = await nonMemberClient.auth.signInWithPassword({
        email: getUserEmail(nonMember),
        password: TEST_PASSWORD,
      });
      expect(signInError).toBeNull();

      // Non-member should not see tenant (using view)
      const { data: tenants, error } = await nonMemberClient
        .from('v_tenants')
        .select('*')
        .eq('id', tenantId);

      // RLS should filter out the tenant (no rows)
      expect(error).toBeNull();
      expect(Array.isArray(tenants)).toBe(true);
      expect(tenants.length).toBe(0);
    });
  });

  describe('Multiple Users in Same Tenant', () => {
    it('should allow multiple users in the same tenant', async () => {
      const { user: owner } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      const { user: user1 } = await createTestUser(client);
      const { user: user2 } = await createTestUser(client);
      const { user: user3 } = await createTestUser(client);

      await addUserToTenant(serviceClient, user1.id, tenantId);
      await addUserToTenant(serviceClient, user2.id, tenantId);
      await addUserToTenant(serviceClient, user3.id, tenantId);

      // Verify all memberships exist
      const { data: memberships, error } = await serviceClient
        .schema('app')
        .from('tenant_memberships')
        .select('*')
        .eq('tenant_id', tenantId);

      expect(error).toBeNull();
      expect(memberships).toBeDefined();
      expect(memberships.length).toBe(4); // owner + 3 users
    });
  });

  describe('User in Multiple Tenants', () => {
    it('should allow user to be member of multiple tenants', async () => {
      const { user: owner1 } = await createTestUser(client);
      const tenantId1 = await createTestTenant(client);

      const { user: owner2 } = await createTestUser(client);
      const tenantId2 = await createTestTenant(client);

      const { user: multiTenantUser } = await createTestUser(client);

      // Add user to both tenants
      await addUserToTenant(serviceClient, multiTenantUser.id, tenantId1);
      await addUserToTenant(serviceClient, multiTenantUser.id, tenantId2);

      // Verify memberships
      const { data: memberships, error } = await serviceClient
        .schema('app')
        .from('tenant_memberships')
        .select('*')
        .eq('user_id', multiTenantUser.id);

      expect(error).toBeNull();
      expect(memberships).toBeDefined();
      expect(memberships.length).toBe(2);

      const tenantIds = memberships.map((m: any) => m.tenant_id);
      expect(tenantIds).toContain(tenantId1);
      expect(tenantIds).toContain(tenantId2);
    });

    it('should allow user to access data from multiple tenants', async () => {
      const { user: owner1 } = await createTestUser(client);
      const tenantId1 = await createTestTenant(client);

      const { user: owner2 } = await createTestUser(client);
      const tenantId2 = await createTestTenant(client);

      const { user: multiTenantUser } = await createTestUser(client);
      await addUserToTenant(serviceClient, multiTenantUser.id, tenantId1);
      await addUserToTenant(serviceClient, multiTenantUser.id, tenantId2);

      // Sign in as multi-tenant user
      const userClient = createTestClient();
      const { error: signInError } = await userClient.auth.signInWithPassword({
        email: getUserEmail(multiTenantUser),
        password: TEST_PASSWORD,
      });
      expect(signInError).toBeNull();

      // Should see both tenants (using view)
      const { data: tenants, error } = await userClient
        .from('v_tenants')
        .select('*')
        .in('id', [tenantId1, tenantId2]);

      expect(error).toBeNull();
      expect(tenants).toBeDefined();
      expect(tenants.length).toBe(2);
    });
  });
});
