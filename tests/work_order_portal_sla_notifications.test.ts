import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient, waitForSupabase } from './helpers/supabase';
import { createTestUser, signInTestUser, TEST_PASSWORD } from './helpers/auth';
import { createTestTenant, addUserToTenant, assignRoleToUser, setTenantContext } from './helpers/tenant';
import { createTestWorkOrder } from './helpers/entities';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Work order portal, SLA, and notifications', () => {
  let client: SupabaseClient;

  beforeAll(async () => {
    await waitForSupabase();
    client = createTestClient();
  });

  it('should set SLA due timestamps when creating a work order', async () => {
    await createTestUser(client);
    const tenantId = await createTestTenant(client);
    const woId = await createTestWorkOrder(client, tenantId, 'SLA WO', undefined, 'high');

    await setTenantContext(client, tenantId);
    const { data: rows, error } = await client
      .from('v_work_order_sla_status')
      .select('work_order_id, sla_response_due_at, sla_resolution_due_at')
      .eq('work_order_id', woId)
      .maybeSingle();

    expect(error).toBeNull();
    expect(rows?.sla_response_due_at).toBeTruthy();
    expect(rows?.sla_resolution_due_at).toBeTruthy();
  });

  it('should allow requestor to create and see only own requests', async () => {
    const adminClient = createTestClient();
    await createTestUser(adminClient);
    const tenantId = await createTestTenant(adminClient);

    const requestorClient = createTestClient();
    const reqEmail = `requestor-${Date.now()}@example.test`;
    await createTestUser(requestorClient, reqEmail);

    const { error: inviteErr } = await adminClient.rpc('rpc_invite_user_to_tenant', {
      p_tenant_id: tenantId,
      p_invitee_email: reqEmail,
      p_role_key: 'requestor',
    });
    expect(inviteErr).toBeNull();

    await signInTestUser(requestorClient, reqEmail, TEST_PASSWORD);
    await setTenantContext(requestorClient, tenantId);

    const { data: woId, error: rpcErr } = await requestorClient.rpc(
      'rpc_create_work_order_request',
      {
        p_tenant_id: tenantId,
        p_title: 'Leak in restroom',
        p_description: 'Water pooling',
        p_priority: 'medium',
      }
    );

    expect(rpcErr).toBeNull();
    expect(woId).toBeTruthy();

    const { data: mine, error: myErr } = await requestorClient
      .from('v_my_work_order_requests')
      .select('id')
      .eq('id', woId as string);

    expect(myErr).toBeNull();
    expect(mine?.length).toBe(1);

    await createTestWorkOrder(adminClient, tenantId, 'Staff WO');

    await setTenantContext(requestorClient, tenantId);
    const { data: allVisible, error: allErr } = await requestorClient
      .from('v_work_orders')
      .select('id');

    expect(allErr).toBeNull();
    const ids = (allVisible ?? []).map((r) => r.id);
    expect(ids).toContain(woId as string);
    expect(ids.length).toBe(1);
  });

  it('should notify assignee when rpc_assign_work_order is used', async () => {
    const adminClient = createTestClient();
    await createTestUser(adminClient);
    const tenantId = await createTestTenant(adminClient);

    const techClient = createTestClient();
    const techEmail = `tech-${Date.now()}@example.test`;
    const { user: tech } = await createTestUser(techClient, techEmail);
    await addUserToTenant(adminClient, tech.id, tenantId);
    await assignRoleToUser(adminClient, tech.id, tenantId, 'technician');

    const woId = await createTestWorkOrder(adminClient, tenantId, 'Assignable');

    await signInTestUser(techClient, techEmail, TEST_PASSWORD);
    await setTenantContext(techClient, tenantId);

    const { error: assignErr } = await adminClient.rpc('rpc_assign_work_order', {
      p_tenant_id: tenantId,
      p_work_order_id: woId,
      p_assigned_to: tech.id,
    });

    expect(assignErr).toBeNull();

    const { data: notes, error: nErr } = await techClient.rpc('rpc_list_my_notifications', {
      p_tenant_id: tenantId,
      p_limit: 20,
    });

    expect(nErr).toBeNull();
    const list = (notes ?? []) as { event_key: string }[];
    expect(list.some((n) => n.event_key === 'work_order.assigned')).toBe(true);
  });
});
