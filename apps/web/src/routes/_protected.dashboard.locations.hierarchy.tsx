import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MapPin, Pencil, Plus } from 'lucide-react'
import type { LocationRow, LocationType } from '@workorder-systems/sdk'
import { getDbClient } from '../lib/db-client'
import { useTenant } from '../contexts/tenant'
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
import { Input } from '@workspace/ui/components/input'
import { Field, FieldLabel } from '@workspace/ui/components/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogClose,
} from '@workspace/ui/components/responsive-dialog'
import { toast } from 'sonner'

const QUERY_KEYS = createDataTableQueryKeys('locations')

const LOCATION_TYPES: { value: LocationType; label: string }[] = [
  { value: 'region', label: 'Region' },
  { value: 'site', label: 'Site' },
  { value: 'building', label: 'Building' },
  { value: 'floor', label: 'Floor' },
  { value: 'room', label: 'Room' },
  { value: 'zone', label: 'Zone' },
]

/** Allowed parent location types for each location type (backend rule). */
function getAllowedParentTypes(locationType: LocationType): LocationType[] | 'root' {
  switch (locationType) {
    case 'region':
      return 'root'
    case 'site':
      return ['region', 'site']
    case 'building':
      return ['site']
    case 'floor':
      return ['building']
    case 'room':
    case 'zone':
      return ['floor', 'zone']
    default:
      return ['region', 'site', 'building', 'floor', 'room', 'zone']
  }
}

export const Route = createFileRoute('/_protected/dashboard/locations/hierarchy')({
  component: LocationsHierarchyPage,
})

function LocationsHierarchyPage() {
  const { activeTenantId } = useTenant()
  const client = getDbClient()
  const queryClient = useQueryClient()

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

  const locationsById = React.useMemo(() => {
    const map = new Map<string, LocationRow>()
    for (const loc of locations) {
      if (loc?.id) map.set(loc.id, loc)
    }
    return map
  }, [locations])

  const isCreateModalOpen = useLocationsPageStore((s) => s.isCreateModalOpen)
  const openCreateModal = useLocationsPageStore((s) => s.openCreateModal)
  const closeCreateModal = useLocationsPageStore((s) => s.closeCreateModal)
  const editingLocationId = useLocationsPageStore((s) => s.editingLocationId)
  const openEditModal = useLocationsPageStore((s) => s.openEditModal)
  const closeEditModal = useLocationsPageStore((s) => s.closeEditModal)

  const [formName, setFormName] = React.useState('')
  const [formDescription, setFormDescription] = React.useState('')
  const [formLocationType, setFormLocationType] = React.useState<LocationType>('site')
  const [formParentId, setFormParentId] = React.useState<string>('')
  const [formCode, setFormCode] = React.useState('')
  const [formAddressLine, setFormAddressLine] = React.useState('')
  const [formExternalId, setFormExternalId] = React.useState('')

  const editingLocation = editingLocationId ? locationsById.get(editingLocationId) : null

  const allowedParentTypes = getAllowedParentTypes(formLocationType)
  const parentOptions = React.useMemo(() => {
    if (allowedParentTypes === 'root') return []
    return locations.filter(
      (loc): loc is LocationRow =>
        loc != null &&
        loc.id != null &&
        loc.location_type != null &&
        loc.id !== editingLocationId &&
        (allowedParentTypes as LocationType[]).includes(loc.location_type as LocationType)
    )
  }, [locations, allowedParentTypes, editingLocationId])

  const resetCreateForm = () => {
    setFormName('')
    setFormDescription('')
    setFormLocationType('site')
    setFormParentId('')
    setFormCode('')
    setFormAddressLine('')
    setFormExternalId('')
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!activeTenantId) throw new Error('No tenant')
      return client.locations.create({
        tenantId: activeTenantId,
        name: formName.trim(),
        description: formDescription.trim() || null,
        parentLocationId: formParentId.trim() || null,
        locationType: formLocationType,
        code: formCode.trim() || null,
        addressLine: formAddressLine.trim() || null,
        externalId: formExternalId.trim() || null,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations', activeTenantId] })
      toast.success('Location created')
      closeCreateModal()
      resetCreateForm()
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to create location')
    },
  })

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!activeTenantId || !editingLocationId) throw new Error('No tenant or location')
      return client.locations.update({
        tenantId: activeTenantId,
        locationId: editingLocationId,
        name: formName.trim(),
        description: formDescription.trim() || null,
        parentLocationId: formParentId.trim() || null,
        locationType: formLocationType,
        code: formCode.trim() || null,
        addressLine: formAddressLine.trim() || null,
        externalId: formExternalId.trim() || null,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations', activeTenantId] })
      toast.success('Location updated')
      closeEditModal()
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update location')
    },
  })

  React.useEffect(() => {
    if (editingLocation) {
      setFormName(editingLocation.name ?? '')
      setFormDescription(editingLocation.description ?? '')
      setFormLocationType((editingLocation.location_type as LocationType) ?? 'site')
      setFormParentId(editingLocation.parent_location_id ?? '')
      setFormCode(editingLocation.code ?? '')
      setFormAddressLine(editingLocation.address_line ?? '')
      setFormExternalId(editingLocation.external_id ?? '')
    }
  }, [editingLocation])

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) return
    createMutation.mutate()
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) return
    updateMutation.mutate()
  }

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
        id: 'location_type',
        accessorKey: 'location_type',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Type" />
        ),
        cell: ({ row }) => {
          const t = row.getValue('location_type') as string | null
          return <span className="capitalize">{t ?? '—'}</span>
        },
        meta: { label: 'Type', variant: 'text' },
      },
      {
        id: 'code',
        accessorKey: 'code',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Code" />
        ),
        cell: ({ row }) => <span>{row.getValue('code') ?? '—'}</span>,
        meta: { label: 'Code', variant: 'text' },
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
          variant: 'text',
        },
      },
      {
        id: 'address_line',
        accessorKey: 'address_line',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Address" />
        ),
        cell: ({ row }) => (
          <span className="max-w-[180px] truncate block" title={row.getValue('address_line') as string ?? ''}>
            {row.getValue('address_line') ?? '—'}
          </span>
        ),
        meta: { label: 'Address', variant: 'text' },
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
      {
        id: 'actions',
        cell: ({ row }) => {
          const id = (row.original as LocationRow).id
          if (!id) return null
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8">
                  <Pencil className="size-4" />
                  <span className="sr-only">Edit</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openEditModal(id)}>
                  Edit
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
        meta: { label: 'Actions' },
      },
    ],
    [locationIdToName, openEditModal],
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
        <DataTableSkeleton columnCount={8} rowCount={10} />
      </div>
    )
  }

  const formContent = (
    <>
      <Field>
        <FieldLabel htmlFor="loc-name">Name</FieldLabel>
        <Input
          id="loc-name"
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
          placeholder="e.g. Building A"
          required
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="loc-type">Type</FieldLabel>
        <Select
          value={formLocationType}
          onValueChange={(v) => setFormLocationType(v as LocationType)}
        >
          <SelectTrigger id="loc-type" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LOCATION_TYPES.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field>
        <FieldLabel htmlFor="loc-parent">Parent</FieldLabel>
        <Select
          value={formParentId || '__none__'}
          onValueChange={(v) => setFormParentId(v === '__none__' ? '' : v)}
        >
          <SelectTrigger id="loc-parent" className="w-full">
            <SelectValue placeholder="No parent" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">No parent</SelectItem>
            {parentOptions.map((loc) => (
              <SelectItem key={loc.id!} value={loc.id!}>
                {loc.name ?? loc.id} ({loc.location_type})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field>
        <FieldLabel htmlFor="loc-desc">Description</FieldLabel>
        <Input
          id="loc-desc"
          value={formDescription}
          onChange={(e) => setFormDescription(e.target.value)}
          placeholder="Optional"
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="loc-code">Code</FieldLabel>
        <Input
          id="loc-code"
          value={formCode}
          onChange={(e) => setFormCode(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
          placeholder="e.g. BLD-A"
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="loc-address">Address</FieldLabel>
        <Input
          id="loc-address"
          value={formAddressLine}
          onChange={(e) => setFormAddressLine(e.target.value)}
          placeholder="Single-line address"
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="loc-external">External ID</FieldLabel>
        <Input
          id="loc-external"
          value={formExternalId}
          onChange={(e) => setFormExternalId(e.target.value)}
          placeholder="External system id"
        />
      </Field>
    </>
  )

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <ExtensionPoint name="header.right">
        <Button onClick={openCreateModal} size="sm" variant="outline">
          <Plus className="size-4" />
          New location
        </Button>
      </ExtensionPoint>

      <DataTable table={table}>
        <DataTableToolbar table={table} />
      </DataTable>

      <ResponsiveDialog
        open={isCreateModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeCreateModal()
            resetCreateForm()
          }
        }}
      >
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>New location</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Create a location in the hierarchy. Type determines allowed parents (e.g. room under floor, building under site).
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            {formContent}
          </form>
          <ResponsiveDialogFooter>
            <ResponsiveDialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </ResponsiveDialogClose>
            <Button
              onClick={() => formName.trim() && createMutation.mutate()}
              disabled={!formName.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating…' : 'Create'}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      <ResponsiveDialog
        open={!!editingLocationId}
        onOpenChange={(open) => !open && closeEditModal()}
      >
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Edit location</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Update location details. Parent type must match hierarchy rules.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            {formContent}
          </form>
          <ResponsiveDialogFooter>
            <ResponsiveDialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </ResponsiveDialogClose>
            <Button
              onClick={() => formName.trim() && updateMutation.mutate()}
              disabled={!formName.trim() || updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  )
}
