/**
 * Projects: public RPCs (rpc_create_project, rpc_update_project, rpc_delete_project).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient, waitForSupabase } from './helpers/supabase';
import { createTestUser } from './helpers/auth';
import { createTestTenant, setTenantContext, assignRoleToUser } from './helpers/tenant';
import { shortSlug } from './helpers/faker';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Projects RPCs', () => {
  let client: SupabaseClient;

  beforeAll(async () => {
    await waitForSupabase();
    client = createTestClient();
  });

  it('should create, update, delete project and see v_projects', async () => {
    await createTestUser(client);
    const tenantId = await createTestTenant(client);

    const code = `PRJ-${shortSlug()}`;
    const { data: projectId, error: createErr } = await client.rpc('rpc_create_project', {
      p_tenant_id: tenantId,
      p_name: 'Capital HVAC',
      p_code: code,
      p_description: 'Roll-up',
    });
    expect(createErr).toBeNull();
    expect(projectId).toBeDefined();

    const { data: row, error: viewErr } = await client
      .from('v_projects')
      .select('id, name, code')
      .eq('id', projectId)
      .maybeSingle();
    expect(viewErr).toBeNull();
    expect(row?.name).toBe('Capital HVAC');
    expect(row?.code).toBe(code);

    const { error: updErr } = await client.rpc('rpc_update_project', {
      p_tenant_id: tenantId,
      p_project_id: projectId,
      p_name: 'Capital HVAC Phase 2',
      p_code: null,
      p_description: null,
    });
    expect(updErr).toBeNull();

    const { data: row2 } = await client.from('v_projects').select('name').eq('id', projectId).single();
    expect(row2?.name).toBe('Capital HVAC Phase 2');

    const { error: delErr } = await client.rpc('rpc_delete_project', {
      p_tenant_id: tenantId,
      p_project_id: projectId,
    });
    expect(delErr).toBeNull();

    const { data: gone } = await client.from('v_projects').select('id').eq('id', projectId).maybeSingle();
    expect(gone).toBeNull();
  });

  it('should reject duplicate project code per tenant', async () => {
    await createTestUser(client);
    const tenantId = await createTestTenant(client);
    const code = `DUP-${shortSlug()}`;

    const { error: e1 } = await client.rpc('rpc_create_project', {
      p_tenant_id: tenantId,
      p_name: 'A',
      p_code: code,
      p_description: null,
    });
    expect(e1).toBeNull();

    const { error: e2 } = await client.rpc('rpc_create_project', {
      p_tenant_id: tenantId,
      p_name: 'B',
      p_code: code,
      p_description: null,
    });
    expect(e2).not.toBeNull();
  });

  it('should deny project.manage to member without permission', async () => {
    const adminClient = createTestClient();
    await createTestUser(adminClient);
    const tenantId = await createTestTenant(adminClient);

    const memberClient = createTestClient();
    const { user: memberUser } = await createTestUser(memberClient);
    await assignRoleToUser(adminClient, memberUser.id, tenantId, 'member');
    await setTenantContext(memberClient, tenantId);

    const { error } = await memberClient.rpc('rpc_create_project', {
      p_tenant_id: tenantId,
      p_name: 'X',
      p_code: null,
      p_description: null,
    });
    expect(error).not.toBeNull();
  });
});
