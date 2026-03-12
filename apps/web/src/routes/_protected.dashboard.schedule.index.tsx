import * as React from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Calendar, Plus, Trash2 } from 'lucide-react'
import type { ScheduleBlockRow } from '@workorder-systems/sdk'
import { getDbClient } from '../lib/db-client'
import { useTenant } from '../contexts/tenant'
import { ensureTenantContext } from '../lib/route-loaders'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { DataTable } from '@workspace/ui/components/data-table/data-table'
import { DataTableColumnHeader } from '@workspace/ui/components/data-table/data-table-column-header'
import { DataTableSkeleton } from '@workspace/ui/components/data-table/data-table-skeleton'
import { DataTableErrorMessage } from '../components/data-table-error-message'
import { Button } from '@workspace/ui/components/button'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'
import { getCoreRowModel, useReactTable } from '@tanstack/react-table'

export const Route = createFileRoute('/_protected/dashboard/schedule/')({
  beforeLoad: async ({ context }) => ensureTenantContext(context),
  component: SchedulePage,
})

function SchedulePage() {
  const { activeTenantId } = useTenant()
  const client = getDbClient()
  const queryClient = useQueryClient()

  const { data: scheduleBlocks = [], isLoading, isError, error } = useQuery({
    queryKey: ['schedule-blocks', activeTenantId],
    queryFn: () => client.scheduling.listScheduleBlocks(),
    enabled: !!activeTenantId,
  })

  const unscheduleMutation = useMutation({
    mutationFn: (params: { scheduleBlockId?: string; workOrderId?: string }) =>
      client.scheduling.unscheduleWorkOrder(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-blocks', activeTenantId] })
      toast.success('Work order unscheduled')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const columns = React.useMemo<ColumnDef<ScheduleBlockRow>[]>(
    () => [
      {
        id: 'work_order_title',
        accessorKey: 'work_order_title',
        header: ({ column }: { column: any }) => (
          <DataTableColumnHeader column={column} label="Work Order" />
        ),
        cell: ({ row }: { row: any }) => {
          const block = row.original
          const title = row.getValue('work_order_title') as string
          const woId = block.work_order_id
          return woId ? (
            <Link
              to="/dashboard/workorders/$id"
              params={{ id: woId }}
              className="font-medium text-primary hover:underline"
            >
              {title ?? woId}
            </Link>
          ) : (
            <span className="font-medium">{title ?? '—'}</span>
          )
        },
      },
      {
        id: 'technician_id',
        accessorKey: 'technician_id',
        header: ({ column }: { column: any }) => (
          <DataTableColumnHeader column={column} label="Technician" />
        ),
        cell: ({ row }: { row: any }) => {
          const techId = row.getValue('technician_id') as string | null
          return <span className="text-sm">{techId ?? '—'}</span>
        },
      },
      {
        id: 'start_time',
        accessorKey: 'start_time',
        header: ({ column }: { column: any }) => (
          <DataTableColumnHeader column={column} label="Start" />
        ),
        cell: ({ row }: { row: any }) => {
          const start = row.getValue('start_time') as string | null
          return start
            ? new Date(start).toLocaleString(undefined, {
                dateStyle: 'short',
                timeStyle: 'short',
              })
            : '—'
        },
      },
      {
        id: 'end_time',
        accessorKey: 'end_time',
        header: ({ column }: { column: any }) => (
          <DataTableColumnHeader column={column} label="End" />
        ),
        cell: ({ row }: { row: any }) => {
          const end = row.getValue('end_time') as string | null
          return end
            ? new Date(end).toLocaleString(undefined, {
                dateStyle: 'short',
                timeStyle: 'short',
              })
            : '—'
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }: { row: any }) => {
          const block = row.original
          return (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                if (confirm('Unschedule this work order?')) {
                  unscheduleMutation.mutate({ scheduleBlockId: block.id })
                }
              }}
              disabled={unscheduleMutation.isPending}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )
        },
      },
    ],
    [unscheduleMutation]
  )

  const scheduleBlocksTable = useReactTable({
    data: scheduleBlocks,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row: ScheduleBlockRow) => row.id ?? '',
  })

  if (isError) {
    return (
      <DataTableErrorMessage resourceName="schedule" error={error ?? null} />
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Schedule</h1>
        <p className="text-sm text-muted-foreground">View and manage work order schedules</p>
      </div>

      <Card className="transition-shadow hover:shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule Blocks
          </CardTitle>
          <CardDescription>Scheduled work orders and assignments</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <DataTableSkeleton columnCount={4} rowCount={5} />
          ) : scheduleBlocks.length === 0 ? (
            <div className="py-12 text-center">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No schedule blocks</p>
              <p className="text-xs text-muted-foreground mt-1">Schedule work orders to see them here</p>
            </div>
            ) : (
              <DataTable table={scheduleBlocksTable} />
            )}
        </CardContent>
      </Card>
    </div>
  )
}
