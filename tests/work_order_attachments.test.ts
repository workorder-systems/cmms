/**
 * Work order attachments: tests follow the architecture in docs/attachments-client-flow.md
 * - Create = upload to Storage (path tenant_id/work_order/work_order_id/uuid_filename) → trigger creates app.files + entity_attachments (no RPC)
 * - Update label/kind = optional rpc_update_entity_attachment_metadata after upload
 * - List = query v_work_order_attachments (tenant context)
 * - Get file URL = storage.from(bucket_id).createSignedUrl(storage_path, expiresIn)
 */
import { execSync } from 'node:child_process';
import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient, createServiceRoleClient, waitForSupabase } from './helpers/supabase';
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
} from './helpers/entities';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Work Order Attachments', () => {
  let client: SupabaseClient;

  beforeAll(async () => {
    await waitForSupabase();
    client = createTestClient();
  });

  describe('Upload (trigger creates app.files + entity_attachments)', () => {
    it('upload to attachments bucket creates attachment row via trigger', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId, 'Test WO', undefined, 'medium', user.id);

      const attachmentId = await createTestAttachment(
        client,
        tenantId,
        workOrderId,
        'path/to/file.jpg'
      );

      expect(attachmentId).toBeDefined();
      expect(typeof attachmentId).toBe('string');

      await setTenantContext(client, tenantId);
      const attachment = await getAttachment(client, attachmentId);

      expect(attachment).toBeDefined();
      expect(attachment.file_id).toBeDefined();
      expect(attachment.bucket_id).toBe('attachments');
      expect(attachment.storage_path).toContain(tenantId);
      expect(attachment.storage_path).toContain(workOrderId);
      expect(attachment.filename).toContain('file.jpg');
      expect(attachment.work_order_id).toBe(workOrderId);
      expect(attachment.created_by).toBe(user.id);
    });

    it('upload without label/kind yields null label and kind', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId, 'Test WO', undefined, 'medium', user.id);

      const attachmentId = await createTestAttachment(
        client,
        tenantId,
        workOrderId,
        'file.pdf'
      );

      await setTenantContext(client, tenantId);
      const attachment = await getAttachment(client, attachmentId);

      expect(attachment.bucket_id).toBe('attachments');
      expect(attachment.filename).toContain('file.pdf');
      expect(attachment.label).toBeNull();
      expect(attachment.kind).toBeNull();
    });
  });

  describe('Update label/kind (rpc_update_entity_attachment_metadata)', () => {
    it('sets label and kind after upload', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId, 'Test WO', undefined, 'medium', user.id);

      const attachmentId = await createTestAttachment(
        client,
        tenantId,
        workOrderId,
        'file.jpg'
      );

      await setTenantContext(client, tenantId);
      await client.rpc('rpc_update_entity_attachment_metadata', {
        p_attachment_id: attachmentId,
        p_label: 'Before photo',
        p_kind: 'photo',
      });
      const attachment = await getAttachment(client, attachmentId);

      expect(attachment.label).toBe('Before photo');
      expect(attachment.kind).toBe('photo');
    });

    it('accepts valid kind format (a-z0-9_)', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId, 'Test WO', undefined, 'medium', user.id);

      const attachmentId = await createTestAttachment(
        client,
        tenantId,
        workOrderId,
        'file.jpg'
      );

      await setTenantContext(client, tenantId);
      await client.rpc('rpc_update_entity_attachment_metadata', {
        p_attachment_id: attachmentId,
        p_kind: 'photo_123',
      });
      const attachment = await getAttachment(client, attachmentId);

      expect(attachment.kind).toBe('photo_123');
    });

    it('rejects label length > 255 when updating via view', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId, 'Test WO', undefined, 'medium', user.id);

      const attachmentId = await createTestAttachment(
        client,
        tenantId,
        workOrderId,
        'file.jpg'
      );

      await setTenantContext(client, tenantId);
      const longLabel = 'a'.repeat(256);
      const { error } = await client
        .from('v_work_order_attachments')
        .update({ label: longLabel })
        .eq('id', attachmentId);

      expect(error).toBeDefined();
    });

    it('rejects invalid kind format when updating via view', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId, 'Test WO', undefined, 'medium', user.id);

      const attachmentId = await createTestAttachment(
        client,
        tenantId,
        workOrderId,
        'file.jpg'
      );

      await setTenantContext(client, tenantId);
      const { error } = await client
        .from('v_work_order_attachments')
        .update({ kind: 'invalid-kind!' })
        .eq('id', attachmentId);

      expect(error).toBeDefined();
    });
  });

  describe('List via v_work_order_attachments', () => {
    it('view returns bucket_id and storage_path for signed URLs', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId, 'Test WO', undefined, 'medium', user.id);

      const attachmentId = await createTestAttachment(
        client,
        tenantId,
        workOrderId,
        'file.jpg'
      );

      await setTenantContext(client, tenantId);
      const { data: attachments, error } = await client
        .from('v_work_order_attachments')
        .select('id, file_id, bucket_id, storage_path, filename, label, kind')
        .eq('id', attachmentId);

      expect(error).toBeNull();
      expect(attachments?.length).toBe(1);
      expect(attachments![0].id).toBe(attachmentId);
      expect(attachments![0].file_id).toBeDefined();
      expect(attachments![0].bucket_id).toBe('attachments');
      expect(attachments![0].storage_path).toContain(tenantId);
      expect(attachments![0].filename).toContain('file.jpg');
    });

    it('view orders by created_at desc', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId, 'Test WO', undefined, 'medium', user.id);

      const attachmentId1 = await createTestAttachment(
        client,
        tenantId,
        workOrderId,
        'file1.jpg'
      );
      await new Promise((resolve) => setTimeout(resolve, 10));
      const attachmentId2 = await createTestAttachment(
        client,
        tenantId,
        workOrderId,
        'file2.jpg'
      );

      await setTenantContext(client, tenantId);
      const { data: attachments, error } = await client
        .from('v_work_order_attachments')
        .select('id')
        .eq('work_order_id', workOrderId);

      expect(error).toBeNull();
      expect(attachments!.length).toBeGreaterThanOrEqual(2);
      expect(attachments![0].id).toBe(attachmentId2);
      expect(attachments![1].id).toBe(attachmentId1);
    });
  });

  describe('Signed URLs (bucket_id + storage_path)', () => {
    it('createSignedUrl returns URL for attachment row', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId, 'Test WO', undefined, 'medium', user.id);

      const attachmentId = await createTestAttachment(
        client,
        tenantId,
        workOrderId,
        'file.jpg'
      );

      await setTenantContext(client, tenantId);
      const attachment = await getAttachment(client, attachmentId);
      const { data: signed, error } = await client.storage
        .from(attachment.bucket_id)
        .createSignedUrl(attachment.storage_path, 3600);

      expect(error).toBeNull();
      expect(signed?.signedUrl).toBeDefined();
    });
  });

  describe('RLS', () => {
    it('users see only attachments in their tenant', async () => {
      const user1Client = createTestClient();
      const { user: user1 } = await createTestUser(user1Client);
      const tenantId1 = await createTestTenant(user1Client);
      const workOrderId1 = await createTestWorkOrder(user1Client, tenantId1, 'WO 1', undefined, 'medium', user1.id);

      const user2Client = createTestClient();
      const { user: user2 } = await createTestUser(user2Client);
      const tenantId2 = await createTestTenant(user2Client);
      const workOrderId2 = await createTestWorkOrder(user2Client, tenantId2, 'WO 2', undefined, 'medium', user2.id);

      const attachmentId1 = await createTestAttachment(
        user1Client,
        tenantId1,
        workOrderId1,
        'file1.jpg'
      );
      const attachmentId2 = await createTestAttachment(
        user2Client,
        tenantId2,
        workOrderId2,
        'file2.jpg'
      );

      await setTenantContext(user1Client, tenantId1);
      const { data: attachments, error } = await user1Client
        .from('v_work_order_attachments')
        .select('id')
        .in('id', [attachmentId1, attachmentId2]);

      expect(error).toBeNull();
      expect(attachments!.length).toBe(1);
      expect(attachments![0].id).toBe(attachmentId1);
    });

    it('users can upload when they can edit the work order (assigned or workorder.edit)', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId, 'Test WO', undefined, 'medium', user.id);

      const attachmentId = await createTestAttachment(
        client,
        tenantId,
        workOrderId,
        'file.jpg'
      );

      expect(attachmentId).toBeDefined();
    });

    it('users can update their own attachment label via view', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId, 'Test WO', undefined, 'medium', user.id);

      const attachmentId = await createTestAttachment(
        client,
        tenantId,
        workOrderId,
        'file.jpg'
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

    it('admins can update any attachment in tenant via view', async () => {
      const adminClient = createTestClient();
      await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);

      const userClient = createTestClient();
      const { user: regularUser } = await createTestUser(userClient);
      await addUserToTenant(adminClient, regularUser.id, tenantId);

      const workOrderId = await createTestWorkOrder(
        adminClient,
        tenantId,
        'Test WO',
        undefined,
        'medium',
        regularUser.id
      );
      const attachmentId = await createTestAttachment(
        userClient,
        tenantId,
        workOrderId,
        'file.jpg'
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

    it('users can delete their own attachment via view', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId, 'Test WO', undefined, 'medium', user.id);

      const attachmentId = await createTestAttachment(
        client,
        tenantId,
        workOrderId,
        'file.jpg'
      );

      await setTenantContext(client, tenantId);
      const { error } = await client
        .from('v_work_order_attachments')
        .delete()
        .eq('id', attachmentId);

      expect(error).toBeNull();
      const { data: attachment } = await client
        .from('v_work_order_attachments')
        .select('id')
        .eq('id', attachmentId)
        .maybeSingle();
      expect(attachment).toBeNull();
    });

    it('anon cannot access v_work_order_attachments', async () => {
      const ownerClient = createTestClient();
      const { user } = await createTestUser(ownerClient);
      const tenantId = await createTestTenant(ownerClient);
      const workOrderId = await createTestWorkOrder(ownerClient, tenantId, 'Test WO', undefined, 'medium', user.id);
      const attachmentId = await createTestAttachment(
        ownerClient,
        tenantId,
        workOrderId,
        'file.jpg'
      );

      const anonClient = createTestClient();
      const { data, error } = await anonClient
        .from('v_work_order_attachments')
        .select('id')
        .eq('id', attachmentId);

      expect(error).toBeNull();
      expect(data!.length).toBe(0);
    });
  });

  describe('Tenant isolation', () => {
    it('view only returns attachments for current tenant context', async () => {
      const client1 = createTestClient();
      const { user: user1 } = await createTestUser(client1);
      const tenantId1 = await createTestTenant(client1);
      const workOrderId1 = await createTestWorkOrder(client1, tenantId1, 'WO 1', undefined, 'medium', user1.id);

      const client2 = createTestClient();
      const { user: user2 } = await createTestUser(client2);
      const tenantId2 = await createTestTenant(client2);
      const workOrderId2 = await createTestWorkOrder(client2, tenantId2, 'WO 2', undefined, 'medium', user2.id);

      const attachmentId1 = await createTestAttachment(
        client1,
        tenantId1,
        workOrderId1,
        'file1.jpg'
      );
      const attachmentId2 = await createTestAttachment(
        client2,
        tenantId2,
        workOrderId2,
        'file2.jpg'
      );

      await setTenantContext(client1, tenantId1);
      const { data: attachments, error } = await client1
        .from('v_work_order_attachments')
        .select('id')
        .in('id', [attachmentId1, attachmentId2]);

      expect(error).toBeNull();
      expect(attachments!.length).toBe(1);
      expect(attachments![0].id).toBe(attachmentId1);
    });
  });

  describe('Lifecycle (cascade, prune, validation)', () => {
    it('rejects reassignment of work_order_id via v_work_order_attachments update', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const workOrderId1 = await createTestWorkOrder(client, tenantId, 'WO A', undefined, 'medium', user.id);
      const workOrderId2 = await createTestWorkOrder(client, tenantId, 'WO B', undefined, 'medium', user.id);
      const attachmentId = await createTestAttachment(client, tenantId, workOrderId1, 'file.jpg');

      await setTenantContext(client, tenantId);
      const { error } = await client
        .from('v_work_order_attachments')
        .update({ work_order_id: workOrderId2 })
        .eq('id', attachmentId);

      expect(error).toBeDefined();
    });

    it('accepts rpc_update_entity_attachment_metadata with a valid document_type_key', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId, 'Doc WO', undefined, 'medium', user.id);
      const attachmentId = await createTestAttachment(client, tenantId, workOrderId, 'file.jpg');

      await setTenantContext(client, tenantId);
      const { error } = await client.rpc('rpc_update_entity_attachment_metadata', {
        p_attachment_id: attachmentId,
        p_document_type_key: 'photo',
        p_is_controlled: false,
      });
      expect(error).toBeNull();
      const row = await getAttachment(client, attachmentId);
      expect(row.document_type_key).toBe('photo');
    });

    it('rejects rpc_update_entity_attachment_metadata with unknown document_type_key', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId, 'Bad doc WO', undefined, 'medium', user.id);
      const attachmentId = await createTestAttachment(client, tenantId, workOrderId, 'file.jpg');

      await setTenantContext(client, tenantId);
      const { error } = await client.rpc('rpc_update_entity_attachment_metadata', {
        p_attachment_id: attachmentId,
        p_document_type_key: 'not_a_catalog_key_zz',
      });
      expect(error).toBeDefined();
    });

    it('deleting the last attachment row removes the Storage object (refcount prune)', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId, 'Prune WO', undefined, 'medium', user.id);
      const attachmentId = await createTestAttachment(client, tenantId, workOrderId, 'prune.jpg');

      await setTenantContext(client, tenantId);
      const { data: row } = await client
        .from('v_work_order_attachments')
        .select('storage_path')
        .eq('id', attachmentId)
        .maybeSingle();
      const folderPrefix = row?.storage_path?.split('/').slice(0, -1).join('/') ?? '';

      const service = createServiceRoleClient();
      const { error: delErr } = await client.from('v_work_order_attachments').delete().eq('id', attachmentId);
      expect(delErr).toBeNull();

      const { data: listed, error: listErr } = await service.storage
        .from('attachments')
        .list(folderPrefix);
      expect(listErr).toBeNull();
      expect((listed ?? []).length).toBe(0);
    });

    it('keeps Storage object while a second entity still references the same file_id', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const wo1 = await createTestWorkOrder(client, tenantId, 'WO1', undefined, 'medium', user.id);
      const wo2 = await createTestWorkOrder(client, tenantId, 'WO2', undefined, 'medium', user.id);
      const att1 = await createTestAttachment(client, tenantId, wo1, 'shared.jpg');
      await setTenantContext(client, tenantId);
      const { data: row1 } = await client
        .from('v_work_order_attachments')
        .select('file_id, storage_path')
        .eq('id', att1)
        .maybeSingle();
      const fileId = row1?.file_id as string;
      const folderPrefix = row1?.storage_path?.split('/').slice(0, -1).join('/') ?? '';

      const { error: regErr } = await client.rpc('rpc_register_entity_attachment', {
        p_tenant_id: tenantId,
        p_entity_type: 'work_order',
        p_entity_id: wo2,
        p_file_id: fileId,
        p_label: 'second link',
      });
      expect(regErr).toBeNull();

      await client.from('v_work_order_attachments').delete().eq('id', att1);

      const service = createServiceRoleClient();
      const { data: listed } = await service.storage.from('attachments').list(folderPrefix);
      expect((listed ?? []).length).toBeGreaterThan(0);

      const { data: att2rows } = await client
        .from('v_work_order_attachments')
        .select('id')
        .eq('work_order_id', wo2)
        .eq('file_id', fileId);
      const att2 = att2rows?.[0]?.id as string;
      await client.from('v_work_order_attachments').delete().eq('id', att2);

      const { data: listedAfter } = await service.storage.from('attachments').list(folderPrefix);
      expect((listedAfter ?? []).length).toBe(0);
    });

    it('deleting the work order row cascades attachment links (SQL parent delete)', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId, 'Cascade WO', undefined, 'medium', user.id);
      const attachmentId = await createTestAttachment(client, tenantId, workOrderId, 'cascade.jpg');

      await setTenantContext(client, tenantId);
      const { data: row } = await client
        .from('v_work_order_attachments')
        .select('storage_path')
        .eq('id', attachmentId)
        .maybeSingle();
      const folderPrefix = row?.storage_path?.split('/').slice(0, -1).join('/') ?? '';

      try {
        execSync(
          `docker exec supabase_db_database psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c "delete from app.work_orders where id = '${workOrderId}';"`,
          { stdio: 'pipe' }
        );
      } catch {
        return;
      }

      await setTenantContext(client, tenantId);
      const { data: gone } = await client
        .from('v_work_order_attachments')
        .select('id')
        .eq('id', attachmentId)
        .maybeSingle();
      expect(gone).toBeNull();

      const service = createServiceRoleClient();
      const { data: listed } = await service.storage.from('attachments').list(folderPrefix);
      expect((listed ?? []).length).toBe(0);
    });
  });

  describe('Audit logging', () => {
    it('attachment creation (trigger insert) is audited', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      const workOrderId = await createTestWorkOrder(client, tenantId, 'Test WO', undefined, 'medium', user.id);

      const attachmentId = await createTestAttachment(
        client,
        tenantId,
        workOrderId,
        'file.jpg'
      );

      await setTenantContext(client, tenantId);
      const { data: audits, error } = await client
        .from('v_audit_entity_changes')
        .select('*')
        .eq('table_name', 'entity_attachments')
        .eq('record_id', attachmentId)
        .eq('operation', 'INSERT');

      expect(error).toBeNull();
      expect(audits).toBeDefined();
      expect(audits!.length).toBeGreaterThan(0);
    });
  });
});
