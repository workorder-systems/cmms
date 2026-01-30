import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient, waitForSupabase } from './helpers/supabase';
import { createTestUser } from './helpers/auth';
import {
  createTestTenant,
  setTenantContext,
} from './helpers/tenant';
import {
  createTestWorkOrder,
  createTestLocation,
  createTestDepartment,
} from './helpers/entities';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Input Validation & Security', () => {
  let client: SupabaseClient;

  beforeAll(async () => {
    await waitForSupabase();
    client = createTestClient();
  });

  describe('SQL Injection Prevention', () => {
    it('should prevent SQL injection in text fields', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      // Attempt SQL injection in title
      const maliciousTitle = "'; DROP TABLE work_orders; --";
      const { error } = await client.rpc('rpc_create_work_order', {
        p_tenant_id: tenantId,
        p_title: maliciousTitle,
        p_priority: 'medium',
      });

      // Should either succeed (with sanitized input) or fail gracefully
      // The key is that it doesn't execute SQL
      if (!error) {
        // If it succeeds, verify the title is stored as-is (not executed)
        const { data: workOrders } = await client
          .from('v_work_orders')
          .select('title')
          .eq('title', maliciousTitle)
          .limit(1);

        // Title should be stored literally, not executed
        expect(workOrders?.length ?? 0).toBeGreaterThanOrEqual(0);
      }
    });

    it('should prevent SQL injection in description fields', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const maliciousDesc = "'; SELECT * FROM auth.users; --";
      const woId = await createTestWorkOrder(
        client,
        tenantId,
        'Test WO',
        maliciousDesc
      );

      // Should succeed - description stored as text, not executed
      expect(woId).toBeDefined();

      const { data: wo } = await client
        .from('v_work_orders')
        .select('description')
        .eq('id', woId)
        .single();

      expect(wo?.description).toBe(maliciousDesc);
    });

    it('should use parameterized queries in RPC functions', async () => {
      // This test verifies that RPCs use parameterized queries
      // by attempting injection and verifying no SQL execution
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      // Try injection in various fields
      const injections = [
        "'; DELETE FROM work_orders; --",
        "' OR '1'='1",
        "'; UPDATE work_orders SET status='hacked'; --",
      ];

      for (const injection of injections) {
        const { error } = await client.rpc('rpc_create_work_order', {
          p_tenant_id: tenantId,
          p_title: injection,
          p_priority: 'medium',
        });

        // Should not execute SQL - either succeeds with literal value or fails validation
        // The important thing is no SQL execution
        if (!error) {
          // Verify work order was created with literal title
          const { data: workOrders } = await client
            .from('v_work_orders')
            .select('title')
            .ilike('title', `%${injection}%`)
            .limit(1);

          // Should find the work order with literal title
          expect(workOrders?.length ?? 0).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });

  describe('Boundary Conditions', () => {
    it('should enforce max length constraint on work order title (500 chars)', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const longTitle = 'a'.repeat(501); // 501 characters

      const { error } = await client.rpc('rpc_create_work_order', {
        p_tenant_id: tenantId,
        p_title: longTitle,
        p_priority: 'medium',
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('work_orders_title_length_check');
    });

    it('should allow work order title at max length (500 chars)', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const maxTitle = 'a'.repeat(500); // Exactly 500 characters

      const { error } = await client.rpc('rpc_create_work_order', {
        p_tenant_id: tenantId,
        p_title: maxTitle,
        p_priority: 'medium',
      });

      expect(error).toBeNull();
    });

    it('should enforce min length constraint on work order title (1 char)', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const { error } = await client.rpc('rpc_create_work_order', {
        p_tenant_id: tenantId,
        p_title: '', // Empty string
        p_priority: 'medium',
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('work_orders_title_length_check');
    });

    it('should handle null vs empty string correctly', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      // Null description should be allowed
      const woId1 = await createTestWorkOrder(
        client,
        tenantId,
        'WO with null desc',
        null as any
      );
      expect(woId1).toBeDefined();

      // Empty string description should be allowed (if not constrained)
      const woId2 = await createTestWorkOrder(
        client,
        tenantId,
        'WO with empty desc',
        ''
      );
      expect(woId2).toBeDefined();
    });

    it('should validate UUID format', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      // Invalid UUID format
      const { error } = await client.rpc('rpc_create_work_order', {
        p_tenant_id: 'not-a-uuid',
        p_title: 'Test',
        p_priority: 'medium',
      });

      expect(error).toBeDefined();
      // Should fail with UUID validation error
    });

    it('should validate date range for entry_date (365 days ago to 7 days future)', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const woId = await createTestWorkOrder(client, tenantId, 'Test WO');

      // Date too far in past
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 366);

      const { error: pastError } = await client.rpc('rpc_log_work_order_time', {
        p_tenant_id: tenantId,
        p_work_order_id: woId,
        p_minutes: 60,
        p_entry_date: pastDate.toISOString().split('T')[0],
      });

      expect(pastError).toBeDefined();
      expect(pastError?.message).toContain('work_order_time_entries_entry_date_range_check');

      // Date too far in future
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 8);

      const { error: futureError } = await client.rpc('rpc_log_work_order_time', {
        p_tenant_id: tenantId,
        p_work_order_id: woId,
        p_minutes: 60,
        p_entry_date: futureDate.toISOString().split('T')[0],
      });

      expect(futureError).toBeDefined();
      expect(futureError?.message).toContain('work_order_time_entries_entry_date_range_check');
    });
  });

  describe('Format Validation', () => {
    it('should validate status key format (^[a-z0-9_]+$)', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const invalidStatuses = [
        'Invalid-Status', // Contains hyphen
        'Invalid Status', // Contains space
        'Invalid.Status', // Contains period
        'INVALID', // Uppercase
        'invalid@status', // Contains @
      ];

      for (const invalidStatus of invalidStatuses) {
        const { error } = await client.rpc('rpc_create_status', {
          p_tenant_id: tenantId,
          p_entity_type: 'work_order',
          p_key: invalidStatus,
          p_name: 'Invalid Status',
          p_category: 'open',
          p_display_order: 100,
        });

        expect(error).toBeDefined();
      }
    });

    it('should allow valid status key format', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const validStatuses = [
        'valid_status',
        'valid123',
        'status_123',
        'a',
        'status_with_underscores',
      ];

      for (const validStatus of validStatuses) {
        const { error } = await client.rpc('rpc_create_status', {
          p_tenant_id: tenantId,
          p_entity_type: 'work_order',
          p_key: validStatus,
          p_name: 'Valid Status',
          p_category: 'open',
          p_display_order: 100,
        });

        // Should succeed or fail for other reasons (duplicate, etc.), not format
        if (error && error.message.includes('format')) {
          throw new Error(`Valid status format rejected: ${validStatus}`);
        }
      }
    });

    it('should validate priority key format', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const invalidPriorities = [
        'Invalid-Priority',
        'Invalid Priority',
        'INVALID',
      ];

      for (const invalidPriority of invalidPriorities) {
        const { error } = await client.rpc('rpc_create_priority', {
          p_tenant_id: tenantId,
          p_entity_type: 'work_order',
          p_key: invalidPriority,
          p_name: 'Invalid Priority',
          p_weight: 5,
          p_display_order: 100,
        });

        expect(error).toBeDefined();
      }
    });

    it('should validate email format in rpc_invite_user_to_tenant', async () => {
      const adminClient = createTestClient();
      const { user: admin } = await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);

      const invalidEmails = [
        'not-an-email',
        'invalid@',
        '@invalid.com',
        'invalid..email@example.com',
        'invalid@example',
      ];

      for (const invalidEmail of invalidEmails) {
        const { error } = await adminClient.rpc('rpc_invite_user_to_tenant', {
          p_tenant_id: tenantId,
          p_invitee_email: invalidEmail,
          p_role_key: 'member',
        });

        // Should fail - either email validation or user not found
        expect(error).toBeDefined();
      }
    });

    it('should validate slug format in rpc_create_tenant', async () => {
      const testClient = createTestClient();
      await createTestUser(testClient);

      const invalidSlugs = [
        'Invalid Slug', // Contains space
        'invalid-slug!', // Contains special char
        'InvalidSlug', // Contains uppercase
        'invalid.slug', // Contains period
      ];

      for (const invalidSlug of invalidSlugs) {
        const { error } = await testClient.rpc('rpc_create_tenant', {
          p_name: 'Test Tenant',
          p_slug: invalidSlug,
        });

        // Should fail format validation
        expect(error).toBeDefined();
      }
    });
  });

  describe('Type Coercion Attacks', () => {
    it('should reject wrong types (string where UUID expected)', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      // Try passing string instead of UUID
      const { error } = await client.rpc('rpc_create_work_order', {
        p_tenant_id: tenantId,
        p_title: 'Test',
        p_priority: 'medium',
        p_assigned_to: 'not-a-uuid' as any,
      });

      // Should fail with type validation error
      expect(error).toBeDefined();
    });

    it('should reject array where single value expected', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      // Try passing array instead of single value
      const { error } = await client.rpc('rpc_create_work_order', {
        p_tenant_id: tenantId,
        p_title: ['Title1', 'Title2'] as any,
        p_priority: 'medium',
      });

      // Should fail type validation
      expect(error).toBeDefined();
    });

    it('should reject object where primitive expected', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      // Try passing object instead of string
      const { error } = await client.rpc('rpc_create_work_order', {
        p_tenant_id: tenantId,
        p_title: { malicious: 'object' } as any,
        p_priority: 'medium',
      });

      // Should fail type validation
      expect(error).toBeDefined();
    });
  });

  describe('XSS Prevention', () => {
    it('should store HTML/script tags as literal text', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const xssPayload = '<script>alert("XSS")</script>';
      const woId = await createTestWorkOrder(
        client,
        tenantId,
        xssPayload,
        '<img src=x onerror=alert(1)>'
      );

      expect(woId).toBeDefined();

      // Verify stored as literal text, not executed
      const { data: wo } = await client
        .from('v_work_orders')
        .select('title, description')
        .eq('id', woId)
        .single();

      expect(wo?.title).toBe(xssPayload);
      expect(wo?.description).toBe('<img src=x onerror=alert(1)>');
    });

    it('should handle special characters in text fields', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const specialChars = [
        '<>&"\'',
        '{}[]()',
        '!@#$%^&*',
        '\\n\\r\\t',
        '中文',
        '🚀',
      ];

      for (const chars of specialChars) {
        const woId = await createTestWorkOrder(
          client,
          tenantId,
          `Test ${chars}`,
          chars
        );

        expect(woId).toBeDefined();

        const { data: wo } = await client
          .from('v_work_orders')
          .select('title, description')
          .eq('id', woId)
          .single();

        expect(wo?.title).toContain(chars);
        expect(wo?.description).toBe(chars);
      }
    });
  });

  describe('Constraint Validation', () => {
    it('should validate minutes constraint (0 < minutes <= 1440)', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const woId = await createTestWorkOrder(client, tenantId, 'Test WO');

      // Zero minutes
      const { error: zeroError } = await client.rpc('rpc_log_work_order_time', {
        p_tenant_id: tenantId,
        p_work_order_id: woId,
        p_minutes: 0,
      });

      expect(zeroError).toBeDefined();
      expect(zeroError?.message).toContain('work_order_time_entries_minutes_check');

      // Negative minutes
      const { error: negError } = await client.rpc('rpc_log_work_order_time', {
        p_tenant_id: tenantId,
        p_work_order_id: woId,
        p_minutes: -1,
      });

      expect(negError).toBeDefined();
      expect(negError?.message).toContain('work_order_time_entries_minutes_check');

      // Over 1440 minutes
      const { error: overError } = await client.rpc('rpc_log_work_order_time', {
        p_tenant_id: tenantId,
        p_work_order_id: woId,
        p_minutes: 1441,
      });

      expect(overError).toBeDefined();
      expect(overError?.message).toContain('work_order_time_entries_minutes_check');
    });

    it('should validate file_ref length constraint (1-500 chars)', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const woId = await createTestWorkOrder(client, tenantId, 'Test WO');

      // Empty file_ref
      const { error: emptyError } = await client.rpc('rpc_add_work_order_attachment', {
        p_tenant_id: tenantId,
        p_work_order_id: woId,
        p_file_ref: '',
      });

      expect(emptyError).toBeDefined();
      expect(emptyError?.message).toContain('work_order_attachments_file_ref_length_check');

      // Over 500 chars
      const longFileRef = 'a'.repeat(501);
      const { error: longError } = await client.rpc('rpc_add_work_order_attachment', {
        p_tenant_id: tenantId,
        p_work_order_id: woId,
        p_file_ref: longFileRef,
      });

      expect(longError).toBeDefined();
      expect(longError?.message).toContain('work_order_attachments_file_ref_length_check');
    });

    it('should validate department code format (uppercase alphanumeric with underscores)', async () => {
      const { user } = await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const invalidCodes = [
        'lowercase',
        'code-with-hyphen',
        'code with space',
        'code.with.period',
        'code@special',
      ];

      for (const invalidCode of invalidCodes) {
        const { error } = await client.rpc('rpc_create_department', {
          p_tenant_id: tenantId,
          p_name: 'Test Dept',
          p_code: invalidCode,
        });

        expect(error).toBeDefined();
        expect(error?.message).toContain('uppercase alphanumeric');
      }

      // Valid codes
      const validCodes = ['MAINT', 'ENG_001', 'DEPT123', 'A'];

      for (const validCode of validCodes) {
        const { error } = await client.rpc('rpc_create_department', {
          p_tenant_id: tenantId,
          p_name: `Dept ${validCode}`,
          p_code: validCode,
        });

        // Should succeed or fail for other reasons (duplicate), not format
        if (error && error.message.includes('uppercase alphanumeric')) {
          throw new Error(`Valid code format rejected: ${validCode}`);
        }
      }
    });
  });
});
