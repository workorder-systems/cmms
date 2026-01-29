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

async function ensurePlugin(
  serviceClient: SupabaseClient,
  key: string,
  name: string
): Promise<string> {
  const { data, error } = await serviceClient
    .schema('int')
    .from('plugins')
    .insert({
      key,
      name,
      description: 'Test plugin',
      is_integration: false,
      is_active: true,
    })
    .select('id')
    .single();

  if (!error) {
    return data.id as string;
  }

  if (error.code === '23505') {
    const { data: existing, error: fetchError } = await serviceClient
      .schema('int')
      .from('plugins')
      .select('id, is_active')
      .eq('key', key)
      .single();

    if (fetchError || !existing) {
      throw new Error(`Failed to fetch existing plugin: ${fetchError?.message}`);
    }

    if (!existing.is_active) {
      const { error: updateError } = await serviceClient
        .schema('int')
        .from('plugins')
        .update({ is_active: true })
        .eq('id', existing.id);
      if (updateError) {
        throw new Error(`Failed to reactivate plugin: ${updateError.message}`);
      }
    }

    return existing.id as string;
  }

  throw new Error(`Failed to create plugin: ${error.message}`);
}

describe('Integrations and plugins', () => {
  let client: SupabaseClient;
  let serviceClient: SupabaseClient;

  beforeAll(async () => {
    await waitForSupabase();
    client = createTestClient();
    serviceClient = createServiceRoleClient();
  });

  it('allows tenant admins to install plugins and view installations', async () => {
    const { user } = await createTestUser(client);
    const tenantId = await createTestTenant(client);
    await setTenantContext(client, tenantId);

    await ensurePlugin(serviceClient, 'sample_plugin', 'Sample Plugin');

    const { data: installationId, error } = await client.rpc('rpc_install_plugin', {
      p_tenant_id: tenantId,
      p_plugin_key: 'sample_plugin',
      p_secret_ref: 'secret-ref-1',
      p_config: { region: 'us-east-1' },
    });

    expect(error).toBeNull();
    expect(installationId).toBeDefined();

    const { data: installation, error: viewError } = await client
      .from('v_plugin_installations')
      .select('id, tenant_id, plugin_key, status, secret_ref')
      .eq('id', installationId as string)
      .single();

    expect(viewError).toBeNull();
    expect(installation.tenant_id).toBe(tenantId);
    expect(installation.plugin_key).toBe('sample_plugin');
    expect(installation.status).toBe('installed');
    expect(installation.secret_ref).toBe('secret-ref-1');
  });

  it('blocks non-admin users from installing plugins', async () => {
    const adminClient = createTestClient();
    const { user: admin } = await createTestUser(adminClient);
    const tenantId = await createTestTenant(adminClient);
    await setTenantContext(adminClient, tenantId);

    await ensurePlugin(serviceClient, 'locked_plugin', 'Locked Plugin');

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

    const errorMessage = await expectRPCError(memberClient, 'rpc_install_plugin', {
      p_tenant_id: tenantId,
      p_plugin_key: 'locked_plugin',
    });

    expect(errorMessage).toContain('tenant.admin');
  });
});
