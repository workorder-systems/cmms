import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient, waitForSupabase } from './helpers/supabase';
import { createTestUser } from './helpers/auth';
import { createTestTenant, setTenantContext } from './helpers/tenant';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Workflows', () => {
  let client: SupabaseClient;

  beforeAll(async () => {
    await waitForSupabase();
    client = createTestClient();
  });

  describe('Default Status Catalogs', () => {
    it('should create default status catalogs for new tenant', async () => {
      await createTestUser(client);
      const tenantId = await createTestTenant(client);

      await setTenantContext(client, tenantId);
      const { data: statuses, error } = await client
        .from('v_status_catalogs')
        .select('*')
        .eq('entity_type', 'work_order');

      expect(error).toBeNull();
      expect(statuses).toBeDefined();
      expect(statuses.length).toBeGreaterThan(0);

      const statusKeys = statuses.map((s: any) => s.key);
      expect(statusKeys).toContain('draft');
      expect(statusKeys).toContain('assigned');
      expect(statusKeys).toContain('completed');
    });
  });

  describe('Default Priority Catalogs', () => {
    it('should create default priority catalogs for new tenant', async () => {
      await createTestUser(client);
      const tenantId = await createTestTenant(client);

      await setTenantContext(client, tenantId);
      const { data: priorities, error } = await client
        .from('v_priority_catalogs')
        .select('*')
        .eq('entity_type', 'work_order');

      expect(error).toBeNull();
      expect(priorities).toBeDefined();
      expect(priorities.length).toBeGreaterThan(0);

      const priorityKeys = priorities.map((p: any) => p.key);
      expect(priorityKeys).toContain('low');
      expect(priorityKeys).toContain('medium');
      expect(priorityKeys).toContain('high');
    });
  });

  describe('Default Status Transitions', () => {
    it('should create default status transitions', async () => {
      await createTestUser(client);
      const tenantId = await createTestTenant(client);

      await setTenantContext(client, tenantId);
      const { data: transitions, error } = await client
        .from('v_status_transitions')
        .select('*')
        .eq('entity_type', 'work_order');

      expect(error).toBeNull();
      expect(transitions).toBeDefined();
      expect(transitions.length).toBeGreaterThan(0);

      // Should have draft -> assigned transition
      const draftToAssigned = transitions.find(
        (t: any) => t.from_status_key === 'draft' && t.to_status_key === 'assigned'
      );
      expect(draftToAssigned).toBeDefined();
    });
  });

  describe('Custom Status Creation', () => {
    it('should create custom status via rpc_create_status', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      const { data: statusId, error } = await client.rpc('rpc_create_status', {
        p_tenant_id: tenantId,
        p_entity_type: 'work_order',
        p_key: 'on_hold',
        p_name: 'On Hold',
        p_category: 'open',
        p_display_order: 10,
      });

      expect(error).toBeNull();
      expect(statusId).toBeDefined();

      // Verify status exists
      await setTenantContext(client, tenantId);
      const { data: status } = await client
        .from('v_status_catalogs')
        .select('*')
        .eq('id', statusId)
        .single();

      expect(status.key).toBe('on_hold');
      expect(status.name).toBe('On Hold');
    });
  });

  describe('Custom Priority Creation', () => {
    it('should create custom priority via rpc_create_priority', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      const { data: priorityId, error } = await client.rpc('rpc_create_priority', {
        p_tenant_id: tenantId,
        p_entity_type: 'work_order',
        p_key: 'urgent',
        p_name: 'Urgent',
        p_weight: 15,
        p_display_order: 5,
      });

      expect(error).toBeNull();
      expect(priorityId).toBeDefined();
    });
  });

  describe('Status Transition Creation', () => {
    it('should create status transition via rpc_create_status_transition', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      // Ensure the target status exists (it's not part of the default catalogs)
      const { error: createStatusError } = await client.rpc('rpc_create_status', {
        p_tenant_id: tenantId,
        p_entity_type: 'work_order',
        p_key: 'on_hold',
        p_name: 'On Hold',
        p_category: 'open',
        p_display_order: 10,
      });
      expect(createStatusError).toBeNull();

      const { data: transitionId, error } = await client.rpc(
        'rpc_create_status_transition',
        {
          p_tenant_id: tenantId,
          p_entity_type: 'work_order',
          p_from_status_key: 'draft',
          p_to_status_key: 'on_hold',
          p_required_permission: 'workorder.edit',
        }
      );

      expect(error).toBeNull();
      expect(transitionId).toBeDefined();
    });
  });

  describe('Workflow Graph', () => {
    it('should get workflow graph via rpc_get_workflow_graph', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const { data: graph, error } = await client.rpc('rpc_get_workflow_graph', {
        p_tenant_id: tenantId,
        p_entity_type: 'work_order',
      });

      expect(error).toBeNull();
      expect(graph).toBeDefined();
      expect(graph.entity_type).toBe('work_order');
      expect(graph.transitions).toBeDefined();
      expect(Array.isArray(graph.transitions)).toBe(true);
    });
  });

  describe('Status Validation', () => {
    it('should validate status against catalog', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      // Try to use invalid status
      const { data: workOrderId, error: createError } = await client.rpc('rpc_create_work_order', {
        p_tenant_id: tenantId,
        p_title: 'Work Order',
      });

      expect(createError).toBeNull();

      const { error } = await client.rpc('rpc_transition_work_order_status', {
        p_tenant_id: tenantId,
        p_work_order_id: workOrderId as string,
        p_to_status_key: 'invalid_status',
      });

      expect(error).toBeDefined();
    });
  });

  describe('Priority Validation', () => {
    it('should validate priority against catalog', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      // Try to use invalid priority
      const { data, error } = await client.rpc('rpc_create_work_order', {
        p_tenant_id: tenantId,
        p_title: 'Work Order',
        p_priority: 'invalid_priority',
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('Invalid priority');
    });
  });
});
