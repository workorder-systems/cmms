/**
 * Tests for parts and inventory: parts catalog, suppliers, stock levels, and public views
 * (migrations: 20260313120001_parts_inventory_foundation, 20260313140000_public_parts_inventory_views).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient, waitForSupabase } from './helpers/supabase';
import { createTestUser } from './helpers/auth';
import { createTestTenant, setTenantContext } from './helpers/tenant';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Parts inventory', () => {
  let client: SupabaseClient;

  beforeAll(async () => {
    await waitForSupabase();
    client = createTestClient();
  });

  describe('Parts', () => {
    it('should create part via rpc_create_part and read from v_parts', async () => {
      await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const { data: partId, error: createError } = await client.rpc('rpc_create_part', {
        p_tenant_id: tenantId,
        p_part_number: 'PN-001',
        p_name: 'Filter cartridge',
        p_description: 'HVAC filter',
        p_unit: 'each',
        p_preferred_supplier_id: null,
        p_external_id: null,
        p_reorder_point: 10,
        p_min_quantity: 5,
        p_max_quantity: 100,
        p_lead_time_days: 7,
      });

      expect(createError).toBeNull();
      expect(partId).toBeDefined();
      expect(typeof partId).toBe('string');

      const { data: row, error: viewError } = await client
        .from('v_parts')
        .select('id, part_number, name, unit, reorder_point')
        .eq('id', partId)
        .single();

      expect(viewError).toBeNull();
      expect(row?.part_number).toBe('PN-001');
      expect(row?.name).toBe('Filter cartridge');
      expect(row?.unit).toBe('each');
      expect(row?.reorder_point).toBe(10);
    });

    it('should list parts scoped to current tenant', async () => {
      await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      await client.rpc('rpc_create_part', {
        p_tenant_id: tenantId,
        p_part_number: 'PN-SCOPE',
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

      const { data: list, error } = await client
        .from('v_parts')
        .select('id, part_number')
        .eq('tenant_id', tenantId);

      expect(error).toBeNull();
      expect(Array.isArray(list)).toBe(true);
      expect(list!.some((r) => r.part_number === 'PN-SCOPE')).toBe(true);
    });
  });

  describe('Suppliers', () => {
    it('should create supplier via rpc_create_supplier and read from v_suppliers', async () => {
      await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const { data: supplierId, error: createError } = await client.rpc('rpc_create_supplier', {
        p_tenant_id: tenantId,
        p_name: 'Acme Supplies',
        p_code: 'ACM',
        p_external_id: null,
        p_contact_name: null,
        p_email: null,
        p_phone: null,
        p_address_line: null,
      });

      expect(createError).toBeNull();
      expect(supplierId).toBeDefined();
      expect(typeof supplierId).toBe('string');

      const { data: row, error: viewError } = await client
        .from('v_suppliers')
        .select('id, name, code')
        .eq('id', supplierId)
        .single();

      expect(viewError).toBeNull();
      expect(row?.name).toBe('Acme Supplies');
      expect(row?.code).toBe('ACM');
    });
  });

  describe('Views', () => {
    it('should query v_parts_with_stock and v_stock_levels without error', async () => {
      await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const { error: partsError } = await client.from('v_parts_with_stock').select('id').limit(1);
      expect(partsError).toBeNull();

      const { error: stockError } = await client.from('v_stock_levels').select('tenant_id, part_id').limit(1);
      expect(stockError).toBeNull();
    });
  });

  describe('Tenant isolation', () => {
    it('should not see other tenant parts in v_parts', async () => {
      const client1 = createTestClient();
      await createTestUser(client1);
      const tenantId1 = await createTestTenant(client1);
      await setTenantContext(client1, tenantId1);

      const { data: partId } = await client1.rpc('rpc_create_part', {
        p_tenant_id: tenantId1,
        p_part_number: 'T1-ONLY',
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

      const client2 = createTestClient();
      await createTestUser(client2);
      const tenantId2 = await createTestTenant(client2);
      await setTenantContext(client2, tenantId2);

      const { data: row, error } = await client2
        .from('v_parts')
        .select('id')
        .eq('id', partId)
        .maybeSingle();

      expect(error).toBeNull();
      expect(row).toBeNull();
    });
  });
});
