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
  createTestTimeEntry,
  getTimeEntry,
  getWorkOrder,
} from './helpers/entities';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Work Order Time Entries', () => {
  let client: SupabaseClient;

  beforeAll(async () => {
    await waitForSupabase();
    client = createTestClient();
  });

  describe('Creating time entries', () => {
    it('should create a time entry via rpc_log_work_order_time', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId, 'Test WO');

      const timeEntryId = await createTestTimeEntry(
        client,
        tenantId,
        workOrderId,
        120,
        undefined,
        undefined,
        'Initial diagnostic work'
      );

      expect(timeEntryId).toBeDefined();
      expect(typeof timeEntryId).toBe('string');

      await setTenantContext(client, tenantId);
      const timeEntry = await getTimeEntry(client, timeEntryId);

      expect(timeEntry).toBeDefined();
      expect(timeEntry.minutes).toBe(120);
      expect(timeEntry.description).toBe('Initial diagnostic work');
      expect(timeEntry.user_id).toBe(user.id);
      expect(timeEntry.work_order_id).toBe(workOrderId);
      expect(timeEntry.entry_date).toBeDefined();
    });

    it('should default entry_date to today if not provided', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId, 'Test WO');

      const timeEntryId = await createTestTimeEntry(
        client,
        tenantId,
        workOrderId,
        60
      );

      await setTenantContext(client, tenantId);
      const timeEntry = await getTimeEntry(client, timeEntryId);

      const today = new Date().toISOString().split('T')[0];
      expect(timeEntry.entry_date).toBe(today);
    });

    it('should use logged-in user as user_id if not provided', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId, 'Test WO');

      const timeEntryId = await createTestTimeEntry(
        client,
        tenantId,
        workOrderId,
        90
      );

      await setTenantContext(client, tenantId);
      const timeEntry = await getTimeEntry(client, timeEntryId);

      expect(timeEntry.user_id).toBe(user.id);
      expect(timeEntry.created_by).toBe(user.id);
    });

    it('should allow manager to log time for other users', async () => {
      const managerClient = createTestClient();
      const { user: manager } = await createTestUser(managerClient);
      const tenantId = await createTestTenant(managerClient);
      await assignRoleToUser(managerClient, manager.id, tenantId, 'manager');

      const technicianClient = createTestClient();
      const { user: technician } = await createTestUser(technicianClient);
      await addUserToTenant(managerClient, technician.id, tenantId);

      const workOrderId = await createTestWorkOrder(
        managerClient,
        tenantId,
        'Test WO',
        undefined,
        'medium',
        technician.id
      );

      const timeEntryId = await createTestTimeEntry(
        managerClient,
        tenantId,
        workOrderId,
        180,
        undefined,
        technician.id,
        'Manager logged time for technician'
      );

      await setTenantContext(managerClient, tenantId);
      const timeEntry = await getTimeEntry(managerClient, timeEntryId);

      expect(timeEntry.user_id).toBe(technician.id);
      expect(timeEntry.created_by).toBe(manager.id);
      expect(timeEntry.description).toBe('Manager logged time for technician');
    });

    it('should reject if minutes <= 0', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId, 'Test WO');

      const { data, error } = await client.rpc('rpc_log_work_order_time', {
        p_tenant_id: tenantId,
        p_work_order_id: workOrderId,
        p_minutes: 0,
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('must be greater than 0');
    });

    it('should reject if minutes > 1440', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId, 'Test WO');

      const { data, error } = await client.rpc('rpc_log_work_order_time', {
        p_tenant_id: tenantId,
        p_work_order_id: workOrderId,
        p_minutes: 1441,
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('1440');
    });

    it('should reject if entry_date is > 365 days ago', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId, 'Test WO');

      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 366);

      const { data, error } = await client.rpc('rpc_log_work_order_time', {
        p_tenant_id: tenantId,
        p_work_order_id: workOrderId,
        p_minutes: 60,
        p_entry_date: oldDate.toISOString().split('T')[0],
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('365 days');
    });

    it('should reject if entry_date is > 7 days in future', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId, 'Test WO');

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 8);

      const { data, error } = await client.rpc('rpc_log_work_order_time', {
        p_tenant_id: tenantId,
        p_work_order_id: workOrderId,
        p_minutes: 60,
        p_entry_date: futureDate.toISOString().split('T')[0],
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('7 days');
    });

    it('should reject if work_order does not belong to tenant', async () => {
      const { user } = await createTestUser(client);
      const tenantId1 = await createTestTenant(client);
      const tenantId2 = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId1, 'Test WO');

      const { data, error } = await client.rpc('rpc_log_work_order_time', {
        p_tenant_id: tenantId2,
        p_work_order_id: workOrderId,
        p_minutes: 60,
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('not found or does not belong');
    });

    it('should reject if target user is not tenant member', async () => {
      const managerClient = createTestClient();
      const { user: manager } = await createTestUser(managerClient);
      const tenantId = await createTestTenant(managerClient);
      await assignRoleToUser(managerClient, manager.id, tenantId, 'manager');

      const outsiderClient = createTestClient();
      const { user: outsider } = await createTestUser(outsiderClient);

      const workOrderId = await createTestWorkOrder(managerClient, tenantId, 'Test WO');

      const { data, error } = await managerClient.rpc('rpc_log_work_order_time', {
        p_tenant_id: tenantId,
        p_work_order_id: workOrderId,
        p_minutes: 60,
        p_user_id: outsider.id,
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('not a member');
    });

    it('should require workorder.edit permission to log time for others', async () => {
      const memberClient = createTestClient();
      const { user: member } = await createTestUser(memberClient);
      const tenantId = await createTestTenant(memberClient);
      await assignRoleToUser(memberClient, member.id, tenantId, 'member');

      const technicianClient = createTestClient();
      const { user: technician } = await createTestUser(technicianClient);
      await addUserToTenant(memberClient, technician.id, tenantId);

      const workOrderId = await createTestWorkOrder(memberClient, tenantId, 'Test WO');

      const { data, error } = await memberClient.rpc('rpc_log_work_order_time', {
        p_tenant_id: tenantId,
        p_work_order_id: workOrderId,
        p_minutes: 60,
        p_user_id: technician.id,
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('workorder.edit');
    });
  });

  describe('Viewing time entries', () => {
    it('should show time entries via v_work_order_time_entries', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId, 'Test WO');

      const timeEntryId = await createTestTimeEntry(
        client,
        tenantId,
        workOrderId,
        120,
        undefined,
        undefined,
        'Test entry'
      );

      await setTenantContext(client, tenantId);
      const { data: timeEntries, error } = await client
        .from('v_work_order_time_entries')
        .select('*')
        .eq('id', timeEntryId);

      expect(error).toBeNull();
      expect(timeEntries).toBeDefined();
      expect(timeEntries.length).toBe(1);
      expect(timeEntries[0].id).toBe(timeEntryId);
      expect(timeEntries[0].minutes).toBe(120);
      expect(timeEntries[0].description).toBe('Test entry');
    });

    it('should order time entries by entry_date desc, logged_at desc', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId, 'Test WO');

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const today = new Date();

      await createTestTimeEntry(client, tenantId, workOrderId, 60, yesterday);
      await createTestTimeEntry(client, tenantId, workOrderId, 90, today);

      await setTenantContext(client, tenantId);
      const { data: timeEntries, error } = await client
        .from('v_work_order_time_entries')
        .select('*')
        .eq('work_order_id', workOrderId);

      expect(error).toBeNull();
      expect(timeEntries.length).toBeGreaterThanOrEqual(2);
      // Most recent entry_date should be first
      const entryDates = timeEntries.map((te: any) => te.entry_date);
      expect(entryDates[0] >= entryDates[1]).toBe(true);
    });
  });

  describe('RLS Policies', () => {
    it('should allow authenticated users to view their tenant time entries', async () => {
      const user1Client = createTestClient();
      const { user: user1 } = await createTestUser(user1Client);
      const tenantId1 = await createTestTenant(user1Client);
      const workOrderId1 = await createTestWorkOrder(user1Client, tenantId1, 'WO 1');

      const user2Client = createTestClient();
      const { user: user2 } = await createTestUser(user2Client);
      const tenantId2 = await createTestTenant(user2Client);
      const workOrderId2 = await createTestWorkOrder(user2Client, tenantId2, 'WO 2');

      const timeEntryId1 = await createTestTimeEntry(
        user1Client,
        tenantId1,
        workOrderId1,
        60
      );
      const timeEntryId2 = await createTestTimeEntry(
        user2Client,
        tenantId2,
        workOrderId2,
        90
      );

      await setTenantContext(user1Client, tenantId1);
      const { data: timeEntries, error } = await user1Client
        .from('v_work_order_time_entries')
        .select('*')
        .in('id', [timeEntryId1, timeEntryId2]);

      expect(error).toBeNull();
      expect(timeEntries.length).toBe(1);
      expect(timeEntries[0].id).toBe(timeEntryId1);
    });

    it('should allow users to insert time entries for their tenant', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId, 'Test WO');

      const timeEntryId = await createTestTimeEntry(
        client,
        tenantId,
        workOrderId,
        120
      );

      expect(timeEntryId).toBeDefined();
    });

    it('should allow users to update their own time entries', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId, 'Test WO');

      const timeEntryId = await createTestTimeEntry(
        client,
        tenantId,
        workOrderId,
        60,
        undefined,
        undefined,
        'Original description'
      );

      await setTenantContext(client, tenantId);
      const { error } = await client
        .from('v_work_order_time_entries')
        .update({ description: 'Updated description' })
        .eq('id', timeEntryId);

      expect(error).toBeNull();

      const timeEntry = await getTimeEntry(client, timeEntryId);
      expect(timeEntry.description).toBe('Updated description');
    });

    it('should allow admins to update any time entry in tenant', async () => {
      const adminClient = createTestClient();
      const { user: admin } = await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);
      await assignRoleToUser(adminClient, admin.id, tenantId, 'admin');

      const userClient = createTestClient();
      const { user: regularUser } = await createTestUser(userClient);
      await addUserToTenant(adminClient, regularUser.id, tenantId);

      const workOrderId = await createTestWorkOrder(adminClient, tenantId, 'Test WO');
      const timeEntryId = await createTestTimeEntry(
        userClient,
        tenantId,
        workOrderId,
        60,
        undefined,
        regularUser.id
      );

      await setTenantContext(adminClient, tenantId);
      const { error } = await adminClient
        .from('v_work_order_time_entries')
        .update({ description: 'Admin updated this' })
        .eq('id', timeEntryId);

      expect(error).toBeNull();

      const timeEntry = await getTimeEntry(adminClient, timeEntryId);
      expect(timeEntry.description).toBe('Admin updated this');
    });

    it('should allow users to delete their own time entries', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId, 'Test WO');

      const timeEntryId = await createTestTimeEntry(
        client,
        tenantId,
        workOrderId,
        60
      );

      await setTenantContext(client, tenantId);
      const { error } = await client
        .from('v_work_order_time_entries')
        .delete()
        .eq('id', timeEntryId);

      expect(error).toBeNull();

      const { data: timeEntry } = await client
        .from('v_work_order_time_entries')
        .select('*')
        .eq('id', timeEntryId)
        .single();

      expect(timeEntry).toBeNull();
    });

    it('should prevent anon users from accessing time entries', async () => {
      const ownerClient = createTestClient();
      await createTestUser(ownerClient);
      const tenantId = await createTestTenant(ownerClient);
      const workOrderId = await createTestWorkOrder(ownerClient, tenantId, 'Test WO');
      const timeEntryId = await createTestTimeEntry(
        ownerClient,
        tenantId,
        workOrderId,
        60
      );

      const anonClient = createTestClient();
      const { data, error } = await anonClient
        .from('v_work_order_time_entries')
        .select('*')
        .eq('id', timeEntryId);

      expect(error).toBeNull();
      expect(data.length).toBe(0);
    });
  });

  describe('Tenant isolation', () => {
    it('should only show time entries from current tenant', async () => {
      const client1 = createTestClient();
      await createTestUser(client1);
      const tenantId1 = await createTestTenant(client1);
      const workOrderId1 = await createTestWorkOrder(client1, tenantId1, 'WO 1');

      const client2 = createTestClient();
      await createTestUser(client2);
      const tenantId2 = await createTestTenant(client2);
      const workOrderId2 = await createTestWorkOrder(client2, tenantId2, 'WO 2');

      const timeEntryId1 = await createTestTimeEntry(
        client1,
        tenantId1,
        workOrderId1,
        60
      );
      const timeEntryId2 = await createTestTimeEntry(
        client2,
        tenantId2,
        workOrderId2,
        90
      );

      await setTenantContext(client1, tenantId1);
      const { data: timeEntries, error } = await client1
        .from('v_work_order_time_entries')
        .select('*')
        .in('id', [timeEntryId1, timeEntryId2]);

      expect(error).toBeNull();
      expect(timeEntries.length).toBe(1);
      expect(timeEntries[0].id).toBe(timeEntryId1);
    });
  });

  describe('Validation triggers', () => {
    it('should reject time entry if user_id is not tenant member', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId, 'Test WO');

      const outsiderClient = createTestClient();
      const { user: outsider } = await createTestUser(outsiderClient);

      // Try to insert directly (bypassing RPC validation)
      const { error } = await client
        .from('app.work_order_time_entries')
        .insert({
          tenant_id: tenantId,
          work_order_id: workOrderId,
          user_id: outsider.id,
          minutes: 60,
          entry_date: new Date().toISOString().split('T')[0],
        });

      expect(error).toBeDefined();
      expect(error?.message).toContain('not a member');
    });
  });

  describe('Aggregation in views', () => {
    it('should aggregate total_labor_minutes in v_work_orders', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId, 'Test WO');

      await createTestTimeEntry(client, tenantId, workOrderId, 60);
      await createTestTimeEntry(client, tenantId, workOrderId, 90);
      await createTestTimeEntry(client, tenantId, workOrderId, 30);

      await setTenantContext(client, tenantId);
      const workOrder = await getWorkOrder(client, workOrderId);

      expect(workOrder.total_labor_minutes).toBe(180);
    });

    it('should handle zero time entries correctly', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId, 'Test WO');

      await setTenantContext(client, tenantId);
      const workOrder = await getWorkOrder(client, workOrderId);

      expect(workOrder.total_labor_minutes).toBe(0);
    });
  });
});
