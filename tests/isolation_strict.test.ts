import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient, waitForSupabase } from './helpers/supabase';
import { createTestUser } from './helpers/auth';
import {
  createTestTenant,
  addUserToTenant,
  setTenantContext,
} from './helpers/tenant';
import {
  createTestLocation,
  createTestDepartment,
  createTestAsset,
  createTestWorkOrder,
} from './helpers/entities';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Strict tenant isolation (public views)', () => {
  let adminClientA: SupabaseClient;
  let adminClientB: SupabaseClient;
  let multiTenantClient: SupabaseClient;
  let tenantA: string;
  let tenantB: string;

  let locationA: string;
  let locationB: string;
  let departmentA: string;
  let departmentB: string;
  let assetA: string;
  let assetB: string;
  let workOrderA: string;
  let workOrderB: string;

  beforeAll(async () => {
    await waitForSupabase();

    adminClientA = createTestClient();
    await createTestUser(adminClientA);
    tenantA = await createTestTenant(adminClientA);
    await setTenantContext(adminClientA, tenantA);

    adminClientB = createTestClient();
    await createTestUser(adminClientB);
    tenantB = await createTestTenant(adminClientB);
    await setTenantContext(adminClientB, tenantB);

    locationA = await createTestLocation(adminClientA, tenantA, 'Location A');
    locationB = await createTestLocation(adminClientB, tenantB, 'Location B');
    departmentA = await createTestDepartment(adminClientA, tenantA, 'Dept A');
    departmentB = await createTestDepartment(adminClientB, tenantB, 'Dept B');
    assetA = await createTestAsset(adminClientA, tenantA, 'Asset A', locationA, departmentA);
    assetB = await createTestAsset(adminClientB, tenantB, 'Asset B', locationB, departmentB);
    workOrderA = await createTestWorkOrder(adminClientA, tenantA, 'Work Order A');
    workOrderB = await createTestWorkOrder(adminClientB, tenantB, 'Work Order B');

    multiTenantClient = createTestClient();
    const { user: multiTenantUser } = await createTestUser(multiTenantClient);
    await addUserToTenant(adminClientA, multiTenantUser.id, tenantA);
    await addUserToTenant(adminClientB, multiTenantUser.id, tenantB);
  });

  it('returns no tenant-scoped data without tenant context', async () => {
    const { data: locations, error } = await multiTenantClient
      .from('v_locations')
      .select('id')
      .in('id', [locationA, locationB]);

    expect(error).toBeNull();
    expect(locations.length).toBe(0);
  });

  it('returns only tenant A data when context is tenant A', async () => {
    await setTenantContext(multiTenantClient, tenantA);

    const { data: locations } = await multiTenantClient
      .from('v_locations')
      .select('id')
      .in('id', [locationA, locationB]);

    const { data: departments } = await multiTenantClient
      .from('v_departments')
      .select('id, tenant_id')
      .in('id', [departmentA, departmentB]);

    const { data: assets } = await multiTenantClient
      .from('v_assets')
      .select('id')
      .in('id', [assetA, assetB]);

    const { data: workOrders } = await multiTenantClient
      .from('v_work_orders')
      .select('id')
      .in('id', [workOrderA, workOrderB]);

    expect(locations.length).toBe(1);
    expect(locations[0].id).toBe(locationA);

    expect(departments.length).toBe(1);
    expect(departments[0].id).toBe(departmentA);
    expect(departments[0].tenant_id).toBe(tenantA);

    expect(assets.length).toBe(1);
    expect(assets[0].id).toBe(assetA);

    expect(workOrders.length).toBe(1);
    expect(workOrders[0].id).toBe(workOrderA);
  });

  it('returns only tenant B data when context is tenant B', async () => {
    await setTenantContext(multiTenantClient, tenantB);

    const { data: locations } = await multiTenantClient
      .from('v_locations')
      .select('id')
      .in('id', [locationA, locationB]);

    const { data: departments } = await multiTenantClient
      .from('v_departments')
      .select('id, tenant_id')
      .in('id', [departmentA, departmentB]);

    const { data: assets } = await multiTenantClient
      .from('v_assets')
      .select('id')
      .in('id', [assetA, assetB]);

    const { data: workOrders } = await multiTenantClient
      .from('v_work_orders')
      .select('id')
      .in('id', [workOrderA, workOrderB]);

    expect(locations.length).toBe(1);
    expect(locations[0].id).toBe(locationB);

    expect(departments.length).toBe(1);
    expect(departments[0].id).toBe(departmentB);
    expect(departments[0].tenant_id).toBe(tenantB);

    expect(assets.length).toBe(1);
    expect(assets[0].id).toBe(assetB);

    expect(workOrders.length).toBe(1);
    expect(workOrders[0].id).toBe(workOrderB);
  });

  it('scopes role views to current tenant context', async () => {
    await setTenantContext(multiTenantClient, tenantA);
    const { data: rolesA } = await multiTenantClient
      .from('v_tenant_roles')
      .select('tenant_id');
    expect(rolesA.length).toBeGreaterThan(0);
    expect(rolesA.every(role => role.tenant_id === tenantA)).toBe(true);

    await setTenantContext(multiTenantClient, tenantB);
    const { data: rolesB } = await multiTenantClient
      .from('v_tenant_roles')
      .select('tenant_id');
    expect(rolesB.length).toBeGreaterThan(0);
    expect(rolesB.every(role => role.tenant_id === tenantB)).toBe(true);
  });
});
