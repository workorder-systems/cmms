/**
 * Tests for scheduling and dispatch: schedule blocks, schedule views, and RPCs
 * (migration: 20260311140000_scheduling_dispatch_work_orders).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient, waitForSupabase } from './helpers/supabase';
import { createTestUser } from './helpers/auth';
import { createTestTenant, setTenantContext } from './helpers/tenant';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Scheduling & Dispatch', () => {
  let client: SupabaseClient;

  beforeAll(async () => {
    await waitForSupabase();
    client = createTestClient();
  });

  describe('Views', () => {
    it('should query v_schedule_blocks without error', async () => {
      await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const { data, error } = await client.from('v_schedule_blocks').select('id').limit(5);
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should query v_schedule_by_technician and v_schedule_by_asset without error', async () => {
      await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const { error: byTech } = await client.from('v_schedule_by_technician').select('*').limit(1);
      expect(byTech).toBeNull();

      const { error: byAsset } = await client.from('v_schedule_by_asset').select('*').limit(1);
      expect(byAsset).toBeNull();
    });
  });

  describe('Tenant isolation', () => {
    it('should only return schedule blocks for current tenant', async () => {
      await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const { data: list, error } = await client.from('v_schedule_blocks').select('id, tenant_id');
      expect(error).toBeNull();
      for (const row of list ?? []) {
        expect(row.tenant_id).toBe(tenantId);
      }
    });
  });
});
