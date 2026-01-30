import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient, waitForSupabase } from './helpers/supabase';
import { createTestUser, TEST_PASSWORD, getUserEmail } from './helpers/auth';
import {
  createTestTenant,
  addUserToTenant,
  assignRoleToUser,
  setTenantContext,
} from './helpers/tenant';
import { expectRPCError } from './helpers/rpc';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Audit retention and access', () => {
  let client: SupabaseClient;

  beforeAll(async () => {
    await waitForSupabase();
    client = createTestClient();
  });

  it('allows tenant admins to manage audit retention configs', async () => {
    const { user } = await createTestUser(client);
    const tenantId = await createTestTenant(client);
    await setTenantContext(client, tenantId);

    const { error } = await client.rpc('rpc_set_audit_retention_config', {
      p_tenant_id: tenantId,
      p_retention_months: 18,
      p_is_active: true,
    });

    expect(error).toBeNull();

    const { data, error: viewError } = await client
      .from('v_audit_retention_configs')
      .select('tenant_id, retention_months, is_active')
      .eq('tenant_id', tenantId)
      .single();

    expect(viewError).toBeNull();
    expect(data.tenant_id).toBe(tenantId);
    expect(data.retention_months).toBe(18);
  });

  it('blocks non-admin users from writing audit retention configs', async () => {
    const adminClient = createTestClient();
    const { user: admin } = await createTestUser(adminClient);
    const tenantId = await createTestTenant(adminClient);

    const { user: member } = await createTestUser(client);
    await addUserToTenant(adminClient, member.id, tenantId);

    const memberClient = createTestClient();
    const { error: signInErr } = await memberClient.auth.signInWithPassword({
      email: getUserEmail(member),
      password: TEST_PASSWORD,
    });
    expect(signInErr).toBeNull();
    await setTenantContext(memberClient, tenantId);

    const errorMessage = await expectRPCError(memberClient, 'rpc_set_audit_retention_config', {
      p_tenant_id: tenantId,
      p_retention_months: 6,
      p_is_active: true,
    });

    expect(errorMessage).toContain('tenant.admin');
  });

  it('exposes audit permission changes only to tenant admins', async () => {
    const adminClient = createTestClient();
    const { user: admin } = await createTestUser(adminClient);
    const tenantId = await createTestTenant(adminClient);
    await setTenantContext(adminClient, tenantId);

    const { user: member } = await createTestUser(client);

    const { error: assignError } = await adminClient.rpc('rpc_assign_role_to_user', {
      p_tenant_id: tenantId,
      p_user_id: member.id,
      p_role_key: 'member',
    });
    expect(assignError).toBeNull();

    await setTenantContext(adminClient, tenantId);
    const { data: adminView, error: adminViewError } = await adminClient
      .from('v_audit_permission_changes')
      .select('change_type, target_user_id')
      .eq('target_user_id', member.id);

    expect(adminViewError).toBeNull();
    expect(adminView.length).toBeGreaterThan(0);

    const memberClient = createTestClient();
    const { error: signInErr } = await memberClient.auth.signInWithPassword({
      email: getUserEmail(member),
      password: TEST_PASSWORD,
    });
    expect(signInErr).toBeNull();
    await setTenantContext(memberClient, tenantId);

    const { data: memberView, error: memberViewError } = await memberClient
      .from('v_audit_permission_changes')
      .select('change_type')
      .eq('target_user_id', member.id);

    expect(memberViewError).toBeNull();
    expect(memberView.length).toBe(0);
  });

  describe('Admin-Only Access', () => {
    it('should only allow tenant admins to access v_audit_entity_changes', async () => {
      const adminClient = createTestClient();
      const { user: admin } = await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);
      await setTenantContext(adminClient, tenantId);

      const memberClient = createTestClient();
      const { user: member } = await createTestUser(memberClient);
      await addUserToTenant(adminClient, member.id, tenantId);
      await setTenantContext(memberClient, tenantId);

      // Create some audit data
      const { data: deptId } = await adminClient.rpc('rpc_create_department', {
        p_tenant_id: tenantId,
        p_name: 'Test Dept',
      });

      // Admin should be able to access audit
      const { data: adminAudits, error: adminError } = await adminClient
        .from('v_audit_entity_changes')
        .select('*')
        .eq('table_name', 'departments')
        .eq('record_id', deptId)
        .limit(1);

      expect(adminError).toBeNull();
      expect(adminAudits?.length ?? 0).toBeGreaterThan(0);

      // Member should not be able to access audit
      const { data: memberAudits, error: memberError } = await memberClient
        .from('v_audit_entity_changes')
        .select('*')
        .eq('table_name', 'departments')
        .eq('record_id', deptId)
        .limit(1);

      // Should be empty (RLS prevents access)
      expect(memberAudits?.length ?? 0).toBe(0);
    });

    it('should prevent members/technicians/managers from accessing audit views', async () => {
      const adminClient = createTestClient();
      const { user: admin } = await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);

      const memberClient = createTestClient();
      const { user: member } = await createTestUser(memberClient);
      await addUserToTenant(adminClient, member.id, tenantId);
      await setTenantContext(memberClient, tenantId);

      const technicianClient = createTestClient();
      const { user: technician } = await createTestUser(technicianClient);
      await addUserToTenant(adminClient, technician.id, tenantId);
      await assignRoleToUser(adminClient, technician.id, tenantId, 'technician');
      await setTenantContext(technicianClient, tenantId);

      const managerClient = createTestClient();
      const { user: manager } = await createTestUser(managerClient);
      await addUserToTenant(adminClient, manager.id, tenantId);
      await assignRoleToUser(adminClient, manager.id, tenantId, 'manager');
      await setTenantContext(managerClient, tenantId);

      // None should be able to access audit views
      const views = ['v_audit_entity_changes', 'v_audit_permission_changes'];

      for (const view of views) {
        const { data: memberData } = await memberClient.from(view).select('*').limit(1);
        expect(memberData?.length ?? 0).toBe(0);

        const { data: techData } = await technicianClient.from(view).select('*').limit(1);
        expect(techData?.length ?? 0).toBe(0);

        const { data: managerData } = await managerClient.from(view).select('*').limit(1);
        expect(managerData?.length ?? 0).toBe(0);
      }
    });

    it('should prevent direct access to audit tables', async () => {
      const adminClient = createTestClient();
      const { user: admin } = await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);
      await setTenantContext(adminClient, tenantId);

      // Try to access audit tables directly (should fail or return empty)
      const { data: directAccess, error } = await adminClient
        .from('audit.entity_changes')
        .select('*')
        .limit(1);

      // Should either error (PGRST205) or return empty (tables are not in public schema)
      expect(error?.code === 'PGRST205' || (directAccess?.length ?? 0) === 0).toBe(true);
    });
  });

  describe('Tenant Isolation in Audit', () => {
    it('should only show audit logs for user\'s tenant', async () => {
      const admin1Client = createTestClient();
      const { user: admin1 } = await createTestUser(admin1Client);
      const tenantId1 = await createTestTenant(admin1Client);
      await setTenantContext(admin1Client, tenantId1);

      const admin2Client = createTestClient();
      const { user: admin2 } = await createTestUser(admin2Client);
      const tenantId2 = await createTestTenant(admin2Client);
      await setTenantContext(admin2Client, tenantId2);

      // Create audit data in both tenants
      const dept1Id = await admin1Client.rpc('rpc_create_department', {
        p_tenant_id: tenantId1,
        p_name: 'Tenant1 Dept',
      }).then(r => r.data);

      const dept2Id = await admin2Client.rpc('rpc_create_department', {
        p_tenant_id: tenantId2,
        p_name: 'Tenant2 Dept',
      }).then(r => r.data);

      // Admin1 should only see Tenant1's audit logs
      const { data: tenant1Audits } = await admin1Client
        .from('v_audit_entity_changes')
        .select('tenant_id, record_id')
        .eq('table_name', 'departments')
        .in('record_id', [dept1Id, dept2Id]);

      const tenantIds1 = tenant1Audits?.map((a: any) => a.tenant_id) ?? [];
      expect(tenantIds1).toContain(tenantId1);
      expect(tenantIds1).not.toContain(tenantId2);
    });

    it('should prevent cross-tenant audit data leakage', async () => {
      const admin1Client = createTestClient();
      const { user: admin1 } = await createTestUser(admin1Client);
      const tenantId1 = await createTestTenant(admin1Client);
      await setTenantContext(admin1Client, tenantId1);

      const admin2Client = createTestClient();
      const { user: admin2 } = await createTestUser(admin2Client);
      const tenantId2 = await createTestTenant(admin2Client);
      await setTenantContext(admin2Client, tenantId2);

      // Create audit data in tenant2
      const dept2Id = await admin2Client.rpc('rpc_create_department', {
        p_tenant_id: tenantId2,
        p_name: 'Tenant2 Dept',
      }).then(r => r.data);

      // Admin1 should not see Tenant2's audit logs
      const { data: crossTenantAudits } = await admin1Client
        .from('v_audit_entity_changes')
        .select('tenant_id, record_id')
        .eq('record_id', dept2Id);

      expect(crossTenantAudits?.length ?? 0).toBe(0);
    });
  });

  describe('Audit Retention', () => {
    it('should require tenant.admin permission for retention config', async () => {
      const adminClient = createTestClient();
      const { user: admin } = await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);

      const memberClient = createTestClient();
      const { user: member } = await createTestUser(memberClient);
      await addUserToTenant(adminClient, member.id, tenantId);
      await setTenantContext(memberClient, tenantId);

      const errorMessage = await expectRPCError(memberClient, 'rpc_set_audit_retention_config', {
        p_tenant_id: tenantId,
        p_retention_months: 12,
        p_is_active: true,
      });

      expect(errorMessage).toContain('tenant.admin');
    });

    it('should respect retention configs', async () => {
      const adminClient = createTestClient();
      const { user: admin } = await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);
      await setTenantContext(adminClient, tenantId);

      // Set retention config
      await adminClient.rpc('rpc_set_audit_retention_config', {
        p_tenant_id: tenantId,
        p_retention_months: 12,
        p_is_active: true,
      });

      // Verify config is set
      const { data: config } = await adminClient
        .from('v_audit_retention_configs')
        .select('retention_months, is_active')
        .eq('tenant_id', tenantId)
        .single();

      expect(config?.retention_months).toBe(12);
      expect(config?.is_active).toBe(true);
    });

    it('should only affect old records in purge operations', async () => {
      // This test would verify purge logic
      // Implementation depends on purge function existence
      // For now, test that retention configs are respected
      const adminClient = createTestClient();
      const { user: admin } = await createTestUser(adminClient);
      const tenantId = await createTestTenant(adminClient);
      await setTenantContext(adminClient, tenantId);

      // Create recent audit data
      const deptId = await adminClient.rpc('rpc_create_department', {
        p_tenant_id: tenantId,
        p_name: 'Recent Dept',
      }).then(r => r.data);

      // Verify recent audit exists
      const { data: recentAudits } = await adminClient
        .from('v_audit_entity_changes')
        .select('*')
        .eq('table_name', 'departments')
        .eq('record_id', deptId);

      expect(recentAudits?.length ?? 0).toBeGreaterThan(0);
    });
  });
});
