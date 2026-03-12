import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, SquareStack, Trash2 } from 'lucide-react'
import type { SpaceRow, SpaceStatus } from '@workorder-systems/sdk'
import type { LocationRow } from '@workorder-systems/sdk'
import { getDbClient } from '../lib/db-client'
import { useTenant } from '../contexts/tenant'
import {
  DEFAULT_PAGE_SIZE,
  createDataTableQueryKeys,
} from '../lib/data-table-query-keys'
import { DataTableErrorMessage } from '../components/data-table-error-message'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@workspace/ui/components/alert-dialog'
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

const QUERY_KEYS = createDataTableQueryKeys('spaces')

const SPACE_STATUSES: { value: SpaceStatus; label: string }[] = [
  { value: 'available', label: 'Available' },
  { value: 'occupied', label: 'Occupied' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'offline', label: 'Offline' },
]

const USAGE_TYPES = [
  'office',
  'conference',
  'patient_room',
  'lab',
  'storage',
  'lobby',
  'meeting_room',
  'classroom',
  'other',
] as const

export const Route = createFileRoute('/_protected/dashboard/locations/spaces')({
  component: LocationsSpacesPage,
})

function LocationsSpacesPage() {
  const { activeTenantId } = useTenant()
  const client = getDbClient()
  const queryClient = useQueryClient()

  const { data: spaces = [], isLoading: spacesLoading, isError, error } = useQuery({
    queryKey: ['spaces', activeTenantId],
    queryFn: () => client.spaces.list(),
    enabled: !!activeTenantId,
  })

  const { data: locations = [] } = useQuery({
    queryKey: ['locations', activeTenantId],
    queryFn: () => client.locations.list(),
    enabled: !!activeTenantId,
  })

  const locationIdsWithSpace = React.useMemo(
    () => new Set(spaces.map((s) => s.location_id).filter(Boolean)),
    [spaces]
  )

  const locationOptionsForCreate = React.useMemo(() => {
    return locations.filter(
      (loc): loc is LocationRow =>
        loc != null &&
        loc.id != null &&
        !locationIdsWithSpace.has(loc.id)
    )
  }, [locations, locationIdsWithSpace])

  const [createOpen, setCreateOpen] = React.useState(false)
  const [editSpaceId, setEditSpaceId] = React.useState<string | null>(null)
  const [deleteSpaceId, setDeleteSpaceId] = React.useState<string | null>(null)

  const [formLocationId, setFormLocationId] = React.useState('')
  const [formUsageType, setFormUsageType] = React.useState('')
  const [formCapacity, setFormCapacity] = React.useState('')
  const [formStatus, setFormStatus] = React.useState<SpaceStatus>('available')
  const [formAreaSqft, setFormAreaSqft] = React.useState('')

  const editingSpace = editSpaceId ? spaces.find((s) => s.id === editSpaceId) : null

  React.useEffect(() => {
    if (editingSpace) {
      setFormLocationId(editingSpace.location_id ?? '')
      setFormUsageType(editingSpace.usage_type ?? '')
      setFormCapacity(editingSpace.capacity != null ? String(editingSpace.capacity) : '')
      setFormStatus((editingSpace.status as SpaceStatus) ?? 'available')
      setFormAreaSqft(editingSpace.area_sqft != null ? String(editingSpace.area_sqft) : '')
    }
  }, [editingSpace])

  const resetCreateForm = () => {
    setFormLocationId('')
    setFormUsageType('')
    setFormCapacity('')
    setFormStatus('available')
    setFormAreaSqft('')
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!activeTenantId || !formLocationId) throw new Error('Tenant and location required')
      return client.spaces.create({
        tenantId: activeTenantId,
        locationId: formLocationId,
        usageType: formUsageType.trim() || null,
        capacity: formCapacity.trim() ? parseInt(formCapacity, 10) : null,
        status: formStatus,
        areaSqft: formAreaSqft.trim() ? parseFloat(formAreaSqft) : null,
        attributes: null,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spaces', activeTenantId] })
      queryClient.invalidateQueries({ queryKey: ['locations', activeTenantId] })
      toast.success('Space created')
      setCreateOpen(false)
      resetCreateForm()
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to create space')
    },
  })

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!activeTenantId || !editSpaceId) throw new Error('Tenant and space required')
      return client.spaces.update({
        tenantId: activeTenantId,
        spaceId: editSpaceId,
        usageType: formUsageType.trim() || null,
        capacity: formCapacity.trim() ? parseInt(formCapacity, 10) : null,
        status: formStatus,
        areaSqft: formAreaSqft.trim() ? parseFloat(formAreaSqft) : null,
        attributes: null,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spaces', activeTenantId] })
      toast.success('Space updated')
      setEditSpaceId(null)
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update space')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!activeTenantId || !deleteSpaceId) throw new Error('Tenant and space required')
      return client.spaces.delete(activeTenantId, deleteSpaceId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spaces', activeTenantId] })
      toast.success('Space deleted')
      setDeleteSpaceId(null)
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to delete space')
    },
  })

  const columns = React.useMemo<ColumnDef<SpaceRow>[]>(
    () => [
      {
        id: 'location_name',
        accessorKey: 'location_name',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Location" />
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.getValue('location_name') ?? '—'}</span>
        ),
        meta: {
          label: 'Location',
          placeholder: 'Search...',
          variant: 'text',
          icon: SquareStack,
        },
        enableColumnFilter: true,
      },
      {
        id: 'location_type',
        accessorKey: 'location_type',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Type" />
        ),
        cell: ({ row }) => (
          <span className="capitalize">{row.getValue('location_type') ?? '—'}</span>
        ),
        meta: { label: 'Type', variant: 'text' },
      },
      {
        id: 'usage_type',
        accessorKey: 'usage_type',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Usage" />
        ),
        cell: ({ row }) => <span>{row.getValue('usage_type') ?? '—'}</span>,
        meta: { label: 'Usage', variant: 'text' },
      },
      {
        id: 'capacity',
        accessorKey: 'capacity',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Capacity" />
        ),
        cell: ({ row }) => <span>{row.getValue('capacity') ?? '—'}</span>,
        meta: { label: 'Capacity', variant: 'text' },
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Status" />
        ),
        cell: ({ row }) => (
          <span className="capitalize">{row.getValue('status') ?? '—'}</span>
        ),
        meta: { label: 'Status', variant: 'text' },
      },
      {
        id: 'area_sqft',
        accessorKey: 'area_sqft',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Area (sq ft)" />
        ),
        cell: ({ row }) => {
          const v = row.getValue('area_sqft') as number | null
          return v != null ? <span>{v}</span> : <span>—</span>
        },
        meta: { label: 'Area', variant: 'text' },
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          const space = row.original as SpaceRow
          const id = space.id
          if (!id) return null
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8">
                  <Pencil className="size-4" />
                  <span className="sr-only">Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditSpaceId(id)}>
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteSpaceId(id)}
                >
                  <Trash2 className="size-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
        meta: { label: 'Actions' },
      },
    ],
    [],
  )

  const pageCount = Math.ceil(spaces.length / DEFAULT_PAGE_SIZE) || 1
  const { table } = useDataTable({
    data: spaces,
    columns,
    pageCount,
    initialState: {
      pagination: { pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE },
    },
    queryKeys: QUERY_KEYS,
    getRowId: (row) => (row as SpaceRow).id ?? '',
  })

  if (isError) {
    return (
      <DataTableErrorMessage
        resourceName="spaces"
        error={error ?? null}
      />
    )
  }

  if (spacesLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <DataTableSkeleton columnCount={7} rowCount={10} />
      </div>
    )
  }

  const formFields = (
    <>
      {!editingSpace && (
        <Field>
          <FieldLabel>Location</FieldLabel>
          <Select
            value={formLocationId}
            onValueChange={setFormLocationId}
            required
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a location (room/zone)" />
            </SelectTrigger>
            <SelectContent>
              {locationOptionsForCreate.map((loc) => (
                <SelectItem key={loc.id!} value={loc.id!}>
                  {loc.name ?? loc.id} ({loc.location_type})
                </SelectItem>
              ))}
              {locationOptionsForCreate.length === 0 && (
                <SelectItem value="__none__" disabled>
                  No locations without a space
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-xs mt-1">
            Only locations that do not yet have a space are listed. Add room/zone locations in Hierarchy first.
          </p>
        </Field>
      )}
      <Field>
        <FieldLabel htmlFor="space-usage">Usage type</FieldLabel>
        <Select value={formUsageType || '__none__'} onValueChange={(v) => setFormUsageType(v === '__none__' ? '' : v)}>
          <SelectTrigger id="space-usage" className="w-full">
            <SelectValue placeholder="e.g. office" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">—</SelectItem>
            {USAGE_TYPES.map((u) => (
              <SelectItem key={u} value={u}>
                {u.replace(/_/g, ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field>
        <FieldLabel htmlFor="space-capacity">Capacity</FieldLabel>
        <Input
          id="space-capacity"
          type="number"
          min={0}
          value={formCapacity}
          onChange={(e) => setFormCapacity(e.target.value)}
          placeholder="Optional"
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="space-status">Status</FieldLabel>
        <Select value={formStatus} onValueChange={(v) => setFormStatus(v as SpaceStatus)}>
          <SelectTrigger id="space-status" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SPACE_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field>
        <FieldLabel htmlFor="space-area">Area (sq ft)</FieldLabel>
        <Input
          id="space-area"
          type="number"
          min={0}
          step={0.01}
          value={formAreaSqft}
          onChange={(e) => setFormAreaSqft(e.target.value)}
          placeholder="Optional"
        />
      </Field>
    </>
  )

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <ExtensionPoint name="header.right">
        <Button
          onClick={() => setCreateOpen(true)}
          size="sm"
          variant="outline"
          disabled={locationOptionsForCreate.length === 0}
        >
          <Plus className="size-4" />
          New space
        </Button>
      </ExtensionPoint>

      <DataTable table={table}>
        <DataTableToolbar table={table} />
      </DataTable>

      <ResponsiveDialog open={createOpen} onOpenChange={(open) => !open && (setCreateOpen(false), resetCreateForm())}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>New space</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Attach space attributes to a location (typically a room or zone). One space per location.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (formLocationId) createMutation.mutate()
            }}
            className="space-y-4"
          >
            {formFields}
          </form>
          <ResponsiveDialogFooter>
            <ResponsiveDialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </ResponsiveDialogClose>
            <Button
              onClick={() => formLocationId && createMutation.mutate()}
              disabled={!formLocationId || createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating…' : 'Create'}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      <ResponsiveDialog open={!!editSpaceId} onOpenChange={(open) => !open && setEditSpaceId(null)}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Edit space</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Update usage, capacity, status, and area. Location cannot be changed.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              updateMutation.mutate()
            }}
            className="space-y-4"
          >
            {editingSpace && (
              <Field>
                <FieldLabel>Location</FieldLabel>
                <p className="text-sm font-medium">
                  {editingSpace.location_name ?? editingSpace.location_id}
                </p>
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="edit-space-usage">Usage type</FieldLabel>
              <Select value={formUsageType || '__none__'} onValueChange={(v) => setFormUsageType(v === '__none__' ? '' : v)}>
                <SelectTrigger id="edit-space-usage" className="w-full">
                  <SelectValue placeholder="e.g. office" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {USAGE_TYPES.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-space-capacity">Capacity</FieldLabel>
              <Input
                id="edit-space-capacity"
                type="number"
                min={0}
                value={formCapacity}
                onChange={(e) => setFormCapacity(e.target.value)}
                placeholder="Optional"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-space-status">Status</FieldLabel>
              <Select value={formStatus} onValueChange={(v) => setFormStatus(v as SpaceStatus)}>
                <SelectTrigger id="edit-space-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SPACE_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-space-area">Area (sq ft)</FieldLabel>
              <Input
                id="edit-space-area"
                type="number"
                min={0}
                step={0.01}
                value={formAreaSqft}
                onChange={(e) => setFormAreaSqft(e.target.value)}
                placeholder="Optional"
              />
            </Field>
          </form>
          <ResponsiveDialogFooter>
            <ResponsiveDialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </ResponsiveDialogClose>
            <Button
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      <AlertDialog open={!!deleteSpaceId} onOpenChange={(open) => !open && setDeleteSpaceId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete space</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the space record. The location itself is not deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteSpaceId && deleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
