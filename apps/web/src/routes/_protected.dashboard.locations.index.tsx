import * as React from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { useQuery } from '@tanstack/react-query'
import { MapPin, Plus, Upload } from 'lucide-react'
import type { LocationRow } from '@workorder-systems/sdk'
import { getDbClient } from '../lib/db-client'
import { useTenant } from '../contexts/tenant'
import { ensureTenantContext } from '../lib/route-loaders'
import {
  DEFAULT_PAGE_SIZE,
  createDataTableQueryKeys,
} from '../lib/data-table-query-keys'
import { DataTableErrorMessage } from '../components/data-table-error-message'
import { useLocationsPageStore } from '../stores/locations-page'
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

const QUERY_KEYS = createDataTableQueryKeys('locations')

export const Route = createFileRoute('/_protected/dashboard/locations/')({
  beforeLoad: async ({ context }) => ensureTenantContext(context),
  component: LocationsPage,
})

const PAGE_SIZE = 10
const QUERY_KEYS = {
  page: 'locations_page',
  perPage: 'locations_perPage',
  sort: 'locations_sort',
  filters: 'locations_filters',
  joinOperator: 'locations_joinOperator',
}

function LocationsPage() {
  const { activeTenantId } = useTenant()
  const client = getDbClient()

  const { data: locations = [], isLoading, isError, error } = useQuery({
    queryKey: ['locations', activeTenantId],
    queryFn: () => client.locations.list(),
    enabled: !!activeTenantId,
  })

  const locationIdToName = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const loc of locations) {
      if (loc?.id) map.set(loc.id, loc.name ?? loc.id)
    }
    return map
  }, [locations])

  const isCreateModalOpen = useLocationsPageStore((s) => s.isCreateModalOpen)
  const openCreateModal = useLocationsPageStore((s) => s.openCreateModal)
  const closeCreateModal = useLocationsPageStore((s) => s.closeCreateModal)

  const columns = React.useMemo<ColumnDef<LocationRow>[]>(
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
          icon: MapPin,
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
        meta: {
          label: 'Description',
          placeholder: 'Search...',
          variant: 'text',
        },
        enableColumnFilter: true,
      },
      {
        id: 'parent_location_id',
        accessorKey: 'parent_location_id',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Parent" />
        ),
        cell: ({ row }) => {
          const id = row.getValue('parent_location_id') as string | null
          return <span>{id ? locationIdToName.get(id) ?? id : '—'}</span>
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
    [locationIdToName],
  )

  const pageCount = Math.ceil(locations.length / DEFAULT_PAGE_SIZE) || 1
  const { table } = useDataTable({
    data: locations,
    columns,
    pageCount,
    initialState: {
      pagination: { pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE },
    },
    queryKeys: QUERY_KEYS,
    getRowId: (row) => (row as LocationRow).id ?? '',
  })

  if (isError) {
    return (
      <DataTableErrorMessage
        resourceName="locations"
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
            <Link to="/dashboard/locations/import">
              <Upload className="size-4" />
            </Link>
          </Button>
          <Button onClick={openCreateModal} size="sm" variant="outline">
            <Plus className="size-4" />
            New location
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
            <ResponsiveDialogTitle>New location</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Create a new location. Form can be implemented here.
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
