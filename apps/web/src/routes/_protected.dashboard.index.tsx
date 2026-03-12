import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  Clock3,
  ClipboardList,
  TimerReset,
  Users,
  Wrench,
} from 'lucide-react'
import type { WorkOrderRow } from '@workorder-systems/sdk'
import { getDbClient } from '../lib/db-client'
import { useTenant } from '../contexts/tenant'
import { catalogQueryOptions } from '../lib/catalog-queries'
import { Button } from '@workspace/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { StatCard } from '@workspace/ui/components/stat-card'
import { WorkOrderCard } from '@workspace/ui/components/work-order-card'
import StatusIndicator from '@workspace/ui/components/status-indicator'
import { ExtensionPoint } from '@workspace/ui/components/app-shell'

export const Route = createFileRoute('/_protected/dashboard/')({
  component: DashboardPage,
})

function DashboardPage() {
  const client = getDbClient()
  const navigate = useNavigate()
  const { activeTenantId } = useTenant()

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

  const { data: statusCatalog = [] } = useQuery({
    ...catalogQueryOptions.statuses(activeTenantId ?? '', client),
    enabled: !!activeTenantId,
  })

  const { data: priorityCatalog = [] } = useQuery({
    ...catalogQueryOptions.priorities(activeTenantId ?? '', client),
    enabled: !!activeTenantId,
  })

  const isLoading =
    isLoadingWorkOrders || isLoadingAssets || isLoadingLocations || isLoadingUsers

  const openWorkOrders = workOrders.filter((workOrder) => {
    const status = (workOrder.status ?? '').toLowerCase()
    return !['completed', 'closed', 'done', 'cancelled'].includes(status)
  })

  const overdueWorkOrders = openWorkOrders.filter((workOrder) => {
    if (!workOrder.due_date) return false
    return new Date(workOrder.due_date).getTime() < Date.now()
  })

  const dueSoonWorkOrders = openWorkOrders.filter((workOrder) => {
    if (!workOrder.due_date) return false
    const dueTime = new Date(workOrder.due_date).getTime()
    const now = Date.now()
    const sevenDays = 7 * 24 * 60 * 60 * 1000
    return dueTime >= now && dueTime <= now + sevenDays
  })

  const unassignedWorkOrders = openWorkOrders.filter(
    (workOrder) => !workOrder.assigned_to_name
  )

  const doneWorkOrders = workOrders.filter((workOrder) => {
    const status = (workOrder.status ?? '').toLowerCase()
    return ['completed', 'closed', 'done'].includes(status)
  })

  const completionRate =
    workOrders.length > 0
      ? Math.round((doneWorkOrders.length / workOrders.length) * 100)
      : 0

  const dailyCreatedSeries = (() => {
    const days = 8
    const buckets = new Array<number>(days).fill(0)
    const now = new Date()
    for (const workOrder of workOrders) {
      if (!workOrder.created_at) continue
      const created = new Date(workOrder.created_at)
      const diff = Math.floor(
        (new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() -
          new Date(created.getFullYear(), created.getMonth(), created.getDate()).getTime()) /
          (24 * 60 * 60 * 1000)
      )
      if (diff >= 0 && diff < days) {
        const bucketIndex = days - 1 - diff
        buckets[bucketIndex] += 1
      }
    }
    return buckets
  })()

  const workOrderStatusCatalog = statusCatalog
    .filter((status) => status.entity_type === 'work_order')
    .map((status) => ({
      key: status.key ?? '',
      name: status.name ?? status.key ?? '',
      color: status.color ?? null,
    }))
    .filter((status) => status.key)

  const workOrderPriorityCatalog = priorityCatalog
    .filter((priority) => priority.entity_type === 'work_order')
    .map((priority) => ({
      key: priority.key ?? '',
      name: priority.name ?? priority.key ?? '',
      color: priority.color ?? null,
    }))
    .filter((priority) => priority.key)

  const queueWorkOrders = [...openWorkOrders]
    .sort((a, b) => {
      const left = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER
      const right = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER
      return left - right
    })
    .slice(0, 6)

  const handleWorkOrderClick = (workOrder: WorkOrderRow) => {
    if (!workOrder.id) return
    void navigate({
      to: '/dashboard/workorders/$id',
      params: { id: workOrder.id },
    })
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-2">
      <ExtensionPoint name="header.right">
        <div className="flex items-center gap-1">
          <Button asChild size="sm" variant="ghost">
            <Link to="/dashboard/workorders">
              <ClipboardList className="size-4" />
              <span className="hidden md:inline">Work orders</span>
            </Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link to="/dashboard/assets">
              <Wrench className="size-4" />
              <span className="hidden md:inline">Assets</span>
            </Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link to="/dashboard/users">
              <Users className="size-4" />
              <span className="hidden md:inline">Team</span>
            </Link>
          </Button>
        </div>
      </ExtensionPoint>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {isLoading ? (
          <>
            <Skeleton className="h-44 rounded-xl" />
            <Skeleton className="h-44 rounded-xl" />
            <Skeleton className="h-44 rounded-xl" />
            <Skeleton className="h-44 rounded-xl" />
          </>
        ) : (
          <>
            <StatCard
              label="Open work orders"
              value={openWorkOrders.length.toLocaleString()}
              trend={{
                value: `${overdueWorkOrders.length} overdue`,
                direction: overdueWorkOrders.length > 0 ? 'down' : 'up',
              }}
              sparkline={{ data: dailyCreatedSeries, sparklineProps: { variant: 'area' } }}
              footerSummary="Current backlog"
              footerDescription={`${dueSoonWorkOrders.length} due in 7 days`}
            />
            <StatCard
              label="Unassigned work"
              value={unassignedWorkOrders.length.toLocaleString()}
              trend={`${dueSoonWorkOrders.length} due soon`}
              footerSummary="Dispatch coverage"
              footerDescription="Work orders without an assignee"
            />
            <StatCard
              label="Managed assets"
              value={assets.length.toLocaleString()}
              trend={`${locations.length} mapped locations`}
              footerSummary="Asset registry"
              footerDescription="Total tracked in this tenant"
            />
            <StatCard
              label="Team members"
              value={users.length.toLocaleString()}
              trend={{
                value: `${completionRate}% completion`,
                direction: completionRate >= 70 ? 'up' : 'down',
              }}
              footerSummary="Execution quality"
              footerDescription="Completed vs all work orders"
            />
          </>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Work queue</CardTitle>
            <CardDescription>
              Open work orders sorted by nearest due date.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <>
                <Skeleton className="h-20 rounded-lg" />
                <Skeleton className="h-20 rounded-lg" />
                <Skeleton className="h-20 rounded-lg" />
              </>
            ) : queueWorkOrders.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No open work orders. Your queue is clear.
              </div>
            ) : (
              queueWorkOrders.map((workOrder) => (
                <WorkOrderCard
                  key={workOrder.id ?? `${workOrder.title}-${workOrder.created_at}`}
                  title={workOrder.title ?? 'Untitled work order'}
                  statusKey={workOrder.status}
                  statusCatalog={workOrderStatusCatalog}
                  priorityKey={workOrder.priority}
                  priorityCatalog={workOrderPriorityCatalog}
                  dueDate={workOrder.due_date}
                  assigneeDisplayName={workOrder.assigned_to_name}
                  onClick={() => handleWorkOrderClick(workOrder)}
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operational status</CardTitle>
            <CardDescription>Live indicators for dispatch and throughput.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-3">
              <div className="mb-2 text-sm font-medium">Backlog health</div>
              <StatusIndicator
                state={overdueWorkOrders.length > 0 ? 'fixing' : 'active'}
                label={
                  overdueWorkOrders.length > 0
                    ? `${overdueWorkOrders.length} work orders overdue`
                    : 'No overdue work orders'
                }
                labelClassName="text-muted-foreground"
              />
            </div>
            <div className="rounded-lg border p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Clock3 className="size-4" />
                Upcoming deadlines
              </div>
              <p className="text-sm text-muted-foreground">
                {dueSoonWorkOrders.length} work orders due in the next 7 days.
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <TimerReset className="size-4" />
                Team allocation
              </div>
              <p className="text-sm text-muted-foreground">
                {unassignedWorkOrders.length} work orders still need assignment.
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <ClipboardList className="size-4" />
                Execution rate
              </div>
              <p className="text-sm text-muted-foreground">
                {doneWorkOrders.length} completed of {workOrders.length} total work orders.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
