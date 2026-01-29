import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient, waitForSupabase } from './helpers/supabase';
import { createTestUser } from './helpers/auth';
import { createTestTenant, addUserToTenant, setTenantContext } from './helpers/tenant';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Tenant Membership', () => {
  let client: SupabaseClient;
  beforeAll(async () => {
    await waitForSupabase();
    client = createTestClient();
  });

  describe('Adding Users to Tenants', () => {
    it('should add user to tenant and create membership', async () => {
      const ownerClient = createTestClient();
      await createTestUser(ownerClient);
      const tenantId = await createTestTenant(ownerClient);

      const memberClient = createTestClient();
      const { user: member } = await createTestUser(memberClient);

      await addUserToTenant(ownerClient, member.id, tenantId);

      await setTenantContext(memberClient, tenantId);
      const { data: roles, error } = await memberClient
        .from('v_user_tenant_roles')
        .select('tenant_id, role_key')
        .eq('tenant_id', tenantId);

      expect(error).toBeNull();
      expect(roles.length).toBeGreaterThan(0);
    });

    it('should allow user to see tenant after membership', async () => {
      const ownerClient = createTestClient();
      await createTestUser(ownerClient);
      const tenantId = await createTestTenant(ownerClient);

      const memberClient = createTestClient();
      const { user: member } = await createTestUser(memberClient);
      await addUserToTenant(ownerClient, member.id, tenantId);

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
      const ownerClient = createTestClient();
      await createTestUser(ownerClient);
      const tenantId = await createTestTenant(ownerClient);

      const nonMemberClient = createTestClient();
      const { user: nonMember } = await createTestUser(nonMemberClient);

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
      const ownerClient = createTestClient();
      await createTestUser(ownerClient);
      const tenantId = await createTestTenant(ownerClient);

      const user1Client = createTestClient();
      const { user: user1 } = await createTestUser(user1Client);
      const user2Client = createTestClient();
      const { user: user2 } = await createTestUser(user2Client);
      const user3Client = createTestClient();
      const { user: user3 } = await createTestUser(user3Client);

      await addUserToTenant(ownerClient, user1.id, tenantId);
      await addUserToTenant(ownerClient, user2.id, tenantId);
      await addUserToTenant(ownerClient, user3.id, tenantId);

      const memberClients = [user1Client, user2Client, user3Client];
      for (const memberClient of memberClients) {
        await setTenantContext(memberClient, tenantId);
        const { data: tenants, error } = await memberClient
          .from('v_tenants')
          .select('id')
          .eq('id', tenantId);
        expect(error).toBeNull();
        expect(tenants.length).toBe(1);
      }
    });
  });

  describe('User in Multiple Tenants', () => {
    it('should allow user to be member of multiple tenants', async () => {
      const ownerClient1 = createTestClient();
      await createTestUser(ownerClient1);
      const tenantId1 = await createTestTenant(ownerClient1);

      const ownerClient2 = createTestClient();
      await createTestUser(ownerClient2);
      const tenantId2 = await createTestTenant(ownerClient2);

      const multiTenantClient = createTestClient();
      const { user: multiTenantUser } = await createTestUser(multiTenantClient);

      await addUserToTenant(ownerClient1, multiTenantUser.id, tenantId1);
      await addUserToTenant(ownerClient2, multiTenantUser.id, tenantId2);
    });

    it('should allow user to access data from multiple tenants', async () => {
      const ownerClient1 = createTestClient();
      await createTestUser(ownerClient1);
      const tenantId1 = await createTestTenant(ownerClient1);

      const ownerClient2 = createTestClient();
      await createTestUser(ownerClient2);
      const tenantId2 = await createTestTenant(ownerClient2);

      const userClient = createTestClient();
      const { user: multiTenantUser } = await createTestUser(userClient);
      await addUserToTenant(ownerClient1, multiTenantUser.id, tenantId1);
      await addUserToTenant(ownerClient2, multiTenantUser.id, tenantId2);

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
