import * as React from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MapPin, Plus, Upload } from 'lucide-react'
import type { LocationRow } from '@workorder-systems/sdk'
import { getDbClient } from '../lib/db-client'
import { useTenant } from '../contexts/tenant'
import { ensureTenantContext } from '../lib/route-loaders'
import { useHasPermission } from '../hooks/use-permissions'
import { Input } from '@workspace/ui/components/input'
import { Textarea } from '@workspace/ui/components/textarea'
import { Label } from '@workspace/ui/components/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { toast } from 'sonner'
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

function LocationsPage() {
  const { activeTenantId } = useTenant()
  const client = getDbClient()
  const { hasPermission: canCreateLocation } = useHasPermission('locations.create')

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

  const queryClient = useQueryClient()
  const isCreateModalOpen = useLocationsPageStore((s) => s.isCreateModalOpen)
  const openCreateModal = useLocationsPageStore((s) => s.openCreateModal)
  const closeCreateModal = useLocationsPageStore((s) => s.closeCreateModal)

  const [createName, setCreateName] = React.useState('')
  const [createDescription, setCreateDescription] = React.useState('')
  const [createParentLocationId, setCreateParentLocationId] = React.useState('')

  const createMutation = useMutation({
    mutationFn: () =>
      client.locations.create({
        tenantId: activeTenantId!,
        name: createName.trim(),
        description: createDescription.trim() || null,
        parentLocationId: createParentLocationId || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations', activeTenantId] })
      toast.success('Location created')
      setCreateName('')
      setCreateDescription('')
      setCreateParentLocationId('')
      closeCreateModal()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const columns = React.useMemo<ColumnDef<LocationRow>[]>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Name" />
        ),
        cell: ({ row }) => {
          const location = row.original
          const name = row.getValue('name') as string | null
          return location.id ? (
            <Link
              to="/dashboard/locations/$id"
              params={{ id: location.id }}
              className="font-medium text-primary hover:underline"
            >
              {name ?? '—'}
            </Link>
          ) : (
            <span className="font-medium">{name ?? '—'}</span>
          )
        },
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
    <div className="flex flex-1 flex-col gap-6 p-6 pt-8">
      <ExtensionPoint name="header.right">
        <div className="flex items-center gap-2">
          <Button asChild size="default" variant="outline" className="shadow-sm">
            <Link to="/dashboard/locations/import">
              <Upload className="size-4" />
            </Link>
          </Button>
          {canCreateLocation && (
            <Button onClick={openCreateModal} size="default" className="shadow-sm">
              <Plus className="size-4" />
              New location
            </Button>
          )}
        </div>
      </ExtensionPoint>

      <div className="rounded-xl border-2 border-border/50 bg-card shadow-sm">
        <DataTable table={table}>
          <DataTableToolbar table={table} />
        </DataTable>
      </div>

      <ResponsiveDialog
        open={isCreateModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeCreateModal()
            setCreateName('')
            setCreateDescription('')
            setCreateParentLocationId('')
          }
        }}
      >
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>New location</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Create a new location
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">Name *</Label>
              <Input
                id="create-name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Location name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-description">Description</Label>
              <Textarea
                id="create-description"
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                placeholder="Location description"
                rows={3}
                className="resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-parent">Parent Location</Label>
              <Select value={createParentLocationId} onValueChange={setCreateParentLocationId}>
                <SelectTrigger id="create-parent">
                  <SelectValue placeholder="Select parent location (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id as string}>
                      {loc.name ?? loc.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <ResponsiveDialogFooter>
            <ResponsiveDialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </ResponsiveDialogClose>
            <Button
              onClick={() => {
                if (!createName.trim()) {
                  toast.error('Name is required')
                  return
                }
                createMutation.mutate()
              }}
              disabled={createMutation.isPending || !createName.trim()}
            >
              {createMutation.isPending ? 'Creating…' : 'Create'}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  )
}
