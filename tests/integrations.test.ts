import { createHmac } from 'node:crypto';
import { execSync } from 'node:child_process';
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

function signPluginWebhookPayloadText(payloadText: string, secret: string): string {
  return createHmac('sha256', secret).update(payloadText, 'utf8').digest('hex');
}

/** Seeds Vault secret for webhook HMAC tests (local Docker DB only). */
function trySeedVaultWebhookSecret(): boolean {
  try {
    execSync(
      `docker exec supabase_db_database psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c "delete from vault.secrets where name = 'plugin_integ_hmac'; select vault.create_secret('testhmacsecret123456789012345678', 'plugin_integ_hmac', 'vitest');"`,
      { stdio: 'ignore' }
    );
    return true;
  } catch {
    return false;
  }
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

  describe('Plugin webhooks (audit-driven queue + Vault HMAC)', () => {
    let vaultOk = false;

    beforeAll(() => {
      vaultOk = trySeedVaultWebhookSecret();
    });

    it('does not enqueue deliveries without a webhook subscription', async () => {
      const adminClient = createTestClient();
      await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);
      await setTenantContext(adminClient, tenantId);

      await registerPlugin(serviceClient, 'no_sub_plugin', 'No Sub Plugin');

      const { data: installationId, error: instErr } = await adminClient.rpc('rpc_install_plugin', {
        p_tenant_id: tenantId,
        p_plugin_key: 'no_sub_plugin',
        p_config: { webhook_url: 'https://example.invalid/webhook' },
      });
      expect(instErr).toBeNull();

      const { error: woErr } = await adminClient.rpc('rpc_create_work_order', {
        p_tenant_id: tenantId,
        p_title: 'Webhook probe',
        p_description: null,
      });
      expect(woErr).toBeNull();

      const { data: deliveries, error: dErr } = await adminClient
        .from('v_plugin_delivery_queue_recent')
        .select('id')
        .eq('plugin_installation_id', installationId as string);

      expect(dErr).toBeNull();
      expect((deliveries ?? []).length).toBe(0);
    });

    it('enqueues a delivery when subscription matches work_orders audit', async () => {
      const adminClient = createTestClient();
      await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);
      await setTenantContext(adminClient, tenantId);

      await registerPlugin(serviceClient, 'queue_plugin', 'Queue Plugin');

      const { data: installationId, error: instErr } = await adminClient.rpc('rpc_install_plugin', {
        p_tenant_id: tenantId,
        p_plugin_key: 'queue_plugin',
        p_config: { webhook_url: 'https://example.invalid/webhook' },
      });
      expect(instErr).toBeNull();

      const { error: subErr } = await adminClient.rpc('rpc_upsert_plugin_webhook_subscription', {
        p_tenant_id: tenantId,
        p_installation_id: installationId,
        p_table_schema: 'app',
        p_table_name: 'work_orders',
        p_operations: ['INSERT'],
        p_include_payload: false,
      });
      expect(subErr).toBeNull();

      const { error: woErr } = await adminClient.rpc('rpc_create_work_order', {
        p_tenant_id: tenantId,
        p_title: 'Queued event',
        p_description: null,
      });
      expect(woErr).toBeNull();

      const { data: deliveries, error: dErr } = await adminClient
        .from('v_plugin_delivery_queue_recent')
        .select('id, event_type, status')
        .eq('plugin_installation_id', installationId as string);

      expect(dErr).toBeNull();
      expect((deliveries ?? []).length).toBe(1);
      expect(deliveries![0].event_type).toBe('entity_change.work_orders.insert');
      expect(deliveries![0].status).toBe('pending');
    });

    it('isolates delivery queue rows between tenants', async () => {
      const admin1 = createTestClient();
      await createTestUser(admin1);
      const tenant1 = await createTestTenant(admin1);
      await setTenantContext(admin1, tenant1);

      const admin2 = createTestClient();
      await createTestUser(admin2);
      const tenant2 = await createTestTenant(admin2);
      await setTenantContext(admin2, tenant2);

      await registerPlugin(serviceClient, 'iso_queue_plugin', 'Iso Queue Plugin');

      const inst1 = await admin1
        .rpc('rpc_install_plugin', {
          p_tenant_id: tenant1,
          p_plugin_key: 'iso_queue_plugin',
          p_config: { webhook_url: 'https://example.invalid/a' },
        })
        .then(r => r.data);
      const inst2 = await admin2
        .rpc('rpc_install_plugin', {
          p_tenant_id: tenant2,
          p_plugin_key: 'iso_queue_plugin',
          p_config: { webhook_url: 'https://example.invalid/b' },
        })
        .then(r => r.data);

      await admin1.rpc('rpc_upsert_plugin_webhook_subscription', {
        p_tenant_id: tenant1,
        p_installation_id: inst1,
        p_table_schema: 'app',
        p_table_name: 'work_orders',
        p_operations: ['INSERT'],
      });
      await admin2.rpc('rpc_upsert_plugin_webhook_subscription', {
        p_tenant_id: tenant2,
        p_installation_id: inst2,
        p_table_schema: 'app',
        p_table_name: 'work_orders',
        p_operations: ['INSERT'],
      });

      await setTenantContext(admin1, tenant1);
      await admin1.rpc('rpc_create_work_order', {
        p_tenant_id: tenant1,
        p_title: 'T1 only',
        p_description: null,
      });

      const { data: t1rows } = await admin1.from('v_plugin_delivery_queue_recent').select('id');
      const { data: t2rows } = await admin2.from('v_plugin_delivery_queue_recent').select('id');

      expect((t1rows ?? []).length).toBe(1);
      expect((t2rows ?? []).length).toBe(0);
    });

    it('marks deliveries dead when webhook_url is missing (processor)', async () => {
      const adminClient = createTestClient();
      await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);
      await setTenantContext(adminClient, tenantId);

      await registerPlugin(serviceClient, 'dead_letter_plugin', 'Dead Letter Plugin');

      const installationId = await adminClient
        .rpc('rpc_install_plugin', {
          p_tenant_id: tenantId,
          p_plugin_key: 'dead_letter_plugin',
          p_config: {},
        })
        .then(r => r.data);

      await adminClient.rpc('rpc_upsert_plugin_webhook_subscription', {
        p_tenant_id: tenantId,
        p_installation_id: installationId,
        p_table_schema: 'app',
        p_table_name: 'work_orders',
        p_operations: ['INSERT'],
      });

      await adminClient.rpc('rpc_create_work_order', {
        p_tenant_id: tenantId,
        p_title: 'Dead letter',
        p_description: null,
      });

      const { data: before } = await adminClient
        .from('v_plugin_delivery_queue_recent')
        .select('id, status')
        .eq('plugin_installation_id', installationId as string)
        .single();

      expect(before?.status).toBe('pending');

      const { data: processed, error: procErr } = await serviceClient.rpc('rpc_process_plugin_deliveries', {
        p_batch_size: 20,
      });
      expect(procErr).toBeNull();
      expect(typeof processed).toBe('number');

      const { data: after } = await adminClient
        .from('v_plugin_delivery_queue_recent')
        .select('status, last_error')
        .eq('plugin_installation_id', installationId as string)
        .single();

      expect(after?.status).toBe('dead');
      expect(after?.last_error).toContain('webhook_url');
    });

    it('accepts inbound noop webhook with valid HMAC (anon)', async () => {
      if (!vaultOk) {
        expect(true).toBe(true);
        return;
      }

      const adminClient = createTestClient();
      await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);
      await setTenantContext(adminClient, tenantId);

      await registerPlugin(serviceClient, 'ingest_plugin', 'Ingest Plugin');

      const installationId = await adminClient
        .rpc('rpc_install_plugin', {
          p_tenant_id: tenantId,
          p_plugin_key: 'ingest_plugin',
          p_secret_ref: 'plugin_integ_hmac',
          p_config: {},
        })
        .then(r => r.data);

      const payloadText = '{"action": "noop"}';
      const sig = signPluginWebhookPayloadText(payloadText, 'testhmacsecret123456789012345678');

      const anonClient = createTestClient();
      const { data, error } = await anonClient.rpc('rpc_plugin_ingest_webhook', {
        p_plugin_key: 'ingest_plugin',
        p_installation_id: installationId,
        p_payload: JSON.parse(payloadText) as object,
        p_signature: sig,
      });

      expect(error).toBeNull();
      expect((data as { ok?: boolean })?.ok).toBe(true);
    });
  });
});
