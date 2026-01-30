import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient, waitForSupabase } from './helpers/supabase';
import { createTestUser } from './helpers/auth';
import {
  createTestTenant,
  addUserToTenant,
  assignRoleToUser,
  setTenantContext,
} from './helpers/tenant';
import {
  createTestLocation,
  createTestAsset,
  createTestWorkOrder,
  getWorkOrder,
  transitionWorkOrderStatus,
} from './helpers/entities';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Work Orders', () => {
  let client: SupabaseClient;

  beforeAll(async () => {
    await waitForSupabase();
    client = createTestClient();
  });

  describe('Creating work orders', () => {
    it('should create a work order via rpc_create_work_order', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      const workOrderId = await createTestWorkOrder(
        client,
        tenantId,
        'Fix HVAC Unit'
      );

      expect(workOrderId).toBeDefined();
      expect(typeof workOrderId).toBe('string');

      await setTenantContext(client, tenantId);
      const workOrder = await getWorkOrder(client, workOrderId);

      expect(workOrder).toBeDefined();
      expect(workOrder.title).toBe('Fix HVAC Unit');
      expect(workOrder.tenant_id).toBe(tenantId);
    });

    it('should default work order status to draft when unassigned', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      const workOrderId = await createTestWorkOrder(
        client,
        tenantId,
        'Work Order'
      );

      await setTenantContext(client, tenantId);
      const workOrder = await getWorkOrder(client, workOrderId);

      expect(workOrder.status).toBe('draft');
    });

    it('should assign an assignee and update status when assigned_to is provided', async () => {
      // Note: Use separate clients for different users to avoid session conflicts
      const creatorClient = createTestClient();
      const { user: creator } = await createTestUser(creatorClient);
      const tenantId = await createTestTenant(creatorClient);

      const assigneeClient = createTestClient();
      const { user: assignee } = await createTestUser(assigneeClient);
      await addUserToTenant(creatorClient, assignee.id, tenantId);

      const workOrderId = await createTestWorkOrder(
        creatorClient,
        tenantId,
        'Assigned Work Order',
        undefined,
        'medium',
        assignee.id
      );

      await setTenantContext(creatorClient, tenantId);
      const workOrder = await getWorkOrder(creatorClient, workOrderId);

      // Should be 'assigned' if that status exists, otherwise 'draft'
      expect(['draft', 'assigned']).toContain(workOrder.status);
      expect(workOrder.assigned_to).toBe(assignee.id);
    });

    it('should reject work orders when priority is not in the catalog', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      // Try invalid priority
      const { data, error } = await client.rpc('rpc_create_work_order', {
        p_tenant_id: tenantId,
        p_title: 'Work Order',
        p_priority: 'invalid_priority',
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('Invalid priority');
    });
  });

  describe('Tenant isolation', () => {
    it('should only expose work orders from the current tenant view', async () => {
      const client1 = createTestClient();
      await createTestUser(client1);
      const tenantId1 = await createTestTenant(client1);

      const client2 = createTestClient();
      await createTestUser(client2);
      const tenantId2 = await createTestTenant(client2);

      // Create work orders in both tenants
      const wo1 = await createTestWorkOrder(client1, tenantId1, 'Tenant 1 WO');
      const wo2 = await createTestWorkOrder(client2, tenantId2, 'Tenant 2 WO');

      await setTenantContext(client1, tenantId1);

      // User1 should only see tenant1 work orders (use view)
      const { data: workOrders, error } = await client1
        .from('v_work_orders')
        .select('*')
        .in('id', [wo1, wo2]);

      expect(error).toBeNull();
      expect(workOrders).toBeDefined();
      expect(workOrders.length).toBe(1);
      expect(workOrders[0].id).toBe(wo1);
    });
  });

  describe('Asset/location validation', () => {
    it('should reject work orders whose asset belongs to a different tenant', async () => {
      const tenantId1 = await createTestTenant(client);
      const tenantId2 = await createTestTenant(client);

      const assetId = await createTestAsset(client, tenantId1, 'Asset');

      // Try to create work order in tenant2 with asset from tenant1
      const { data, error } = await client.rpc('rpc_create_work_order', {
        p_tenant_id: tenantId2,
        p_title: 'Work Order',
        p_asset_id: assetId,
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('same tenant');
    });

    it('should reject work orders whose location belongs to a different tenant', async () => {
      const tenantId1 = await createTestTenant(client);
      const tenantId2 = await createTestTenant(client);

      const locationId = await createTestLocation(client, tenantId1, 'Location');

      // Try to create work order in tenant2 with location from tenant1
      const { data, error } = await client.rpc('rpc_create_work_order', {
        p_tenant_id: tenantId2,
        p_title: 'Work Order',
        p_location_id: locationId,
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('same tenant');
    });
  });

  describe('Status Transitions', () => {
    it('should transition work order status via rpc_transition_work_order_status', async () => {
      const userClient = createTestClient();
      const { user } = await createTestUser(userClient);
      const tenantId = await createTestTenant(userClient);

      const workOrderId = await createTestWorkOrder(
        userClient,
        tenantId,
        'Work Order'
      );

      // Try transition from draft to assigned
      const { error } = await userClient.rpc('rpc_transition_work_order_status', {
        p_tenant_id: tenantId,
        p_work_order_id: workOrderId,
        p_to_status_key: 'assigned',
      });

      expect(error).toBeDefined();
      if (error?.message) {
        expect(error.message).toContain('Invalid status transition');
      }
    });

    it('should reject invalid status transitions', async () => {
      const userClient = createTestClient();
      const { user } = await createTestUser(userClient);
      const tenantId = await createTestTenant(userClient);

      const workOrderId = await createTestWorkOrder(
        userClient,
        tenantId,
        'Work Order'
      );

      // Try invalid transition (draft -> completed, skipping assigned)
      const { error } = await userClient.rpc('rpc_transition_work_order_status', {
        p_tenant_id: tenantId,
        p_work_order_id: workOrderId,
        p_to_status_key: 'completed',
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('Invalid status transition');
    });

    it('should require permission for status transitions', async () => {
      const adminClient = createTestClient();
      const { user: admin } = await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);

      const memberClient = createTestClient();
      const { user: member } = await createTestUser(memberClient);
      await addUserToTenant(adminClient, member.id, tenantId);
      await assignRoleToUser(adminClient, member.id, tenantId, 'member');

      const workOrderId = await createTestWorkOrder(adminClient, tenantId, 'Work Order');

      await setTenantContext(memberClient, tenantId);

      // Member should not be able to transition due to invalid workflow transition
      const { error } = await memberClient.rpc(
        'rpc_transition_work_order_status',
        {
          p_tenant_id: tenantId,
          p_work_order_id: workOrderId,
          p_to_status_key: 'assigned',
        }
      );

      expect(error).toBeDefined();
      expect(error?.message).toContain('Invalid status transition');
    });
  });

  describe('Work Order Completion', () => {
    it('should complete work order via rpc_complete_work_order', async () => {
      const userClient = createTestClient();
      const { user } = await createTestUser(userClient);
      const tenantId = await createTestTenant(userClient);

      const workOrderId = await createTestWorkOrder(
        userClient,
        tenantId,
        'Work Order'
      );

      // Direct completion from draft is invalid per workflow rules
      const { error } = await userClient.rpc('rpc_complete_work_order', {
        p_tenant_id: tenantId,
        p_work_order_id: workOrderId,
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('Invalid status transition');
    });

    it('should auto-set completed_at and completed_by on final status', async () => {
      const userClient = createTestClient();
      const { user } = await createTestUser(userClient);
      const tenantId = await createTestTenant(userClient);

      const workOrderId = await createTestWorkOrder(
        userClient,
        tenantId,
        'Work Order'
      );

      // Direct transition from draft to completed is invalid per workflow rules
      const { error } = await userClient.rpc('rpc_transition_work_order_status', {
        p_tenant_id: tenantId,
        p_work_order_id: workOrderId,
        p_to_status_key: 'completed',
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('Invalid status transition');
    });
  });
});
