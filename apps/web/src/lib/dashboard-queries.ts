import type { QueryClient } from '@tanstack/react-query'
import type { DbClient } from '@workorder-systems/sdk'

/** Query key for dashboard metrics (tenant-level KPIs). */
export function dashboardMetricsQueryKey(tenantId: string | null | undefined) {
  return tenantId ? (['dashboard', 'metrics', tenantId] as const) : (['dashboard', 'metrics'] as const)
}

/** Query key for dashboard MTTR metrics. */
export function dashboardMttrQueryKey(tenantId: string | null | undefined) {
  return tenantId ? (['dashboard', 'mttr', tenantId] as const) : (['dashboard', 'mttr'] as const)
}

/** Query key for open work orders (dashboard list). */
export function dashboardOpenWorkOrdersQueryKey(tenantId: string | null | undefined) {
  return tenantId ? (['dashboard', 'open-work-orders', tenantId] as const) : (['dashboard', 'open-work-orders'] as const)
}

/** Query key for overdue work orders (dashboard list). */
export function dashboardOverdueWorkOrdersQueryKey(tenantId: string | null | undefined) {
  return tenantId ? (['dashboard', 'overdue-work-orders', tenantId] as const) : (['dashboard', 'overdue-work-orders'] as const)
}

/** Query key for work orders by status. */
export function dashboardWorkOrdersByStatusQueryKey(tenantId: string | null | undefined) {
  return tenantId ? (['dashboard', 'work-orders-by-status', tenantId] as const) : (['dashboard', 'work-orders-by-status'] as const)
}

/** Query key for work orders by maintenance type. */
export function dashboardWorkOrdersByTypeQueryKey(tenantId: string | null | undefined) {
  return tenantId ? (['dashboard', 'work-orders-by-type', tenantId] as const) : (['dashboard', 'work-orders-by-type'] as const)
}

/** Query key for assets summary. */
export function dashboardAssetsSummaryQueryKey(tenantId: string | null | undefined) {
  return tenantId ? (['dashboard', 'assets-summary', tenantId] as const) : (['dashboard', 'assets-summary'] as const)
}

/** Prefetch all dashboard data used on the home page. */
export async function prefetchDashboardData(
  queryClient: QueryClient,
  dbClient: DbClient,
  tenantId: string
) {
  const dashboard = dbClient.dashboard
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: dashboardMetricsQueryKey(tenantId),
      queryFn: () => dashboard.getMetrics(),
    }),
    queryClient.prefetchQuery({
      queryKey: dashboardMttrQueryKey(tenantId),
      queryFn: () => dashboard.getMttrMetrics(),
    }),
    queryClient.prefetchQuery({
      queryKey: dashboardOpenWorkOrdersQueryKey(tenantId),
      queryFn: () => dashboard.listOpenWorkOrders(),
    }),
    queryClient.prefetchQuery({
      queryKey: dashboardOverdueWorkOrdersQueryKey(tenantId),
      queryFn: () => dashboard.listOverdueWorkOrders(),
    }),
    queryClient.prefetchQuery({
      queryKey: dashboardWorkOrdersByStatusQueryKey(tenantId),
      queryFn: () => dashboard.listWorkOrdersByStatus(),
    }),
    queryClient.prefetchQuery({
      queryKey: dashboardWorkOrdersByTypeQueryKey(tenantId),
      queryFn: () => dashboard.listWorkOrdersByMaintenanceType(),
    }),
    queryClient.prefetchQuery({
      queryKey: dashboardAssetsSummaryQueryKey(tenantId),
      queryFn: () => dashboard.getAssetsSummary(),
    }),
  ])
}
