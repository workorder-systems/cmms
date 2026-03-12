import type { QueryClient } from '@tanstack/react-query'
import type { DbClient } from '@workorder-systems/sdk'

/** 5 minutes – dashboard metrics change frequently; refresh regularly. */
export const DASHBOARD_STALE_TIME_MS = 1000 * 60 * 5
/** 30 minutes – keep in memory for fast restore. */
export const DASHBOARD_GC_TIME_MS = 1000 * 60 * 30

export const dashboardQueryKeys = {
  metrics: (tenantId: string) => ['dashboard', 'metrics', tenantId] as const,
  mttrMetrics: (tenantId: string) => ['dashboard', 'mttr-metrics', tenantId] as const,
  openWorkOrders: (tenantId: string) => ['dashboard', 'open-work-orders', tenantId] as const,
  overdueWorkOrders: (tenantId: string) => ['dashboard', 'overdue-work-orders', tenantId] as const,
  workOrdersSummary: (tenantId: string) => ['dashboard', 'work-orders-summary', tenantId] as const,
  assetsSummary: (tenantId: string) => ['dashboard', 'assets-summary', tenantId] as const,
  locationsSummary: (tenantId: string) => ['dashboard', 'locations-summary', tenantId] as const,
}

/**
 * When dashboard returns [], it usually means tenant or JWT is out of sync (e.g. tenant_id
 * not in JWT). Sync tenant context and session once, then refetch.
 */
async function dashboardQueryFnWithRecovery<T>(
  client: DbClient,
  queryKey: readonly unknown[],
  listFn: () => Promise<T[]>
): Promise<T[]> {
  const tenantId = typeof queryKey[2] === 'string' ? queryKey[2] : null
  const result = await listFn()
  if (result.length === 0 && tenantId) {
    await client.setTenant(tenantId)
    await client.supabase.auth.refreshSession()
    return listFn()
  }
  return result
}

export const dashboardQueryOptions = {
  metrics: (tenantId: string, client: DbClient) => ({
    queryKey: dashboardQueryKeys.metrics(tenantId),
    queryFn: ({ queryKey }: { queryKey: readonly unknown[] }) =>
      dashboardQueryFnWithRecovery(client, queryKey, () =>
        client.dashboard.getMetrics()
      ),
    staleTime: DASHBOARD_STALE_TIME_MS,
    gcTime: DASHBOARD_GC_TIME_MS,
  }),
  mttrMetrics: (tenantId: string, client: DbClient) => ({
    queryKey: dashboardQueryKeys.mttrMetrics(tenantId),
    queryFn: ({ queryKey }: { queryKey: readonly unknown[] }) =>
      dashboardQueryFnWithRecovery(client, queryKey, () =>
        client.dashboard.getMttrMetrics()
      ),
    staleTime: DASHBOARD_STALE_TIME_MS,
    gcTime: DASHBOARD_GC_TIME_MS,
  }),
  openWorkOrders: (tenantId: string, client: DbClient) => ({
    queryKey: dashboardQueryKeys.openWorkOrders(tenantId),
    queryFn: ({ queryKey }: { queryKey: readonly unknown[] }) =>
      dashboardQueryFnWithRecovery(client, queryKey, () =>
        client.dashboard.listOpenWorkOrders()
      ),
    staleTime: DASHBOARD_STALE_TIME_MS,
    gcTime: DASHBOARD_GC_TIME_MS,
  }),
  overdueWorkOrders: (tenantId: string, client: DbClient) => ({
    queryKey: dashboardQueryKeys.overdueWorkOrders(tenantId),
    queryFn: ({ queryKey }: { queryKey: readonly unknown[] }) =>
      dashboardQueryFnWithRecovery(client, queryKey, () =>
        client.dashboard.listOverdueWorkOrders()
      ),
    staleTime: DASHBOARD_STALE_TIME_MS,
    gcTime: DASHBOARD_GC_TIME_MS,
  }),
  workOrdersSummary: (tenantId: string, client: DbClient) => ({
    queryKey: dashboardQueryKeys.workOrdersSummary(tenantId),
    queryFn: ({ queryKey }: { queryKey: readonly unknown[] }) =>
      dashboardQueryFnWithRecovery(client, queryKey, () =>
        client.dashboard.getWorkOrdersSummary()
      ),
    staleTime: DASHBOARD_STALE_TIME_MS,
    gcTime: DASHBOARD_GC_TIME_MS,
  }),
  assetsSummary: (tenantId: string, client: DbClient) => ({
    queryKey: dashboardQueryKeys.assetsSummary(tenantId),
    queryFn: ({ queryKey }: { queryKey: readonly unknown[] }) =>
      dashboardQueryFnWithRecovery(client, queryKey, () =>
        client.dashboard.getAssetsSummary()
      ),
    staleTime: DASHBOARD_STALE_TIME_MS,
    gcTime: DASHBOARD_GC_TIME_MS,
  }),
  locationsSummary: (tenantId: string, client: DbClient) => ({
    queryKey: dashboardQueryKeys.locationsSummary(tenantId),
    queryFn: ({ queryKey }: { queryKey: readonly unknown[] }) =>
      dashboardQueryFnWithRecovery(client, queryKey, () =>
        client.dashboard.getLocationsSummary()
      ),
    staleTime: DASHBOARD_STALE_TIME_MS,
    gcTime: DASHBOARD_GC_TIME_MS,
  }),
}

/**
 * Prefetch dashboard data for a tenant. Call after setTenant(tenantId).
 * Used in route beforeLoad and ensures dashboard data is ready when the dashboard page mounts.
 */
export async function prefetchDashboard(
  queryClient: QueryClient,
  dbClient: DbClient,
  tenantId: string
): Promise<void> {
  await Promise.all([
    queryClient.prefetchQuery(dashboardQueryOptions.metrics(tenantId, dbClient)),
    queryClient.prefetchQuery(dashboardQueryOptions.mttrMetrics(tenantId, dbClient)),
    queryClient.prefetchQuery(dashboardQueryOptions.openWorkOrders(tenantId, dbClient)),
    queryClient.prefetchQuery(dashboardQueryOptions.overdueWorkOrders(tenantId, dbClient)),
    queryClient.prefetchQuery(dashboardQueryOptions.workOrdersSummary(tenantId, dbClient)),
    queryClient.prefetchQuery(dashboardQueryOptions.assetsSummary(tenantId, dbClient)),
    queryClient.prefetchQuery(dashboardQueryOptions.locationsSummary(tenantId, dbClient)),
  ])
}
