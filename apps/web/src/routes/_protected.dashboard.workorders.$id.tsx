import * as React from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef, Column, Row } from '@tanstack/react-table'
import { getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { ClipboardList, History, Loader2 } from 'lucide-react'
import type { WorkOrderRow, SimilarPastFixResult } from '@workorder-systems/sdk'
import { getDbClient } from '../lib/db-client'
import { useTenant } from '../contexts/tenant'
import { ensureTenantContextWithCatalogs } from '../lib/route-loaders'
import { catalogQueryOptions } from '../lib/catalog-queries'
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
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      <h1 className="text-xl font-semibold truncate">
        {workOrder.title ?? 'Work order'}
      </h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="size-4" />
              Details
            </CardTitle>
            <CardDescription>Work order information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <DetailRow
              label="Status"
              value={
                <StatusBadge
                  statusKey={workOrder.status}
                  statusCatalog={workOrderStatusCatalog}
                />
              }
            />
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cause & resolution</CardTitle>
            <CardDescription>
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="size-4" />
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
            <p className="text-sm text-muted-foreground">
              Could not load similar past fixes. You may have hit a rate limit or the feature may be disabled.
            </p>
          ) : similarPastFixes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No similar past fixes found.
            </p>
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
