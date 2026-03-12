import * as React from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ClipboardList, Package, ChevronRight } from 'lucide-react'
import { getDbClient } from '../lib/db-client'
import { useTenant } from '../contexts/tenant'
import { ensureTenantContextWithCatalogs } from '../lib/route-loaders'
import { DASHBOARD_TENANT_STORAGE_KEY } from '../lib/tenant-storage'
import {
  dashboardMetricsQueryKey,
  dashboardMttrQueryKey,
  dashboardOpenWorkOrdersQueryKey,
  dashboardOverdueWorkOrdersQueryKey,
  dashboardWorkOrdersByStatusQueryKey,
  dashboardWorkOrdersByTypeQueryKey,
  dashboardAssetsSummaryQueryKey,
  prefetchDashboardData,
} from '../lib/dashboard-queries'
import { BentoGrid, BentoGridItem } from '@workspace/ui/components/BentoGrid'
import { DataChart } from '@workspace/ui/components/data-chart'
import { PriorityBadge } from '../components/priority-badge'
import { StatusBadge } from '../components/status-badge'
import { catalogQueryOptions } from '../lib/catalog-queries'

export const Route = createFileRoute('/_protected/dashboard/')({
  beforeLoad: async ({ context }) => ensureTenantContextWithCatalogs(context),
  loader: async ({ context }) => {
    if (typeof window === 'undefined') return
    const tenantId = window.localStorage.getItem(DASHBOARD_TENANT_STORAGE_KEY)
    if (!tenantId) return
    await prefetchDashboardData(context.queryClient, context.dbClient, tenantId)
  },
  component: DashboardPage,
})

function formatDueDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function DashboardPage() {
  const { activeTenantId } = useTenant()
  const client = getDbClient()

  const { data: metrics = [] } = useQuery({
    queryKey: dashboardMetricsQueryKey(activeTenantId),
    queryFn: () => client.dashboard.getMetrics(),
    enabled: !!activeTenantId,
  })
  const { data: mttrRows = [] } = useQuery({
    queryKey: dashboardMttrQueryKey(activeTenantId),
    queryFn: () => client.dashboard.getMttrMetrics(),
    enabled: !!activeTenantId,
  })
  const { data: openWorkOrders = [] } = useQuery({
    queryKey: dashboardOpenWorkOrdersQueryKey(activeTenantId),
    queryFn: () => client.dashboard.listOpenWorkOrders(),
    enabled: !!activeTenantId,
  })
  const { data: overdueWorkOrders = [] } = useQuery({
    queryKey: dashboardOverdueWorkOrdersQueryKey(activeTenantId),
    queryFn: () => client.dashboard.listOverdueWorkOrders(),
    enabled: !!activeTenantId,
  })
  const { data: byStatus = [] } = useQuery({
    queryKey: dashboardWorkOrdersByStatusQueryKey(activeTenantId),
    queryFn: () => client.dashboard.listWorkOrdersByStatus(),
    enabled: !!activeTenantId,
  })
  const { data: byType = [] } = useQuery({
    queryKey: dashboardWorkOrdersByTypeQueryKey(activeTenantId),
    queryFn: () => client.dashboard.listWorkOrdersByMaintenanceType(),
    enabled: !!activeTenantId,
  })
  const { data: assetsSummary = [] } = useQuery({
    queryKey: dashboardAssetsSummaryQueryKey(activeTenantId),
    queryFn: () => client.dashboard.getAssetsSummary(),
    enabled: !!activeTenantId,
  })
  const { data: statusCatalog = [] } = useQuery({
    ...catalogQueryOptions.statuses(activeTenantId ?? '', client),
    enabled: !!activeTenantId,
  })
  const { data: priorityCatalog = [] } = useQuery({
    ...catalogQueryOptions.priorities(activeTenantId ?? '', client),
    enabled: !!activeTenantId,
  })

  const metric = metrics[0]
  const mttr = mttrRows[0]
  const totalAssets = assetsSummary.reduce((sum, r) => sum + (r.count ?? 0), 0)
  const statusChartData = byStatus.map((r) => ({
    status: r.status ?? '—',
    count: r.count ?? 0,
  }))
  const typeChartData = byType.map((r) => ({
    type: r.maintenance_type ?? r.category ?? '—',
    count: r.count ?? 0,
  }))
  const statusOptions = statusCatalog
    .filter((s) => s.entity_type === 'work_order')
    .map((s) => ({ key: s.key, name: s.name ?? s.key, color: s.color ?? null }))
  const priorityOptions = priorityCatalog.map((p) => ({
    key: p.key,
    name: p.name ?? p.key,
    color: p.color ?? null,
  }))

  const openPreview = openWorkOrders.slice(0, 6)
  const overduePreview = overdueWorkOrders.slice(0, 6)

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <BentoGrid
        cols={{ base: 2, md: 3, lg: 4 }}
        rowHeight={{ base: '80px', md: '100px', lg: '120px' }}
      >
        {/* Hero: work orders by status (bar chart – categorical data) */}
        <BentoGridItem colSpan={2} rowSpan={2} className="items-stretch justify-start text-left">
          <div className="flex h-full w-full flex-col overflow-hidden p-1">
            <p className="mb-1 text-sm font-medium text-foreground">Work orders by status</p>
            <div className="min-h-0 flex-1">
              {statusChartData.length === 0 ? (
                <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
                  No data
                </div>
              ) : (
                <DataChart
                  type="bar"
                  data={statusChartData}
                  categoryKey="status"
                  valueKeys={['count']}
                  valueLabels={{ count: 'Count' }}
                  height={220}
                  className="h-full"
                />
              )}
            </div>
          </div>
        </BentoGridItem>

        <BentoGridItem className="flex flex-col items-center justify-center gap-0.5">
          <span className="text-2xl font-semibold tabular-nums tracking-tight">{metric?.open_count ?? 0}</span>
          <span className="text-muted-foreground text-xs font-medium">Open</span>
        </BentoGridItem>
        <BentoGridItem className="flex flex-col items-center justify-center gap-0.5">
          <span className="text-2xl font-semibold tabular-nums tracking-tight">{metric?.overdue_count ?? 0}</span>
          <span className="text-muted-foreground text-xs font-medium">Overdue</span>
        </BentoGridItem>

        {/* Open work orders list */}
        <BentoGridItem rowSpan={2} colSpan={2} className="items-stretch justify-start text-left">
          <div className="flex h-full w-full flex-col overflow-hidden p-1">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Open work orders</span>
              <Link
                to="/dashboard/workorders"
                className="text-muted-foreground hover:text-foreground flex items-center gap-0.5 text-xs"
              >
                View all <ChevronRight className="size-3.5" />
              </Link>
            </div>
            <ul className="flex-1 space-y-1 overflow-y-auto pr-1">
              {openPreview.length === 0 ? (
                <li className="text-muted-foreground text-sm">No open work orders</li>
              ) : (
                openPreview.map((wo) => (
                  <li key={wo.id}>
                    <Link
                      to="/dashboard/workorders/$id"
                      params={{ id: wo.id ?? '' }}
                      className="hover:bg-muted/50 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors"
                    >
                      <ClipboardList className="text-muted-foreground shrink-0 size-4" />
                      <span className="min-w-0 flex-1 truncate font-medium">{wo.title ?? 'Untitled'}</span>
                      <PriorityBadge priorityKey={wo.priority} priorityCatalog={priorityOptions} variant="badge" />
                      <span className="text-muted-foreground shrink-0 text-xs">{formatDueDate(wo.due_date)}</span>
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </div>
        </BentoGridItem>

        <BentoGridItem className="flex flex-col items-center justify-center gap-0.5">
          <span className="text-2xl font-semibold tabular-nums tracking-tight">
            {metric?.completed_last_30_days ?? 0}
          </span>
          <span className="text-muted-foreground text-xs font-medium">Completed (30d)</span>
        </BentoGridItem>
        <BentoGridItem className="flex flex-col items-center justify-center gap-0.5">
          <span className="text-2xl font-semibold tabular-nums tracking-tight">
            {mttr?.mttr_hours != null ? mttr.mttr_hours.toFixed(1) : '—'}
          </span>
          <span className="text-muted-foreground text-xs font-medium">MTTR (hrs)</span>
        </BentoGridItem>

        {/* Work orders by maintenance type (bar) */}
        <BentoGridItem colSpan={2} rowSpan={2} className="items-stretch justify-start text-left">
          <div className="flex h-full w-full flex-col overflow-hidden p-1">
            <p className="text-sm font-medium text-foreground">Work orders by maintenance type</p>
            <div className="min-h-0 flex-1">
              {typeChartData.length === 0 ? (
                <div className="text-muted-foreground flex h-full items-center justify-center text-sm">No data</div>
              ) : (
                <DataChart
                  type="bar"
                  data={typeChartData}
                  categoryKey="type"
                  valueKeys={['count']}
                  valueLabels={{ count: 'Count' }}
                  height={180}
                  className="h-full"
                />
              )}
            </div>
          </div>
        </BentoGridItem>

        <BentoGridItem className="flex flex-col items-center justify-center gap-0.5">
          <span className="text-2xl font-semibold tabular-nums tracking-tight">
            {metric?.total_assets ?? totalAssets ?? 0}
          </span>
          <span className="text-muted-foreground text-xs font-medium">Assets</span>
        </BentoGridItem>
        <BentoGridItem className="flex flex-col items-center justify-center gap-0.5">
          <span className="text-2xl font-semibold tabular-nums tracking-tight">{metric?.total_locations ?? 0}</span>
          <span className="text-muted-foreground text-xs font-medium">Locations</span>
        </BentoGridItem>

        {/* Overdue work orders list */}
        <BentoGridItem rowSpan={2} colSpan={2} className="items-stretch justify-start text-left">
          <div className="flex h-full w-full flex-col overflow-hidden p-1">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Overdue work orders</span>
              <Link
                to="/dashboard/workorders"
                className="text-muted-foreground hover:text-foreground flex items-center gap-0.5 text-xs"
              >
                View all <ChevronRight className="size-3.5" />
              </Link>
            </div>
            <ul className="flex-1 space-y-1 overflow-y-auto pr-1">
              {overduePreview.length === 0 ? (
                <li className="text-muted-foreground text-sm">No overdue work orders</li>
              ) : (
                overduePreview.map((wo) => (
                  <li key={wo.id}>
                    <Link
                      to="/dashboard/workorders/$id"
                      params={{ id: wo.id ?? '' }}
                      className="hover:bg-muted/50 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors"
                    >
                      <ClipboardList className="text-muted-foreground shrink-0 size-4" />
                      <span className="min-w-0 flex-1 truncate font-medium">{wo.title ?? 'Untitled'}</span>
                      <PriorityBadge priorityKey={wo.priority} priorityCatalog={priorityOptions} variant="badge" />
                      <span className="text-muted-foreground shrink-0 text-xs">{formatDueDate(wo.due_date)}</span>
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </div>
        </BentoGridItem>

        {/* Work orders by maintenance type (pie) */}
        <BentoGridItem colSpan={2} rowSpan={2} className="items-stretch justify-start text-left">
          <div className="flex h-full w-full flex-col overflow-hidden p-1">
            <p className="text-sm font-medium text-foreground">By maintenance type</p>
            <div className="min-h-0 flex-1">
              {typeChartData.length === 0 ? (
                <div className="text-muted-foreground flex h-full items-center justify-center text-sm">No data</div>
              ) : (
                <DataChart
                  type="pie"
                  data={typeChartData}
                  categoryKey="type"
                  valueKeys={['count']}
                  valueLabels={{ count: 'Work orders' }}
                  height={200}
                  className="h-full"
                />
              )}
            </div>
          </div>
        </BentoGridItem>

        <BentoGridItem className="p-0">
          <Link
            to="/dashboard/workorders"
            className="hover:bg-muted/50 flex h-full w-full flex-col items-center justify-center gap-1 transition-colors"
          >
            <ClipboardList className="text-muted-foreground size-6" />
            <span className="text-sm font-medium">Work orders</span>
          </Link>
        </BentoGridItem>
        <BentoGridItem className="p-0">
          <Link
            to="/dashboard/assets"
            className="hover:bg-muted/50 flex h-full w-full flex-col items-center justify-center gap-1 transition-colors"
          >
            <Package className="text-muted-foreground size-6" />
            <span className="text-sm font-medium">Assets</span>
          </Link>
        </BentoGridItem>
      </BentoGrid>
    </div>
  )
}
