import * as React from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import type { ColumnDef, Row } from '@tanstack/react-table'
import { useQuery } from '@tanstack/react-query'
import { ClipboardList, Plus, Upload } from 'lucide-react'
import type { WorkOrderRow } from '@workorder-systems/sdk'
import { getDbClient } from '../lib/db-client'
import { catalogQueryOptions } from '../lib/catalog-queries'
import { useTenant } from '../contexts/tenant'
import { ensureTenantContextWithCatalogs } from '../lib/route-loaders'
import {
  DEFAULT_PAGE_SIZE,
  createDataTableQueryKeys,
} from '../lib/data-table-query-keys'
import { DataTableErrorMessage } from '../components/data-table-error-message'
import { useWorkOrdersPageStore } from '../stores/workorders-page'
import { DataTable } from '@workspace/ui/components/data-table/data-table'
import { DataTableColumnHeader } from '@workspace/ui/components/data-table/data-table-column-header'
import { DataTableToolbar } from '@workspace/ui/components/data-table/data-table-toolbar'
import { DataTableSkeleton } from '@workspace/ui/components/data-table/data-table-skeleton'
import { useDataTable } from '@workspace/ui/hooks/use-data-table'
import { Button } from '@workspace/ui/components/button'
import { ExtensionPoint } from '@workspace/ui/components/app-shell'
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

  const { data: workOrders = [], isLoading, isError, error } = useQuery({
    queryKey: ['work-orders', activeTenantId],
    queryFn: () => client.workOrders.list(),
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
      .map((s) => ({ label: s.name ?? s.key ?? '', value: s.key ?? '' }))
      .filter((o) => o.value)
  }, [statusCatalog])

  const priorityOptions = React.useMemo(() => {
    return priorityCatalog
      .filter((p) => p.entity_type === WORK_ORDER_ENTITY_TYPE)
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
      .map((p) => ({ label: p.name ?? p.key ?? '', value: p.key ?? '' }))
      .filter((o) => o.value)
  }, [priorityCatalog])

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
        cell: ({ row }) => (
          <span className="font-medium">{row.getValue('title') ?? '—'}</span>
        ),
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
        cell: ({ row }) => {
          const status = row.getValue('status') as string | null
          const label = statusOptions.find((o) => o.value === status)?.label ?? status
          return (
            <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-muted text-muted-foreground">
              {label ?? '—'}
            </span>
          )
        },
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
        cell: ({ row }) => {
          const priority = row.getValue('priority') as string | null
          const label = priorityOptions.find((o) => o.value === priority)?.label ?? priority
          return <span>{label ?? '—'}</span>
        },
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
    ],
    [statusOptions, priorityOptions],
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
        <DataTableSkeleton columnCount={6} rowCount={10} />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <ExtensionPoint name="header.right">
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="ghost">
            <Link to="/dashboard/workorders/import">
              <Upload className="size-4" />
            </Link>
          </Button>
          <Button onClick={openCreateModal} size="sm" variant="outline">
            <Plus className="size-4" />
            New
          </Button>
        </div>
      </ExtensionPoint>

      <DataTable table={table}>
        <DataTableToolbar table={table} />
      </DataTable>

      {/* Create work order modal */}
      <ResponsiveDialog open={isCreateModalOpen} onOpenChange={(open) => !open && closeCreateModal()}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>New work order</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Create a new work order. Form can be implemented here.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <ResponsiveDialogFooter>
            <ResponsiveDialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </ResponsiveDialogClose>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  )
}
