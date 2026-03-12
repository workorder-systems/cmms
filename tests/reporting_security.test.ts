/**
 * Reporting schema security: tenant isolation and no-data-without-context.
 * All reporting views filter by authz.get_current_tenant_id(); only the
 * current tenant's data must be visible via the API.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient, waitForSupabase } from './helpers/supabase';
import { createTestUser } from './helpers/auth';
import {
  createTestTenant,
  setTenantContext,
  clearTenantContext,
} from './helpers/tenant';
import {
  createTestWorkOrder,
  transitionWorkOrderStatus,
} from './helpers/entities';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Reporting schema security', () => {
  let client: SupabaseClient;

  beforeAll(async () => {
    await waitForSupabase();
    client = createTestClient();
  });

  describe('No tenant context', () => {
    it('should return no rows from dim_tenant when tenant context is not set', async () => {
      await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);
      await clearTenantContext(client);

      const { data, error } = await client
        .schema('reporting')
        .from('dim_tenant')
        .select('tenant_id, tenant_name, slug');

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data?.length).toBe(0);
    });

    it('should return no rows from fact_work_orders when tenant context is not set', async () => {
      await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId, 'WO for no-context test');
      await transitionWorkOrderStatus(client, tenantId, workOrderId, 'assigned');
      await transitionWorkOrderStatus(client, tenantId, workOrderId, 'completed');
      await clearTenantContext(client);

      const { data, error } = await client
        .schema('reporting')
        .from('fact_work_orders')
        .select('work_order_id, tenant_id')
        .eq('work_order_id', workOrderId);

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data?.length).toBe(0);
    });

    it('should return no rows from kpi_backlog when tenant context is not set', async () => {
      await createTestUser(client);
      await createTestTenant(client);
      await clearTenantContext(client);

      const { data, error } = await client
        .schema('reporting')
        .from('kpi_backlog')
        .select('tenant_id, open_count, overdue_count');

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data?.length).toBe(0);
    });
  });

  describe('With tenant context', () => {
    it('should return only current tenant in dim_tenant', async () => {
      await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const { data, error } = await client
        .schema('reporting')
        .from('dim_tenant')
        .select('tenant_id, tenant_name, slug');

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data?.length).toBe(1);
      expect(data?.[0].tenant_id).toBe(tenantId);
    });

    it('should return only current tenant work orders in fact_work_orders', async () => {
      await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId, 'WO for fact test');
      await setTenantContext(client, tenantId);

      const { data, error } = await client
        .schema('reporting')
        .from('fact_work_orders')
        .select('work_order_id, tenant_id')
        .eq('work_order_id', workOrderId);

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data?.length).toBe(1);
      expect(data?.[0].tenant_id).toBe(tenantId);
      expect(data?.[0].work_order_id).toBe(workOrderId);
    });
  });

  describe('Tenant isolation', () => {
    it('should not expose tenant B data to user with tenant A context', async () => {
      const clientA = createTestClient();
      await createTestUser(clientA);
      const tenantIdA = await createTestTenant(clientA);
      const workOrderIdA = await createTestWorkOrder(clientA, tenantIdA, 'WO Tenant A');

      const clientB = createTestClient();
      await createTestUser(clientB);
      const tenantIdB = await createTestTenant(clientB);
      const workOrderIdB = await createTestWorkOrder(clientB, tenantIdB, 'WO Tenant B');

      await setTenantContext(clientA, tenantIdA);
      const { data: factsA, error: errA } = await clientA
        .schema('reporting')
        .from('fact_work_orders')
        .select('work_order_id, tenant_id')
        .in('work_order_id', [workOrderIdA, workOrderIdB]);

      expect(errA).toBeNull();
      expect(factsA?.length).toBe(1);
      expect(factsA?.[0].work_order_id).toBe(workOrderIdA);
      expect(factsA?.[0].tenant_id).toBe(tenantIdA);

      await setTenantContext(clientB, tenantIdB);
      const { data: factsB, error: errB } = await clientB
        .schema('reporting')
        .from('fact_work_orders')
        .select('work_order_id, tenant_id')
        .in('work_order_id', [workOrderIdA, workOrderIdB]);

      expect(errB).toBeNull();
      expect(factsB?.length).toBe(1);
      expect(factsB?.[0].work_order_id).toBe(workOrderIdB);
      expect(factsB?.[0].tenant_id).toBe(tenantIdB);
    });

    it('should not expose tenant B data in kpi_backlog to user with tenant A context', async () => {
      const clientA = createTestClient();
      await createTestUser(clientA);
      const tenantIdA = await createTestTenant(clientA);

      const clientB = createTestClient();
      await createTestUser(clientB);
      const tenantIdB = await createTestTenant(clientB);

      await setTenantContext(clientA, tenantIdA);
      const { data: backlogA, error: errA } = await clientA
        .schema('reporting')
        .from('kpi_backlog')
        .select('tenant_id, open_count, overdue_count');

      expect(errA).toBeNull();
      expect(backlogA).not.toBeNull();
      expect(backlogA?.every((r: { tenant_id: string }) => r.tenant_id === tenantIdA)).toBe(true);

      await setTenantContext(clientB, tenantIdB);
      const { data: backlogB, error: errB } = await clientB
        .schema('reporting')
        .from('kpi_backlog')
        .select('tenant_id, open_count, overdue_count');

      expect(errB).toBeNull();
      expect(backlogB).not.toBeNull();
      expect(backlogB?.every((r: { tenant_id: string }) => r.tenant_id === tenantIdB)).toBe(true);
    });

    it('should return only current tenant in dim_tenant (isolation)', async () => {
      const clientA = createTestClient();
      await createTestUser(clientA);
      const tenantIdA = await createTestTenant(clientA);

      const clientB = createTestClient();
      await createTestUser(clientB);
      const tenantIdB = await createTestTenant(clientB);

      await setTenantContext(clientA, tenantIdA);
      const { data: dimA, error: errA } = await clientA
        .schema('reporting')
        .from('dim_tenant')
        .select('tenant_id');

      expect(errA).toBeNull();
      expect(dimA?.length).toBe(1);
      expect(dimA?.[0].tenant_id).toBe(tenantIdA);

      await setTenantContext(clientB, tenantIdB);
      const { data: dimB, error: errB } = await clientB
        .schema('reporting')
        .from('dim_tenant')
        .select('tenant_id');

      expect(errB).toBeNull();
      expect(dimB?.length).toBe(1);
      expect(dimB?.[0].tenant_id).toBe(tenantIdB);
    });
  });
});
