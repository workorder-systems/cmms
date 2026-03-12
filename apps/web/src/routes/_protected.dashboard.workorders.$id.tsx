import * as React from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef, Column, Row } from '@tanstack/react-table'
import { getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { ClipboardList, History, Loader2, Clock, Paperclip, ArrowRight, Users, Package, Calendar, AlertCircle, ArrowLeft } from 'lucide-react'
import type {
  WorkOrderRow,
  SimilarPastFixResult,
  WorkOrderAttachmentRow,
  StatusTransitionRow,
  WorkOrderAssignmentRow,
  WorkOrderLaborActualsRow,
  PartReservationRow,
  PartUsageRow,
} from '@workorder-systems/sdk'
import { getDbClient } from '../lib/db-client'
import { useTenant } from '../contexts/tenant'
import { ensureTenantContextWithCatalogs } from '../lib/route-loaders'
import { catalogQueryOptions } from '../lib/catalog-queries'
import { useHasPermission } from '../hooks/use-permissions'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Label } from '@workspace/ui/components/label'
import { Textarea } from '@workspace/ui/components/textarea'
import { DataTable } from '@workspace/ui/components/data-table/data-table'
import { DataTableColumnHeader } from '@workspace/ui/components/data-table/data-table-column-header'
import { DataTableErrorMessage } from '../components/data-table-error-message'
import { DataTableSkeleton } from '@workspace/ui/components/data-table/data-table-skeleton'
import { StatusBadge } from '../components/status-badge'
import { PriorityBadge } from '../components/priority-badge'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { Input } from '@workspace/ui/components/input'

export const Route = createFileRoute('/_protected/dashboard/workorders/$id')({
  beforeLoad: async ({ context }) => ensureTenantContextWithCatalogs(context),
  component: WorkOrderDetailPage,
})

const WORK_ORDER_ENTITY_TYPE = 'work_order'

function WorkOrderDetailPage() {
  const { id } = Route.useParams()
  const queryClient = useQueryClient()
  const client = getDbClient()
  const { activeTenantId } = useTenant()
  const { hasPermission: canTransitionStatus } = useHasPermission('work_orders.transition_status')
  const { hasPermission: canLogTime } = useHasPermission('work_orders.log_time')

  const { data: workOrder, isLoading, isError, error } = useQuery({
    queryKey: ['work-order', id],
    queryFn: () => client.workOrders.getById(id),
    enabled: !!id,
  })

  const { data: statusCatalog = [] } = useQuery({
    ...catalogQueryOptions.statuses(activeTenantId ?? '', client),
    enabled: !!activeTenantId,
  })
  const { data: priorityCatalog = [] } = useQuery({
    ...catalogQueryOptions.priorities(activeTenantId ?? '', client),
    enabled: !!activeTenantId,
  })

  const { data: similarPastFixes = [], isLoading: similarLoading, isError: similarError } = useQuery({
    queryKey: ['similar-past-fixes', id],
    queryFn: () => client.similarPastFixes.search({ workOrderId: id, limit: 5 }),
    enabled: !!id && !!workOrder,
  })

  const { data: statusTransitions = [] } = useQuery({
    queryKey: ['status-transitions', activeTenantId, 'work_order'],
    queryFn: () => client.catalogs.listStatusTransitions(),
    enabled: !!activeTenantId,
  })

  const { data: attachments = [], isLoading: attachmentsLoading } = useQuery({
    queryKey: ['work-order-attachments', id],
    queryFn: () => client.workOrders.listAttachments(id),
    enabled: !!id,
  })

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['work-order-assignments', id],
    queryFn: () => client.labor.listWorkOrderAssignmentsByWorkOrderId(id),
    enabled: !!id,
  })

  const { data: laborActuals = [], isLoading: laborLoading } = useQuery({
    queryKey: ['work-order-labor-actuals', id],
    queryFn: () => client.labor.listWorkOrderLaborActualsByWorkOrderId(id),
    enabled: !!id,
  })

  const { data: partReservations = [], isLoading: reservationsLoading } = useQuery({
    queryKey: ['part-reservations', id],
    queryFn: () => client.partsInventory.listPartReservationsByWorkOrderId(id),
    enabled: !!id,
  })

  const { data: partUsage = [], isLoading: usageLoading } = useQuery({
    queryKey: ['part-usage', id],
    queryFn: () => client.partsInventory.listPartUsageByWorkOrderId(id),
    enabled: !!id,
  })

  // Get allowed transitions for current status
  const allowedTransitions = React.useMemo(() => {
    if (!workOrder?.status) return []
    return statusTransitions.filter(
      (t) => t.entity_type === WORK_ORDER_ENTITY_TYPE && t.from_status_key === workOrder.status
    )
  }, [statusTransitions, workOrder?.status])

  const completeMutation = useMutation({
    mutationFn: (params: { cause: string; resolution: string }) =>
      client.workOrders.complete({
        tenantId: activeTenantId!,
        workOrderId: id,
        cause: params.cause || null,
        resolution: params.resolution || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order', id] })
      queryClient.invalidateQueries({ queryKey: ['work-orders', activeTenantId] })
      toast.success('Work order completed')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const transitionStatusMutation = useMutation({
    mutationFn: (toStatusKey: string) =>
      client.workOrders.transitionStatus({
        tenantId: activeTenantId!,
        workOrderId: id,
        toStatusKey,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order', id] })
      queryClient.invalidateQueries({ queryKey: ['work-orders', activeTenantId] })
      toast.success('Status updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const logTimeMutation = useMutation({
    mutationFn: (params: { minutes: number; description?: string | null }) =>
      client.workOrders.logTime({
        tenantId: activeTenantId!,
        workOrderId: id,
        minutes: params.minutes,
        description: params.description || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order', id] })
      toast.success('Time logged')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const [logTimeMinutes, setLogTimeMinutes] = React.useState('')
  const [logTimeDescription, setLogTimeDescription] = React.useState('')

  const [completeCause, setCompleteCause] = React.useState('')
  const [completeResolution, setCompleteResolution] = React.useState('')

  const similarPastFixesColumns = React.useMemo<ColumnDef<SimilarPastFixResult>[]>(
    () => [
      {
        id: 'title',
        accessorKey: 'title',
        header: ({ column }: { column: Column<SimilarPastFixResult, unknown> }) => (
          <DataTableColumnHeader column={column} label="Title" />
        ),
        cell: ({ row }: { row: Row<SimilarPastFixResult> }) => {
          const fix = row.original
          return (
            <Link
              to="/dashboard/workorders/$id"
              params={{ id: fix.workOrderId }}
              className="font-medium text-primary hover:underline"
            >
              {fix.title || 'Untitled'}
            </Link>
          )
        },
      },
      {
        id: 'similarityScore',
        accessorKey: 'similarityScore',
        header: ({ column }: { column: Column<SimilarPastFixResult, unknown> }) => (
          <DataTableColumnHeader column={column} label="Match" />
        ),
        cell: ({ row }: { row: Row<SimilarPastFixResult> }) => {
          const score = row.original.similarityScore
          return (
            <span className="tabular-nums text-muted-foreground">
              {(score * 100).toFixed(0)}%
            </span>
          )
        },
      },
      {
        id: 'completedAt',
        accessorKey: 'completedAt',
        header: ({ column }: { column: Column<SimilarPastFixResult, unknown> }) => (
          <DataTableColumnHeader column={column} label="Completed" />
        ),
        cell: ({ row }: { row: Row<SimilarPastFixResult> }) => {
          const at = row.original.completedAt
          return at ? (
            <span className="text-muted-foreground text-sm">
              {new Date(at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
            </span>
          ) : (
            '—'
          )
        },
      },
      {
        id: 'cause',
        accessorFn: (row: SimilarPastFixResult) => row.cause ?? '',
        header: 'Cause',
        cell: ({ row }: { row: Row<SimilarPastFixResult> }) => {
          const v = row.original.cause
          return v ? (
            <span className="line-clamp-2 text-muted-foreground text-sm">{v}</span>
          ) : (
            '—'
          )
        },
      },
      {
        id: 'resolution',
        accessorFn: (row: SimilarPastFixResult) => row.resolution ?? '',
        header: 'Resolution',
        cell: ({ row }: { row: Row<SimilarPastFixResult> }) => {
          const v = row.original.resolution
          return v ? (
            <span className="line-clamp-2 text-muted-foreground text-sm">{v}</span>
          ) : (
            '—'
          )
        },
      },
    ],
    [],
  )

  const similarPastFixesTable = useReactTable({
    data: similarPastFixes,
    columns: similarPastFixesColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row: SimilarPastFixResult) => row.workOrderId,
  })

  const workOrderStatusCatalog = React.useMemo(
    () =>
      statusCatalog
        .filter((s) => s.entity_type === WORK_ORDER_ENTITY_TYPE)
        .map((s) => ({ key: s.key ?? '', name: s.name ?? null, color: s.color ?? null })),
    [statusCatalog]
  )
  const workOrderPriorityCatalog = React.useMemo(
    () =>
      priorityCatalog
        .filter((p) => p.entity_type === WORK_ORDER_ENTITY_TYPE)
        .map((p) => ({ key: p.key ?? '', name: p.name ?? null, color: p.color ?? null })),
    [priorityCatalog]
  )

  if (isError) {
    return (
      <DataTableErrorMessage
        resourceName="work order"
        error={error ?? null}
      />
    )
  }

  if (isLoading || !workOrder) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="animate-pulse rounded-lg bg-muted h-8 w-48" />
        <div className="animate-pulse rounded-lg bg-muted h-32 w-full" />
      </div>
    )
  }

  const isCompleted = workOrder.status === 'completed'

  return (
    <div className="flex flex-1 flex-col gap-8 p-6 pt-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="default" asChild className="shadow-sm">
          <Link to="/dashboard/workorders">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>
        <div className="flex-1 space-y-1.5">
          <h1 className="text-3xl font-bold tracking-tight truncate">
            {workOrder.title ?? 'Work order'}
          </h1>
          <div className="flex items-center gap-3 flex-wrap">
            <StatusBadge
              statusKey={workOrder.status}
              statusCatalog={workOrderStatusCatalog}
            />
            <PriorityBadge
              priorityKey={workOrder.priority}
              priorityCatalog={workOrderPriorityCatalog}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-2 border-border/50 transition-all duration-300 hover:shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <ClipboardList className="size-5" />
              Details
            </CardTitle>
            <CardDescription className="text-sm">Work order information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Status</Label>
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge
                  statusKey={workOrder.status}
                  statusCatalog={workOrderStatusCatalog}
                />
                {!isCompleted && allowedTransitions.length > 0 && canTransitionStatus && (
                  <Select
                    value=""
                    onValueChange={(value) => {
                      if (value) {
                        const statusName = workOrderStatusCatalog.find(s => s.key === value)?.name ?? value
                        if (window.confirm(`Change status to "${statusName}"?`)) {
                          transitionStatusMutation.mutate(value)
                        }
                      }
                    }}
                    disabled={transitionStatusMutation.isPending}
                    aria-label="Change work order status"
                  >
                    <SelectTrigger className="w-[180px]" aria-label="Select new status">
                      <SelectValue placeholder="Change status..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allowedTransitions.map((transition) => {
                        const toStatus = workOrderStatusCatalog.find(
                          (s) => s.key === transition.to_status_key
                        )
                        return (
                          <SelectItem key={transition.to_status_key} value={transition.to_status_key}>
                            <div className="flex items-center gap-2">
                              <ArrowRight className="h-3 w-3" aria-hidden="true" />
                              <span>{toStatus?.name ?? transition.to_status_key}</span>
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                )}
                {!isCompleted && allowedTransitions.length === 0 && (
                  <span className="text-xs text-muted-foreground">No status transitions available</span>
                )}
              </div>
            </div>
            <DetailRow
              label="Priority"
              value={
                <PriorityBadge
                  priorityKey={workOrder.priority}
                  priorityCatalog={workOrderPriorityCatalog}
                />
              }
            />
            <DetailRow
              label="Assigned to"
              value={workOrder.assigned_to_name ?? undefined}
            />
            <DetailRow
              label="Due date"
              value={
                workOrder.due_date
                  ? new Date(workOrder.due_date).toLocaleDateString(undefined, {
                      dateStyle: 'medium',
                    })
                  : undefined
              }
            />
            <DetailRow
              label="Completed at"
              value={
                workOrder.completed_at
                  ? new Date(workOrder.completed_at).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })
                  : undefined
              }
            />
            <DetailRow
              label="Completed by"
              value={workOrder.completed_by_name ?? undefined}
            />
            {workOrder.description ? (
              <div className="space-y-1">
                <Label className="text-muted-foreground">Description</Label>
                <p className="text-sm whitespace-pre-wrap">
                  {workOrder.description}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-2 border-border/50 transition-all duration-300 hover:shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Cause & resolution</CardTitle>
            <CardDescription className="text-sm">
              Root cause and resolution for completed work orders
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isCompleted ? (
              <>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Cause</Label>
                  <p className="text-sm whitespace-pre-wrap min-h-[4rem]">
                    {workOrder.cause ?? '—'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Resolution</Label>
                  <p className="text-sm whitespace-pre-wrap min-h-[4rem]">
                    {workOrder.resolution ?? '—'}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="complete-cause">Cause</Label>
                  <Textarea
                    id="complete-cause"
                    placeholder="What was the root cause?"
                    value={completeCause}
                    onChange={(e) => setCompleteCause(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="complete-resolution">Resolution</Label>
                  <Textarea
                    id="complete-resolution"
                    placeholder="How was it resolved?"
                    value={completeResolution}
                    onChange={(e) => setCompleteResolution(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>
                <Button
                  onClick={() =>
                    completeMutation.mutate({
                      cause: completeCause.trim(),
                      resolution: completeResolution.trim(),
                    })
                  }
                  disabled={completeMutation.isPending}
                >
                  {completeMutation.isPending ? 'Completing…' : 'Complete work order'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-2 border-border/50 transition-all duration-300 hover:shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Clock className="size-5" />
              Time Logging
            </CardTitle>
            <CardDescription className="text-sm">Log time spent on this work order</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isCompleted && canLogTime ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="log-time-minutes">
                    Time Spent (minutes) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="log-time-minutes"
                    type="number"
                    min="1"
                    step="0.5"
                    placeholder="e.g. 30 or 1.5"
                    value={logTimeMinutes}
                    onChange={(e) => setLogTimeMinutes(e.target.value)}
                    className="max-w-[200px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the time spent in minutes. You can use decimals (e.g., 1.5 for 1 hour 30 minutes)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="log-time-description">Work Description</Label>
                  <Textarea
                    id="log-time-description"
                    placeholder="Describe what work was performed..."
                    value={logTimeDescription}
                    onChange={(e) => setLogTimeDescription(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional: Add details about the work performed
                  </p>
                </div>
                <Button
                  onClick={() => {
                    const minutes = parseFloat(logTimeMinutes)
                    if (minutes > 0) {
                      logTimeMutation.mutate({
                        minutes,
                        description: logTimeDescription.trim() || null,
                      })
                      setLogTimeMinutes('')
                      setLogTimeDescription('')
                    } else {
                      toast.error('Please enter a valid time greater than 0')
                    }
                  }}
                  disabled={logTimeMutation.isPending || !logTimeMinutes || parseFloat(logTimeMinutes) <= 0}
                  className="w-full sm:w-auto"
                >
                  {logTimeMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Logging…
                    </>
                  ) : (
                    <>
                      <Clock className="h-4 w-4 mr-2" />
                      Log Time
                    </>
                  )}
                </Button>
              </>
            ) : !canLogTime ? (
              <div className="py-4 text-center">
                <Clock className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  You don't have permission to log time on work orders.
                </p>
              </div>
            ) : (
              <div className="py-4 text-center">
                <Clock className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Time logging is not available for completed work orders.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-2 border-border/50 transition-all duration-300 hover:shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Paperclip className="size-5" />
              Attachments
            </CardTitle>
            <CardDescription>Files attached to this work order</CardDescription>
          </CardHeader>
          <CardContent>
            {attachmentsLoading ? (
              <DataTableSkeleton columnCount={2} rowCount={3} />
            ) : attachments.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
                  <Paperclip className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">No attachments yet</p>
                <p className="text-xs text-muted-foreground">Upload files via the Storage API</p>
              </div>
            ) : (
              <div className="space-y-2">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between rounded-md border p-2"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {attachment.label ?? attachment.storage_path ?? 'Untitled'}
                      </p>
                      {attachment.kind && (
                        <p className="text-xs text-muted-foreground">Type: {attachment.kind}</p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          const { data, error } = await client.supabase.storage
                            .from(attachment.bucket_id as string)
                            .createSignedUrl(attachment.storage_path as string, 3600)
                          if (error) throw error
                          if (data?.signedUrl) {
                            window.open(data.signedUrl, '_blank')
                          }
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : 'Failed to download')
                        }
                      }}
                    >
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-2 border-border/50 transition-all duration-300 hover:shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Users className="size-5" />
              Assignments
            </CardTitle>
            <CardDescription className="text-sm">Technicians and crews assigned to this work order</CardDescription>
          </CardHeader>
          <CardContent>
            {assignmentsLoading ? (
              <DataTableSkeleton columnCount={2} rowCount={3} />
            ) : assignments.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">No assignments</p>
                <p className="text-xs text-muted-foreground">Assign technicians or crews to this work order</p>
              </div>
            ) : (
              <div className="space-y-2">
                {assignments.map((assignment) => (
                  <div key={assignment.id} className="flex items-center justify-between rounded-md border p-2">
                    <div>
                      <p className="text-sm font-medium">
                        {assignment.technician_id ?? assignment.crew_id ?? 'Unassigned'}
                      </p>
                      {assignment.role && (
                        <p className="text-xs text-muted-foreground">Role: {assignment.role}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-2 border-border/50 transition-all duration-300 hover:shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Clock className="size-5" />
              Labor Actuals
            </CardTitle>
            <CardDescription className="text-sm">Time logged by technicians</CardDescription>
          </CardHeader>
          <CardContent>
            {laborLoading ? (
              <DataTableSkeleton columnCount={2} rowCount={3} />
            ) : laborActuals.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
                  <Clock className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">No labor entries</p>
                <p className="text-xs text-muted-foreground">Time logged will appear here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {laborActuals.map((actual) => (
                  <div key={actual.id} className="flex items-center justify-between rounded-md border p-2">
                    <div>
                      <p className="text-sm font-medium">
                        {actual.technician_id ?? 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {actual.minutes_logged} minutes
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-2 border-border/50 transition-all duration-300 hover:shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Package className="size-5" />
              Part Reservations
            </CardTitle>
            <CardDescription className="text-sm">Parts reserved for this work order</CardDescription>
          </CardHeader>
          <CardContent>
            {reservationsLoading ? (
              <DataTableSkeleton columnCount={2} rowCount={3} />
            ) : partReservations.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">No part reservations</p>
                <p className="text-xs text-muted-foreground">Reserved parts will appear here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {partReservations.map((reservation) => (
                  <div key={reservation.id} className="flex items-center justify-between rounded-md border p-2">
                    <div>
                      <p className="text-sm font-medium">Part ID: {reservation.part_id}</p>
                      <p className="text-xs text-muted-foreground">
                        Quantity: {reservation.quantity} | Status: {reservation.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-2 border-border/50 transition-all duration-300 hover:shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Package className="size-5" />
              Part Usage
            </CardTitle>
            <CardDescription className="text-sm">Parts used on this work order</CardDescription>
          </CardHeader>
          <CardContent>
            {usageLoading ? (
              <DataTableSkeleton columnCount={2} rowCount={3} />
            ) : partUsage.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">No parts used</p>
                <p className="text-xs text-muted-foreground">Parts used on this work order will appear here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {partUsage.map((usage) => (
                  <div key={usage.id} className="flex items-center justify-between rounded-md border p-2">
                    <div>
                      <p className="text-sm font-medium">Part ID: {usage.part_id}</p>
                      <p className="text-xs text-muted-foreground">
                        Quantity: {usage.quantity_used} | Used: {new Date(usage.used_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-2 border-border/50 transition-all duration-300 hover:shadow-md">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <History className="size-5" />
            Similar past fixes
          </CardTitle>
          <CardDescription>
            Completed work orders similar to this one (by title, description, cause & resolution)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {similarLoading ? (
            <DataTableSkeleton columnCount={5} rowCount={3} />
          ) : similarError ? (
            <div className="py-8 text-center">
              <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                Could not load similar past fixes
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                You may have hit a rate limit or the feature may be disabled
              </p>
            </div>
          ) : similarPastFixes.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
                <History className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">No similar past fixes found</p>
              <p className="text-xs text-muted-foreground">Similar work orders will appear here when available</p>
            </div>
          ) : (
            <DataTable table={similarPastFixesTable} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function DetailRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  if (value == null || value === '') return null
  return (
    <div className="space-y-1">
      <Label className="text-muted-foreground">{label}</Label>
      <div className="text-sm">{value}</div>
    </div>
  )
}
