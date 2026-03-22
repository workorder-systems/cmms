/**
 * Labor writes: crews, technicians, crew members via public RPCs.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient, waitForSupabase } from './helpers/supabase';
import { createTestUser } from './helpers/auth';
import { createTestTenant, assignRoleToUser, setTenantContext } from './helpers/tenant';
import { shortSlug } from './helpers/faker';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Labor write RPCs', () => {
  let client: SupabaseClient;

  beforeAll(async () => {
    await waitForSupabase();
    client = createTestClient();
  });

  it('should create crew, technician for member, add and remove crew member', async () => {
    const adminClient = createTestClient();
    await createTestUser(adminClient);
    const tenantId = await createTestTenant(adminClient);

    const { data: crewId, error: crewErr } = await adminClient.rpc('rpc_create_crew', {
      p_tenant_id: tenantId,
      p_name: `Crew ${shortSlug()}`,
      p_description: 'Test crew',
    });
    expect(crewErr).toBeNull();
    expect(crewId).toBeDefined();

    const memberClient = createTestClient();
    const { user: memberUser } = await createTestUser(memberClient);
    await assignRoleToUser(adminClient, memberUser.id, tenantId, 'member');
    await setTenantContext(memberClient, tenantId);

    const { data: techId, error: techErr } = await adminClient.rpc('rpc_create_technician', {
      p_tenant_id: tenantId,
      p_user_id: memberUser.id,
      p_employee_number: `E-${shortSlug()}`,
      p_default_crew_id: crewId,
      p_department_id: null,
    });
    expect(techErr).toBeNull();
    expect(techId).toBeDefined();

    const { error: addMemErr } = await adminClient.rpc('rpc_add_crew_member', {
      p_tenant_id: tenantId,
      p_crew_id: crewId,
      p_technician_id: techId,
      p_role: 'tech',
    });
    expect(addMemErr).toBeNull();

    const { data: members } = await adminClient
      .from('v_crew_members')
      .select('technician_id, left_at')
      .eq('crew_id', crewId)
      .eq('technician_id', techId);
    expect(members?.some((m) => m.left_at === null)).toBe(true);

    const { error: rmErr } = await adminClient.rpc('rpc_remove_crew_member', {
      p_tenant_id: tenantId,
      p_crew_id: crewId,
      p_technician_id: techId,
    });
    expect(rmErr).toBeNull();

    const { data: membersAfter } = await adminClient
      .from('v_crew_members')
      .select('left_at')
      .eq('crew_id', crewId)
      .eq('technician_id', techId);
    expect(membersAfter?.every((m) => m.left_at !== null)).toBe(true);
  });

  it('should reject rpc_create_technician for user not in tenant', async () => {
    const adminClient = createTestClient();
    await createTestUser(adminClient);
    const tenantId = await createTestTenant(adminClient);

    const outsiderClient = createTestClient();
    const { user: outsider } = await createTestUser(outsiderClient);

    const { error } = await adminClient.rpc('rpc_create_technician', {
      p_tenant_id: tenantId,
      p_user_id: outsider.id,
      p_employee_number: null,
      p_default_crew_id: null,
      p_department_id: null,
    });
    expect(error).not.toBeNull();
  });

  it('should reject duplicate technician per user and tenant', async () => {
    const adminClient = createTestClient();
    await createTestUser(adminClient);
    const tenantId = await createTestTenant(adminClient);

    const memberClient = createTestClient();
    const { user: memberUser } = await createTestUser(memberClient);
    await assignRoleToUser(adminClient, memberUser.id, tenantId, 'member');

    const { error: e1 } = await adminClient.rpc('rpc_create_technician', {
      p_tenant_id: tenantId,
      p_user_id: memberUser.id,
      p_employee_number: null,
      p_default_crew_id: null,
      p_department_id: null,
    });
    expect(e1).toBeNull();

    const { error: e2 } = await adminClient.rpc('rpc_create_technician', {
      p_tenant_id: tenantId,
      p_user_id: memberUser.id,
      p_employee_number: 'dup',
      p_default_crew_id: null,
      p_department_id: null,
    });
    expect(e2).not.toBeNull();
  });

  it('should deny labor.crew.manage to member', async () => {
    const adminClient = createTestClient();
    await createTestUser(adminClient);
    const tenantId = await createTestTenant(adminClient);

    const memberClient = createTestClient();
    const { user: memberUser } = await createTestUser(memberClient);
    await assignRoleToUser(adminClient, memberUser.id, tenantId, 'member');
    await setTenantContext(memberClient, tenantId);

    const { error } = await memberClient.rpc('rpc_create_crew', {
      p_tenant_id: tenantId,
      p_name: 'No perm',
      p_description: null,
    });
    expect(error).not.toBeNull();
  });
});
