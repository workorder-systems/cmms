/**
 * Tests for purchasing: purchase orders, receipts, and related RPCs/views
 * (migration: 20260313130000_purchasing_po_receipts).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient, waitForSupabase } from './helpers/supabase';
import { createTestUser } from './helpers/auth';
import { createTestTenant, setTenantContext } from './helpers/tenant';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Purchasing', () => {
  let client: SupabaseClient;

  beforeAll(async () => {
    await waitForSupabase();
    client = createTestClient();
  });

  describe('Purchase orders', () => {
    it('should create purchase order via rpc_create_purchase_order', async () => {
      await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const { data: supplierId } = await client.rpc('rpc_create_supplier', {
        p_tenant_id: tenantId,
        p_name: 'Vendor A',
        p_code: null,
        p_external_id: null,
        p_contact_name: null,
        p_email: null,
        p_phone: null,
        p_address_line: null,
      });
      const { data: partId } = await client.rpc('rpc_create_part', {
        p_tenant_id: tenantId,
        p_part_number: 'PO-PART-1',
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

      const { data: poId, error } = await client.rpc('rpc_create_purchase_order', {
        p_tenant_id: tenantId,
        p_supplier_id: supplierId,
        p_order_number: 'PO-001',
        p_order_date: null,
        p_expected_delivery_date: null,
        p_external_id: null,
        p_notes: null,
        p_lines: [{ part_id: partId, quantity_ordered: 10, unit_price: 5.99 }],
      });

      expect(error).toBeNull();
      expect(poId).toBeDefined();
      expect(typeof poId).toBe('string');

      const { data: rows, error: viewError } = await client
        .from('v_open_purchase_orders')
        .select('id, order_number')
        .eq('id', poId)
        .maybeSingle();

      expect(viewError).toBeNull();
      expect(rows?.order_number).toBe('PO-001');
    });

    it('should query v_open_purchase_orders and v_purchase_order_receipt_status without error', async () => {
      await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const { error: openError } = await client.from('v_open_purchase_orders').select('id').limit(1);
      expect(openError).toBeNull();

      const { error: statusError } = await client.from('v_purchase_order_receipt_status').select('purchase_order_id, tenant_id').limit(1);
      expect(statusError).toBeNull();
    });
  });

  describe('Tenant isolation', () => {
    it('should not see other tenant purchase orders in v_open_purchase_orders', async () => {
      const client1 = createTestClient();
      await createTestUser(client1);
      const tenantId1 = await createTestTenant(client1);
      await setTenantContext(client1, tenantId1);

      const { data: supplierId } = await client1.rpc('rpc_create_supplier', {
        p_tenant_id: tenantId1,
        p_name: 'S1',
        p_code: null,
        p_external_id: null,
        p_contact_name: null,
        p_email: null,
        p_phone: null,
        p_address_line: null,
      });
      const { data: poId } = await client1.rpc('rpc_create_purchase_order', {
        p_tenant_id: tenantId1,
        p_supplier_id: supplierId,
        p_order_number: 'T1-PO',
        p_order_date: null,
        p_expected_delivery_date: null,
        p_external_id: null,
        p_notes: null,
        p_lines: [],
      });

      const client2 = createTestClient();
      await createTestUser(client2);
      const tenantId2 = await createTestTenant(client2);
      await setTenantContext(client2, tenantId2);

      const { data: row, error } = await client2
        .from('v_open_purchase_orders')
        .select('id')
        .eq('id', poId)
        .maybeSingle();

      expect(error).toBeNull();
      expect(row).toBeNull();
    });
  });
});
