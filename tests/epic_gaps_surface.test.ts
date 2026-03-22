import { describe, it, expect, beforeAll } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createTestClient, waitForSupabase } from './helpers/supabase';
import { createTestUser, TEST_PASSWORD } from './helpers/auth';
import {
  createTestTenant,
  addUserToTenant,
  setTenantContext,
} from './helpers/tenant';
import { createTestWorkOrder } from './helpers/entities';

describe('Epic gaps surface (comms, contracts, integrations, maintenance requests)', () => {
  let client: SupabaseClient;

  beforeAll(async () => {
    await waitForSupabase();
    client = createTestClient();
  });

  it('rpc_add_work_order_comms_event and v_work_order_comms', async () => {
    await createTestUser(client);
    const tenantId = await createTestTenant(client);
    const woId = await createTestWorkOrder(client, tenantId, 'Comms test WO');
    await setTenantContext(client, tenantId);

    const { data: eventId, error } = await client.rpc('rpc_add_work_order_comms_event', {
      p_tenant_id: tenantId,
      p_work_order_id: woId,
      p_body: 'Test comms line',
      p_channel: 'phone',
      p_metadata: { source: 'vitest' },
    });
    expect(error).toBeNull();
    expect(typeof eventId).toBe('string');

    const { data: rows, error: viewError } = await client
      .from('v_work_order_comms')
      .select('*')
      .eq('work_order_id', woId);
    expect(viewError).toBeNull();
    expect(rows?.some((r) => r.body === 'Test comms line')).toBe(true);
  });

  it('supplier contracts and vendor metric views', async () => {
    await createTestUser(client);
    const tenantId = await createTestTenant(client);
    await setTenantContext(client, tenantId);

    const { data: supplierId, error: sErr } = await client.rpc('rpc_create_supplier', {
      p_tenant_id: tenantId,
      p_name: 'Contract Test Supplier',
      p_code: null,
      p_external_id: null,
      p_contact_name: null,
      p_email: null,
      p_phone: null,
      p_address_line: null,
    });
    expect(sErr).toBeNull();
    expect(typeof supplierId).toBe('string');

    const { data: contractId, error: cErr } = await client.rpc('rpc_create_supplier_contract', {
      p_tenant_id: tenantId,
      p_supplier_id: supplierId,
      p_effective_start: '2025-01-01',
      p_effective_end: null,
      p_contract_number: 'T-CTR-1',
      p_terms: 'Net 30',
      p_is_active: true,
    });
    expect(cErr).toBeNull();
    expect(typeof contractId).toBe('string');

    const { data: rateId, error: rErr } = await client.rpc('rpc_add_supplier_contract_rate', {
      p_tenant_id: tenantId,
      p_contract_id: contractId,
      p_rate_type: 'hourly',
      p_amount_cents: 10000,
      p_uom: 'hour',
    });
    expect(rErr).toBeNull();
    expect(typeof rateId).toBe('number');

    const { data: contracts, error: vcErr } = await client.from('v_supplier_contracts').select('id');
    expect(vcErr).toBeNull();
    expect(contracts?.some((c) => c.id === contractId)).toBe(true);

    const { data: rates, error: vrErr } = await client.from('v_supplier_contract_rates').select('id');
    expect(vrErr).toBeNull();
    expect(rates?.some((r) => r.id === rateId)).toBe(true);

    const { error: spendErr } = await client.from('v_vendor_spend_by_supplier').select('supplier_id');
    expect(spendErr).toBeNull();

    const { error: cntErr } = await client.from('v_work_order_counts_by_primary_supplier').select('supplier_id');
    expect(cntErr).toBeNull();
  });

  it('integration external ids and outbound events (admin) and denial for member', async () => {
    const adminClient = createTestClient();
    await createTestUser(adminClient);
    const tenantId = await createTestTenant(adminClient);
    await setTenantContext(adminClient, tenantId);

    const woId = await createTestWorkOrder(adminClient, tenantId, 'Integration WO');

    const { data: mapId, error } = await adminClient.rpc('rpc_upsert_integration_external_id', {
      p_tenant_id: tenantId,
      p_entity_type: 'work_order',
      p_entity_id: woId,
      p_system_key: 'erp',
      p_external_id: 'EXT-1',
      p_metadata: { ok: true },
    });
    expect(error).toBeNull();
    expect(typeof mapId).toBe('string');

    const { data: evId, error: evErr } = await adminClient.rpc('rpc_enqueue_integration_event', {
      p_tenant_id: tenantId,
      p_event_type: 'work_order.created',
      p_payload: { work_order_id: woId },
      p_entity_type: 'work_order',
      p_entity_id: woId,
    });
    expect(evErr).toBeNull();
    expect(typeof evId).toBe('string');

    const { data: maps, error: mErr } = await adminClient.from('v_integration_external_ids').select('external_id');
    expect(mErr).toBeNull();
    expect(maps?.some((m) => m.external_id === 'EXT-1')).toBe(true);

    const { data: events, error: eErr } = await adminClient.from('v_outbound_integration_events').select('id');
    expect(eErr).toBeNull();
    expect(events?.some((e) => e.id === evId)).toBe(true);

    const memberClient = createTestClient();
    const { user: member } = await createTestUser(memberClient);
    await addUserToTenant(adminClient, member.id, tenantId);
    await memberClient.auth.signInWithPassword({
      email: member.email!,
      password: TEST_PASSWORD,
    });
    await setTenantContext(memberClient, tenantId);

    const { error: denied } = await memberClient.rpc('rpc_upsert_integration_external_id', {
      p_tenant_id: tenantId,
      p_entity_type: 'work_order',
      p_entity_id: woId,
      p_system_key: 'erp2',
      p_external_id: 'nope',
      p_metadata: null,
    });
    expect(denied).toBeTruthy();
  });

  it('maintenance request submitted then convert to work order', async () => {
    await createTestUser(client);
    const tenantId = await createTestTenant(client);
    await setTenantContext(client, tenantId);

    const { data: reqId, error: rErr } = await client.rpc('rpc_create_maintenance_request', {
      p_tenant_id: tenantId,
      p_title: 'MR convert test',
      p_description: null,
      p_priority: 'medium',
      p_maintenance_type: null,
      p_location_id: null,
      p_asset_id: null,
      p_due_date: null,
      p_status: 'submitted',
    });
    expect(rErr).toBeNull();
    expect(typeof reqId).toBe('string');

    const { data: woId, error: cErr } = await client.rpc('rpc_convert_maintenance_request_to_work_order', {
      p_tenant_id: tenantId,
      p_request_id: reqId,
    });
    expect(cErr).toBeNull();
    expect(typeof woId).toBe('string');

    const { data: mr, error: mrErr } = await client
      .from('v_maintenance_requests')
      .select('status, converted_work_order_id')
      .eq('id', reqId)
      .maybeSingle();
    expect(mrErr).toBeNull();
    expect(mr?.status).toBe('converted');
    expect(mr?.converted_work_order_id).toBe(woId);
  });

  it('rpc_create_work_order_request still returns work order and creates converted maintenance request', async () => {
    await createTestUser(client);
    const tenantId = await createTestTenant(client);
    await setTenantContext(client, tenantId);

    const { data: woId, error } = await client.rpc('rpc_create_work_order_request', {
      p_tenant_id: tenantId,
      p_title: 'Portal path MR+WO',
      p_description: null,
      p_priority: 'low',
      p_maintenance_type: null,
      p_location_id: null,
      p_asset_id: null,
      p_due_date: null,
    });
    expect(error).toBeNull();
    expect(typeof woId).toBe('string');

    const { data: mrs, error: qErr } = await client
      .from('v_maintenance_requests')
      .select('id, converted_work_order_id, status')
      .eq('converted_work_order_id', woId);
    expect(qErr).toBeNull();
    expect(mrs?.length).toBe(1);
    expect(mrs![0].status).toBe('converted');
  });
});
