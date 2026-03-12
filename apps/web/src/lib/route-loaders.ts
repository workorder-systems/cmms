import type { QueryClient } from '@tanstack/react-query'
import type { DbClient } from '@workorder-systems/sdk'
import { prefetchCatalogs } from './catalog-queries'
import { prefetchDashboard } from './dashboard-queries'
import { DASHBOARD_TENANT_STORAGE_KEY } from './tenant-storage'

export type DashboardRouteContext = {
  queryClient: QueryClient
  dbClient: DbClient
}

/**
 * Ensures tenant context is set before loading a dashboard route (SSR-safe).
 * Reads tenant from localStorage, calls setTenant, then refreshes session so JWT
 * carries tenant_id for tenant-scoped views/RPCs.
 * No-op on server or when no tenant is stored.
 */
export async function ensureTenantContext(
  context: DashboardRouteContext
): Promise<void> {
  if (typeof window === 'undefined') return
  const tenantId = window.localStorage.getItem(DASHBOARD_TENANT_STORAGE_KEY)
  if (!tenantId) return
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
  await context.dbClient.setTenant(tenantId)
  await context.dbClient.supabase.auth.refreshSession()
  await prefetchCatalogs(context.queryClient, context.dbClient, tenantId)
}

/**
 * Like ensureTenantContext but also prefetches dashboard data.
 * Use for the dashboard home route.
 */
export async function ensureTenantContextWithDashboard(
  context: DashboardRouteContext
): Promise<void> {
  if (typeof window === 'undefined') return
  const tenantId = window.localStorage.getItem(DASHBOARD_TENANT_STORAGE_KEY)
  if (!tenantId) return
  await context.dbClient.setTenant(tenantId)
  await context.dbClient.supabase.auth.refreshSession()
  await prefetchDashboard(context.queryClient, context.dbClient, tenantId)
}
