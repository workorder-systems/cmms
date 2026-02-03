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

async function registerPlugin(
  serviceClient: SupabaseClient,
  key: string,
  name: string
): Promise<string> {
  const { data, error } = await serviceClient.rpc('rpc_register_plugin', {
    p_key: key,
    p_name: name,
    p_description: 'Test plugin',
    p_is_integration: false,
    p_is_active: true,
  });

  if (error) {
    throw new Error(`Failed to register plugin: ${error.message}`);
  }

  return data as string;
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

    await registerPlugin(serviceClient, 'sample_plugin', 'Sample Plugin');

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

    await registerPlugin(serviceClient, 'locked_plugin', 'Locked Plugin');

    const { user: member } = await createTestUser(client);
    await addUserToTenant(adminClient, member.id, tenantId);

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

  it('hides plugin installations from non-admin users', async () => {
    const adminClient = createTestClient();
    await createTestUser(adminClient);
    const tenantId = await createTestTenant(adminClient);
    await setTenantContext(adminClient, tenantId);

    await registerPlugin(serviceClient, 'hidden_plugin', 'Hidden Plugin');

    const { data: installationId, error } = await adminClient.rpc('rpc_install_plugin', {
      p_tenant_id: tenantId,
      p_plugin_key: 'hidden_plugin',
      p_secret_ref: 'secret-ref-2',
      p_config: { region: 'us-west-2' },
    });
    expect(error).toBeNull();
    expect(installationId).toBeDefined();

    const memberClient = createTestClient();
    const { user: member } = await createTestUser(memberClient);
    await addUserToTenant(adminClient, member.id, tenantId);
    await setTenantContext(memberClient, tenantId);

    const { data: installations, error: viewError } = await memberClient
      .from('v_plugin_installations')
      .select('id')
      .eq('id', installationId as string);

    expect(viewError).toBeNull();
    expect(installations.length).toBe(0);
  });

  describe('Plugin Installation Security', () => {
    it('should enforce plugin data isolation between tenants', async () => {
      const admin1Client = createTestClient();
      const { user: admin1 } = await createTestUser(admin1Client);
      const tenantId1 = await createTestTenant(admin1Client);
      await setTenantContext(admin1Client, tenantId1);

      const admin2Client = createTestClient();
      const { user: admin2 } = await createTestUser(admin2Client);
      const tenantId2 = await createTestTenant(admin2Client);
      await setTenantContext(admin2Client, tenantId2);

      await registerPlugin(serviceClient, 'isolated_plugin', 'Isolated Plugin');

      const install1Id = await admin1Client.rpc('rpc_install_plugin', {
        p_tenant_id: tenantId1,
        p_plugin_key: 'isolated_plugin',
        p_config: { tenant: 'tenant1' },
      }).then(r => r.data);

      const install2Id = await admin2Client.rpc('rpc_install_plugin', {
        p_tenant_id: tenantId2,
        p_plugin_key: 'isolated_plugin',
        p_config: { tenant: 'tenant2' },
      }).then(r => r.data);

      // Tenant1 should only see their installation
      const { data: tenant1Installs } = await admin1Client
        .from('v_plugin_installations')
        .select('id')
        .eq('id', install1Id);

      const { data: tenant1Cross } = await admin1Client
        .from('v_plugin_installations')
        .select('id')
        .eq('id', install2Id);

      expect(tenant1Installs?.length ?? 0).toBe(1);
      expect(tenant1Cross?.length ?? 0).toBe(0);
    });

    it('should clean up plugin data on uninstallation', async () => {
      const adminClient = createTestClient();
      const { user: admin } = await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);
      await setTenantContext(adminClient, tenantId);

      await registerPlugin(serviceClient, 'cleanup_plugin', 'Cleanup Plugin');

      const installId = await adminClient.rpc('rpc_install_plugin', {
        p_tenant_id: tenantId,
        p_plugin_key: 'cleanup_plugin',
      }).then(r => r.data);

      // Uninstall
      await adminClient.rpc('rpc_uninstall_plugin', {
        p_tenant_id: tenantId,
        p_installation_id: installId,
      });

      // Installation should be removed or marked as uninstalled
      const { data: installations } = await adminClient
        .from('v_plugin_installations')
        .select('status')
        .eq('id', installId);

      // Should be empty or status should be 'uninstalled'
      if (installations && installations.length > 0) {
        expect(installations[0].status).toBe('uninstalled');
      } else {
        expect(installations?.length ?? 0).toBe(0);
      }
    });

    it('should require permissions for plugin config updates', async () => {
      const adminClient = createTestClient();
      const { user: admin } = await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);
      await setTenantContext(adminClient, tenantId);

      await registerPlugin(serviceClient, 'config_plugin', 'Config Plugin');

      const installId = await adminClient.rpc('rpc_install_plugin', {
        p_tenant_id: tenantId,
        p_plugin_key: 'config_plugin',
        p_config: { initial: 'config' },
      }).then(r => r.data);

      const memberClient = createTestClient();
      const { user: member } = await createTestUser(memberClient);
      await addUserToTenant(adminClient, member.id, tenantId);
      await setTenantContext(memberClient, tenantId);

      // Member should not be able to update config
      const errorMessage = await expectRPCError(memberClient, 'rpc_update_plugin_installation', {
        p_tenant_id: tenantId,
        p_installation_id: installId,
        p_config: { updated: 'config' },
      });

      expect(errorMessage).toContain('tenant.admin');
    });
  });

  describe('Integration Boundaries', () => {
    it('should prevent plugin data leakage between tenants', async () => {
      const admin1Client = createTestClient();
      const { user: admin1 } = await createTestUser(admin1Client);
      const tenantId1 = await createTestTenant(admin1Client);
      await setTenantContext(admin1Client, tenantId1);

      const admin2Client = createTestClient();
      const { user: admin2 } = await createTestUser(admin2Client);
      const tenantId2 = await createTestTenant(admin2Client);
      await setTenantContext(admin2Client, tenantId2);

      await registerPlugin(serviceClient, 'boundary_plugin', 'Boundary Plugin');

      await admin1Client.rpc('rpc_install_plugin', {
        p_tenant_id: tenantId1,
        p_plugin_key: 'boundary_plugin',
        p_config: { secret: 'tenant1_secret' },
      });

      await admin2Client.rpc('rpc_install_plugin', {
        p_tenant_id: tenantId2,
        p_plugin_key: 'boundary_plugin',
        p_config: { secret: 'tenant2_secret' },
      });

      // Tenant1 should not see Tenant2's config
      const { data: tenant1Installs } = await admin1Client
        .from('v_plugin_installations')
        .select('config')
        .eq('plugin_key', 'boundary_plugin')
        .eq('tenant_id', tenantId1);

      expect(tenant1Installs?.length ?? 0).toBe(1);
      if (tenant1Installs && tenant1Installs.length > 0) {
        expect(tenant1Installs[0].config).not.toContain('tenant2_secret');
      }
    });

    it('should enforce tenant context in plugin RPCs', async () => {
      const adminClient = createTestClient();
      const { user: admin } = await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);
      await setTenantContext(adminClient, tenantId);

      await registerPlugin(serviceClient, 'context_plugin', 'Context Plugin');

      // Plugin RPCs should validate tenant context
      const installId = await adminClient.rpc('rpc_install_plugin', {
        p_tenant_id: tenantId,
        p_plugin_key: 'context_plugin',
      }).then(r => r.data);

      expect(installId).toBeDefined();

      // Verify installation belongs to tenant
      const { data: installation } = await adminClient
        .from('v_plugin_installations')
        .select('tenant_id')
        .eq('id', installId)
        .single();

      expect(installation?.tenant_id).toBe(tenantId);
    });

    it('should log plugin operations in audit', async () => {
      const adminClient = createTestClient();
      const { user: admin } = await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);
      await setTenantContext(adminClient, tenantId);

      await registerPlugin(serviceClient, 'audit_plugin', 'Audit Plugin');

      const installId = await adminClient.rpc('rpc_install_plugin', {
        p_tenant_id: tenantId,
        p_plugin_key: 'audit_plugin',
      }).then(r => r.data);

      // Check audit log
      const { data: audits } = await adminClient
        .from('v_audit_entity_changes')
        .select('*')
        .eq('table_name', 'plugin_installations')
        .eq('record_id', installId)
        .eq('operation', 'INSERT');

      expect(audits?.length ?? 0).toBeGreaterThan(0);
    });
  });
});
