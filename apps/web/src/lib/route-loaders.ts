import type { QueryClient } from '@tanstack/react-query'
import type { DbClient } from '@workorder-systems/sdk'
import { prefetchCatalogs } from './catalog-queries'
import { DASHBOARD_TENANT_STORAGE_KEY } from './tenant-storage'
import { getTenantIdFromSession } from './tenant-context'

export type DashboardRouteContext = {
  queryClient: QueryClient
  dbClient: DbClient
}

/**
 * Router + Query strategy for a fast feel:
 * - _protected beforeLoad: auth + prefetch tenants (so layout has tenant list).
 * - List/detail routes: beforeLoad sets tenant context and (where needed) prefetches catalogs.
 * - Loaders (work orders list, assets list, work order $id, asset $id): prefetch the main
 *   query into the same cache keys that useQuery uses, so when the route renders the data
 *   is already there (no loading flash). With defaultPreload: 'intent', hovering a link
 *   runs the target route's beforeLoad + loader, so data is often ready before the click.
 * - TanStack Query default staleTime (see query-config) avoids refetches on remount/focus;
 *   after mutations we invalidate/refetch so the UI stays correct.
 */

/**
 * Ensures tenant context is set before loading a dashboard route (SSR-safe).
 * Reads tenant from localStorage. If the session JWT already has that tenant_id
 * (from a previous setTenant + refresh), skips rpc_set_tenant_context and refresh
 * to avoid redundant RPCs. Otherwise calls setTenant then refreshes session.
 * No-op on server or when no tenant is stored.
 */
export async function ensureTenantContext(
  context: DashboardRouteContext
): Promise<void> {
  if (typeof window === 'undefined') return
  const tenantId = window.localStorage.getItem(DASHBOARD_TENANT_STORAGE_KEY)
  if (!tenantId) return
  const { data: { session } } = await context.dbClient.supabase.auth.getSession()
  if (getTenantIdFromSession(session) === tenantId) return
  await context.dbClient.setTenant(tenantId)
  await context.dbClient.supabase.auth.refreshSession()
}

/**
 * Like ensureTenantContext but also prefetches status/priority catalogs.
 * Use for routes that need catalog data (e.g. work orders list/import).
 */
export async function ensureTenantContextWithCatalogs(
  context: DashboardRouteContext
): Promise<void> {
  if (typeof window === 'undefined') return
  const tenantId = window.localStorage.getItem(DASHBOARD_TENANT_STORAGE_KEY)
  if (!tenantId) return
  const { data: { session } } = await context.dbClient.supabase.auth.getSession()
  if (getTenantIdFromSession(session) !== tenantId) {
    await context.dbClient.setTenant(tenantId)
    await context.dbClient.supabase.auth.refreshSession()
  }
  await prefetchCatalogs(context.queryClient, context.dbClient, tenantId)
}
