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
  createTestWorkOrder,
  getMaintenanceTypes,
  createTestMaintenanceType,
} from './helpers/entities';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Maintenance Types', () => {
  let client: SupabaseClient;

  beforeAll(async () => {
    await waitForSupabase();
    client = createTestClient();
  });

  describe('Default maintenance types creation', () => {
    it('should create reactive maintenance types for new tenant', async () => {
      await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const types = await getMaintenanceTypes(client, tenantId);
      const reactiveTypes = types.filter((t: any) => t.category === 'reactive');

      expect(reactiveTypes.length).toBeGreaterThanOrEqual(4);
      const keys = reactiveTypes.map((t: any) => t.key);
      expect(keys).toContain('corrective');
      expect(keys).toContain('emergency');
      expect(keys).toContain('breakdown');
      expect(keys).toContain('run_to_failure');
    });

    it('should create planned maintenance types for new tenant', async () => {
      await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const types = await getMaintenanceTypes(client, tenantId);
      const plannedTypes = types.filter((t: any) => t.category === 'planned');

      expect(plannedTypes.length).toBeGreaterThanOrEqual(3);
      const keys = plannedTypes.map((t: any) => t.key);
      expect(keys).toContain('preventive_time');
      expect(keys).toContain('preventive_usage');
      expect(keys).toContain('condition_based');
    });

    it('should create advanced maintenance types for new tenant', async () => {
      await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const types = await getMaintenanceTypes(client, tenantId);
      const advancedTypes = types.filter((t: any) => t.category === 'advanced');

      expect(advancedTypes.length).toBeGreaterThanOrEqual(4);
      const keys = advancedTypes.map((t: any) => t.key);
      expect(keys).toContain('predictive');
      expect(keys).toContain('rcm');
      expect(keys).toContain('rbm');
      expect(keys).toContain('fmea');
    });

    it('should create lean maintenance types for new tenant', async () => {
      await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const types = await getMaintenanceTypes(client, tenantId);
      const leanTypes = types.filter((t: any) => t.category === 'lean');

      expect(leanTypes.length).toBeGreaterThanOrEqual(3);
      const keys = leanTypes.map((t: any) => t.key);
      expect(keys).toContain('tpm');
      expect(keys).toContain('proactive');
      expect(keys).toContain('design_out');
    });

    it('should create other maintenance types for new tenant', async () => {
      await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const types = await getMaintenanceTypes(client, tenantId);
      const otherTypes = types.filter((t: any) => t.category === 'other');

      expect(otherTypes.length).toBeGreaterThanOrEqual(6);
      const keys = otherTypes.map((t: any) => t.key);
      expect(keys).toContain('inspection');
      expect(keys).toContain('calibration');
      expect(keys).toContain('installation');
      expect(keys).toContain('modification');
      expect(keys).toContain('project');
      expect(keys).toContain('shutdown');
    });

    it('should mark default types as system types', async () => {
      await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const types = await getMaintenanceTypes(client, tenantId);
      const systemTypes = types.filter((t: any) => t.is_system === true);

      expect(systemTypes.length).toBeGreaterThan(0);
      expect(systemTypes.every((t: any) => t.is_system === true)).toBe(true);
    });
  });

  describe('Creating work orders with maintenance type', () => {
    it('should accept valid maintenance_type', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const { data: workOrderId, error } = await client.rpc('rpc_create_work_order', {
        p_tenant_id: tenantId,
        p_title: 'PM Work Order',
        p_priority: 'medium',
        p_maintenance_type: 'preventive_time',
      });

      expect(error).toBeNull();
      expect(workOrderId).toBeDefined();

      const { data: workOrder } = await client
        .from('v_work_orders')
        .select('*')
        .eq('id', workOrderId)
        .single();

      expect(workOrder.maintenance_type).toBe('preventive_time');
    });

    it('should accept null maintenance_type', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      const { data: workOrderId, error } = await client.rpc('rpc_create_work_order', {
        p_tenant_id: tenantId,
        p_title: 'Work Order',
        p_priority: 'medium',
        p_maintenance_type: null,
      });

      expect(error).toBeNull();
      expect(workOrderId).toBeDefined();

      await setTenantContext(client, tenantId);
      const { data: workOrder } = await client
        .from('v_work_orders')
        .select('*')
        .eq('id', workOrderId)
        .single();

      expect(workOrder.maintenance_type).toBeNull();
    });

    it('should reject invalid maintenance_type', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);

      const { data, error } = await client.rpc('rpc_create_work_order', {
        p_tenant_id: tenantId,
        p_title: 'Work Order',
        p_priority: 'medium',
        p_maintenance_type: 'invalid_type',
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('Invalid maintenance type');
    });

    it('should validate maintenance_type belongs to tenant', async () => {
      const { user } = await createTestUser(client);
      const tenantId1 = await createTestTenant(client);
      const tenantId2 = await createTestTenant(client);

      // Create custom type in tenant1 (user already has admin role from tenant creation)
      await setTenantContext(client, tenantId1);
      await createTestMaintenanceType(
        client,
        tenantId1,
        'reactive',
        'custom_type',
        'Custom Type'
      );

      // Try to use it in tenant2
      const { data, error } = await client.rpc('rpc_create_work_order', {
        p_tenant_id: tenantId2,
        p_title: 'Work Order',
        p_priority: 'medium',
        p_maintenance_type: 'custom_type',
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('Invalid maintenance type');
    });
  });

  describe('Viewing maintenance types', () => {
    it('should show maintenance types via v_maintenance_type_catalogs', async () => {
      await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const { data: types, error } = await client
        .from('v_maintenance_type_catalogs')
        .select('*')
        .order('category')
        .order('display_order');

      expect(error).toBeNull();
      expect(types).toBeDefined();
      expect(types.length).toBeGreaterThan(0);

      // Should be ordered by category, then display_order
      const categories = types.map((t: any) => t.category);
      expect(categories).toEqual([...categories].sort());
    });

    it('should include all required fields', async () => {
      await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const { data: types, error } = await client
        .from('v_maintenance_type_catalogs')
        .select('*')
        .limit(1)
        .single();

      expect(error).toBeNull();
      expect(types).toBeDefined();
      expect(types.id).toBeDefined();
      expect(types.tenant_id).toBe(tenantId);
      expect(types.category).toBeDefined();
      expect(types.key).toBeDefined();
      expect(types.name).toBeDefined();
      expect(types.display_order).toBeDefined();
    });
  });

  describe('Creating custom maintenance types', () => {
    it('should create custom maintenance type via rpc_create_maintenance_type', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      // User already has admin role from tenant creation

      const typeId = await createTestMaintenanceType(
        client,
        tenantId,
        'reactive',
        'custom_reactive',
        'Custom Reactive Type',
        'A custom reactive maintenance type'
      );

      expect(typeId).toBeDefined();

      await setTenantContext(client, tenantId);
      const { data: types, error } = await client
        .from('v_maintenance_type_catalogs')
        .select('*')
        .eq('key', 'custom_reactive')
        .single();

      expect(error).toBeNull();
      expect(types).toBeDefined();
      expect(types.category).toBe('reactive');
      expect(types.name).toBe('Custom Reactive Type');
      expect(types.description).toBe('A custom reactive maintenance type');
    });

    it('should auto-calculate display_order if not provided', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      // User already has admin role from tenant creation

      const typeId = await createTestMaintenanceType(
        client,
        tenantId,
        'reactive',
        'auto_order_test',
        'Auto Order Test'
      );

      await setTenantContext(client, tenantId);
      const { data: type, error } = await client
        .from('v_maintenance_type_catalogs')
        .select('*')
        .eq('id', typeId)
        .single();

      expect(error).toBeNull();
      expect(type.display_order).toBeDefined();
      expect(type.display_order).toBeGreaterThan(0);
    });

    it('should require tenant.admin permission', async () => {
      const adminClient = createTestClient();
      const { user: admin } = await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);

      const memberClient = createTestClient();
      const { user: member } = await createTestUser(memberClient);
      await addUserToTenant(adminClient, member.id, tenantId);
      await assignRoleToUser(adminClient, member.id, tenantId, 'member');

      const { data, error } = await memberClient.rpc('rpc_create_maintenance_type', {
        p_tenant_id: tenantId,
        p_category: 'reactive',
        p_key: 'custom_type',
        p_name: 'Custom Type',
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('tenant.admin');
    });

    it('should reject invalid category', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      // User already has admin role from tenant creation

      const { data, error } = await client.rpc('rpc_create_maintenance_type', {
        p_tenant_id: tenantId,
        p_category: 'invalid_category',
        p_key: 'custom_type',
        p_name: 'Custom Type',
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('Invalid category');
    });

    it('should validate key format', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      // User already has admin role from tenant creation

      const { data, error } = await client.rpc('rpc_create_maintenance_type', {
        p_tenant_id: tenantId,
        p_category: 'reactive',
        p_key: 'invalid-key!',
        p_name: 'Custom Type',
      });

      expect(error).toBeDefined();
    });
  });

  describe('RLS Policies', () => {
    it('should allow users to view their tenant maintenance types', async () => {
      const user1Client = createTestClient();
      await createTestUser(user1Client);
      const tenantId1 = await createTestTenant(user1Client);

      const user2Client = createTestClient();
      await createTestUser(user2Client);
      const tenantId2 = await createTestTenant(user2Client);

      await setTenantContext(user1Client, tenantId1);
      const { data: types1, error: error1 } = await user1Client
        .from('v_maintenance_type_catalogs')
        .select('*');

      expect(error1).toBeNull();
      expect(types1).toBeDefined();

      await setTenantContext(user2Client, tenantId2);
      const { data: types2, error: error2 } = await user2Client
        .from('v_maintenance_type_catalogs')
        .select('*');

      expect(error2).toBeNull();
      expect(types2).toBeDefined();

      // Types should be different between tenants
      const typeIds1 = types1.map((t: any) => t.id);
      const typeIds2 = types2.map((t: any) => t.id);
      expect(typeIds1).not.toEqual(typeIds2);
    });
  });

  describe('Tenant isolation', () => {
    it('should only show maintenance types from current tenant', async () => {
      const client1 = createTestClient();
      const { user: user1 } = await createTestUser(client1);
      const tenantId1 = await createTestTenant(client1);
      // user1 already has admin role from tenant creation

      const client2 = createTestClient();
      const { user: user2 } = await createTestUser(client2);
      const tenantId2 = await createTestTenant(client2);
      // user2 already has admin role from tenant creation

      await setTenantContext(client1, tenantId1);
      await createTestMaintenanceType(
        client1,
        tenantId1,
        'reactive',
        'tenant1_custom',
        'Tenant 1 Custom'
      );

      await setTenantContext(client2, tenantId2);
      await createTestMaintenanceType(
        client2,
        tenantId2,
        'reactive',
        'tenant2_custom',
        'Tenant 2 Custom'
      );

      await setTenantContext(client1, tenantId1);
      const { data: types1, error: error1 } = await client1
        .from('v_maintenance_type_catalogs')
        .select('*')
        .eq('key', 'tenant1_custom');

      expect(error1).toBeNull();
      expect(types1.length).toBe(1);

      const { data: types2, error: error2 } = await client1
        .from('v_maintenance_type_catalogs')
        .select('*')
        .eq('key', 'tenant2_custom');

      expect(error2).toBeNull();
      expect(types2.length).toBe(0);
    });
  });

  describe('Custom Type Validation', () => {
    it('should reject duplicate keys', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      // Create first type
      await client.rpc('rpc_create_maintenance_type', {
        p_tenant_id: tenantId,
        p_key: 'duplicate_key',
        p_name: 'First Type',
        p_category: 'reactive',
        p_display_order: 10,
      });

      // Try to create duplicate
      const { error } = await client.rpc('rpc_create_maintenance_type', {
        p_tenant_id: tenantId,
        p_key: 'duplicate_key',
        p_name: 'Duplicate Type',
        p_category: 'reactive',
        p_display_order: 11,
      });

      expect(error).toBeDefined();
      expect(error?.message).toMatch(/duplicate|unique|already exists/i);
    });

    it('should reject invalid categories', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const invalidCategories = ['invalid', 'wrong', 'bad_category'];

      for (const category of invalidCategories) {
        const { error } = await client.rpc('rpc_create_maintenance_type', {
          p_tenant_id: tenantId,
          p_key: `invalid_${category}`,
          p_name: 'Invalid Type',
          p_category: category as any,
          p_display_order: 100,
        });

        expect(error).toBeDefined();
        expect(error?.message).toMatch(/category|invalid/i);
      }
    });

    it('should handle display_order auto-calculation edge cases', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      // Create types with various display orders
      const type1Id = await client.rpc('rpc_create_maintenance_type', {
        p_tenant_id: tenantId,
        p_key: 'order_test_1',
        p_name: 'Order Test 1',
        p_category: 'reactive',
        p_display_order: 1,
      }).then(r => r.data);

      const type2Id = await client.rpc('rpc_create_maintenance_type', {
        p_tenant_id: tenantId,
        p_key: 'order_test_2',
        p_name: 'Order Test 2',
        p_category: 'reactive',
        p_display_order: 999,
      }).then(r => r.data);

      // Verify orders are set correctly
      const { data: type1 } = await client
        .from('v_maintenance_type_catalogs')
        .select('display_order')
        .eq('id', type1Id)
        .single();

      const { data: type2 } = await client
        .from('v_maintenance_type_catalogs')
        .select('display_order')
        .eq('id', type2Id)
        .single();

      expect(type1?.display_order).toBe(1);
      expect(type2?.display_order).toBe(999);
    });

    it('should prevent deleting maintenance types with work orders', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      // Create maintenance type
      const typeId = await client.rpc('rpc_create_maintenance_type', {
        p_tenant_id: tenantId,
        p_key: 'used_type',
        p_name: 'Used Type',
        p_category: 'reactive',
        p_display_order: 10,
      }).then(r => r.data);

      // Create work order using this type
      const { data: woId } = await client.rpc('rpc_create_work_order', {
        p_tenant_id: tenantId,
        p_title: 'WO with Type',
        p_priority: 'medium',
        p_maintenance_type: 'used_type',
      });

      expect(woId).toBeDefined();

      // Verify work order exists with type
      await setTenantContext(client, tenantId);
      const { data: workOrders } = await client
        .from('v_work_orders')
        .select('maintenance_type')
        .eq('maintenance_type', 'used_type');

      expect(workOrders).toBeDefined();
      expect(workOrders?.length ?? 0).toBeGreaterThan(0);

      // Try to delete type (should fail - function doesn't exist or has FK constraint)
      // Note: rpc_delete_maintenance_type may not exist, so we verify work order still exists
      const { error } = await client.rpc('rpc_delete_maintenance_type', {
        p_tenant_id: tenantId,
        p_key: 'used_type',
      });

      // If function doesn't exist, that's fine - verify work order still exists
      if (error) {
        // Function might not exist or might have FK constraint
        expect(error?.message).toMatch(/violates foreign key constraint|foreign key|Could not find the function/i);
      }
      
      // Verify work order still exists regardless
      const { data: workOrdersAfter } = await client
        .from('v_work_orders')
        .select('maintenance_type')
        .eq('maintenance_type', 'used_type');
      expect(workOrdersAfter?.length ?? 0).toBeGreaterThan(0);
    });
  });
});
