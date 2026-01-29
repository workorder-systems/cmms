import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient, waitForSupabase } from './helpers/supabase';
import { createTestUser } from './helpers/auth';
import { createTestTenant, getTenantBySlug, setTenantContext } from './helpers/tenant';
import { makeTenant } from './helpers/faker';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Tenant Management', () => {
  let client: SupabaseClient;

  beforeAll(async () => {
    await waitForSupabase();
    client = createTestClient();
  });

  describe('Tenant Creation', () => {
    it('should create a tenant via rpc_create_tenant', async () => {
      const { user } = await createTestUser(client);
      const { name: tenantName, slug: tenantSlug } = makeTenant();

      const tenantId = await createTestTenant(client, tenantName, tenantSlug);

      expect(tenantId).toBeDefined();
      expect(typeof tenantId).toBe('string');

      // Verify tenant exists
      const tenant = await getTenantBySlug(client, tenantSlug);
      expect(tenant).toBeDefined();
      expect(tenant?.name).toBe(tenantName);
      expect(tenant?.slug).toBe(tenantSlug);
    });

    it('should create default roles (admin, member) for new tenant', async () => {
      const { name: tenantName, slug: tenantSlug } = makeTenant();
      const tenantId = await createTestTenant(client, tenantName, tenantSlug);

      await setTenantContext(client, tenantId);

      const { data: adminRole, error: adminError } = await client
        .from('v_tenant_roles')
        .select('*')
        .eq('key', 'admin')
        .single();

      expect(adminError).toBeNull();
      expect(adminRole).toBeDefined();
      expect(adminRole.is_system).toBe(true);

      const { data: memberRole, error: memberError } = await client
        .from('v_tenant_roles')
        .select('*')
        .eq('key', 'member')
        .single();

      expect(memberError).toBeNull();
      expect(memberRole).toBeDefined();
      expect(memberRole.is_system).toBe(true);
      expect(memberRole.is_default).toBe(true);
    });

    it('should create default workflows (statuses, priorities) for new tenant', async () => {
      const { name: tenantName, slug: tenantSlug } = makeTenant();
      const tenantId = await createTestTenant(client, tenantName, tenantSlug);

      await setTenantContext(client, tenantId);
      const { data: statuses, error: statusError } = await client
        .from('v_status_catalogs')
        .select('*')
        .eq('entity_type', 'work_order');

      expect(statusError).toBeNull();
      expect(statuses).toBeDefined();
      expect(statuses.length).toBeGreaterThan(0);

      // Should have draft, assigned, in_progress, completed, cancelled
      const statusKeys = statuses.map((s: any) => s.key);
      expect(statusKeys).toContain('draft');
      expect(statusKeys).toContain('assigned');
      expect(statusKeys).toContain('completed');

      const { data: priorities, error: priorityError } = await client
        .from('v_priority_catalogs')
        .select('*')
        .eq('entity_type', 'work_order');

      expect(priorityError).toBeNull();
      expect(priorities).toBeDefined();
      expect(priorities.length).toBeGreaterThan(0);

      // Should have low, medium, high, critical
      const priorityKeys = priorities.map((p: any) => p.key);
      expect(priorityKeys).toContain('low');
      expect(priorityKeys).toContain('medium');
      expect(priorityKeys).toContain('high');
    });

    it('should add creator as tenant member', async () => {
      const { user } = await createTestUser(client);
      const { name: tenantName, slug: tenantSlug } = makeTenant();
      const tenantId = await createTestTenant(client, tenantName, tenantSlug);

      await setTenantContext(client, tenantId);
      const { data: membership, error } = await client
        .from('v_user_tenant_roles')
        .select('tenant_id')
        .eq('tenant_id', tenantId)
        .single();

      expect(error).toBeNull();
      expect(membership).toBeDefined();
      expect(membership.tenant_id).toBe(tenantId);
    });

    it('should assign admin role to creator', async () => {
      const { user } = await createTestUser(client);
      const tenantName = `Admin Role Test ${Date.now()}`;
      const tenantSlug = `admin-role-test-${Date.now()}`;
      const tenantId = await createTestTenant(client, tenantName, tenantSlug);

      await setTenantContext(client, tenantId);
      const { data: roleAssignment, error } = await client
        .from('v_user_tenant_roles')
        .select('tenant_id, role_key')
        .eq('tenant_id', tenantId)
        .eq('role_key', 'admin')
        .single();

      expect(error).toBeNull();
      expect(roleAssignment).toBeDefined();
      expect(roleAssignment.tenant_id).toBe(tenantId);
    });
  });

  describe('Tenant Validation', () => {
    it('should enforce tenant slug uniqueness', async () => {
      const slug = `unique-slug-${Date.now()}`;
      await createTestTenant(client, 'First Tenant', slug);

      // Try to create another tenant with same slug
      const { data, error } = await client.rpc('rpc_create_tenant', {
        p_name: 'Second Tenant',
        p_slug: slug,
      });

      expect(error).toBeDefined();
      expect(error?.code).toBe('23505'); // Unique violation
      expect(data).toBeNull();
    });

    it('should validate tenant slug format', async () => {
      const { data, error } = await client.rpc('rpc_create_tenant', {
        p_name: 'Invalid Slug Tenant',
        p_slug: 'Invalid Slug!@#', // Invalid characters
      });

      expect(error).toBeDefined();
      expect(data).toBeNull();
    });

    it('should validate tenant name length', async () => {
      const longName = 'a'.repeat(300); // Exceeds 255 char limit

      const { data, error } = await client.rpc('rpc_create_tenant', {
        p_name: longName,
        p_slug: `long-name-${Date.now()}`,
      });

      expect(error).toBeDefined();
      expect(data).toBeNull();
    });
  });
});
