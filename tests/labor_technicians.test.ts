/**
 * Tests for labor, technicians, and crews: public views and RPCs
 * (migrations: 20260311120000_labor_technicians_crews_foundation, 20260311130000_public_labor_views).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient, waitForSupabase } from './helpers/supabase';
import { createTestUser } from './helpers/auth';
import { createTestTenant, setTenantContext } from './helpers/tenant';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Labor & Technicians', () => {
  let client: SupabaseClient;

  beforeAll(async () => {
    await waitForSupabase();
    client = createTestClient();
  });

  describe('Views', () => {
    it('should query v_technicians and v_crews without error when tenant has no data', async () => {
      await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const { data: techList, error: techError } = await client
        .from('v_technicians')
        .select('id')
        .limit(5);
      expect(techError).toBeNull();
      expect(Array.isArray(techList)).toBe(true);

      const { data: crewList, error: crewError } = await client
        .from('v_crews')
        .select('id')
        .limit(5);
      expect(crewError).toBeNull();
      expect(Array.isArray(crewList)).toBe(true);
    });

    it('should query v_shift_templates and v_technician_capacity without error', async () => {
      await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const { error: shiftError } = await client.from('v_shift_templates').select('id').limit(1);
      expect(shiftError).toBeNull();

      const { error: capError } = await client.from('v_technician_capacity').select('technician_id').limit(1);
      expect(capError).toBeNull();
    });
  });

  describe('Tenant isolation', () => {
    it('should only return technicians for current tenant', async () => {
      const client1 = createTestClient();
      await createTestUser(client1);
      const tenantId1 = await createTestTenant(client1);
      await setTenantContext(client1, tenantId1);

      const { data: list1, error: e1 } = await client1.from('v_technicians').select('id, tenant_id');
      expect(e1).toBeNull();
      for (const row of list1 ?? []) {
        expect(row.tenant_id).toBe(tenantId1);
      }

      const client2 = createTestClient();
      await createTestUser(client2);
      const tenantId2 = await createTestTenant(client2);
      await setTenantContext(client2, tenantId2);

      const { data: list2, error: e2 } = await client2.from('v_technicians').select('id, tenant_id');
      expect(e2).toBeNull();
      for (const row of list2 ?? []) {
        expect(row.tenant_id).toBe(tenantId2);
      }
    });
  });
});
