import * as React from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { CalendarCheck, AlertTriangle, Clock, FileText, Play } from 'lucide-react'
import type {
  PmTemplateRow,
  PmScheduleRow,
  DuePmRow,
  OverduePmRow,
} from '@workorder-systems/sdk'
import { getDbClient } from '../lib/db-client'
import { useTenant } from '../contexts/tenant'
import { ensureTenantContextWithCatalogs } from '../lib/route-loaders'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { DataTable } from '@workspace/ui/components/data-table/data-table'
import { DataTableColumnHeader } from '@workspace/ui/components/data-table/data-table-column-header'
import { DataTableSkeleton } from '@workspace/ui/components/data-table/data-table-skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { toast } from 'sonner'
import { useHasPermission } from '../hooks/use-permissions'
import { getCoreRowModel, useReactTable } from '@tanstack/react-table'

export const Route = createFileRoute('/_protected/dashboard/pm/')({
  beforeLoad: async ({ context }) => ensureTenantContextWithCatalogs(context),
  component: PmPage,
})

function PmPage() {
  const { activeTenantId } = useTenant()
  const client = getDbClient()
  const queryClient = useQueryClient()
  const canTriggerPm = useHasPermission('pm.trigger')

  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['pm-templates', activeTenantId],
    queryFn: () => client.pm.listTemplates(),
    enabled: !!activeTenantId,
  })

  const { data: schedules = [], isLoading: schedulesLoading } = useQuery({
    queryKey: ['pm-schedules', activeTenantId],
    queryFn: () => client.pm.listSchedules(),
    enabled: !!activeTenantId,
  })

  const { data: duePms = [], isLoading: dueLoading } = useQuery({
    queryKey: ['pm-due', activeTenantId],
    queryFn: () => client.pm.listDue(),
    enabled: !!activeTenantId,
  })

  const { data: overduePms = [], isLoading: overdueLoading } = useQuery({
    queryKey: ['pm-overdue', activeTenantId],
    queryFn: () => client.pm.listOverdue(),
    enabled: !!activeTenantId,
  })

  const templatesColumns = React.useMemo<ColumnDef<PmTemplateRow>[]>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: ({ column }: { column: any }) => <DataTableColumnHeader column={column} label="Name" />,
        cell: ({ row }: { row: any }) => {
          const name = row.getValue('name') as string | null
          return <span className="font-medium">{name ?? '—'}</span>
        },
      },
      {
        id: 'trigger_type',
        accessorKey: 'trigger_type',
        header: ({ column }: { column: any }) => <DataTableColumnHeader column={column} label="Trigger Type" />,
        cell: ({ row }: { row: any }) => {
          const triggerType = row.getValue('trigger_type') as string | null
          return <span className="text-sm text-muted-foreground">{triggerType ?? '—'}</span>
        },
      },
      {
        id: 'estimated_hours',
        accessorKey: 'estimated_hours',
        header: ({ column }: { column: any }) => <DataTableColumnHeader column={column} label="Est. Hours" />,
        cell: ({ row }: { row: any }) => {
          const hours = row.getValue('estimated_hours') as number | null
          return <span className="text-sm">{hours ? `${hours}h` : '—'}</span>
        },
      },
      {
        id: 'description',
        accessorKey: 'description',
        header: ({ column }: { column: any }) => <DataTableColumnHeader column={column} label="Description" />,
        cell: ({ row }: { row: any }) => {
          const desc = row.getValue('description') as string | null
          return <span className="text-sm text-muted-foreground">{desc ?? '—'}</span>
        },
      },
    ],
    []
  )

  const triggerPmMutation = useMutation({
    mutationFn: (pmScheduleId: string) =>
      client.pm.triggerManualPm({
        tenantId: activeTenantId!,
        pmScheduleId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-due', activeTenantId] })
      queryClient.invalidateQueries({ queryKey: ['pm-overdue', activeTenantId] })
      toast.success('PM work order created')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const schedulesColumns = React.useMemo<ColumnDef<PmScheduleRow>[]>(
    () => [
      {
        id: 'title',
        accessorKey: 'title',
        header: ({ column }: { column: any }) => <DataTableColumnHeader column={column} label="Title" />,
        cell: ({ row }: { row: any }) => {
          const title = row.getValue('title') as string | null
          return <span className="font-medium">{title ?? '—'}</span>
        },
      },
      {
        id: 'asset_name',
        accessorKey: 'asset_name',
        header: ({ column }: { column: any }) => <DataTableColumnHeader column={column} label="Asset" />,
        cell: ({ row }: { row: any }) => {
          const assetName = row.getValue('asset_name') as string | null
          const assetId = row.original.asset_id as string | null
          if (!assetId) return <span>{assetName ?? '—'}</span>
          return (
            <Link
              to="/dashboard/assets/$id"
              params={{ id: assetId }}
              className="text-primary hover:underline"
            >
              {assetName ?? '—'}
            </Link>
          )
        },
      },
      {
        id: 'trigger_type',
        accessorKey: 'trigger_type',
        header: ({ column }: { column: any }) => <DataTableColumnHeader column={column} label="Trigger Type" />,
        cell: ({ row }: { row: any }) => {
          const triggerType = row.getValue('trigger_type') as string | null
          return <span className="text-sm text-muted-foreground">{triggerType ?? '—'}</span>
        },
      },
      {
        id: 'is_active',
        accessorKey: 'is_active',
        header: ({ column }: { column: any }) => <DataTableColumnHeader column={column} label="Status" />,
        cell: ({ row }: { row: any }) => {
          const isActive = row.getValue('is_active') as boolean | null
          return (
            <Badge variant={isActive ? 'default' : 'secondary'}>
              {isActive ? 'Active' : 'Inactive'}
            </Badge>
          )
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }: { row: any }) => {
          const schedule = row.original
          return canTriggerPm ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (schedule.id && confirm('Trigger manual PM for this schedule?')) {
                  triggerPmMutation.mutate(schedule.id)
                }
              }}
              disabled={triggerPmMutation.isPending}
            >
              <Play className="h-3 w-3 mr-1" />
              Trigger
            </Button>
          ) : null
        },
      },
    ],
    [canTriggerPm, triggerPmMutation]
  )

  const duePmsColumns = React.useMemo<ColumnDef<DuePmRow>[]>(
    () => [
      {
        id: 'title',
        accessorKey: 'title',
        header: ({ column }: { column: any }) => <DataTableColumnHeader column={column} label="Title" />,
        cell: ({ row }: { row: any }) => {
          const title = row.getValue('title') as string | null
          return <span className="font-medium">{title ?? '—'}</span>
        },
      },
      {
        id: 'asset_name',
        accessorKey: 'asset_name',
        header: ({ column }: { column: any }) => <DataTableColumnHeader column={column} label="Asset" />,
        cell: ({ row }: { row: any }) => {
          const assetName = row.getValue('asset_name') as string | null
          const assetId = row.original.asset_id as string | null
          if (!assetId) return <span>{assetName ?? '—'}</span>
          return (
            <Link
              to="/dashboard/assets/$id"
              params={{ id: assetId }}
              className="text-primary hover:underline"
            >
              {assetName ?? '—'}
            </Link>
          )
        },
      },
      {
        id: 'due_date',
        accessorKey: 'due_date',
        header: ({ column }: { column: any }) => <DataTableColumnHeader column={column} label="Due Date" />,
        cell: ({ row }: { row: any }) => {
          const dueDate = row.getValue('due_date') as string | null
          if (!dueDate) return <span>—</span>
          return <span className="text-sm">{new Date(dueDate).toLocaleDateString()}</span>
        },
      },
    ],
    []
  )

  const overduePmsColumns = React.useMemo<ColumnDef<OverduePmRow>[]>(
    () => [
      {
        id: 'title',
        accessorKey: 'title',
        header: ({ column }: { column: any }) => <DataTableColumnHeader column={column} label="Title" />,
        cell: ({ row }: { row: any }) => {
          const title = row.getValue('title') as string | null
          return <span className="font-medium">{title ?? '—'}</span>
        },
      },
      {
        id: 'asset_name',
        accessorKey: 'asset_name',
        header: ({ column }: { column: any }) => <DataTableColumnHeader column={column} label="Asset" />,
        cell: ({ row }: { row: any }) => {
          const assetName = row.getValue('asset_name') as string | null
          const assetId = row.original.asset_id as string | null
          if (!assetId) return <span>{assetName ?? '—'}</span>
          return (
            <Link
              to="/dashboard/assets/$id"
              params={{ id: assetId }}
              className="text-primary hover:underline"
            >
              {assetName ?? '—'}
            </Link>
          )
        },
      },
      {
        id: 'due_date',
        accessorKey: 'due_date',
        header: ({ column }: { column: any }) => <DataTableColumnHeader column={column} label="Due Date" />,
        cell: ({ row }: { row: any }) => {
          const dueDate = row.getValue('due_date') as string | null
          if (!dueDate) return <span>—</span>
          return <span className="text-sm text-destructive">{new Date(dueDate).toLocaleDateString()}</span>
        },
      },
    ],
    []
  )

  const templatesTable = useReactTable({
    data: templates,
    columns: templatesColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row: PmTemplateRow) => row.id ?? '',
  })

  const schedulesTable = useReactTable({
    data: schedules,
    columns: schedulesColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row: PmScheduleRow) => row.id ?? '',
  })

  const duePmsTable = useReactTable({
    data: duePms,
    columns: duePmsColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row: DuePmRow) => (row as Record<string, unknown>).id as string ?? '',
  })

  const overduePmsTable = useReactTable({
    data: overduePms,
    columns: overduePmsColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row: OverduePmRow) => (row as Record<string, unknown>).id as string ?? '',
  })

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Preventive Maintenance</h1>
        <p className="text-sm text-muted-foreground">
          Manage PM templates, schedules, and track due/overdue maintenance
        </p>
      </div>

      <Tabs defaultValue="due" className="w-full">
        <TabsList>
          <TabsTrigger value="due">
            Due PMs
            {duePms.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {duePms.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="overdue">
            Overdue PMs
            {overduePms.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {overduePms.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="schedules">Schedules</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="due" className="space-y-4">
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Due Preventive Maintenance
              </CardTitle>
              <CardDescription>PMs that are due for execution</CardDescription>
            </CardHeader>
            <CardContent>
              {dueLoading ? (
                <DataTableSkeleton columnCount={3} rowCount={5} />
              ) : duePms.length === 0 ? (
                <div className="py-12 text-center">
                  <Clock className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No PMs due at this time</p>
                </div>
              ) : (
                <DataTable table={duePmsTable} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overdue" className="space-y-4">
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Overdue Preventive Maintenance
              </CardTitle>
              <CardDescription>PMs that are past their due date</CardDescription>
            </CardHeader>
            <CardContent>
              {overdueLoading ? (
                <DataTableSkeleton columnCount={3} rowCount={5} />
              ) : overduePms.length === 0 ? (
                <div className="py-12 text-center">
                  <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No overdue PMs</p>
                </div>
              ) : (
                <DataTable table={overduePmsTable} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedules" className="space-y-4">
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarCheck className="h-5 w-5" />
                PM Schedules
              </CardTitle>
              <CardDescription>Active preventive maintenance schedules</CardDescription>
            </CardHeader>
            <CardContent>
              {schedulesLoading ? (
                <DataTableSkeleton columnCount={4} rowCount={5} />
              ) : schedules.length === 0 ? (
                <div className="py-12 text-center">
                  <CalendarCheck className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No PM schedules configured</p>
                </div>
              ) : (
                <DataTable table={schedulesTable} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                PM Templates
              </CardTitle>
              <CardDescription>Reusable PM templates for creating schedules</CardDescription>
            </CardHeader>
            <CardContent>
              {templatesLoading ? (
                <DataTableSkeleton columnCount={4} rowCount={5} />
              ) : templates.length === 0 ? (
                <div className="py-12 text-center">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No PM templates configured</p>
                </div>
              ) : (
                <DataTable table={templatesTable} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
