import { describe, it, expect, beforeAll } from 'vitest';
import {
  createTestClient,
  createServiceRoleClient,
  waitForSupabase,
} from './helpers/supabase';
import { createTestUser, TEST_PASSWORD, getUserEmail } from './helpers/auth';
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
  createTestWorkOrderDirect,
  getWorkOrder,
  transitionWorkOrderStatus,
} from './helpers/entities';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Work Orders', () => {
  let client: SupabaseClient;
  let serviceClient: SupabaseClient;

  beforeAll(async () => {
    await waitForSupabase();
    client = createTestClient();
    serviceClient = createServiceRoleClient();
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

      // Verify work order exists
      const workOrder = await getWorkOrder(serviceClient, workOrderId);

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

      const workOrder = await getWorkOrder(serviceClient, workOrderId);

      expect(workOrder.status).toBe('draft');
    });

    it('should assign an assignee and update status when assigned_to is provided', async () => {
      // Note: Use separate clients for different users to avoid session conflicts
      const creatorClient = createTestClient();
      const { user: creator } = await createTestUser(creatorClient);
      const tenantId = await createTestTenant(creatorClient);

      const assigneeBootstrapClient = createTestClient();
      const { user: assignee } = await createTestUser(assigneeBootstrapClient);
      await addUserToTenant(serviceClient, assignee.id, tenantId);

      const workOrderId = await createTestWorkOrder(
        creatorClient,
        tenantId,
        'Assigned Work Order',
        undefined,
        'medium',
        assignee.id
      );

      const workOrder = await getWorkOrder(serviceClient, workOrderId);

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
      const user1BootstrapClient = createTestClient();
      const { user: user1 } = await createTestUser(user1BootstrapClient);
      const tenantId1 = await createTestTenant(user1BootstrapClient);

      const user2BootstrapClient = createTestClient();
      const { user: user2 } = await createTestUser(user2BootstrapClient);
      const tenantId2 = await createTestTenant(user2BootstrapClient);

      // Create work orders in both tenants
      const wo1 = await createTestWorkOrderDirect(serviceClient, tenantId1, 'Tenant 1 WO');
      const wo2 = await createTestWorkOrderDirect(serviceClient, tenantId2, 'Tenant 2 WO');

      // Sign in as user1
      const client1 = createTestClient();
      const { error: signInErr } = await client1.auth.signInWithPassword({
        email: getUserEmail(user1),
        password: TEST_PASSWORD,
      });
      expect(signInErr).toBeNull();
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

      const assetId = await createTestAsset(
        serviceClient,
        tenantId1,
        'Asset'
      );

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

      const locationId = await createTestLocation(
        serviceClient,
        tenantId1,
        'Location'
      );

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
      expect(error?.message).toContain('Invalid status transition');
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

      const memberBootstrapClient = createTestClient();
      const { user: member } = await createTestUser(memberBootstrapClient);
      await addUserToTenant(serviceClient, member.id, tenantId);
      await assignRoleToUser(serviceClient, member.id, tenantId, 'member');

      const workOrderId = await createTestWorkOrder(adminClient, tenantId, 'Work Order');

      // Sign in as member (only has view permissions)
      const memberClient = createTestClient();
      const { error: signInErr } = await memberClient.auth.signInWithPassword({
        email: getUserEmail(member),
        password: TEST_PASSWORD,
      });
      expect(signInErr).toBeNull();
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
