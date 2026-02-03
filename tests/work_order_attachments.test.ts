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
  createTestAttachment,
  getAttachment,
} from './helpers/entities';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Work Order Attachments', () => {
  let client: SupabaseClient;

  beforeAll(async () => {
    await waitForSupabase();
    client = createTestClient();
  });

  describe('Creating attachments', () => {
    it('should create an attachment via rpc_add_work_order_attachment', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId, 'Test WO');

      const attachmentId = await createTestAttachment(
        client,
        tenantId,
        workOrderId,
        'storage://bucket/path/to/file.jpg',
        'Before photo',
        'photo'
      );

      expect(attachmentId).toBeDefined();
      expect(typeof attachmentId).toBe('string');

      await setTenantContext(client, tenantId);
      const attachment = await getAttachment(client, attachmentId);

      expect(attachment).toBeDefined();
      expect(attachment.file_ref).toBe('storage://bucket/path/to/file.jpg');
      expect(attachment.label).toBe('Before photo');
      expect(attachment.kind).toBe('photo');
      expect(attachment.work_order_id).toBe(workOrderId);
      expect(attachment.created_by).toBe(user.id);
    });

    it('should accept attachment without label and kind', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId, 'Test WO');

      const attachmentId = await createTestAttachment(
        client,
        tenantId,
        workOrderId,
        'storage://bucket/file.pdf'
      );

      await setTenantContext(client, tenantId);
      const attachment = await getAttachment(client, attachmentId);

      expect(attachment.file_ref).toBe('storage://bucket/file.pdf');
      expect(attachment.label).toBeNull();
      expect(attachment.kind).toBeNull();
    });

    it('should reject if file_ref length < 1', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId, 'Test WO');

      const { data, error } = await client.rpc('rpc_add_work_order_attachment', {
        p_tenant_id: tenantId,
        p_work_order_id: workOrderId,
        p_file_ref: '',
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('work_order_attachments_file_ref_length_check');
    });

    it('should reject if file_ref length > 500', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId, 'Test WO');

      const longFileRef = 'a'.repeat(501);

      const { data, error } = await client.rpc('rpc_add_work_order_attachment', {
        p_tenant_id: tenantId,
        p_work_order_id: workOrderId,
        p_file_ref: longFileRef,
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('work_order_attachments_file_ref_length_check');
    });

    it('should reject if work_order does not belong to tenant', async () => {
      const { user } = await createTestUser(client);
      const tenantId1 = await createTestTenant(client);
      const tenantId2 = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId1, 'Test WO');

      const { data, error } = await client.rpc('rpc_add_work_order_attachment', {
        p_tenant_id: tenantId2,
        p_work_order_id: workOrderId,
        p_file_ref: 'storage://bucket/file.jpg',
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('not found or does not belong');
    });

    it('should reject if label length > 255', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId, 'Test WO');

      const longLabel = 'a'.repeat(256);

      const { data, error } = await client.rpc('rpc_add_work_order_attachment', {
        p_tenant_id: tenantId,
        p_work_order_id: workOrderId,
        p_file_ref: 'storage://bucket/file.jpg',
        p_label: longLabel,
      });

      expect(error).toBeDefined();
    });

    it('should reject if kind does not match format', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId, 'Test WO');

      const { data, error } = await client.rpc('rpc_add_work_order_attachment', {
        p_tenant_id: tenantId,
        p_work_order_id: workOrderId,
        p_file_ref: 'storage://bucket/file.jpg',
        p_kind: 'invalid-kind!',
      });

      expect(error).toBeDefined();
    });

    it('should accept valid kind format (a-z0-9_)', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId, 'Test WO');

      const attachmentId = await createTestAttachment(
        client,
        tenantId,
        workOrderId,
        'storage://bucket/file.jpg',
        undefined,
        'photo_123'
      );

      await setTenantContext(client, tenantId);
      const attachment = await getAttachment(client, attachmentId);

      expect(attachment.kind).toBe('photo_123');
    });
  });

  describe('Viewing attachments', () => {
    it('should show attachments via v_work_order_attachments', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId, 'Test WO');

      const attachmentId = await createTestAttachment(
        client,
        tenantId,
        workOrderId,
        'storage://bucket/file.jpg',
        'Test attachment'
      );

      await setTenantContext(client, tenantId);
      const { data: attachments, error } = await client
        .from('v_work_order_attachments')
        .select('*')
        .eq('id', attachmentId);

      expect(error).toBeNull();
      expect(attachments).toBeDefined();
      expect(attachments.length).toBe(1);
      expect(attachments[0].id).toBe(attachmentId);
      expect(attachments[0].file_ref).toBe('storage://bucket/file.jpg');
    });

    it('should order attachments by created_at desc', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId, 'Test WO');

      const attachmentId1 = await createTestAttachment(
        client,
        tenantId,
        workOrderId,
        'storage://bucket/file1.jpg'
      );

      // Small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      const attachmentId2 = await createTestAttachment(
        client,
        tenantId,
        workOrderId,
        'storage://bucket/file2.jpg'
      );

      await setTenantContext(client, tenantId);
      const { data: attachments, error } = await client
        .from('v_work_order_attachments')
        .select('*')
        .eq('work_order_id', workOrderId);

      expect(error).toBeNull();
      expect(attachments.length).toBeGreaterThanOrEqual(2);
      // Most recent should be first
      expect(attachments[0].id).toBe(attachmentId2);
      expect(attachments[1].id).toBe(attachmentId1);
    });
  });

  describe('RLS Policies', () => {
    it('should allow authenticated users to view their tenant attachments', async () => {
      const user1Client = createTestClient();
      await createTestUser(user1Client);
      const tenantId1 = await createTestTenant(user1Client);
      const workOrderId1 = await createTestWorkOrder(user1Client, tenantId1, 'WO 1');

      const user2Client = createTestClient();
      await createTestUser(user2Client);
      const tenantId2 = await createTestTenant(user2Client);
      const workOrderId2 = await createTestWorkOrder(user2Client, tenantId2, 'WO 2');

      const attachmentId1 = await createTestAttachment(
        user1Client,
        tenantId1,
        workOrderId1,
        'storage://bucket/file1.jpg'
      );
      const attachmentId2 = await createTestAttachment(
        user2Client,
        tenantId2,
        workOrderId2,
        'storage://bucket/file2.jpg'
      );

      await setTenantContext(user1Client, tenantId1);
      const { data: attachments, error } = await user1Client
        .from('v_work_order_attachments')
        .select('*')
        .in('id', [attachmentId1, attachmentId2]);

      expect(error).toBeNull();
      expect(attachments.length).toBe(1);
      expect(attachments[0].id).toBe(attachmentId1);
    });

    it('should allow users to insert attachments for their tenant', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId, 'Test WO');

      const attachmentId = await createTestAttachment(
        client,
        tenantId,
        workOrderId,
        'storage://bucket/file.jpg'
      );

      expect(attachmentId).toBeDefined();
    });

    it('should allow users to update their own attachments', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId, 'Test WO');

      const attachmentId = await createTestAttachment(
        client,
        tenantId,
        workOrderId,
        'storage://bucket/file.jpg',
        'Original label'
      );

      await setTenantContext(client, tenantId);
      const { error } = await client
        .from('v_work_order_attachments')
        .update({ label: 'Updated label' })
        .eq('id', attachmentId);

      expect(error).toBeNull();

      const attachment = await getAttachment(client, attachmentId);
      expect(attachment.label).toBe('Updated label');
    });

    it('should allow admins to update any attachment in tenant', async () => {
      const adminClient = createTestClient();
      const { user: admin } = await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);
      // admin already has admin role from tenant creation

      const userClient = createTestClient();
      const { user: regularUser } = await createTestUser(userClient);
      await addUserToTenant(adminClient, regularUser.id, tenantId);

      const workOrderId = await createTestWorkOrder(adminClient, tenantId, 'Test WO');
      const attachmentId = await createTestAttachment(
        userClient,
        tenantId,
        workOrderId,
        'storage://bucket/file.jpg'
      );

      await setTenantContext(adminClient, tenantId);
      const { error } = await adminClient
        .from('v_work_order_attachments')
        .update({ label: 'Admin updated this' })
        .eq('id', attachmentId);

      expect(error).toBeNull();

      const attachment = await getAttachment(adminClient, attachmentId);
      expect(attachment.label).toBe('Admin updated this');
    });

    it('should allow users to delete their own attachments', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId, 'Test WO');

      const attachmentId = await createTestAttachment(
        client,
        tenantId,
        workOrderId,
        'storage://bucket/file.jpg'
      );

      await setTenantContext(client, tenantId);
      const { error } = await client
        .from('v_work_order_attachments')
        .delete()
        .eq('id', attachmentId);

      expect(error).toBeNull();

      const { data: attachment } = await client
        .from('v_work_order_attachments')
        .select('*')
        .eq('id', attachmentId)
        .single();

      expect(attachment).toBeNull();
    });

    it('should prevent anon users from accessing attachments', async () => {
      const ownerClient = createTestClient();
      await createTestUser(ownerClient);
      const tenantId = await createTestTenant(ownerClient);
      const workOrderId = await createTestWorkOrder(ownerClient, tenantId, 'Test WO');
      const attachmentId = await createTestAttachment(
        ownerClient,
        tenantId,
        workOrderId,
        'storage://bucket/file.jpg'
      );

      const anonClient = createTestClient();
      const { data, error } = await anonClient
        .from('v_work_order_attachments')
        .select('*')
        .eq('id', attachmentId);

      expect(error).toBeNull();
      expect(data.length).toBe(0);
    });
  });

  describe('Tenant isolation', () => {
    it('should only show attachments from current tenant', async () => {
      const client1 = createTestClient();
      await createTestUser(client1);
      const tenantId1 = await createTestTenant(client1);
      const workOrderId1 = await createTestWorkOrder(client1, tenantId1, 'WO 1');

      const client2 = createTestClient();
      await createTestUser(client2);
      const tenantId2 = await createTestTenant(client2);
      const workOrderId2 = await createTestWorkOrder(client2, tenantId2, 'WO 2');

      const attachmentId1 = await createTestAttachment(
        client1,
        tenantId1,
        workOrderId1,
        'storage://bucket/file1.jpg'
      );
      const attachmentId2 = await createTestAttachment(
        client2,
        tenantId2,
        workOrderId2,
        'storage://bucket/file2.jpg'
      );

      await setTenantContext(client1, tenantId1);
      const { data: attachments, error } = await client1
        .from('v_work_order_attachments')
        .select('*')
        .in('id', [attachmentId1, attachmentId2]);

      expect(error).toBeNull();
      expect(attachments.length).toBe(1);
      expect(attachments[0].id).toBe(attachmentId1);
    });
  });

  describe('Audit logging', () => {
    it('should log attachment creation events', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId, 'Test WO');

      const attachmentId = await createTestAttachment(
        client,
        tenantId,
        workOrderId,
        'storage://bucket/file.jpg'
      );

      await setTenantContext(client, tenantId);
      const { data: audits, error } = await client
        .from('v_audit_entity_changes')
        .select('*')
        .eq('table_name', 'work_order_attachments')
        .eq('record_id', attachmentId)
        .eq('operation', 'INSERT');

      expect(error).toBeNull();
      expect(audits).toBeDefined();
      expect(audits.length).toBeGreaterThan(0);
    });
  });
});
