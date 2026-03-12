import * as React from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Package, Edit, Trash2, ArrowLeft } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import type { PartWithStockRow } from '@workorder-systems/sdk'
import { getDbClient } from '../lib/db-client'
import { useTenant } from '../contexts/tenant'
import { ensureTenantContext } from '../lib/route-loaders'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Button } from '@workspace/ui/components/button'
import { Label } from '@workspace/ui/components/label'
import {
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@workspace/ui/components/responsive-dialog'
import { Input } from '@workspace/ui/components/input'
import { Textarea } from '@workspace/ui/components/textarea'
import { DataTableSkeleton } from '@workspace/ui/components/data-table/data-table-skeleton'
import { DataTableErrorMessage } from '../components/data-table-error-message'
import { toast } from 'sonner'
import { useHasPermission } from '../hooks/use-permissions'

export const Route = createFileRoute('/_protected/dashboard/parts/$id')({
  beforeLoad: async ({ context }) => ensureTenantContext(context),
  component: PartDetailPage,
})

function PartDetailPage() {
  const { id } = Route.useParams()
  const { activeTenantId } = useTenant()
  const client = getDbClient()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const canEditPart = useHasPermission('parts.update')
  const canDeletePart = useHasPermission('parts.delete')

  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
  const [editPartNumber, setEditPartNumber] = React.useState('')
  const [editName, setEditName] = React.useState('')
  const [editDescription, setEditDescription] = React.useState('')
  const [editUnit, setEditUnit] = React.useState('each')
  const [editReorderPoint, setEditReorderPoint] = React.useState('')
  const [editMinQuantity, setEditMinQuantity] = React.useState('')
  const [editMaxQuantity, setEditMaxQuantity] = React.useState('')
  const [editLeadTimeDays, setEditLeadTimeDays] = React.useState('')
  const [editIsActive, setEditIsActive] = React.useState(true)

  const { data: part, isLoading, isError, error } = useQuery({
    queryKey: ['part', id],
    queryFn: () => client.partsInventory.getPartWithStockById(id),
    enabled: !!id,
  })

  React.useEffect(() => {
    if (part) {
      setEditPartNumber(part.part_number ?? '')
      setEditName(part.name ?? '')
      setEditDescription(part.description ?? '')
      setEditUnit(part.unit ?? 'each')
      setEditReorderPoint(part.reorder_point?.toString() ?? '')
      setEditMinQuantity(part.min_quantity?.toString() ?? '')
      setEditMaxQuantity(part.max_quantity?.toString() ?? '')
      setEditLeadTimeDays(part.lead_time_days?.toString() ?? '')
      setEditIsActive(part.is_active ?? true)
    }
  }, [part])

  const updateMutation = useMutation({
    mutationFn: () =>
      client.partsInventory.updatePart({
        tenantId: activeTenantId!,
        partId: id,
        partNumber: editPartNumber.trim() || null,
        name: editName.trim() || null,
        description: editDescription.trim() || null,
        unit: editUnit || null,
        reorderPoint: editReorderPoint ? parseInt(editReorderPoint, 10) : null,
        minQuantity: editMinQuantity ? parseInt(editMinQuantity, 10) : null,
        maxQuantity: editMaxQuantity ? parseInt(editMaxQuantity, 10) : null,
        leadTimeDays: editLeadTimeDays ? parseInt(editLeadTimeDays, 10) : null,
        isActive: editIsActive,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['part', id] })
      queryClient.invalidateQueries({ queryKey: ['parts', activeTenantId] })
      toast.success('Part updated')
      setIsEditDialogOpen(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: () => {
      // Note: SDK may not have delete, so we'll deactivate instead
      return client.partsInventory.updatePart({
        tenantId: activeTenantId!,
        partId: id,
        isActive: false,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts', activeTenantId] })
      toast.success('Part deactivated')
      navigate({ to: '/dashboard/parts' })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  if (isError) {
    return <DataTableErrorMessage resourceName="part" error={error ?? null} />
  }

  if (isLoading || !part) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <DataTableSkeleton columnCount={3} rowCount={5} />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard/parts">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
            <h1 className="text-2xl font-semibold tracking-tight">{part.name ?? part.part_number ?? 'Part'}</h1>
          </div>
          <p className="text-sm text-muted-foreground ml-12">Part details and inventory information</p>
        </div>
        <div className="flex gap-2">
          {canEditPart && (
            <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          {canDeletePart && (
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
              <Package className="size-4" />
              Details
            </CardTitle>
            <CardDescription>Part information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <DetailRow label="Part Number" value={part.part_number ?? undefined} />
            <DetailRow label="Name" value={part.name ?? undefined} />
            <DetailRow label="Description" value={part.description ?? undefined} />
            <DetailRow label="Unit" value={part.unit ?? undefined} />
            <DetailRow label="Status" value={part.is_active ? 'Active' : 'Inactive'} />
          </CardContent>
        </Card>

        <Card className="transition-shadow hover:shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="size-4" />
              Inventory
            </CardTitle>
            <CardDescription>Stock and reorder information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <DetailRow label="Total Stock" value={part.total_stock?.toString() ?? '0'} />
            <DetailRow label="Reserved" value={part.total_reserved?.toString() ?? '0'} />
            <DetailRow label="Available" value={part.total_available?.toString() ?? '0'} />
            <DetailRow label="Reorder Point" value={part.reorder_point?.toString() ?? undefined} />
            <DetailRow label="Min Quantity" value={part.min_quantity?.toString() ?? undefined} />
            <DetailRow label="Max Quantity" value={part.max_quantity?.toString() ?? undefined} />
            <DetailRow label="Lead Time" value={part.lead_time_days ? `${part.lead_time_days} days` : undefined} />
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <ResponsiveDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Edit Part</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>Update part information</ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-part-number">Part Number</Label>
              <Input
                id="edit-part-number"
                value={editPartNumber}
                onChange={(e) => setEditPartNumber(e.target.value)}
                placeholder="Part number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Part name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Part description"
                rows={3}
                className="resize-none"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-unit">Unit</Label>
                <Input
                  id="edit-unit"
                  value={editUnit}
                  onChange={(e) => setEditUnit(e.target.value)}
                  placeholder="each"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lead-time">Lead Time (days)</Label>
                <Input
                  id="edit-lead-time"
                  type="number"
                  value={editLeadTimeDays}
                  onChange={(e) => setEditLeadTimeDays(e.target.value)}
                  placeholder="Days"
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="edit-reorder-point">Reorder Point</Label>
                <Input
                  id="edit-reorder-point"
                  type="number"
                  value={editReorderPoint}
                  onChange={(e) => setEditReorderPoint(e.target.value)}
                  placeholder="Min stock"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-min-qty">Min Quantity</Label>
                <Input
                  id="edit-min-qty"
                  type="number"
                  value={editMinQuantity}
                  onChange={(e) => setEditMinQuantity(e.target.value)}
                  placeholder="Minimum"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-max-qty">Max Quantity</Label>
                <Input
                  id="edit-max-qty"
                  type="number"
                  value={editMaxQuantity}
                  onChange={(e) => setEditMaxQuantity(e.target.value)}
                  placeholder="Maximum"
                />
              </div>
            </div>
          </div>
          <ResponsiveDialogFooter>
            <ResponsiveDialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </ResponsiveDialogClose>
            <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Updating…' : 'Update'}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Delete Dialog */}
      <ResponsiveDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Deactivate Part</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Are you sure you want to deactivate this part? This will mark it as inactive.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <ResponsiveDialogFooter>
            <ResponsiveDialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </ResponsiveDialogClose>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deactivating…' : 'Deactivate'}
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
