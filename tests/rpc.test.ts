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
import { expectRPCError } from './helpers/rpc';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('RPC Functions', () => {
  let client: SupabaseClient;
  let serviceClient: SupabaseClient;

  beforeAll(async () => {
    await waitForSupabase();
    client = createTestClient();
    serviceClient = createServiceRoleClient();
  });

  describe('rpc_set_tenant_context', () => {
    it('should validate membership before setting context', async () => {
      const { user: owner } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      const { user: nonMember } = await createTestUser(client);

      // Sign in as non-member
      const nonMemberClient = createTestClient();
      const { error: signInErr } = await nonMemberClient.auth.signInWithPassword({
        email: getUserEmail(nonMember),
        password: TEST_PASSWORD,
      });
      expect(signInErr).toBeNull();

      // Try to set context for tenant they're not a member of
      const error = await expectRPCError(nonMemberClient, 'rpc_set_tenant_context', {
        p_tenant_id: tenantId,
      });

      expect(error).toContain('not a member');
    });

    it('should set context for valid members', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      const { error } = await client.rpc('rpc_set_tenant_context', {
        p_tenant_id: tenantId,
      });

      expect(error).toBeNull();
    });
  });

  describe('rpc_invite_user_to_tenant', () => {
    it('should require tenant.admin permission', async () => {
      const { user: admin } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      const { user: member } = await createTestUser(client);
      await addUserToTenant(serviceClient, member.id, tenantId);

      // Sign in as member (no tenant.admin)
      const memberClient = createTestClient();
      const { error: signInErr } = await memberClient.auth.signInWithPassword({
        email: getUserEmail(member),
        password: TEST_PASSWORD,
      });
      expect(signInErr).toBeNull();
      await setTenantContext(memberClient, tenantId);

      const { user: invitee } = await createTestUser(client);

      const error = await expectRPCError(memberClient, 'rpc_invite_user_to_tenant', {
        p_tenant_id: tenantId,
        p_invitee_email: getUserEmail(invitee),
        p_role_key: 'member',
      });

      expect(error).toContain('Permission denied');
    });
  });

  describe('rpc_assign_permission_to_role', () => {
    it('should require tenant.admin permission', async () => {
      const { user: admin } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      const { user: member } = await createTestUser(client);
      await addUserToTenant(serviceClient, member.id, tenantId);

      // Sign in as member
      const memberClient = createTestClient();
      const { error: signInErr } = await memberClient.auth.signInWithPassword({
        email: getUserEmail(member),
        password: TEST_PASSWORD,
      });
      expect(signInErr).toBeNull();
      await setTenantContext(memberClient, tenantId);

      const error = await expectRPCError(memberClient, 'rpc_assign_permission_to_role', {
        p_tenant_id: tenantId,
        p_role_key: 'member',
        p_permission_key: 'workorder.create',
      });

      expect(error).toContain('Permission denied');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid inputs gracefully', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      // Try to create tenant with invalid slug
      const error = await expectRPCError(client, 'rpc_create_tenant', {
        p_name: 'Test',
        p_slug: 'Invalid Slug!@#',
      });

      expect(error).toBeDefined();
    });

    it('should handle missing required parameters', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      // Try to create work order without required title
      const error = await expectRPCError(client, 'rpc_create_work_order', {
        p_tenant_id: tenantId,
        // Missing p_title
      });

      expect(error).toBeDefined();
    });
  });
});
