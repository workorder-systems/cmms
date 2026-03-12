import { Link, createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  AlertTriangle,
  Building2,
  CheckCircle2,
  ClipboardList,
  Users,
  Wrench,
} from 'lucide-react'
import { getDbClient } from '../lib/db-client'
import { useTenant } from '../contexts/tenant'
import { Button } from '@workspace/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { Progress } from '@workspace/ui/components/progress'
import { Skeleton } from '@workspace/ui/components/skeleton'

export const Route = createFileRoute('/_protected/dashboard/')({
  component: DashboardPage,
})

function DashboardPage() {
  const client = getDbClient()
  const { activeTenantId, activeTenant } = useTenant()

  const { data: workOrders = [], isLoading: isLoadingWorkOrders } = useQuery({
    queryKey: ['dashboard-work-orders', activeTenantId],
    queryFn: () => client.workOrders.list(),
    enabled: !!activeTenantId,
  })

  const { data: assets = [], isLoading: isLoadingAssets } = useQuery({
    queryKey: ['dashboard-assets', activeTenantId],
    queryFn: () => client.assets.list(),
    enabled: !!activeTenantId,
  })

  const { data: locations = [], isLoading: isLoadingLocations } = useQuery({
    queryKey: ['dashboard-locations', activeTenantId],
    queryFn: () => client.locations.list(),
    enabled: !!activeTenantId,
  })

  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['dashboard-users', activeTenantId],
    queryFn: () => client.authorization.listProfiles(),
    enabled: !!activeTenantId,
  })

  const isLoading =
    isLoadingWorkOrders || isLoadingAssets || isLoadingLocations || isLoadingUsers

  const overdueWorkOrders = workOrders.filter((workOrder) => {
    if (!workOrder.due_date) return false
    const status = (workOrder.status ?? '').toLowerCase()
    if (['completed', 'closed', 'done', 'cancelled'].includes(status)) return false
    return new Date(workOrder.due_date).getTime() < Date.now()
  }).length

  const doneWorkOrders = workOrders.filter((workOrder) => {
    const status = (workOrder.status ?? '').toLowerCase()
    return ['completed', 'closed', 'done'].includes(status)
  }).length

  const openWorkOrders = workOrders.filter((workOrder) => {
    const status = (workOrder.status ?? '').toLowerCase()
    return !['completed', 'closed', 'done', 'cancelled'].includes(status)
  }).length

  const completionRate =
    workOrders.length > 0 ? Math.round((doneWorkOrders / workOrders.length) * 100) : 0

  const assetCoverage =
    assets.length > 0
      ? Math.round((locations.length / assets.length) * 100)
      : 0

  const recentWorkOrders = [...workOrders]
    .sort((a, b) => {
      const left = a.created_at ? new Date(a.created_at).getTime() : 0
      const right = b.created_at ? new Date(b.created_at).getTime() : 0
      return right - left
    })
    .slice(0, 5)

  const metricCards = [
    {
      title: 'Open work orders',
      value: openWorkOrders.toLocaleString(),
      description: `${overdueWorkOrders} overdue`,
      icon: ClipboardList,
    },
    {
      title: 'Managed assets',
      value: assets.length.toLocaleString(),
      description: 'Tracked across all sites',
      icon: Wrench,
    },
    {
      title: 'Locations',
      value: locations.length.toLocaleString(),
      description: 'Physical coverage map',
      icon: Building2,
    },
    {
      title: 'Team members',
      value: users.length.toLocaleString(),
      description: 'Tenant-level access',
      icon: Users,
    },
  ]

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-2">
      <section className="rounded-2xl border bg-gradient-to-br from-card to-muted/30 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
              Dashboard overview
            </p>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              {activeTenant?.name ?? 'Your workspace'}
            </h1>
            <p className="text-sm text-muted-foreground">
              Monitor operations, unblock overdue work, and keep teams aligned.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/dashboard/workorders">
                View work orders
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/dashboard/assets">Open assets</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((metric) => (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardDescription>{metric.title}</CardDescription>
                <CardTitle className="mt-2 text-3xl">{metric.value}</CardTitle>
              </div>
              <div className="rounded-md bg-primary/10 p-2 text-primary">
                <metric.icon className="size-4" />
              </div>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {metric.description}
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>System health</CardTitle>
            <CardDescription>
              Snapshot of completion and coverage across the tenant.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {isLoading ? (
              <>
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Work order completion</span>
                    <span className="text-muted-foreground">{completionRate}%</span>
                  </div>
                  <Progress value={completionRate} />
                  <p className="text-xs text-muted-foreground">
                    {doneWorkOrders} of {workOrders.length} work orders are complete.
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Location coverage</span>
                    <span className="text-muted-foreground">{assetCoverage}%</span>
                  </div>
                  <Progress value={Math.min(assetCoverage, 100)} />
                  <p className="text-xs text-muted-foreground">
                    {locations.length} locations mapped to {assets.length} assets.
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                  <div className="flex items-center gap-2 font-medium">
                    {overdueWorkOrders > 0 ? (
                      <AlertTriangle className="size-4 text-amber-500" />
                    ) : (
                      <CheckCircle2 className="size-4 text-emerald-500" />
                    )}
                    {overdueWorkOrders > 0
                      ? `${overdueWorkOrders} overdue work orders need attention`
                      : 'No overdue work orders right now'}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Latest work orders created in this tenant.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <>
                <Skeleton className="h-10 w-full rounded-md" />
                <Skeleton className="h-10 w-full rounded-md" />
                <Skeleton className="h-10 w-full rounded-md" />
              </>
            ) : recentWorkOrders.length === 0 ? (
              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No work orders yet. Create your first one to start tracking
                maintenance.
              </p>
            ) : (
              recentWorkOrders.map((workOrder, index) =>
                workOrder.id ? (
                  <Link
                    key={workOrder.id}
                    to="/dashboard/workorders/$id"
                    params={{ id: workOrder.id }}
                    className="block rounded-lg border p-3 transition-colors hover:bg-muted/40"
                  >
                    <p className="truncate text-sm font-medium">
                      {workOrder.title ?? 'Untitled work order'}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Status: {workOrder.status ?? 'unknown'}
                    </p>
                  </Link>
                ) : (
                  <div
                    key={`recent-work-order-${index}`}
                    className="rounded-lg border p-3"
                  >
                    <p className="truncate text-sm font-medium">
                      {workOrder.title ?? 'Untitled work order'}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Status: {workOrder.status ?? 'unknown'}
                    </p>
                  </div>
                )
              )
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
