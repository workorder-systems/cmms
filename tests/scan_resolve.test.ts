import { describe, it, expect, beforeAll } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createTestClient, waitForSupabase } from './helpers/supabase';
import { createTestUser } from './helpers/auth';
import { createTestTenant, setTenantContext } from './helpers/tenant';

describe('Barcode scan resolution (assets and parts)', () => {
  let client: SupabaseClient;

  beforeAll(async () => {
    await waitForSupabase();
    client = createTestClient();
  });

  it('rpc_resolve_asset_by_scan_code matches barcode then asset_number', async () => {
    await createTestUser(client);
    const tenantId = await createTestTenant(client);
    await setTenantContext(client, tenantId);

    const { data: byBarcode, error: e1 } = await client.rpc('rpc_create_asset', {
      p_tenant_id: tenantId,
      p_name: 'Scan test asset',
      p_barcode: 'SCAN-ASSET-001',
    });
    expect(e1).toBeNull();
    const assetId = byBarcode as string;

    const { data: r1, error: e2 } = await client.rpc('rpc_resolve_asset_by_scan_code', {
      p_tenant_id: tenantId,
      p_code: 'SCAN-ASSET-001',
    });
    expect(e2).toBeNull();
    expect(r1).toBe(assetId);

    const { data: r2 } = await client.rpc('rpc_resolve_asset_by_scan_code', {
      p_tenant_id: tenantId,
      p_code: '  SCAN-ASSET-001  ',
    });
    expect(r2).toBe(assetId);

    const { data: byNum, error: e3 } = await client.rpc('rpc_create_asset', {
      p_tenant_id: tenantId,
      p_name: 'Number only',
      p_asset_number: 'TAG-777',
    });
    expect(e3).toBeNull();
    const { data: r3 } = await client.rpc('rpc_resolve_asset_by_scan_code', {
      p_tenant_id: tenantId,
      p_code: 'TAG-777',
    });
    expect(r3).toBe(byNum as string);

    const { data: missing } = await client.rpc('rpc_resolve_asset_by_scan_code', {
      p_tenant_id: tenantId,
      p_code: 'no-such-code',
    });
    expect(missing).toBeNull();
  });

  it('rejects duplicate barcode per tenant on asset', async () => {
    await createTestUser(client);
    const tenantId = await createTestTenant(client);
    await setTenantContext(client, tenantId);

    const { error: first } = await client.rpc('rpc_create_asset', {
      p_tenant_id: tenantId,
      p_name: 'A1',
      p_barcode: 'DUP-BAR',
    });
    expect(first).toBeNull();

    const { error: second } = await client.rpc('rpc_create_asset', {
      p_tenant_id: tenantId,
      p_name: 'A2',
      p_barcode: 'DUP-BAR',
    });
    expect(second).toBeTruthy();
  });

  it('rpc_resolve_part_by_scan_code matches barcode, part_number, external_id', async () => {
    await createTestUser(client);
    const tenantId = await createTestTenant(client);
    await setTenantContext(client, tenantId);

    const { data: pid1, error: p1e } = await client.rpc('rpc_create_part', {
      p_tenant_id: tenantId,
      p_part_number: 'PN-BASE',
      p_barcode: 'SCAN-PART-99',
    });
    expect(p1e).toBeNull();

    const { data: r1 } = await client.rpc('rpc_resolve_part_by_scan_code', {
      p_tenant_id: tenantId,
      p_code: 'SCAN-PART-99',
    });
    expect(r1).toBe(pid1 as string);

    const { data: r2 } = await client.rpc('rpc_resolve_part_by_scan_code', {
      p_tenant_id: tenantId,
      p_code: 'PN-BASE',
    });
    expect(r2).toBe(pid1 as string);

    const { data: pid2 } = await client.rpc('rpc_create_part', {
      p_tenant_id: tenantId,
      p_part_number: 'PN-ERP',
      p_external_id: 'ERP-EXT-42',
    });
    const { data: r3 } = await client.rpc('rpc_resolve_part_by_scan_code', {
      p_tenant_id: tenantId,
      p_code: 'ERP-EXT-42',
    });
    expect(r3).toBe(pid2 as string);
  });
});
