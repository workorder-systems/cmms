import * as React from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { useQuery } from '@tanstack/react-query'
import { Plus, Upload, Users } from 'lucide-react'
import type { DepartmentRow } from '@workorder-systems/sdk'
import { getDbClient } from '../lib/db-client'
import { useTenant } from '../contexts/tenant'
import { ensureTenantContext } from '../lib/route-loaders'
import {
  DEFAULT_PAGE_SIZE,
  createDataTableQueryKeys,
} from '../lib/data-table-query-keys'
import { DataTableErrorMessage } from '../components/data-table-error-message'
import { useDepartmentsPageStore } from '../stores/departments-page'
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

const QUERY_KEYS = createDataTableQueryKeys('departments')

export const Route = createFileRoute('/_protected/dashboard/departments/')({
  beforeLoad: async ({ context }) => ensureTenantContext(context),
  component: DepartmentsPage,
})

const PAGE_SIZE = 10
const QUERY_KEYS = {
  page: 'departments_page',
  perPage: 'departments_perPage',
  sort: 'departments_sort',
  filters: 'departments_filters',
  joinOperator: 'departments_joinOperator',
}

function DepartmentsPage() {
  const { activeTenantId } = useTenant()
  const client = getDbClient()

  const { data: departments = [], isLoading, isError, error } = useQuery({
    queryKey: ['departments', activeTenantId],
    queryFn: () => client.departments.list(),
    enabled: !!activeTenantId,
  })

  const isCreateModalOpen = useDepartmentsPageStore((s) => s.isCreateModalOpen)
  const openCreateModal = useDepartmentsPageStore((s) => s.openCreateModal)
  const closeCreateModal = useDepartmentsPageStore((s) => s.closeCreateModal)

  const columns = React.useMemo<ColumnDef<DepartmentRow>[]>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Name" />
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.getValue('name') ?? '—'}</span>
        ),
        meta: {
          label: 'Name',
          placeholder: 'Search names...',
          variant: 'text',
          icon: Users,
        },
        enableColumnFilter: true,
      },
      {
        id: 'code',
        accessorKey: 'code',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Code" />
        ),
        cell: ({ row }) => (
          <span>{row.getValue('code') ?? '—'}</span>
        ),
        meta: {
          label: 'Code',
          placeholder: 'Search...',
          variant: 'text',
        },
        enableColumnFilter: true,
      },
      {
        id: 'description',
        accessorKey: 'description',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Description" />
        ),
        cell: ({ row }) => (
          <span className="max-w-[200px] truncate block" title={row.getValue('description') as string ?? ''}>
            {row.getValue('description') ?? '—'}
          </span>
        ),
      },
      {
        id: 'created_at',
        accessorKey: 'created_at',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Created" />
        ),
        cell: ({ row }) => {
          const created = row.getValue('created_at') as string | null
          return created
            ? new Date(created).toLocaleDateString(undefined, {
                dateStyle: 'medium',
              })
            : '—'
        },
      },
    ],
    [],
  )

  const pageCount = Math.ceil(departments.length / DEFAULT_PAGE_SIZE) || 1
  const { table } = useDataTable({
    data: departments,
    columns,
    pageCount,
    initialState: {
      pagination: { pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE },
    },
    queryKeys: QUERY_KEYS,
    getRowId: (row) => (row as DepartmentRow).id ?? '',
  })

  if (isError) {
    return (
      <DataTableErrorMessage
        resourceName="departments"
        error={error ?? null}
      />
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <DataTableSkeleton columnCount={4} rowCount={10} />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <ExtensionPoint name="header.right">
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="ghost">
            <Link to="/dashboard/departments/import">
              <Upload className="size-4" />
            </Link>
          </Button>
          <Button onClick={openCreateModal} size="sm" variant="outline">
            <Plus className="size-4" />
            New department
          </Button>
        </div>
      </ExtensionPoint>

      <DataTable table={table}>
        <DataTableToolbar table={table} />
      </DataTable>

      <ResponsiveDialog
        open={isCreateModalOpen}
        onOpenChange={(open) => !open && closeCreateModal()}
      >
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>New department</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Create a new department. Form can be implemented here.
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
