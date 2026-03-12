import * as React from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ClipboardList, Clock, AlertTriangle, TrendingUp, Wrench, MapPin } from 'lucide-react'
import { getDbClient } from '../lib/db-client'
import { useTenant } from '../contexts/tenant'
import { ensureTenantContext } from '../lib/route-loaders'
import { dashboardQueryOptions } from '../lib/dashboard-queries'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { DataTable } from '@workspace/ui/components/data-table/data-table'
import { DataTableColumnHeader } from '@workspace/ui/components/data-table/data-table-column-header'
import { DataTableSkeleton } from '@workspace/ui/components/data-table/data-table-skeleton'
import { DataTableErrorMessage } from '../components/data-table-error-message'
import { StatusBadge } from '../components/status-badge'
import { PriorityBadge } from '../components/priority-badge'
import type { ColumnDef } from '@tanstack/react-table'
import { getCoreRowModel, useReactTable } from '@tanstack/react-table'
import type {
  DashboardMetricsRow,
  DashboardMttrMetricsRow,
  DashboardOpenWorkOrdersRow,
  DashboardOverdueWorkOrdersRow,
} from '@workorder-systems/sdk'

import { ensureTenantContextWithDashboard } from '../lib/route-loaders'

export const Route = createFileRoute('/_protected/dashboard/')({
  beforeLoad: async ({ context }) => ensureTenantContextWithDashboard(context),
  component: DashboardPage,
})

function DashboardPage() {
  const { activeTenantId } = useTenant()
  const client = getDbClient()

  const { data: metrics = [], isLoading: metricsLoading } = useQuery({
    ...dashboardQueryOptions.metrics(activeTenantId ?? '', client),
    enabled: !!activeTenantId,
  })

  const { data: mttrMetrics = [], isLoading: mttrLoading } = useQuery({
    ...dashboardQueryOptions.mttrMetrics(activeTenantId ?? '', client),
    enabled: !!activeTenantId,
  })

  const { data: openWorkOrders = [], isLoading: openLoading } = useQuery({
    ...dashboardQueryOptions.openWorkOrders(activeTenantId ?? '', client),
    enabled: !!activeTenantId,
  })

  const { data: overdueWorkOrders = [], isLoading: overdueLoading } = useQuery({
    ...dashboardQueryOptions.overdueWorkOrders(activeTenantId ?? '', client),
    enabled: !!activeTenantId,
  })

  const { data: workOrdersSummary = [] } = useQuery({
    ...dashboardQueryOptions.workOrdersSummary(activeTenantId ?? '', client),
    enabled: !!activeTenantId,
  })

  const { data: assetsSummary = [] } = useQuery({
    ...dashboardQueryOptions.assetsSummary(activeTenantId ?? '', client),
    enabled: !!activeTenantId,
  })

  const { data: locationsSummary = [] } = useQuery({
    ...dashboardQueryOptions.locationsSummary(activeTenantId ?? '', client),
    enabled: !!activeTenantId,
  })

  const summary = workOrdersSummary[0]
  const assets = assetsSummary[0]
  const locations = locationsSummary[0]
  const mttr = mttrMetrics[0]

  const openWorkOrdersColumns = React.useMemo<ColumnDef<DashboardOpenWorkOrdersRow>[]>(
    () => [
      {
        id: 'title',
        accessorKey: 'title',
        header: ({ column }: { column: any }) => <DataTableColumnHeader column={column} label="Title" />,
        cell: ({ row }: { row: any }) => {
          const id = row.original.id
          const title = row.getValue('title') as string | null
          if (!id) return <span className="font-medium">{title ?? '—'}</span>
          return (
            <Link
              to="/dashboard/workorders/$id"
              params={{ id }}
              className="font-medium text-primary hover:underline"
            >
              {title ?? '—'}
            </Link>
          )
        },
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: ({ column }: { column: any }) => <DataTableColumnHeader column={column} label="Status" />,
        cell: ({ row }: { row: any }) => {
          const status = row.getValue('status') as string | null
          return <StatusBadge statusKey={status} />
        },
      },
      {
        id: 'priority',
        accessorKey: 'priority',
        header: ({ column }: { column: any }) => <DataTableColumnHeader column={column} label="Priority" />,
        cell: ({ row }: { row: any }) => {
          const priority = row.getValue('priority') as string | null
          return <PriorityBadge priorityKey={priority} />
        },
      },
    ],
    []
  )

  const openWorkOrdersTable = useReactTable({
    data: openWorkOrders.slice(0, 5),
    columns: openWorkOrdersColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row: DashboardOpenWorkOrdersRow) => row.id ?? '',
  })

  const overdueWorkOrdersColumns = React.useMemo<ColumnDef<DashboardOverdueWorkOrdersRow>[]>(
    () => [
      {
        id: 'title',
        accessorKey: 'title',
        header: ({ column }: { column: any }) => <DataTableColumnHeader column={column} label="Title" />,
        cell: ({ row }: { row: any }) => {
          const id = row.original.id
          const title = row.getValue('title') as string | null
          if (!id) return <span className="font-medium">{title ?? '—'}</span>
          return (
            <Link
              to="/dashboard/workorders/$id"
              params={{ id }}
              className="font-medium text-primary hover:underline"
            >
              {title ?? '—'}
            </Link>
          )
        },
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: ({ column }: { column: any }) => <DataTableColumnHeader column={column} label="Status" />,
        cell: ({ row }: { row: any }) => {
          const status = row.getValue('status') as string | null
          return <StatusBadge statusKey={status} />
        },
      },
      {
        id: 'priority',
        accessorKey: 'priority',
        header: ({ column }: { column: any }) => <DataTableColumnHeader column={column} label="Priority" />,
        cell: ({ row }: { row: any }) => {
          const priority = row.getValue('priority') as string | null
          return <PriorityBadge priorityKey={priority} />
        },
      },
    ],
    []
  )

  const overdueWorkOrdersTable = useReactTable({
    data: overdueWorkOrders.slice(0, 5),
    columns: overdueWorkOrdersColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row: DashboardOverdueWorkOrdersRow) => row.id ?? '',
  })

  return (
    <div className="flex flex-1 flex-col gap-8 p-6 pt-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-base text-muted-foreground">
          Overview of your maintenance operations
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <Card className="group relative overflow-hidden border-2 transition-all duration-300 hover:border-primary/20 hover:shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Open Work Orders</CardTitle>
            <div className="rounded-xl bg-primary/10 p-2.5 shadow-sm transition-transform duration-300 group-hover:scale-110">
              <ClipboardList className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {metricsLoading ? (
              <div className="h-10 w-20 animate-pulse rounded-lg bg-muted" />
            ) : (
              <div className="text-4xl font-bold tracking-tight text-foreground">
                {summary?.total_open ?? (metrics[0] as any)?.open_count ?? 0}
              </div>
            )}
            <p className="text-xs font-medium text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border-2 transition-all duration-300 hover:border-destructive/20 hover:shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-destructive/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Overdue</CardTitle>
            <div className="rounded-xl bg-destructive/10 p-2.5 shadow-sm transition-transform duration-300 group-hover:scale-110">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {metricsLoading ? (
              <div className="h-10 w-20 animate-pulse rounded-lg bg-muted" />
            ) : (
              <div className="text-4xl font-bold tracking-tight text-destructive">
                {summary?.total_overdue ?? (metrics[0] as any)?.overdue_count ?? 0}
              </div>
            )}
            <p className="text-xs font-medium text-muted-foreground">Requiring attention</p>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border-2 transition-all duration-300 hover:border-blue-500/20 hover:shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Mean Time to Repair</CardTitle>
            <div className="rounded-xl bg-blue-500/10 p-2.5 shadow-sm transition-transform duration-300 group-hover:scale-110">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {mttrLoading ? (
              <div className="h-10 w-20 animate-pulse rounded-lg bg-muted" />
            ) : (
              <div className="text-4xl font-bold tracking-tight">
                {mttr?.mttr_hours ? `${mttr.mttr_hours.toFixed(1)}h` : '—'}
              </div>
            )}
            <p className="text-xs font-medium text-muted-foreground">Average repair time</p>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border-2 transition-all duration-300 hover:border-green-500/20 hover:shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Total Assets</CardTitle>
            <div className="rounded-xl bg-green-500/10 p-2.5 shadow-sm transition-transform duration-300 group-hover:scale-110">
              <Wrench className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {metricsLoading ? (
              <div className="h-10 w-20 animate-pulse rounded-lg bg-muted" />
            ) : (
              <div className="text-4xl font-bold tracking-tight">{assets?.total ?? 0}</div>
            )}
            <p className="text-xs font-medium text-muted-foreground">Managed assets</p>
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-5 md:grid-cols-3">
        <Card className="border-2 transition-all duration-300 hover:shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Work Orders Summary</CardTitle>
            <CardDescription className="text-xs">Complete breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <div className="space-y-3">
                <div className="h-5 w-full animate-pulse rounded-lg bg-muted" />
                <div className="h-5 w-3/4 animate-pulse rounded-lg bg-muted" />
                <div className="h-5 w-4/5 animate-pulse rounded-lg bg-muted" />
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                  <span className="font-medium text-muted-foreground">Total:</span>
                  <span className="font-bold text-foreground">{summary?.total ?? 0}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                  <span className="font-medium text-muted-foreground">Open:</span>
                  <span className="font-bold text-foreground">{summary?.total_open ?? 0}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                  <span className="font-medium text-muted-foreground">Completed:</span>
                  <span className="font-bold text-foreground">{summary?.total_completed ?? 0}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-destructive/10 px-3 py-2">
                  <span className="font-medium text-muted-foreground">Overdue:</span>
                  <span className="font-bold text-destructive">{summary?.total_overdue ?? 0}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-2 transition-all duration-300 hover:shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Assets Summary</CardTitle>
            <CardDescription className="text-xs">Asset overview</CardDescription>
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <div className="space-y-3">
                <div className="h-5 w-full animate-pulse rounded-lg bg-muted" />
                <div className="h-5 w-3/4 animate-pulse rounded-lg bg-muted" />
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                  <span className="font-medium text-muted-foreground">Total:</span>
                  <span className="font-bold text-foreground">{assets?.total ?? 0}</span>
                </div>
                {assets?.active !== undefined && (
                  <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                    <span className="font-medium text-muted-foreground">Active:</span>
                    <span className="font-bold text-foreground">{assets.active}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-2 transition-all duration-300 hover:shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Locations Summary</CardTitle>
            <CardDescription className="text-xs">Location count</CardDescription>
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <div className="space-y-3">
                <div className="h-5 w-full animate-pulse rounded-lg bg-muted" />
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                  <span className="font-medium text-muted-foreground">Total:</span>
                  <span className="font-bold text-foreground">{locations?.total ?? 0}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Work Orders Tables */}
      <div className="grid gap-5 md:grid-cols-2">
        <Card className="border-2 transition-all duration-300 hover:shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Open Work Orders</CardTitle>
            <CardDescription className="text-sm">Work orders currently in progress</CardDescription>
          </CardHeader>
          <CardContent>
            {openLoading ? (
              <DataTableSkeleton columnCount={3} rowCount={5} />
            ) : openWorkOrders.length === 0 ? (
              <div className="py-16 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <ClipboardList className="h-8 w-8 text-primary" />
                </div>
                <p className="text-base font-semibold text-foreground">No open work orders</p>
                <p className="text-sm text-muted-foreground mt-2">All caught up! Great work.</p>
              </div>
            ) : (
              <div className="rounded-lg border bg-card">
                <DataTable table={openWorkOrdersTable} />
              </div>
            )}
            {openWorkOrders.length > 5 && (
              <div className="mt-5 text-center">
                <Link
                  to="/dashboard/workorders"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
                >
                  View all {openWorkOrders.length} open work orders
                  <span>→</span>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-2 transition-all duration-300 hover:shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Overdue Work Orders</CardTitle>
            <CardDescription className="text-sm">Work orders past their due date</CardDescription>
          </CardHeader>
          <CardContent>
            {overdueLoading ? (
              <DataTableSkeleton columnCount={3} rowCount={5} />
            ) : overdueWorkOrders.length === 0 ? (
              <div className="py-16 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                  <AlertTriangle className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-base font-semibold text-foreground">No overdue work orders</p>
                <p className="text-sm text-muted-foreground mt-2">Great job staying on track!</p>
              </div>
            ) : (
              <div className="rounded-lg border bg-card">
                <DataTable table={overdueWorkOrdersTable} />
              </div>
            )}
            {overdueWorkOrders.length > 5 && (
              <div className="mt-5 text-center">
                <Link
                  to="/dashboard/workorders"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
                >
                  View all {overdueWorkOrders.length} overdue work orders
                  <span>→</span>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
