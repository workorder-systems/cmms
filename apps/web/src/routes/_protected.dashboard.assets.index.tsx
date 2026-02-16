import * as React from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import type { ColumnDef, Row } from '@tanstack/react-table'
import { useQuery } from '@tanstack/react-query'
import { Plus, Upload, Wrench } from 'lucide-react'
import type { AssetRow } from '@workorder-systems/sdk'
import { getDbClient } from '../lib/db-client'
import { useTenant } from '../contexts/tenant'
import { ensureTenantContext } from '../lib/route-loaders'
import {
  DEFAULT_PAGE_SIZE,
  createDataTableQueryKeys,
} from '../lib/data-table-query-keys'
import { DataTableErrorMessage } from '../components/data-table-error-message'
import { useAssetsPageStore } from '../stores/assets-page'
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

const QUERY_KEYS = createDataTableQueryKeys('assets')
const ASSET_STATUS_OPTIONS = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
]

export const Route = createFileRoute('/_protected/dashboard/assets/')({
  beforeLoad: async ({ context }) => ensureTenantContext(context),
  component: AssetsPage,
})

const PAGE_SIZE = 10
const QUERY_KEYS = {
  page: 'assets_page',
  perPage: 'assets_perPage',
  sort: 'assets_sort',
  filters: 'assets_filters',
  joinOperator: 'assets_joinOperator',
}

function AssetsPage() {
  const { activeTenantId } = useTenant()
  const client = getDbClient()

  const { data: assets = [], isLoading, isError, error } = useQuery({
    queryKey: ['assets', activeTenantId],
    queryFn: () => client.assets.list(),
    enabled: !!activeTenantId,
  })

  const { data: locations = [] } = useQuery({
    queryKey: ['locations', activeTenantId],
    queryFn: () => client.locations.list(),
    enabled: !!activeTenantId,
  })

  const { data: departments = [] } = useQuery({
    queryKey: ['departments', activeTenantId],
    queryFn: () => client.departments.list(),
    enabled: !!activeTenantId,
  })

  const locationIdToName = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const loc of locations) {
      if (loc?.id) map.set(loc.id, loc.name ?? loc.id)
    }
    return map
  }, [locations])

  const departmentIdToName = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const dept of departments) {
      if (dept?.id) map.set(dept.id, dept.name ?? dept.id)
    }
    return map
  }, [departments])

  const isCreateModalOpen = useAssetsPageStore((s) => s.isCreateModalOpen)
  const openCreateModal = useAssetsPageStore((s) => s.openCreateModal)
  const closeCreateModal = useAssetsPageStore((s) => s.closeCreateModal)

  const columns = React.useMemo<ColumnDef<AssetRow>[]>(
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
          icon: Wrench,
        },
        enableColumnFilter: true,
      },
      {
        id: 'asset_number',
        accessorKey: 'asset_number',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Asset number" />
        ),
        cell: ({ row }) => (
          <span>{row.getValue('asset_number') ?? '—'}</span>
        ),
        meta: {
          label: 'Asset number',
          placeholder: 'Search...',
          variant: 'text',
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
          const label =
            ASSET_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status
          return (
            <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-muted text-muted-foreground">
              {label ?? '—'}
            </span>
          )
        },
        meta: {
          label: 'Status',
          variant: 'multiSelect',
          options: ASSET_STATUS_OPTIONS,
        },
        enableColumnFilter: true,
        filterFn: (row: Row<AssetRow>, id: string, filterValue: unknown) => {
          const value = row.getValue(id) as string | null
          const values = Array.isArray(filterValue) ? filterValue : [filterValue]
          if (!values.length) return true
          return value != null && values.includes(value)
        },
      },
      {
        id: 'location_id',
        accessorKey: 'location_id',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Location" />
        ),
        cell: ({ row }) => {
          const id = row.getValue('location_id') as string | null
          return <span>{id ? locationIdToName.get(id) ?? id : '—'}</span>
        },
      },
      {
        id: 'department_id',
        accessorKey: 'department_id',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Department" />
        ),
        cell: ({ row }) => {
          const id = row.getValue('department_id') as string | null
          return <span>{id ? departmentIdToName.get(id) ?? id : '—'}</span>
        },
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
    [locationIdToName, departmentIdToName],
  )

  const pageCount = Math.ceil(assets.length / DEFAULT_PAGE_SIZE) || 1
  const { table } = useDataTable({
    data: assets,
    columns,
    pageCount,
    initialState: {
      pagination: { pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE },
    },
    queryKeys: QUERY_KEYS,
    getRowId: (row) => (row as AssetRow).id ?? '',
  })

  if (isError) {
    return (
      <DataTableErrorMessage resourceName="assets" error={error ?? null} />
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
            <Link to="/dashboard/assets/import">
              <Upload className="size-4" />
            </Link>
          </Button>
          <Button onClick={openCreateModal} size="sm" variant="outline">
            <Plus className="size-4" />
            New asset
          </Button>
        </div>
      </ExtensionPoint>

      <DataTable table={table}>
        <DataTableToolbar table={table} />
      </DataTable>

      {/* Create asset modal */}
      <ResponsiveDialog
        open={isCreateModalOpen}
        onOpenChange={(open) => !open && closeCreateModal()}
      >
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>New asset</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Create a new asset. Form can be implemented here.
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
