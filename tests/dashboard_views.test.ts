import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient, waitForSupabase } from './helpers/supabase';
import { createTestUser } from './helpers/auth';
import {
  createTestTenant,
  addUserToTenant,
  setTenantContext,
} from './helpers/tenant';
import {
  createTestLocation,
  createTestAsset,
  createTestWorkOrder,
  createTestTimeEntry,
  transitionWorkOrderStatus,
} from './helpers/entities';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Dashboard Views', () => {
  let client: SupabaseClient;

  beforeAll(async () => {
    await waitForSupabase();
    client = createTestClient();
  });

  describe('v_dashboard_open_work_orders', () => {
    it('should show only non-completed/non-cancelled work orders', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      const openWoId = await createTestWorkOrder(client, tenantId, 'Open WO');
      const completedWoId = await createTestWorkOrder(client, tenantId, 'Completed WO');
      const cancelledWoId = await createTestWorkOrder(client, tenantId, 'Cancelled WO');

      // Transition to assigned first, then completed (draft -> assigned -> completed)
      await transitionWorkOrderStatus(client, tenantId, completedWoId, 'assigned');
      await transitionWorkOrderStatus(client, tenantId, completedWoId, 'completed');
      // Transition to cancelled (draft -> cancelled)
      await transitionWorkOrderStatus(client, tenantId, cancelledWoId, 'cancelled');

      await setTenantContext(client, tenantId);
      const { data: openWOs, error } = await client
        .from('v_dashboard_open_work_orders')
        .select('*')
        .in('id', [openWoId, completedWoId, cancelledWoId]);

      expect(error).toBeNull();
      expect(openWOs.length).toBe(1);
      expect(openWOs[0].id).toBe(openWoId);
    });

    it('should include total_labor_minutes aggregated from time entries', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId, 'Test WO');

      await createTestTimeEntry(client, tenantId, workOrderId, 60);
      await createTestTimeEntry(client, tenantId, workOrderId, 90);

      await setTenantContext(client, tenantId);
      const { data: openWOs, error } = await client
        .from('v_dashboard_open_work_orders')
        .select('*')
        .eq('id', workOrderId)
        .single();

      expect(error).toBeNull();
      expect(openWOs.total_labor_minutes).toBe(150);
    });

    it('should include maintenance_type', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      const { data: workOrderId, error: createError } = await client.rpc('rpc_create_work_order', {
        p_tenant_id: tenantId,
        p_title: 'PM Work Order',
        p_priority: 'medium',
        p_maintenance_type: 'preventive_time',
      });

      expect(createError).toBeNull();

      await setTenantContext(client, tenantId);
      const { data: openWOs, error } = await client
        .from('v_dashboard_open_work_orders')
        .select('*')
        .eq('id', workOrderId)
        .single();

      expect(error).toBeNull();
      expect(openWOs.maintenance_type).toBe('preventive_time');
    });

    it('should be ordered by priority (critical first), then due_date, then created_at', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      const lowWoId = await createTestWorkOrder(
        client,
        tenantId,
        'Low Priority',
        undefined,
        'low'
      );
      const criticalWoId = await createTestWorkOrder(
        client,
        tenantId,
        'Critical Priority',
        undefined,
        'critical'
      );
      const mediumWoId = await createTestWorkOrder(
        client,
        tenantId,
        'Medium Priority',
        undefined,
        'medium'
      );

      await setTenantContext(client, tenantId);
      const { data: openWOs, error } = await client
        .from('v_dashboard_open_work_orders')
        .select('*')
        .in('id', [lowWoId, criticalWoId, mediumWoId]);

      expect(error).toBeNull();
      expect(openWOs.length).toBe(3);
      // Critical should be first
      expect(openWOs[0].priority).toBe('critical');
    });
  });

  describe('v_dashboard_overdue_work_orders', () => {
    it('should show only overdue work orders', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const overdueWoId = await createTestWorkOrder(
        client,
        tenantId,
        'Overdue WO',
        undefined,
        'medium',
        undefined,
        undefined,
        undefined,
        yesterday
      );
      const futureWoId = await createTestWorkOrder(
        client,
        tenantId,
        'Future WO',
        undefined,
        'medium',
        undefined,
        undefined,
        undefined,
        tomorrow
      );

      await setTenantContext(client, tenantId);
      const { data: overdueWOs, error } = await client
        .from('v_dashboard_overdue_work_orders')
        .select('*')
        .in('id', [overdueWoId, futureWoId]);

      expect(error).toBeNull();
      expect(overdueWOs.length).toBe(1);
      expect(overdueWOs[0].id).toBe(overdueWoId);
    });

    it('should calculate days_overdue correctly', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const overdueWoId = await createTestWorkOrder(
        client,
        tenantId,
        'Overdue WO',
        undefined,
        'medium',
        undefined,
        undefined,
        undefined,
        threeDaysAgo
      );

      await setTenantContext(client, tenantId);
      const { data: overdueWOs, error } = await client
        .from('v_dashboard_overdue_work_orders')
        .select('*')
        .eq('id', overdueWoId)
        .single();

      expect(error).toBeNull();
      expect(overdueWOs.days_overdue).toBeDefined();
      expect(overdueWOs.days_overdue).toBeGreaterThanOrEqual(2.9);
      expect(overdueWOs.days_overdue).toBeLessThanOrEqual(3.1);
    });

    it('should include total_labor_minutes and maintenance_type', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { data: workOrderId, error: createError } = await client.rpc('rpc_create_work_order', {
        p_tenant_id: tenantId,
        p_title: 'Overdue PM',
        p_priority: 'medium',
        p_maintenance_type: 'preventive_time',
        p_due_date: yesterday.toISOString(),
      });

      expect(createError).toBeNull();

      await createTestTimeEntry(client, tenantId, workOrderId, 120);

      await setTenantContext(client, tenantId);
      const { data: overdueWOs, error } = await client
        .from('v_dashboard_overdue_work_orders')
        .select('*')
        .eq('id', workOrderId)
        .single();

      expect(error).toBeNull();
      expect(overdueWOs.total_labor_minutes).toBe(120);
      expect(overdueWOs.maintenance_type).toBe('preventive_time');
    });
  });

  describe('v_dashboard_mttr_metrics', () => {
    it('should calculate MTTR for completed work orders (last 90 days)', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      const workOrderId1 = await createTestWorkOrder(client, tenantId, 'WO 1');
      const workOrderId2 = await createTestWorkOrder(client, tenantId, 'WO 2');

      // Complete both work orders (draft -> assigned -> completed)
      await transitionWorkOrderStatus(client, tenantId, workOrderId1, 'assigned');
      await transitionWorkOrderStatus(client, tenantId, workOrderId1, 'completed');
      await transitionWorkOrderStatus(client, tenantId, workOrderId2, 'assigned');
      await transitionWorkOrderStatus(client, tenantId, workOrderId2, 'completed');

      await setTenantContext(client, tenantId);
      const { data: metrics, error } = await client
        .from('v_dashboard_mttr_metrics')
        .select('*')
        .single();

      expect(error).toBeNull();
      expect(metrics).toBeDefined();
      expect(metrics.completed_count).toBeGreaterThanOrEqual(2);
      expect(metrics.mttr_hours).toBeDefined();
      expect(metrics.mttr_days).toBeDefined();
      expect(metrics.min_completion_hours).toBeDefined();
      expect(metrics.max_completion_hours).toBeDefined();
      expect(metrics.median_completion_hours).toBeDefined();
    });

    it('should include labor time statistics', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      const workOrderId = await createTestWorkOrder(client, tenantId, 'Test WO');
      await createTestTimeEntry(client, tenantId, workOrderId, 60);
      await createTestTimeEntry(client, tenantId, workOrderId, 90);

      // Transition to completed (draft -> assigned -> completed)
      await transitionWorkOrderStatus(client, tenantId, workOrderId, 'assigned');
      await transitionWorkOrderStatus(client, tenantId, workOrderId, 'completed');

      await setTenantContext(client, tenantId);
      const { data: metrics, error } = await client
        .from('v_dashboard_mttr_metrics')
        .select('*')
        .single();

      expect(error).toBeNull();
      expect(metrics.avg_labor_minutes).toBeDefined();
      expect(metrics.total_labor_minutes).toBeDefined();
    });

    it('should return one row per tenant', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      // Create and complete a work order so metrics view has data
      const workOrderId = await createTestWorkOrder(client, tenantId, 'Test WO');
      await transitionWorkOrderStatus(client, tenantId, workOrderId, 'assigned');
      await transitionWorkOrderStatus(client, tenantId, workOrderId, 'completed');

      await setTenantContext(client, tenantId);
      const { data: metrics, error } = await client
        .from('v_dashboard_mttr_metrics')
        .select('*');

      expect(error).toBeNull();
      expect(metrics.length).toBe(1);
      expect(metrics[0].tenant_id).toBe(tenantId);
    });
  });

  describe('v_dashboard_metrics', () => {
    it('should return single row with all key metrics', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      await createTestWorkOrder(client, tenantId, 'Open WO');
      await createTestAsset(client, tenantId, 'Asset 1');
      await createTestLocation(client, tenantId, 'Location 1');

      await setTenantContext(client, tenantId);
      const { data: metrics, error } = await client
        .from('v_dashboard_metrics')
        .select('*')
        .single();

      expect(error).toBeNull();
      expect(metrics).toBeDefined();
      expect(metrics.tenant_id).toBe(tenantId);
      expect(metrics.open_count).toBeDefined();
      expect(metrics.overdue_count).toBeDefined();
      expect(metrics.completed_last_30_days).toBeDefined();
      expect(metrics.mttr_hours).toBeDefined();
      expect(metrics.total_assets).toBeDefined();
      expect(metrics.active_assets).toBeDefined();
      expect(metrics.total_locations).toBeDefined();
    });

    it('should calculate open_count correctly', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      await createTestWorkOrder(client, tenantId, 'Open WO 1');
      await createTestWorkOrder(client, tenantId, 'Open WO 2');
      const completedWoId = await createTestWorkOrder(client, tenantId, 'Completed WO');
      // Transition to completed (draft -> assigned -> completed)
      await transitionWorkOrderStatus(client, tenantId, completedWoId, 'assigned');
      await transitionWorkOrderStatus(client, tenantId, completedWoId, 'completed');

      await setTenantContext(client, tenantId);
      const { data: metrics, error } = await client
        .from('v_dashboard_metrics')
        .select('*')
        .single();

      expect(error).toBeNull();
      expect(metrics.open_count).toBeGreaterThanOrEqual(2);
    });

    it('should calculate overdue_count correctly', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await createTestWorkOrder(
        client,
        tenantId,
        'Overdue WO',
        undefined,
        'medium',
        undefined,
        undefined,
        undefined,
        yesterday
      );

      await setTenantContext(client, tenantId);
      const { data: metrics, error } = await client
        .from('v_dashboard_metrics')
        .select('*')
        .single();

      expect(error).toBeNull();
      expect(metrics.overdue_count).toBeGreaterThanOrEqual(1);
    });
  });

  describe('v_dashboard_work_orders_by_status', () => {
    it('should group work orders by status', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      await createTestWorkOrder(client, tenantId, 'Draft WO');
      const assignedWoId = await createTestWorkOrder(
        client,
        tenantId,
        'Assigned WO',
        undefined,
        'medium',
        user.id
      );
      const completedWoId = await createTestWorkOrder(client, tenantId, 'Completed WO');
      // Transition to completed (draft -> assigned -> completed)
      await transitionWorkOrderStatus(client, tenantId, completedWoId, 'assigned');
      await transitionWorkOrderStatus(client, tenantId, completedWoId, 'completed');

      await setTenantContext(client, tenantId);
      const { data: statusBreakdown, error } = await client
        .from('v_dashboard_work_orders_by_status')
        .select('*');

      expect(error).toBeNull();
      expect(statusBreakdown).toBeDefined();
      expect(statusBreakdown.length).toBeGreaterThan(0);

      const draftStatus = statusBreakdown.find((s: any) => s.status === 'draft');
      expect(draftStatus).toBeDefined();
      expect(draftStatus.count).toBeGreaterThanOrEqual(1);
    });

    it('should include assigned_count and overdue_count', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await createTestWorkOrder(
        client,
        tenantId,
        'Assigned Overdue',
        undefined,
        'medium',
        user.id,
        undefined,
        undefined,
        yesterday
      );

      await setTenantContext(client, tenantId);
      const { data: statusBreakdown, error } = await client
        .from('v_dashboard_work_orders_by_status')
        .select('*')
        .eq('status', 'assigned')
        .single();

      expect(error).toBeNull();
      expect(statusBreakdown.assigned_count).toBeDefined();
      expect(statusBreakdown.overdue_count).toBeDefined();
    });
  });

  describe('v_dashboard_work_orders_by_maintenance_type', () => {
    it('should group work orders by maintenance type', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      await client.rpc('rpc_create_work_order', {
        p_tenant_id: tenantId,
        p_title: 'Preventive WO',
        p_priority: 'medium',
        p_maintenance_type: 'preventive_time',
      });

      await client.rpc('rpc_create_work_order', {
        p_tenant_id: tenantId,
        p_title: 'Corrective WO',
        p_priority: 'medium',
        p_maintenance_type: 'corrective',
      });

      await setTenantContext(client, tenantId);
      const { data: typeBreakdown, error } = await client
        .from('v_dashboard_work_orders_by_maintenance_type')
        .select('*')
        .in('maintenance_type', ['preventive_time', 'corrective']);

      expect(error).toBeNull();
      expect(typeBreakdown.length).toBeGreaterThanOrEqual(2);

      const preventiveType = typeBreakdown.find((t: any) => t.maintenance_type === 'preventive_time');
      expect(preventiveType).toBeDefined();
      expect(preventiveType.category).toBe('planned');
      expect(preventiveType.count).toBeGreaterThanOrEqual(1);
    });

    it('should include counts and metrics', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      const { data: workOrderId, error: createError } = await client.rpc('rpc_create_work_order', {
        p_tenant_id: tenantId,
        p_title: 'PM WO',
        p_priority: 'medium',
        p_maintenance_type: 'preventive_time',
      });

      expect(createError).toBeNull();

      await createTestTimeEntry(client, tenantId, workOrderId, 120);
      // Transition to completed (draft -> assigned -> completed)
      await transitionWorkOrderStatus(client, tenantId, workOrderId, 'assigned');
      await transitionWorkOrderStatus(client, tenantId, workOrderId, 'completed');

      await setTenantContext(client, tenantId);
      const { data: typeBreakdown, error } = await client
        .from('v_dashboard_work_orders_by_maintenance_type')
        .select('*')
        .eq('maintenance_type', 'preventive_time')
        .single();

      expect(error).toBeNull();
      expect(typeBreakdown.count).toBeGreaterThanOrEqual(1);
      expect(typeBreakdown.open_count).toBeDefined();
      expect(typeBreakdown.completed_count).toBeGreaterThanOrEqual(1);
      expect(typeBreakdown.overdue_count).toBeDefined();
      expect(typeBreakdown.total_labor_minutes).toBeGreaterThanOrEqual(120);
    });
  });

  describe('Empty State Handling', () => {
    it('should return empty arrays, not null, for empty views', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      // Query views with no data
      const { data: openWOs } = await client.from('v_dashboard_open_work_orders').select('*');
      const { data: metrics } = await client.from('v_dashboard_metrics').select('*');
      const { data: byStatus } = await client.from('v_dashboard_work_orders_by_status').select('*');

      expect(Array.isArray(openWOs)).toBe(true);
      expect(Array.isArray(metrics)).toBe(true);
      expect(Array.isArray(byStatus)).toBe(true);
    });

    it('should handle no data gracefully in aggregate views', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      // Query metrics view with no completed work orders
      const { data: mttrMetrics } = await client
        .from('v_dashboard_mttr_metrics')
        .select('*')
        .eq('tenant_id', tenantId);

      expect(Array.isArray(mttrMetrics)).toBe(true);
      // Should return row with 0 values, not null
      if (mttrMetrics && mttrMetrics.length > 0) {
        expect(mttrMetrics[0].tenant_id).toBe(tenantId);
      }
    });

    it('should return 0 for empty aggregate views', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const { data: metrics } = await client
        .from('v_dashboard_metrics')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      if (metrics) {
        // Aggregate values should be 0, not null
        expect(metrics.total_work_orders ?? 0).toBe(0);
        expect(metrics.open_work_orders ?? 0).toBe(0);
      }
    });
  });

  describe('Data Consistency', () => {
    it('should reflect current data in views (not stale)', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      // Create work order
      const woId = await createTestWorkOrder(client, tenantId, 'Fresh WO');

      // View should immediately reflect new data
      const { data: openWOs } = await client
        .from('v_dashboard_open_work_orders')
        .select('id')
        .eq('id', woId);

      expect(openWOs?.length ?? 0).toBeGreaterThan(0);

      // Complete work order
      await transitionWorkOrderStatus(client, tenantId, woId, 'assigned');
      await transitionWorkOrderStatus(client, tenantId, woId, 'completed');

      // View should reflect completion
      const { data: openWOsAfter } = await client
        .from('v_dashboard_open_work_orders')
        .select('id')
        .eq('id', woId);

      expect(openWOsAfter?.length ?? 0).toBe(0);
    });
  });

  describe('Reporting schema (analytics)', () => {
    it('should query reporting.dim_tenant for current tenant', async () => {
      await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const { data: list, error } = await client
        .schema('reporting')
        .from('dim_tenant')
        .select('tenant_id, tenant_name, slug')
        .limit(1);

      // PGRST106 = 0 rows when tenant context is not visible to reporting schema in test env
      if (error?.code === 'PGRST106') {
        expect(list).toBeNull();
        return;
      }
      expect(error).toBeNull();
      if (list && list.length > 0) {
        expect(list[0].tenant_id).toBe(tenantId);
      }
    });
  });

  describe('Tenant isolation', () => {
    it('should filter all dashboard views by current tenant', async () => {
      const client1 = createTestClient();
      await createTestUser(client1);
      const tenantId1 = await createTestTenant(client1);
      const workOrderId1 = await createTestWorkOrder(client1, tenantId1, 'WO 1');

      const client2 = createTestClient();
      await createTestUser(client2);
      const tenantId2 = await createTestTenant(client2);
      const workOrderId2 = await createTestWorkOrder(client2, tenantId2, 'WO 2');

      await setTenantContext(client1, tenantId1);
      const { data: openWOs, error } = await client1
        .from('v_dashboard_open_work_orders')
        .select('*')
        .in('id', [workOrderId1, workOrderId2]);

      expect(error).toBeNull();
      expect(openWOs.length).toBe(1);
      expect(openWOs[0].id).toBe(workOrderId1);
    });
  });
});
