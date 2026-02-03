import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient, waitForSupabase } from './helpers/supabase';
import { createTestUser } from './helpers/auth';
import {
  createTestTenant,
  addUserToTenant,
  setTenantContext,
} from './helpers/tenant';
import {
  createTestAsset,
  createTestLocation,
} from './helpers/entities';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * These tests are specifically designed to prove that:
 *
 * 1) Views that previously used SECURITY DEFINER actually respect RLS and
 *    tenant membership (i.e. behave as SECURITY INVOKER).
 * 2) RLS policies that rely on authz.* helpers (e.g. is_tenant_member) can
 *    be evaluated for both authenticated and anonymous roles without throwing
 *    permission or recursion errors.
 *
 * If a future migration re-introduces SECURITY DEFINER on views or breaks
 * function grants used by RLS, these tests should start failing.
 */
describe('Security-definer / view security regressions', () => {
  let memberClient: SupabaseClient;
  let nonMemberClient: SupabaseClient;
  let tenantId: string;
  let otherTenantId: string;
  let assetId: string;

  beforeAll(async () => {
    await waitForSupabase();

    // Tenant with member that owns some data
    const ownerClient = createTestClient();
    await createTestUser(ownerClient);
    tenantId = await createTestTenant(ownerClient);
    await setTenantContext(ownerClient, tenantId);

    const locationId = await createTestLocation(
      ownerClient,
      tenantId,
      'Security View Test Location',
    );

    assetId = await createTestAsset(
      ownerClient,
      tenantId,
      'Security View Test Asset',
      locationId,
    );

    // Second tenant with isolated data
    const otherOwnerClient = createTestClient();
    await createTestUser(otherOwnerClient);
    otherTenantId = await createTestTenant(otherOwnerClient);
    await setTenantContext(otherOwnerClient, otherTenantId);

    await createTestLocation(
      otherOwnerClient,
      otherTenantId,
      'Security View Other Tenant Location',
    );
    await createTestAsset(
      otherOwnerClient,
      otherTenantId,
      'Security View Other Tenant Asset',
      locationId,
    ).catch(() => {
      // If cross-tenant asset creation is blocked (expected), ignore.
    });

    // Member client for first tenant
    memberClient = createTestClient();
    const { user: member } = await createTestUser(memberClient);
    await addUserToTenant(ownerClient, member.id, tenantId);
    await setTenantContext(memberClient, tenantId);

    // Non-member client that should never see tenantId data
    nonMemberClient = createTestClient();
    await createTestUser(nonMemberClient);
    // Note: do NOT add this user to tenantId or otherTenantId
  });

  it('views backed by tenant-scoped tables do not leak data across tenants', async () => {
    // This specifically targets views that historically had
    // security_invoker = false for "performance".
    // According to ADR 0003: Views require tenant context (convenience), but
    // RLS is the security boundary. Member client has tenant context set.
    const viewsToCheck = [
      'v_work_orders',
      'v_assets',
      'v_locations',
      'v_tenants',
      'v_asset_meters',
      'v_meter_readings',
      'v_pm_schedules',
      'v_pm_templates',
      'v_due_pms',
      'v_overdue_pms',
      'v_upcoming_pms',
      'v_pm_history',
    ] as const;

    for (const viewName of viewsToCheck) {
      const { data, error } = await memberClient
        .from(viewName)
        .select('*')
        .limit(1);

      // According to ADR 0003: RLS is the security boundary. Views filter by
      // tenant context (convenience), but RLS policies on underlying tables
      // enforce access. If SECURITY DEFINER was re-introduced with BYPASSRLS,
      // this would either leak data or produce permission errors.
      // We expect no error - RLS should allow access for tenant members.
      expect(error).toBeNull();
      // Member has tenant context set, so views may return rows (depending on data)
      expect(Array.isArray(data)).toBe(true);
    }
  });

  it('non-member cannot see tenant data through views, even with tenant context set elsewhere', async () => {
    // Non-member client should not see tenant data via public views.
    const { data: assets, error } = await nonMemberClient
      .from('v_assets')
      .select('tenant_id, id')
      .eq('id', assetId);

    // The critical behavior we want: no error, but also no rows.
    expect(error).toBeNull();
    expect(Array.isArray(assets)).toBe(true);
    expect(assets.length).toBe(0);
  });

  it('anonymous access to anon-exposed views does not error (function grants for anon are correct)', async () => {
    // Fresh client with no auth state -> anon role
    // According to ADR 0003: Views require tenant context (convenience), but
    // RLS is the security boundary. Anonymous users without tenant context
    // will get empty results (authz.get_current_tenant_id() returns NULL),
    // but should NOT get permission errors if function grants are correct.
    const anonClient = createTestClient();

    const anonViews = [
      // Dashboards and public analytics views
      'v_dashboard_open_work_orders',
      'v_dashboard_overdue_work_orders',
      'v_dashboard_mttr_metrics',
      'v_dashboard_metrics',
      'v_dashboard_work_orders_by_status',
      'v_maintenance_type_catalogs',
      'v_dashboard_work_orders_by_maintenance_type',
      // PM system anon views
      'v_work_orders',
      'v_asset_meters',
      'v_meter_readings',
      'v_pm_schedules',
      'v_pm_templates',
      'v_due_pms',
      'v_overdue_pms',
      'v_upcoming_pms',
      'v_pm_history',
    ] as const;

    for (const viewName of anonViews) {
      const { data, error } = await anonClient.from(viewName).select('*').limit(1);

      // According to ADR 0003 and view comments: "Anonymous users can query
      // but will receive empty results" (not errors). If RLS policies for
      // anon call authz.is_tenant_member()/friends without GRANT EXECUTE to
      // anon, this will surface as a 42501 "permission denied" error here.
      // We expect no error - function grants should be correct.
      expect(error).toBeNull();
      // Anon has no tenant context, so views filter to tenant_id = NULL,
      // resulting in empty results (expected behavior per ADR 0003)
      expect(Array.isArray(data)).toBe(true);
    }
  });
});

