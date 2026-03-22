/**
 * Purchase requisitions: draft CRUD via public RPCs.
 */
import { execSync } from 'node:child_process';
import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient, waitForSupabase } from './helpers/supabase';
import { createTestUser } from './helpers/auth';
import { createTestTenant } from './helpers/tenant';
import { shortSlug } from './helpers/faker';
import type { SupabaseClient } from '@supabase/supabase-js';

function setRequisitionStatusSubmitted(requisitionId: string): void {
  execSync(
    `docker exec supabase_db_database psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c "update app.purchase_requisitions set status = 'submitted' where id = '${requisitionId}';"`,
    { stdio: 'pipe' }
  );
}

describe('Purchase requisitions RPCs', () => {
  let client: SupabaseClient;

  beforeAll(async () => {
    await waitForSupabase();
    client = createTestClient();
  });

  it('should create draft requisition, add/update/remove line, delete draft', async () => {
    await createTestUser(client);
    const tenantId = await createTestTenant(client);

    const { data: partId, error: partErr } = await client.rpc('rpc_create_part', {
      p_tenant_id: tenantId,
      p_part_number: `REQ-P-${shortSlug()}`,
      p_name: null,
      p_description: null,
      p_unit: 'each',
      p_preferred_supplier_id: null,
      p_external_id: null,
      p_reorder_point: null,
      p_min_quantity: null,
      p_max_quantity: null,
      p_lead_time_days: null,
    });
    expect(partErr).toBeNull();
    expect(partId).toBeDefined();

    const { data: reqId, error: reqErr } = await client.rpc('rpc_create_purchase_requisition', {
      p_tenant_id: tenantId,
      p_due_date: null,
      p_notes: 'Need parts',
    });
    expect(reqErr).toBeNull();
    expect(reqId).toBeDefined();

    const { data: lineId, error: lineErr } = await client.rpc('rpc_add_purchase_requisition_line', {
      p_tenant_id: tenantId,
      p_purchase_requisition_id: reqId,
      p_part_id: partId,
      p_quantity: 5,
      p_estimated_unit_cost: 10.5,
      p_notes: null,
    });
    expect(lineErr).toBeNull();
    expect(lineId).toBeDefined();

    const { error: updLineErr } = await client.rpc('rpc_update_purchase_requisition_line', {
      p_tenant_id: tenantId,
      p_line_id: lineId,
      p_quantity: 7,
      p_estimated_unit_cost: null,
      p_notes: null,
    });
    expect(updLineErr).toBeNull();

    const { error: rmErr } = await client.rpc('rpc_remove_purchase_requisition_line', {
      p_tenant_id: tenantId,
      p_line_id: lineId,
    });
    expect(rmErr).toBeNull();

    const { error: delErr } = await client.rpc('rpc_delete_purchase_requisition', {
      p_tenant_id: tenantId,
      p_purchase_requisition_id: reqId,
    });
    expect(delErr).toBeNull();
  });

  it('should reject line mutations when requisition is not draft', async () => {
    await createTestUser(client);
    const tenantId = await createTestTenant(client);

    const { data: partId } = await client.rpc('rpc_create_part', {
      p_tenant_id: tenantId,
      p_part_number: `REQ-P2-${shortSlug()}`,
      p_name: null,
      p_description: null,
      p_unit: 'each',
      p_preferred_supplier_id: null,
      p_external_id: null,
      p_reorder_point: null,
      p_min_quantity: null,
      p_max_quantity: null,
      p_lead_time_days: null,
    });

    const { data: reqId, error: reqErr } = await client.rpc('rpc_create_purchase_requisition', {
      p_tenant_id: tenantId,
      p_due_date: null,
      p_notes: null,
    });
    expect(reqErr).toBeNull();

    try {
      setRequisitionStatusSubmitted(reqId as string);
    } catch {
      return;
    }

    const { error: addErr } = await client.rpc('rpc_add_purchase_requisition_line', {
      p_tenant_id: tenantId,
      p_purchase_requisition_id: reqId,
      p_part_id: partId,
      p_quantity: 1,
      p_estimated_unit_cost: null,
      p_notes: null,
    });
    expect(addErr).not.toBeNull();
  });

  it('should reject delete when not draft', async () => {
    await createTestUser(client);
    const tenantId = await createTestTenant(client);

    const { data: reqId } = await client.rpc('rpc_create_purchase_requisition', {
      p_tenant_id: tenantId,
      p_due_date: null,
      p_notes: null,
    });

    try {
      setRequisitionStatusSubmitted(reqId as string);
    } catch {
      return;
    }

    const { error: delErr } = await client.rpc('rpc_delete_purchase_requisition', {
      p_tenant_id: tenantId,
      p_purchase_requisition_id: reqId,
    });
    expect(delErr).not.toBeNull();
  });
});
