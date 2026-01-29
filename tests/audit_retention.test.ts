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
  assignRoleToUser,
  setTenantContext,
} from './helpers/tenant';
import { expectRPCError } from './helpers/rpc';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Audit retention and access', () => {
  let client: SupabaseClient;
  let serviceClient: SupabaseClient;

  beforeAll(async () => {
    await waitForSupabase();
    client = createTestClient();
    serviceClient = createServiceRoleClient();
  });

  it('allows tenant admins to manage audit retention configs', async () => {
    const { user } = await createTestUser(client);
    const tenantId = await createTestTenant(client);
    await setTenantContext(client, tenantId);

    const { error } = await client.rpc('rpc_set_audit_retention_config', {
      p_tenant_id: tenantId,
      p_retention_months: 18,
      p_is_active: true,
    });

    expect(error).toBeNull();

    const { data, error: viewError } = await client
      .from('v_audit_retention_configs')
      .select('tenant_id, retention_months, is_active')
      .eq('tenant_id', tenantId)
      .single();

    expect(viewError).toBeNull();
    expect(data.tenant_id).toBe(tenantId);
    expect(data.retention_months).toBe(18);
  });

  it('blocks non-admin users from writing audit retention configs', async () => {
    const adminClient = createTestClient();
    const { user: admin } = await createTestUser(adminClient);
    const tenantId = await createTestTenant(adminClient);

    const { user: member } = await createTestUser(client);
    await addUserToTenant(serviceClient, member.id, tenantId);
    await assignRoleToUser(serviceClient, member.id, tenantId, 'member');

    const memberClient = createTestClient();
    const { error: signInErr } = await memberClient.auth.signInWithPassword({
      email: getUserEmail(member),
      password: TEST_PASSWORD,
    });
    expect(signInErr).toBeNull();
    await setTenantContext(memberClient, tenantId);

    const errorMessage = await expectRPCError(memberClient, 'rpc_set_audit_retention_config', {
      p_tenant_id: tenantId,
      p_retention_months: 6,
      p_is_active: true,
    });

    expect(errorMessage).toContain('tenant.admin');
  });

  it('exposes audit permission changes only to tenant admins', async () => {
    const adminClient = createTestClient();
    const { user: admin } = await createTestUser(adminClient);
    const tenantId = await createTestTenant(adminClient);
    await setTenantContext(adminClient, tenantId);

    const { user: member } = await createTestUser(client);

    const { error: assignError } = await adminClient.rpc('rpc_assign_role_to_user', {
      p_tenant_id: tenantId,
      p_user_id: member.id,
      p_role_key: 'member',
    });
    expect(assignError).toBeNull();

    await setTenantContext(adminClient, tenantId);
    const { data: adminView, error: adminViewError } = await adminClient
      .from('v_audit_permission_changes')
      .select('change_type, target_user_id')
      .eq('target_user_id', member.id);

    expect(adminViewError).toBeNull();
    expect(adminView.length).toBeGreaterThan(0);

    const memberClient = createTestClient();
    const { error: signInErr } = await memberClient.auth.signInWithPassword({
      email: getUserEmail(member),
      password: TEST_PASSWORD,
    });
    expect(signInErr).toBeNull();
    await setTenantContext(memberClient, tenantId);

    const { data: memberView, error: memberViewError } = await memberClient
      .from('v_audit_permission_changes')
      .select('change_type')
      .eq('target_user_id', member.id);

    expect(memberViewError).toBeNull();
    expect(memberView.length).toBe(0);
  });
});
