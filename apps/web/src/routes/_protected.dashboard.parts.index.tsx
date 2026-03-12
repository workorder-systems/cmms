import * as React from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Package, Plus, Edit, Trash2, Loader2 } from 'lucide-react'
import type { PartWithStockRow } from '@workorder-systems/sdk'
import { getDbClient } from '../lib/db-client'
import { useTenant } from '../contexts/tenant'
import { ensureTenantContext } from '../lib/route-loaders'
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
import { Label } from '@workspace/ui/components/label'
import { Textarea } from '@workspace/ui/components/textarea'
import { toast } from 'sonner'
import { useHasPermission } from '../hooks/use-permissions'

export const Route = createFileRoute('/_protected/dashboard/parts/')({
  beforeLoad: async ({ context }) => ensureTenantContext(context),
  component: PartsPage,
})

const QUERY_KEYS = createDataTableQueryKeys('parts')

function PartsPage() {
  const { activeTenantId } = useTenant()
  const client = getDbClient()
  const queryClient = useQueryClient()
  const canCreatePart = useHasPermission('parts.create')
  const canEditPart = useHasPermission('parts.update')
  const canDeletePart = useHasPermission('parts.delete')

  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)
  const [createPartNumber, setCreatePartNumber] = React.useState('')
  const [createName, setCreateName] = React.useState('')
  const [createDescription, setCreateDescription] = React.useState('')
  const [createUnit, setCreateUnit] = React.useState('each')
  const [createReorderPoint, setCreateReorderPoint] = React.useState('')
  const [createMinQuantity, setCreateMinQuantity] = React.useState('')
  const [createMaxQuantity, setCreateMaxQuantity] = React.useState('')
  const [createLeadTimeDays, setCreateLeadTimeDays] = React.useState('')

  const { data: parts = [], isLoading, isError, error } = useQuery({
    queryKey: ['parts', activeTenantId],
    queryFn: () => client.partsInventory.listPartsWithStock(),
    enabled: !!activeTenantId,
  })

  const createPartMutation = useMutation({
    mutationFn: () =>
      client.partsInventory.createPart({
        tenantId: activeTenantId!,
        partNumber: createPartNumber.trim(),
        name: createName.trim() || null,
        description: createDescription.trim() || null,
        unit: createUnit,
        reorderPoint: createReorderPoint ? parseInt(createReorderPoint, 10) : null,
        minQuantity: createMinQuantity ? parseInt(createMinQuantity, 10) : null,
        maxQuantity: createMaxQuantity ? parseInt(createMaxQuantity, 10) : null,
        leadTimeDays: createLeadTimeDays ? parseInt(createLeadTimeDays, 10) : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts', activeTenantId] })
      toast.success('Part created')
      setIsCreateDialogOpen(false)
      setCreatePartNumber('')
      setCreateName('')
      setCreateDescription('')
      setCreateUnit('each')
      setCreateReorderPoint('')
      setCreateMinQuantity('')
      setCreateMaxQuantity('')
      setCreateLeadTimeDays('')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const columns = React.useMemo<ColumnDef<PartWithStockRow>[]>(
    () => [
      {
        id: 'part_number',
        accessorKey: 'part_number',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Part #" />
        ),
        cell: ({ row }) => {
          const part = row.original
          return (
            <Link
              to="/dashboard/parts/$id"
              params={{ id: part.id }}
              className="font-medium text-primary hover:underline"
            >
              {row.getValue('part_number') ?? '—'}
            </Link>
          )
        },
      },
      {
        id: 'name',
        accessorKey: 'name',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Name" />
        ),
        cell: ({ row }) => (
          <span>{row.getValue('name') ?? '—'}</span>
        ),
      },
      {
        id: 'total_stock',
        accessorKey: 'total_stock',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Total Stock" />
        ),
        cell: ({ row }) => {
          const stock = row.getValue('total_stock') as number | null
          return <span className="font-medium">{stock ?? 0}</span>
        },
      },
      {
        id: 'unit',
        accessorKey: 'unit',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Unit" />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.getValue('unit') ?? '—'}</span>
        ),
      },
    ],
    []
  )

  const pageCount = Math.ceil(parts.length / DEFAULT_PAGE_SIZE) || 1
  const { table } = useDataTable({
    data: parts,
    columns,
    pageCount,
    initialState: {
      pagination: { pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE },
    },
    queryKeys: QUERY_KEYS,
    getRowId: (row) => (row as PartWithStockRow).id ?? '',
  })

  if (isError) {
    return (
      <DataTableErrorMessage resourceName="parts" error={error ?? null} />
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6 pt-8">
        <DataTableSkeleton columnCount={4} rowCount={10} />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 pt-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <h1 className="text-3xl font-bold tracking-tight">Parts & Inventory</h1>
          <p className="text-base text-muted-foreground">Manage parts, stock levels, and purchasing</p>
        </div>
        {canCreatePart && (
          <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            Create Part
          </Button>
        )}
      </div>

      <div className="rounded-xl border-2 border-border/50 bg-card shadow-sm">
        <DataTable table={table}>
          <DataTableToolbar table={table} />
        </DataTable>
      </div>

      {/* Create Part Dialog */}
      <ResponsiveDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Create Part</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>Add a new part to the inventory</ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="part-number">
                Part Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="part-number"
                value={createPartNumber}
                onChange={(e) => setCreatePartNumber(e.target.value)}
                placeholder="e.g. PART-001"
                required
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                A unique identifier for this part (e.g., manufacturer part number)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="part-name">Name</Label>
              <Input
                id="part-name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="e.g. Hydraulic Filter"
              />
              <p className="text-xs text-muted-foreground">
                Optional: A descriptive name for the part
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="part-description">Description</Label>
              <Textarea
                id="part-description"
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                placeholder="Additional details about the part..."
                rows={3}
                className="resize-none"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="part-unit">Unit</Label>
                <Input
                  id="part-unit"
                  value={createUnit}
                  onChange={(e) => setCreateUnit(e.target.value)}
                  placeholder="each"
                />
                <p className="text-xs text-muted-foreground">
                  Unit of measure (e.g., each, box, gallon)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="part-lead-time">Lead Time (days)</Label>
                <Input
                  id="part-lead-time"
                  type="number"
                  min="0"
                  value={createLeadTimeDays}
                  onChange={(e) => setCreateLeadTimeDays(e.target.value)}
                  placeholder="e.g. 7"
                />
                <p className="text-xs text-muted-foreground">
                  Average days to receive from supplier
                </p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="part-reorder-point">Reorder Point</Label>
                <Input
                  id="part-reorder-point"
                  type="number"
                  min="0"
                  value={createReorderPoint}
                  onChange={(e) => setCreateReorderPoint(e.target.value)}
                  placeholder="e.g. 10"
                />
                <p className="text-xs text-muted-foreground">
                  Alert when stock falls below this
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="part-min-qty">Min Quantity</Label>
                <Input
                  id="part-min-qty"
                  type="number"
                  min="0"
                  value={createMinQuantity}
                  onChange={(e) => setCreateMinQuantity(e.target.value)}
                  placeholder="e.g. 5"
                />
                <p className="text-xs text-muted-foreground">
                  Minimum stock level
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="part-max-qty">Max Quantity</Label>
                <Input
                  id="part-max-qty"
                  type="number"
                  min="0"
                  value={createMaxQuantity}
                  onChange={(e) => setCreateMaxQuantity(e.target.value)}
                  placeholder="e.g. 100"
                />
                <p className="text-xs text-muted-foreground">
                  Maximum stock level
                </p>
              </div>
            </div>
          </div>
          <ResponsiveDialogFooter>
            <ResponsiveDialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </ResponsiveDialogClose>
            <Button
              onClick={() => createPartMutation.mutate()}
              disabled={createPartMutation.isPending || !createPartNumber.trim()}
            >
              {createPartMutation.isPending ? 'Creating…' : 'Create'}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  )
}
