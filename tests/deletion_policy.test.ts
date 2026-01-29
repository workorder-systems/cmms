import { describe, it, expect, beforeAll } from 'vitest';
import {
  createTestClient,
  createServiceRoleClient,
  waitForSupabase,
} from './helpers/supabase';
import { createTestUser } from './helpers/auth';
import { createTestTenant, setTenantContext } from './helpers/tenant';
import { createTestDepartment, createTestAsset } from './helpers/entities';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Deletion policy (ADR 0007)', () => {
  let client: SupabaseClient;
  let serviceClient: SupabaseClient;

  beforeAll(async () => {
    await waitForSupabase();
    client = createTestClient();
    serviceClient = createServiceRoleClient();
  });

  it('hard deletes departments and audits delete events', async () => {
    await createTestUser(client);
    const tenantId = await createTestTenant(client);
    await setTenantContext(client, tenantId);

    const departmentId = await createTestDepartment(client, tenantId, 'Delete Me');

    const { error: deleteError } = await client.rpc('rpc_delete_department', {
      p_tenant_id: tenantId,
      p_department_id: departmentId,
    });
    expect(deleteError).toBeNull();

    const { data: remaining, error: fetchError } = await serviceClient
      .schema('app')
      .from('departments')
      .select('id')
      .eq('id', departmentId);

    expect(fetchError).toBeNull();
    expect(remaining).toHaveLength(0);

    await setTenantContext(client, tenantId);
    const { data: audits, error: auditError } = await client
      .from('v_audit_entity_changes')
      .select('operation, table_name, record_id')
      .eq('table_name', 'departments')
      .eq('record_id', departmentId)
      .eq('operation', 'DELETE');

    expect(auditError).toBeNull();
    expect(audits?.length ?? 0).toBeGreaterThan(0);
  });

  it('hard deletes assets and audits delete events', async () => {
    await createTestUser(client);
    const tenantId = await createTestTenant(client);
    await setTenantContext(client, tenantId);

    const assetId = await createTestAsset(serviceClient, tenantId, 'Disposable Asset');

    const { error: deleteError } = await client.rpc('rpc_delete_asset', {
      p_tenant_id: tenantId,
      p_asset_id: assetId,
    });
    expect(deleteError).toBeNull();

    const { data: remaining, error: fetchError } = await serviceClient
      .schema('app')
      .from('assets')
      .select('id')
      .eq('id', assetId);

    expect(fetchError).toBeNull();
    expect(remaining).toHaveLength(0);

    await setTenantContext(client, tenantId);
    const { data: audits, error: auditError } = await client
      .from('v_audit_entity_changes')
      .select('operation, table_name, record_id')
      .eq('table_name', 'assets')
      .eq('record_id', assetId)
      .eq('operation', 'DELETE');

    expect(auditError).toBeNull();
    expect(audits?.length ?? 0).toBeGreaterThan(0);
  });
});
