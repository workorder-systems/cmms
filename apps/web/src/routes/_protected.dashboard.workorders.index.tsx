import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import type { ColumnDef, Row } from '@tanstack/react-table'
import { useQuery } from '@tanstack/react-query'
import { ClipboardList, Plus } from 'lucide-react'
import type { WorkOrderRow } from '@workorder-systems/sdk'
import { getDbClient } from '../lib/db-client'
import { prefetchCatalogs, catalogQueryOptions } from '../lib/catalog-queries'
import { useTenant } from '../contexts/tenant'
import { useWorkOrdersPageStore } from '../stores/workorders-page'
import { DataTable } from '@workspace/ui/components/data-table/data-table'
import { DataTableColumnHeader } from '@workspace/ui/components/data-table/data-table-column-header'
import { DataTableToolbar } from '@workspace/ui/components/data-table/data-table-toolbar'
import { DataTableSkeleton } from '@workspace/ui/components/data-table/data-table-skeleton'
import { useDataTable } from '@workspace/ui/hooks/use-data-table'
import { Button } from '@workspace/ui/components/button'
import { ExtensionPoint } from '@workspace/ui/components/app-shell'
import { Separator } from '@workspace/ui/components/separator'
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogClose,
} from '@workspace/ui/components/responsive-dialog'

const TENANT_STORAGE_KEY = 'dashboard_tenant_id'

export const Route = createFileRoute('/_protected/dashboard/workorders/')({
  beforeLoad: async ({ context }) => {
    if (typeof window === 'undefined') return
    const tenantId = window.localStorage.getItem(TENANT_STORAGE_KEY)
    if (!tenantId) return
    await context.dbClient.setTenant(tenantId)
    await prefetchCatalogs(context.queryClient, context.dbClient, tenantId)
  },
  component: WorkOrdersPage,
})

/** Right sidebar content: shows selected work order details. Uses store + query so it stays live when portaled. */
function WorkOrderRightSidebarContent() {
  const client = getDbClient()
  const { activeTenantId } = useTenant()
  const selectedWorkOrderId = useWorkOrdersPageStore((s) => s.selectedWorkOrderId)
  const setSelectedWorkOrderId = useWorkOrdersPageStore((s) => s.setSelectedWorkOrderId)
  const { data: workOrders = [] } = useQuery({
    queryKey: ['work-orders', activeTenantId],
    queryFn: () => client.workOrders.list(),
    enabled: !!activeTenantId,
  })
  const selectedWorkOrder = selectedWorkOrderId
    ? workOrders.find((wo) => wo?.id === selectedWorkOrderId)
    : null

  if (!selectedWorkOrder) {
    return (
      <p className="p-2 text-sm text-muted-foreground">Select a work order</p>
    )
  }

  return (
    <div className="flex flex-col gap-3 p-2">
      <div className="space-y-1">
        <p className="text-sm font-medium leading-none">{selectedWorkOrder.title ?? '—'}</p>
        <p className="text-xs text-muted-foreground">
          {selectedWorkOrder.status ?? '—'} · {selectedWorkOrder.priority ?? '—'}
        </p>
      </div>
      <Separator />
      <dl className="grid gap-2 text-sm">
        <div>
          <dt className="text-muted-foreground">Status</dt>
          <dd>{selectedWorkOrder.status ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Priority</dt>
          <dd>{selectedWorkOrder.priority ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Assigned to</dt>
          <dd>{selectedWorkOrder.assigned_to_name ?? '—'}</dd>
        </div>
        {selectedWorkOrder.due_date && (
          <div>
            <dt className="text-muted-foreground">Due</dt>
            <dd>{new Date(selectedWorkOrder.due_date).toLocaleDateString(undefined, { dateStyle: 'medium' })}</dd>
          </div>
        )}
      </dl>
      {selectedWorkOrder.description && (
        <>
          <Separator />
          <div>
            <dt className="mb-1 text-muted-foreground text-xs">Description</dt>
            <dd className="text-sm whitespace-pre-wrap">{selectedWorkOrder.description}</dd>
          </div>
        </>
      )}
      <button
        type="button"
        className="mt-2 text-left text-xs text-muted-foreground hover:underline"
        onClick={() => setSelectedWorkOrderId(null)}
      >
        Clear selection
      </button>
    </div>
  )
}

const PAGE_SIZE = 10
const WORK_ORDER_ENTITY_TYPE = 'work_order'
const QUERY_KEYS = {
  page: 'workOrders_page',
  perPage: 'workOrders_perPage',
  sort: 'workOrders_sort',
  filters: 'workOrders_filters',
  joinOperator: 'workOrders_joinOperator',
}

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

  const selectedWorkOrderId = useWorkOrdersPageStore((s) => s.selectedWorkOrderId)
  const setSelectedWorkOrderId = useWorkOrdersPageStore((s) => s.setSelectedWorkOrderId)
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
          <button
            type="button"
            className="text-left font-medium hover:underline"
            onClick={() => setSelectedWorkOrderId(row.original?.id ?? null)}
          >
            {row.getValue('title') ?? '—'}
          </button>
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
    [setSelectedWorkOrderId, statusOptions, priorityOptions],
  )

  const pageCount = Math.ceil(workOrders.length / PAGE_SIZE) || 1
  const { table } = useDataTable({
    data: workOrders,
    columns,
    pageCount,
    initialState: { pagination: { pageIndex: 0, pageSize: PAGE_SIZE } },
    queryKeys: QUERY_KEYS,
    getRowId: (row) => (row as WorkOrderRow).id ?? '',
  })

  const selectedWorkOrder = selectedWorkOrderId
    ? workOrders.find((wo) => wo?.id === selectedWorkOrderId)
    : null

  if (isError) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <p className="text-destructive">
          Failed to load work orders: {error?.message ?? 'Unknown error'}
        </p>
      </div>
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
        <Button onClick={openCreateModal} size="sm" variant="outline">
          <Plus className="size-4" />
          New work order
        </Button>
      </ExtensionPoint>

      <ExtensionPoint name="sidebar.right.header">
        <span className="font-semibold">Details</span>
      </ExtensionPoint>
      <ExtensionPoint name="sidebar.right.content">
        <WorkOrderRightSidebarContent />
      </ExtensionPoint>

      <DataTable table={table}>
        <DataTableToolbar table={table} />
      </DataTable>

      {/* Detail: responsive dialog when a row is selected */}
      <ResponsiveDialog
        open={!!selectedWorkOrderId}
        onOpenChange={(open) => !open && setSelectedWorkOrderId(null)}
      >
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>
              {selectedWorkOrder?.title ?? 'Work order'}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              View work order details. Full detail view can be added later.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          {selectedWorkOrder && (
            <div className="grid gap-2 text-sm">
              <p><strong>Status:</strong> {selectedWorkOrder.status ?? '—'}</p>
              <p><strong>Priority:</strong> {selectedWorkOrder.priority ?? '—'}</p>
              <p><strong>Assigned to:</strong> {selectedWorkOrder.assigned_to_name ?? '—'}</p>
              {selectedWorkOrder.due_date && (
                <p><strong>Due:</strong> {new Date(selectedWorkOrder.due_date).toLocaleDateString(undefined, { dateStyle: 'medium' })}</p>
              )}
              {selectedWorkOrder.description && (
                <p><strong>Description:</strong> {selectedWorkOrder.description}</p>
              )}
            </div>
          )}
          <ResponsiveDialogFooter>
            <ResponsiveDialogClose asChild>
              <Button variant="outline">Close</Button>
            </ResponsiveDialogClose>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Create: responsive dialog placeholder */}
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
