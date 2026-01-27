import { describe, it, expect, beforeAll } from 'vitest';
import {
  createTestClient,
  createServiceRoleClient,
  waitForSupabase,
} from './helpers/supabase';
import { createTestUser } from './helpers/auth';
import { createTestTenant, getTenantBySlug } from './helpers/tenant';
import { makeTenant } from './helpers/faker';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Tenant Management', () => {
  let client: SupabaseClient;
  let serviceClient: SupabaseClient;

  beforeAll(async () => {
    await waitForSupabase();
    client = createTestClient();
    serviceClient = createServiceRoleClient();
  });

  describe('Tenant Creation', () => {
    it('should create a tenant via rpc_create_tenant', async () => {
      const { user } = await createTestUser(client);
      const { name: tenantName, slug: tenantSlug } = makeTenant();

      const tenantId = await createTestTenant(client, tenantName, tenantSlug);

      expect(tenantId).toBeDefined();
      expect(typeof tenantId).toBe('string');

      // Verify tenant exists
      const tenant = await getTenantBySlug(serviceClient, tenantSlug);
      expect(tenant).toBeDefined();
      expect(tenant?.name).toBe(tenantName);
      expect(tenant?.slug).toBe(tenantSlug);
    });

    it('should create default roles (admin, member) for new tenant', async () => {
      const { name: tenantName, slug: tenantSlug } = makeTenant();
      const tenantId = await createTestTenant(client, tenantName, tenantSlug);

      // Check for admin role
      const { data: adminRole, error: adminError } = await serviceClient
        .schema('cfg')
        .from('tenant_roles')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('key', 'admin')
        .single();

      expect(adminError).toBeNull();
      expect(adminRole).toBeDefined();
      expect(adminRole.is_system).toBe(true);

      // Check for member role
      const { data: memberRole, error: memberError } = await serviceClient
        .schema('cfg')
        .from('tenant_roles')
        .select('*')
        .eq('tenant_id', tenantId)
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

      // Check for default work order statuses
      const { data: statuses, error: statusError } = await serviceClient
        .schema('cfg')
        .from('status_catalogs')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('entity_type', 'work_order');

      expect(statusError).toBeNull();
      expect(statuses).toBeDefined();
      expect(statuses.length).toBeGreaterThan(0);

      // Should have draft, assigned, in_progress, completed, cancelled
      const statusKeys = statuses.map((s: any) => s.key);
      expect(statusKeys).toContain('draft');
      expect(statusKeys).toContain('assigned');
      expect(statusKeys).toContain('completed');

      // Check for default priorities
      const { data: priorities, error: priorityError } = await serviceClient
        .schema('cfg')
        .from('priority_catalogs')
        .select('*')
        .eq('tenant_id', tenantId)
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

      // Check membership
      const { data: membership, error } = await serviceClient
        .schema('app')
        .from('tenant_memberships')
        .select('*')
        .eq('user_id', user.id)
        .eq('tenant_id', tenantId)
        .single();

      expect(error).toBeNull();
      expect(membership).toBeDefined();
      expect(membership.user_id).toBe(user.id);
      expect(membership.tenant_id).toBe(tenantId);
    });

    it('should assign admin role to creator', async () => {
      const { user } = await createTestUser(client);
      const tenantName = `Admin Role Test ${Date.now()}`;
      const tenantSlug = `admin-role-test-${Date.now()}`;
      const tenantId = await createTestTenant(client, tenantName, tenantSlug);

      // Get admin role ID
      const { data: adminRole } = await serviceClient
        .schema('cfg')
        .from('tenant_roles')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('key', 'admin')
        .single();

      // Check role assignment
      const { data: roleAssignment, error } = await serviceClient
        .schema('app')
        .from('user_tenant_roles')
        .select('*')
        .eq('user_id', user.id)
        .eq('tenant_id', tenantId)
        .eq('tenant_role_id', adminRole.id)
        .single();

      expect(error).toBeNull();
      expect(roleAssignment).toBeDefined();
      expect(roleAssignment.user_id).toBe(user.id);
      expect(roleAssignment.tenant_role_id).toBe(adminRole.id);
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
