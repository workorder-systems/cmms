import * as React from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MapPin, Trash2, Edit, Plus, ArrowLeft, Loader2 } from 'lucide-react'
import type { LocationRow, SpaceRow, CreateSpaceParams, UpdateSpaceParams } from '@workorder-systems/sdk'
import { getDbClient } from '../lib/db-client'
import { useTenant } from '../contexts/tenant'
import { ensureTenantContext } from '../lib/route-loaders'
import { useHasPermission } from '../hooks/use-permissions'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Label } from '@workspace/ui/components/label'
import { Input } from '@workspace/ui/components/input'
import { Textarea } from '@workspace/ui/components/textarea'
import { DataTable } from '@workspace/ui/components/data-table/data-table'
import { DataTableColumnHeader } from '@workspace/ui/components/data-table/data-table-column-header'
import { DataTableSkeleton } from '@workspace/ui/components/data-table/data-table-skeleton'
import { DataTableErrorMessage } from '../components/data-table-error-message'
import { toast } from 'sonner'
import { Badge } from '@workspace/ui/components/badge'
import type { ColumnDef } from '@tanstack/react-table'
import { getCoreRowModel, useReactTable } from '@tanstack/react-table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogClose,
} from '@workspace/ui/components/responsive-dialog'

export const Route = createFileRoute('/_protected/dashboard/locations/$id')({
  beforeLoad: async ({ context }) => ensureTenantContext(context),
  component: LocationDetailPage,
})

function LocationDetailPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { activeTenantId } = useTenant()
  const client = getDbClient()
  const { hasPermission: canEditLocation } = useHasPermission('locations.update')
  const { hasPermission: canDeleteLocation } = useHasPermission('locations.delete')

  const { data: location, isLoading, isError, error } = useQuery({
    queryKey: ['location', id],
    queryFn: () => client.locations.getById(id),
    enabled: !!id,
  })

  const { data: allSpaces = [], isLoading: spacesLoading } = useQuery({
    queryKey: ['spaces', activeTenantId],
    queryFn: () => client.spaces.list(),
    enabled: !!activeTenantId,
  })

  const spaces = React.useMemo(
    () => allSpaces.filter((s) => s.location_id === id),
    [allSpaces, id]
  )

  const { data: allLocations = [] } = useQuery({
    queryKey: ['locations', activeTenantId],
    queryFn: () => client.locations.list(),
    enabled: !!activeTenantId,
  })

  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
  const [isCreateSpaceDialogOpen, setIsCreateSpaceDialogOpen] = React.useState(false)
  const [editingSpace, setEditingSpace] = React.useState<SpaceRow | null>(null)

  const [editName, setEditName] = React.useState('')
  const [editDescription, setEditDescription] = React.useState('')
  const [editParentLocationId, setEditParentLocationId] = React.useState('')

  const [createSpaceUsageType, setCreateSpaceUsageType] = React.useState('')
  const [createSpaceCapacity, setCreateSpaceCapacity] = React.useState('')
  const [createSpaceStatus, setCreateSpaceStatus] = React.useState('available')
  const [createSpaceAreaSqft, setCreateSpaceAreaSqft] = React.useState('')

  React.useEffect(() => {
    if (location) {
      setEditName(location.name ?? '')
      setEditDescription(location.description ?? '')
      setEditParentLocationId(location.parent_location_id ?? '')
    }
  }, [location])

  const updateMutation = useMutation({
    mutationFn: () =>
      client.locations.update({
        tenantId: activeTenantId!,
        locationId: id,
        name: editName.trim() || null,
        description: editDescription.trim() || null,
        parentLocationId: editParentLocationId || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['location', id] })
      queryClient.invalidateQueries({ queryKey: ['locations', activeTenantId] })
      setIsEditDialogOpen(false)
      toast.success('Location updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: () => client.locations.delete(activeTenantId!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations', activeTenantId] })
      toast.success('Location deleted')
      navigate({ to: '/dashboard/locations' })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const createSpaceMutation = useMutation({
    mutationFn: () =>
      client.spaces.create({
        tenantId: activeTenantId!,
        locationId: id,
        usageType: createSpaceUsageType.trim() || null,
        capacity: createSpaceCapacity ? parseInt(createSpaceCapacity, 10) : null,
        status: createSpaceStatus as 'available' | 'occupied' | 'maintenance' | 'reserved' | 'offline',
        areaSqft: createSpaceAreaSqft ? parseFloat(createSpaceAreaSqft) : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spaces', activeTenantId] })
      toast.success('Space created')
      setIsCreateSpaceDialogOpen(false)
      setCreateSpaceUsageType('')
      setCreateSpaceCapacity('')
      setCreateSpaceStatus('available')
      setCreateSpaceAreaSqft('')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateSpaceMutation = useMutation({
    mutationFn: (spaceId: string) =>
      client.spaces.update({
        tenantId: activeTenantId!,
        spaceId,
        usageType: createSpaceUsageType.trim() || null,
        capacity: createSpaceCapacity ? parseInt(createSpaceCapacity, 10) : null,
        status: createSpaceStatus as 'available' | 'occupied' | 'maintenance' | 'reserved' | 'offline',
        areaSqft: createSpaceAreaSqft ? parseFloat(createSpaceAreaSqft) : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spaces', activeTenantId] })
      toast.success('Space updated')
      setEditingSpace(null)
      setCreateSpaceUsageType('')
      setCreateSpaceCapacity('')
      setCreateSpaceStatus('available')
      setCreateSpaceAreaSqft('')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteSpaceMutation = useMutation({
    mutationFn: (spaceId: string) => client.spaces.delete(activeTenantId!, spaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spaces', activeTenantId] })
      toast.success('Space deleted')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const spacesColumns = React.useMemo<ColumnDef<SpaceRow>[]>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} label="Name" />,
        cell: ({ row }) => {
          const space = row.original
          const name = row.getValue('name') as string | null
          return <span className="font-medium">{name ?? '—'}</span>
        },
      },
      {
        id: 'usage_type',
        accessorKey: 'usage_type',
        header: ({ column }) => <DataTableColumnHeader column={column} label="Usage Type" />,
        cell: ({ row }) => {
          const usageType = row.getValue('usage_type') as string | null
          return <span className="text-sm text-muted-foreground">{usageType ?? '—'}</span>
        },
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} label="Status" />,
        cell: ({ row }) => {
          const status = row.getValue('status') as string | null
          return <Badge variant="outline">{status ?? '—'}</Badge>
        },
      },
      {
        id: 'capacity',
        accessorKey: 'capacity',
        header: ({ column }) => <DataTableColumnHeader column={column} label="Capacity" />,
        cell: ({ row }) => {
          const capacity = row.getValue('capacity') as number | null
          return <span className="text-sm">{capacity ?? '—'}</span>
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const space = row.original
          return (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingSpace(space)
                  setCreateSpaceUsageType(space.usage_type ?? '')
                  setCreateSpaceCapacity(space.capacity?.toString() ?? '')
                  setCreateSpaceStatus(space.status ?? 'available')
                  setCreateSpaceAreaSqft(space.area_sqft?.toString() ?? '')
                }}
              >
                <Edit className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  if (space.id && confirm('Delete this space?')) {
                    deleteSpaceMutation.mutate(space.id)
                  }
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )
        },
      },
    ],
    [deleteSpaceMutation]
  )

  const spacesTable = useReactTable({
    data: spaces,
    columns: spacesColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row: SpaceRow) => row.id ?? '',
  })

  if (isError) {
    return <DataTableErrorMessage resourceName="location" error={error ?? null} />
  }

  if (isLoading || !location) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <DataTableSkeleton columnCount={3} rowCount={5} />
      </div>
    )
  }

  const parentLocation = allLocations.find((l) => l.id === location.parent_location_id)

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard/locations">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
            <h1 className="text-2xl font-semibold tracking-tight">{location.name ?? 'Location'}</h1>
          </div>
          <p className="text-sm text-muted-foreground ml-12">Location details and spaces</p>
        </div>
        <div className="flex gap-2">
          {canEditLocation && (
            <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          {canDeleteLocation && (
            <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="size-4" />
              Details
            </CardTitle>
            <CardDescription>Location information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <DetailRow label="Name" value={location.name ?? undefined} />
            <DetailRow label="Description" value={location.description ?? undefined} />
            <DetailRow
              label="Parent Location"
              value={
                parentLocation ? (
                  <Link
                    to="/dashboard/locations/$id"
                    params={{ id: parentLocation.id as string }}
                    className="text-primary hover:underline"
                  >
                    {parentLocation.name ?? parentLocation.id}
                  </Link>
                ) : undefined
              }
            />
            <DetailRow
              label="Created"
              value={
                location.created_at
                  ? new Date(location.created_at).toLocaleDateString(undefined, {
                      dateStyle: 'medium',
                    })
                  : undefined
              }
            />
          </CardContent>
        </Card>

        <Card className="transition-shadow hover:shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <MapPin className="size-4" />
                Spaces
              </span>
              {canEditLocation && (
                <Button size="sm" onClick={() => setIsCreateSpaceDialogOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Space
                </Button>
              )}
            </CardTitle>
            <CardDescription>Spaces within this location</CardDescription>
          </CardHeader>
          <CardContent>
            {spacesLoading ? (
              <DataTableSkeleton columnCount={3} rowCount={3} />
            ) : spaces.length === 0 ? (
              <div className="py-8 text-center">
                <MapPin className="mx-auto h-10 w-10 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No spaces in this location</p>
              </div>
            ) : (
              <DataTable table={spacesTable} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <ResponsiveDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Edit Location</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>Update location information</ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="e.g. Building A, Warehouse"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Additional details about this location..."
                rows={3}
                className="resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-parent">Parent Location</Label>
              <Select value={editParentLocationId} onValueChange={setEditParentLocationId}>
                <SelectTrigger id="edit-parent">
                  <SelectValue placeholder="Select parent location (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None (Top Level)</SelectItem>
                  {allLocations
                    .filter((l) => l.id !== id)
                    .map((loc) => (
                      <SelectItem key={loc.id} value={loc.id as string}>
                        {loc.name ?? loc.id}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Organize locations hierarchically
              </p>
            </div>
          </div>
          <ResponsiveDialogFooter>
            <ResponsiveDialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </ResponsiveDialogClose>
            <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating…
                </>
              ) : (
                'Update Location'
              )}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Delete Dialog */}
      <ResponsiveDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <Trash2 className="h-6 w-6 text-destructive" />
            </div>
            <ResponsiveDialogTitle className="text-center">Delete Location</ResponsiveDialogTitle>
            <ResponsiveDialogDescription className="text-center">
              Are you sure you want to delete <strong>{location?.name ?? 'this location'}</strong>? This action cannot be undone and will permanently remove all associated data.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <ResponsiveDialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <ResponsiveDialogClose asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                Cancel
              </Button>
            </ResponsiveDialogClose>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="w-full sm:w-auto"
              aria-label="Confirm delete location"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                  <span>Deleting…</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
                  <span>Delete Location</span>
                </>
              )}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Create/Edit Space Dialog */}
      <ResponsiveDialog
        open={isCreateSpaceDialogOpen || editingSpace !== null}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateSpaceDialogOpen(false)
            setEditingSpace(null)
            setCreateSpaceUsageType('')
            setCreateSpaceCapacity('')
            setCreateSpaceStatus('available')
            setCreateSpaceAreaSqft('')
          }
        }}
      >
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>
              {editingSpace ? 'Edit Space' : 'Create Space'}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {editingSpace ? 'Update space information' : 'Add a new space to this location'}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="space-usage-type">Usage Type</Label>
              <Input
                id="space-usage-type"
                value={createSpaceUsageType}
                onChange={(e) => setCreateSpaceUsageType(e.target.value)}
                placeholder="e.g. Office, Storage, Warehouse"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Describe how this space is used
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="space-capacity">Capacity</Label>
                <Input
                  id="space-capacity"
                  type="number"
                  min="0"
                  value={createSpaceCapacity}
                  onChange={(e) => setCreateSpaceCapacity(e.target.value)}
                  placeholder="e.g. 10"
                />
                <p className="text-xs text-muted-foreground">
                  Maximum number of people
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="space-area">Area (sq ft)</Label>
                <Input
                  id="space-area"
                  type="number"
                  min="0"
                  step="0.01"
                  value={createSpaceAreaSqft}
                  onChange={(e) => setCreateSpaceAreaSqft(e.target.value)}
                  placeholder="e.g. 500.5"
                />
                <p className="text-xs text-muted-foreground">
                  Total square footage
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="space-status">Status</Label>
              <Select value={createSpaceStatus} onValueChange={setCreateSpaceStatus}>
                <SelectTrigger id="space-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="occupied">Occupied</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Current availability status
              </p>
            </div>
          </div>
          <ResponsiveDialogFooter>
            <ResponsiveDialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </ResponsiveDialogClose>
            <Button
              onClick={() => {
                if (editingSpace?.id) {
                  updateSpaceMutation.mutate(editingSpace.id)
                } else {
                  createSpaceMutation.mutate()
                }
              }}
              disabled={createSpaceMutation.isPending || updateSpaceMutation.isPending}
            >
              {createSpaceMutation.isPending || updateSpaceMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : editingSpace ? (
                'Update'
              ) : (
                'Create'
              )}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === '') return null
  return (
    <div className="space-y-1">
      <Label className="text-muted-foreground">{label}</Label>
      <div className="text-sm">{value}</div>
    </div>
  )
}
