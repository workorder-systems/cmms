import * as React from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import type { ColumnDef, Row } from '@tanstack/react-table'
import { useQuery } from '@tanstack/react-query'
import { ClipboardList, Plus, Upload, FileText } from 'lucide-react'
import type { WorkOrderRow } from '@workorder-systems/sdk'
import { getDbClient } from '../lib/db-client'
import { catalogQueryOptions } from '../lib/catalog-queries'
import { useTenant } from '../contexts/tenant'
import { ensureTenantContextWithCatalogs } from '../lib/route-loaders'
import { useHasPermission } from '../hooks/use-permissions'
import {
  DEFAULT_PAGE_SIZE,
  createDataTableQueryKeys,
} from '../lib/data-table-query-keys'
import { DataTableErrorMessage } from '../components/data-table-error-message'
import { StatusBadge } from '../components/status-badge'
import { PriorityBadge } from '../components/priority-badge'
import { useWorkOrdersPageStore } from '../stores/workorders-page'
import { DataTable } from '@workspace/ui/components/data-table/data-table'
import { DataTableColumnHeader } from '@workspace/ui/components/data-table/data-table-column-header'
import { DataTableToolbar } from '@workspace/ui/components/data-table/data-table-toolbar'
import { DataTableSkeleton } from '@workspace/ui/components/data-table/data-table-skeleton'
import { useDataTable } from '@workspace/ui/hooks/use-data-table'
import { Button } from '@workspace/ui/components/button'
import { ExtensionPoint } from '@workspace/ui/components/app-shell'
import { Label } from '@workspace/ui/components/label'
import { Switch } from '@workspace/ui/components/switch'
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogClose,
} from '@workspace/ui/components/responsive-dialog'

export const Route = createFileRoute('/_protected/dashboard/workorders/')({
  beforeLoad: async ({ context }) => ensureTenantContextWithCatalogs(context),
  component: WorkOrdersPage,
})

const WORK_ORDER_ENTITY_TYPE = 'work_order'
const QUERY_KEYS = createDataTableQueryKeys('workOrders')

function WorkOrdersPage() {
  const { activeTenantId } = useTenant()
  const client = getDbClient()
  const { hasPermission: canCreateWorkOrder } = useHasPermission('work_orders.create')
  const [includeDrafts, setIncludeDrafts] = React.useState(false)

  const { data: workOrders = [], isLoading, isError, error } = useQuery({
    queryKey: ['work-orders', activeTenantId, includeDrafts],
    queryFn: () => (includeDrafts ? client.workOrders.listIncludingDraft() : client.workOrders.list()),
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

  const statusOptions = React.useMemo(() => {
    return statusCatalog
      .filter((s) => s.entity_type === WORK_ORDER_ENTITY_TYPE)
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
      .map((s) => ({
        label: s.name ?? s.key ?? '',
        value: s.key ?? '',
        color: s.color ?? null,
      }))
      .filter((o) => o.value)
  }, [statusCatalog])

  const priorityOptions = React.useMemo(() => {
    return priorityCatalog
      .filter((p) => p.entity_type === WORK_ORDER_ENTITY_TYPE)
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
      .map((p) => ({
        label: p.name ?? p.key ?? '',
        value: p.key ?? '',
        color: p.color ?? null,
      }))
      .filter((o) => o.value)
  }, [priorityCatalog])

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

  const isCreateModalOpen = useWorkOrdersPageStore((s) => s.isCreateModalOpen)
  const openCreateModal = useWorkOrdersPageStore((s) => s.openCreateModal)
  const closeCreateModal = useWorkOrdersPageStore((s) => s.closeCreateModal)

  const columns = React.useMemo<ColumnDef<WorkOrderRow>[]>(
    () => [
      {
        id: 'title',
        accessorKey: 'title',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Title" />
        ),
        cell: ({ row }) => {
          const id = (row.original as WorkOrderRow).id
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
        meta: {
          label: 'Title',
          placeholder: 'Search titles...',
          variant: 'text',
          icon: ClipboardList,
        },
        enableColumnFilter: true,
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Status" />
        ),
        cell: ({ row }) => (
          <StatusBadge
            statusKey={row.getValue('status') as string | null}
            statusCatalog={workOrderStatusCatalog}
          />
        ),
        meta: {
          label: 'Status',
          variant: 'multiSelect',
          options: statusOptions,
        },
        enableColumnFilter: true,
        filterFn: (row: Row<WorkOrderRow>, id: string, filterValue: unknown) => {
          const value = row.getValue(id) as string | null
          const values = Array.isArray(filterValue) ? filterValue : [filterValue]
          if (!values.length) return true
          return value != null && values.includes(value)
        },
      },
      {
        id: 'priority',
        accessorKey: 'priority',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Priority" />
        ),
        cell: ({ row }) => (
          <PriorityBadge
            priorityKey={row.getValue('priority') as string | null}
            priorityCatalog={workOrderPriorityCatalog}
          />
        ),
        meta: {
          label: 'Priority',
          variant: 'multiSelect',
          options: priorityOptions,
        },
        enableColumnFilter: true,
        filterFn: (row: Row<WorkOrderRow>, id: string, filterValue: unknown) => {
          const value = row.getValue(id) as string | null
          const values = Array.isArray(filterValue) ? filterValue : [filterValue]
          if (!values.length) return true
          return value != null && values.includes(value)
        },
      },
      {
        id: 'assigned_to_name',
        accessorKey: 'assigned_to_name',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Assigned to" />
        ),
        cell: ({ row }) => (
          <span>{row.getValue('assigned_to_name') ?? '—'}</span>
        ),
      },
      {
        id: 'due_date',
        accessorKey: 'due_date',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Due date" />
        ),
        cell: ({ row }) => {
          const due = row.getValue('due_date') as string | null
          return due ? new Date(due).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—'
        },
        meta: {
          label: 'Due date',
          variant: 'date',
        },
        enableColumnFilter: true,
      },
      {
        id: 'created_at',
        accessorKey: 'created_at',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Created" />
        ),
        cell: ({ row }) => {
          const created = row.getValue('created_at') as string | null
          return created ? new Date(created).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—'
        },
      },
      {
        id: 'cause',
        accessorKey: 'cause',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Cause" />
        ),
        cell: ({ row }) => {
          const cause = row.getValue('cause') as string | null
          if (!cause) return '—'
          return (
            <span className="max-w-[180px] truncate block" title={cause}>
              {cause}
            </span>
          )
        },
        enableColumnFilter: false,
      },
      {
        id: 'resolution',
        accessorKey: 'resolution',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Resolution" />
        ),
        cell: ({ row }) => {
          const resolution = row.getValue('resolution') as string | null
          if (!resolution) return '—'
          return (
            <span className="max-w-[180px] truncate block" title={resolution}>
              {resolution}
            </span>
          )
        },
        enableColumnFilter: false,
      },
    ],
    [
      statusOptions,
      priorityOptions,
      workOrderStatusCatalog,
      workOrderPriorityCatalog,
    ],
  )

  const pageCount = Math.ceil(workOrders.length / DEFAULT_PAGE_SIZE) || 1
  const { table } = useDataTable({
    data: workOrders,
    columns,
    pageCount,
    initialState: {
      pagination: { pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE },
    },
    queryKeys: QUERY_KEYS,
    getRowId: (row) => (row as WorkOrderRow).id ?? '',
  })

  if (isError) {
    return (
      <DataTableErrorMessage resourceName="work orders" error={error ?? null} />
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="space-y-2">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="h-4 w-64 animate-pulse rounded bg-muted" />
        </div>
        <DataTableSkeleton columnCount={6} rowCount={10} />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 pt-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <h1 className="text-3xl font-bold tracking-tight">Work Orders</h1>
          <p className="text-base text-muted-foreground">
            Manage and track all work orders
          </p>
        </div>
        <ExtensionPoint name="header.right">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border-2 border-border/50 bg-card px-4 py-2 shadow-sm transition-all hover:border-primary/20 hover:shadow">
              <Switch
                id="include-drafts"
                checked={includeDrafts}
                onCheckedChange={setIncludeDrafts}
              />
              <Label htmlFor="include-drafts" className="text-sm font-medium cursor-pointer">
                Include drafts
              </Label>
            </div>
            <Button
              asChild
              size="default"
              variant="outline"
              title="Import work orders from CSV"
              className="shadow-sm"
            >
              <Link to="/dashboard/workorders/import">
                <Upload className="size-4" />
                <span className="sr-only md:not-sr-only md:ml-2">Import</span>
              </Link>
            </Button>
            {canCreateWorkOrder && (
              <Button asChild size="default" className="gap-2 shadow-sm">
                <Link to="/dashboard/workorders/new">
                  <Plus className="size-4" />
                  <span className="hidden sm:inline">New Work Order</span>
                  <span className="sm:hidden">New</span>
                </Link>
              </Button>
            )}
          </div>
        </ExtensionPoint>
      </div>

      <div className="rounded-xl border-2 border-border/50 bg-card shadow-sm">
        <DataTable table={table}>
          <DataTableToolbar table={table} />
        </DataTable>
      </div>
    </div>
  )
}
