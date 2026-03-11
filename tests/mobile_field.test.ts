/**
 * Tests for mobile-first field workflows: sync, start/stop work order, notes,
 * check-ins, register attachment, and mobile views (migrations 20260317120000–20260317120300).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient, waitForSupabase } from './helpers/supabase';
import { createTestUser } from './helpers/auth';
import {
  createTestTenant,
  addUserToTenant,
  setTenantContext,
} from './helpers/tenant';
import {
  createTestWorkOrder,
  createTestAttachment,
  getAttachment,
  getWorkOrder,
  transitionWorkOrderStatus,
} from './helpers/entities';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Mobile field', () => {
  let client: SupabaseClient;

  beforeAll(async () => {
    await waitForSupabase();
    client = createTestClient();
  });

  describe('rpc_mobile_sync', () => {
    it('returns payload with work_orders, assets, locations, time_entries, attachments, check_ins, notes', async () => {
      await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const { data: payload, error } = await client.rpc('rpc_mobile_sync', {
        p_tenant_id: tenantId,
        p_updated_after: null,
        p_limit: 10,
        p_technician_id: null,
      });

      expect(error).toBeNull();
      expect(payload).toBeDefined();
      expect(payload).toHaveProperty('work_orders');
      expect(payload).toHaveProperty('assets');
      expect(payload).toHaveProperty('locations');
      expect(payload).toHaveProperty('time_entries');
      expect(payload).toHaveProperty('attachments');
      expect(payload).toHaveProperty('check_ins');
      expect(payload).toHaveProperty('notes');
      expect(Array.isArray(payload.work_orders)).toBe(true);
      expect(Array.isArray(payload.assets)).toBe(true);
      expect(Array.isArray(payload.check_ins)).toBe(true);
      expect(Array.isArray(payload.notes)).toBe(true);
    });

    it('includes created work order in sync payload when updated_after is null', async () => {
      await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId, 'Sync test WO');
      await setTenantContext(client, tenantId);

      const { data: payload, error } = await client.rpc('rpc_mobile_sync', {
        p_tenant_id: tenantId,
        p_updated_after: null,
        p_limit: 100,
        p_technician_id: null,
      });

      expect(error).toBeNull();
      const workOrders = (payload as { work_orders: { id: string; title?: string }[] }).work_orders;
      const found = workOrders.find((wo) => wo.id === workOrderId);
      expect(found).toBeDefined();
      expect(found!.title).toBe('Sync test WO');
    });
  });

  describe('rpc_start_work_order', () => {
    it('transitions to in_progress and creates check-in, returns check-in id', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId, 'Start WO', undefined, 'medium', user.id);
      await setTenantContext(client, tenantId);

      const { data: checkInId, error } = await client.rpc('rpc_start_work_order', {
        p_tenant_id: tenantId,
        p_work_order_id: workOrderId,
        p_latitude: null,
        p_longitude: null,
        p_accuracy_metres: null,
      });

      expect(error).toBeNull();
      expect(checkInId).toBeDefined();
      expect(typeof checkInId).toBe('string');

      const workOrder = await getWorkOrder(client, workOrderId, tenantId);
      expect(workOrder.status).toBe('in_progress');

      const { data: checkIns, error: ciError } = await client
        .from('v_mobile_work_order_check_ins')
        .select('id, work_order_id, user_id')
        .eq('id', checkInId)
        .limit(1);
      expect(ciError).toBeNull();
      expect(checkIns?.length).toBe(1);
      expect(checkIns![0].work_order_id).toBe(workOrderId);
      expect(checkIns![0].user_id).toBe(user.id);
    });

    it('accepts optional GPS and stores on check-in', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId, 'GPS WO', undefined, 'medium', user.id);
      await setTenantContext(client, tenantId);

      const { data: checkInId, error } = await client.rpc('rpc_start_work_order', {
        p_tenant_id: tenantId,
        p_work_order_id: workOrderId,
        p_latitude: 52.52,
        p_longitude: 13.405,
        p_accuracy_metres: 10,
      });

      expect(error).toBeNull();
      expect(checkInId).toBeDefined();

      const { data: rows } = await client
        .from('v_mobile_work_order_check_ins')
        .select('latitude, longitude')
        .eq('id', checkInId)
        .limit(1);
      expect(rows?.length).toBe(1);
      expect(Number(rows![0].latitude)).toBe(52.52);
      expect(Number(rows![0].longitude)).toBe(13.405);
    });
  });

  describe('rpc_stop_work_order', () => {
    it('can complete work order with optional note and time', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId, 'Stop WO', undefined, 'medium', user.id);
      await setTenantContext(client, tenantId);
      await client.rpc('rpc_start_work_order', {
        p_tenant_id: tenantId,
        p_work_order_id: workOrderId,
        p_latitude: null,
        p_longitude: null,
        p_accuracy_metres: null,
      });

      const { error } = await client.rpc('rpc_stop_work_order', {
        p_tenant_id: tenantId,
        p_work_order_id: workOrderId,
        p_complete: true,
        p_minutes: 30,
        p_note: 'Done. Replaced filter.',
        p_latitude: null,
        p_longitude: null,
        p_accuracy_metres: null,
        p_cause: null,
        p_resolution: null,
      });

      expect(error).toBeNull();

      const workOrder = await getWorkOrder(client, workOrderId, tenantId);
      expect(workOrder.status).toBe('completed');

      const { data: notes } = await client
        .from('v_mobile_work_order_notes')
        .select('id, body')
        .eq('work_order_id', workOrderId);
      expect(notes?.length).toBeGreaterThanOrEqual(1);
      expect(notes?.some((n: { body: string }) => n.body === 'Done. Replaced filter.')).toBe(true);

      const { data: timeRows } = await client
        .from('v_mobile_work_order_time_entries')
        .select('minutes')
        .eq('work_order_id', workOrderId);
      expect(timeRows?.length).toBeGreaterThanOrEqual(1);
      expect(timeRows?.some((t: { minutes: number }) => t.minutes === 30)).toBe(true);
    });
  });

  describe('rpc_add_work_order_note', () => {
    it('creates note and returns note id', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId, 'Note WO', undefined, 'medium', user.id);
      await setTenantContext(client, tenantId);

      const { data: noteId, error } = await client.rpc('rpc_add_work_order_note', {
        p_tenant_id: tenantId,
        p_work_order_id: workOrderId,
        p_body: 'Field note: customer reported noise.',
        p_latitude: null,
        p_longitude: null,
      });

      expect(error).toBeNull();
      expect(noteId).toBeDefined();
      expect(typeof noteId).toBe('string');

      const { data: notes, error: selError } = await client
        .from('v_mobile_work_order_notes')
        .select('id, body, created_by')
        .eq('id', noteId)
        .limit(1);
      expect(selError).toBeNull();
      expect(notes?.length).toBe(1);
      expect(notes![0].body).toBe('Field note: customer reported noise.');
      expect(notes![0].created_by).toBe(user.id);
    });
  });

  describe('rpc_register_work_order_attachment', () => {
    it('registers existing file as work order attachment and returns attachment id', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId, 'Register WO', undefined, 'medium', user.id);
      const attachmentId = await createTestAttachment(client, tenantId, workOrderId, 'reg.pdf');
      await setTenantContext(client, tenantId);
      const attachment = await getAttachment(client, attachmentId, tenantId);
      const fileId = attachment.file_id;

      await client.from('v_work_order_attachments').delete().eq('id', attachmentId);

      const { data: newAttachmentId, error } = await client.rpc('rpc_register_work_order_attachment', {
        p_tenant_id: tenantId,
        p_work_order_id: workOrderId,
        p_file_id: fileId,
        p_label: 'Re-registered',
        p_kind: 'document',
      });

      expect(error).toBeNull();
      expect(newAttachmentId).toBeDefined();
      expect(typeof newAttachmentId).toBe('string');

      const reAttach = await getAttachment(client, newAttachmentId as string, tenantId);
      expect(reAttach.file_id).toBe(fileId);
      expect(reAttach.label).toBe('Re-registered');
      expect(reAttach.kind).toBe('document');
    });
  });

  describe('v_mobile_* views', () => {
    it('v_mobile_work_orders returns minimal columns for tenant', async () => {
      await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId, 'Mobile view WO');
      await setTenantContext(client, tenantId);

      const { data: rows, error } = await client
        .from('v_mobile_work_orders')
        .select('id, tenant_id, title, status, updated_at')
        .eq('id', workOrderId)
        .limit(1);

      expect(error).toBeNull();
      expect(rows?.length).toBe(1);
      expect(rows![0]).toHaveProperty('id');
      expect(rows![0]).toHaveProperty('tenant_id');
      expect(rows![0]).toHaveProperty('title');
      expect(rows![0]).toHaveProperty('status');
      expect(rows![0]).toHaveProperty('updated_at');
      expect(rows![0].title).toBe('Mobile view WO');
    });

    it('v_mobile_work_order_check_ins returns check-ins for tenant', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId, 'CI view WO', undefined, 'medium', user.id);
      await setTenantContext(client, tenantId);
      const { data: checkInId } = await client.rpc('rpc_start_work_order', {
        p_tenant_id: tenantId,
        p_work_order_id: workOrderId,
        p_latitude: null,
        p_longitude: null,
        p_accuracy_metres: null,
      });

      const { data: rows, error } = await client
        .from('v_mobile_work_order_check_ins')
        .select('id, work_order_id, user_id, checked_in_at')
        .eq('id', checkInId)
        .limit(1);

      expect(error).toBeNull();
      expect(rows?.length).toBe(1);
      expect(rows![0].work_order_id).toBe(workOrderId);
      expect(rows![0].user_id).toBe(user.id);
    });

    it('v_mobile_work_order_notes returns notes for tenant', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId, 'Notes view WO', undefined, 'medium', user.id);
      await setTenantContext(client, tenantId);
      const { data: noteId } = await client.rpc('rpc_add_work_order_note', {
        p_tenant_id: tenantId,
        p_work_order_id: workOrderId,
        p_body: 'Note for view test',
        p_latitude: null,
        p_longitude: null,
      });

      const { data: rows, error } = await client
        .from('v_mobile_work_order_notes')
        .select('id, work_order_id, body, created_by')
        .eq('id', noteId)
        .limit(1);

      expect(error).toBeNull();
      expect(rows?.length).toBe(1);
      expect(rows![0].body).toBe('Note for view test');
      expect(rows![0].work_order_id).toBe(workOrderId);
    });
  });

  describe('log time with GPS', () => {
    it('rpc_log_work_order_time accepts optional latitude, longitude, accuracy_metres', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId, 'GPS time WO');
      await setTenantContext(client, tenantId);

      const { data: timeEntryId, error } = await client.rpc('rpc_log_work_order_time', {
        p_tenant_id: tenantId,
        p_work_order_id: workOrderId,
        p_minutes: 15,
        p_entry_date: null,
        p_user_id: null,
        p_description: 'On-site check',
        p_latitude: 52.52,
        p_longitude: 13.405,
        p_accuracy_metres: 5,
      });

      expect(error).toBeNull();
      expect(timeEntryId).toBeDefined();

      const { data: rows } = await client
        .from('v_mobile_work_order_time_entries')
        .select('latitude, longitude')
        .eq('id', timeEntryId)
        .limit(1);
      expect(rows?.length).toBe(1);
      expect(Number(rows![0].latitude)).toBe(52.52);
      expect(Number(rows![0].longitude)).toBe(13.405);
    });
  });

  describe('tenant isolation', () => {
    it('rpc_mobile_sync returns only current tenant data', async () => {
      const client1 = createTestClient();
      await createTestUser(client1);
      const tenantId1 = await createTestTenant(client1);
      const wo1 = await createTestWorkOrder(client1, tenantId1, 'T1 WO');

      const client2 = createTestClient();
      await createTestUser(client2);
      const tenantId2 = await createTestTenant(client2);
      const wo2 = await createTestWorkOrder(client2, tenantId2, 'T2 WO');

      await setTenantContext(client2, tenantId2);
      const { data: payload } = await client2.rpc('rpc_mobile_sync', {
        p_tenant_id: tenantId2,
        p_updated_after: null,
        p_limit: 100,
        p_technician_id: null,
      });

      const workOrders = (payload as { work_orders: { id: string; tenant_id: string }[] }).work_orders;
      const ids = workOrders.map((wo) => wo.id);
      expect(ids).toContain(wo2);
      expect(ids).not.toContain(wo1);
    });
  });
});
