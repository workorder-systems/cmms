import * as React from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import type { ColumnDef, Row } from '@tanstack/react-table'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Upload, Wrench, Loader2 } from 'lucide-react'
import type { AssetRow } from '@workorder-systems/sdk'
import { getDbClient } from '../lib/db-client'
import { catalogQueryOptions } from '../lib/catalog-queries'
import { useTenant } from '../contexts/tenant'
import { ensureTenantContextWithCatalogs } from '../lib/route-loaders'
import { useHasPermission } from '../hooks/use-permissions'
import { StatusBadge } from '../components/status-badge'
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
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import { Textarea } from '@workspace/ui/components/textarea'
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

const ASSETS_QUERY_KEYS = createDataTableQueryKeys('assets')
const ASSET_ENTITY_TYPE = 'asset'

/** Fallback when catalog has no asset statuses. */
const FALLBACK_ASSET_STATUS_OPTIONS = [
  { label: 'Active', value: 'active', color: '#22c55e' as const },
  { label: 'Inactive', value: 'inactive', color: '#94a3b8' as const },
  { label: 'Retired', value: 'retired', color: '#64748b' as const },
]

export const Route = createFileRoute('/_protected/dashboard/assets/')({
  beforeLoad: async ({ context }) => ensureTenantContextWithCatalogs(context),
  component: AssetsPage,
})

function AssetsPage() {
  const { activeTenantId } = useTenant()
  const client = getDbClient()
  const { hasPermission: canCreateAsset } = useHasPermission('assets.create')

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

  const { data: statusCatalog = [] } = useQuery({
    ...catalogQueryOptions.statuses(activeTenantId ?? '', client),
    enabled: !!activeTenantId,
  })

  const assetStatusOptions = React.useMemo(() => {
    const opts = statusCatalog
      .filter((s) => s.entity_type === ASSET_ENTITY_TYPE)
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
      .map((s) => ({
        label: s.name ?? s.key ?? '',
        value: s.key ?? '',
        color: s.color ?? null,
      }))
      .filter((o) => o.value)
    return opts.length > 0 ? opts : FALLBACK_ASSET_STATUS_OPTIONS
  }, [statusCatalog])

  const assetStatusCatalog = React.useMemo(
    () =>
      assetStatusOptions.map((s) => ({
        key: s.value,
        name: s.label,
        color: s.color ?? null,
      })),
    [assetStatusOptions]
  )

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

  const queryClient = useQueryClient()
  const isCreateModalOpen = useAssetsPageStore((s) => s.isCreateModalOpen)
  const openCreateModal = useAssetsPageStore((s) => s.openCreateModal)
  const closeCreateModal = useAssetsPageStore((s) => s.closeCreateModal)

  const [createName, setCreateName] = React.useState('')
  const [createDescription, setCreateDescription] = React.useState('')
  const [createAssetNumber, setCreateAssetNumber] = React.useState('')
  const [createLocationId, setCreateLocationId] = React.useState('')
  const [createDepartmentId, setCreateDepartmentId] = React.useState('')
  const [createStatus, setCreateStatus] = React.useState('active')

  const createMutation = useMutation({
    mutationFn: () =>
      client.assets.create({
        tenantId: activeTenantId!,
        name: createName.trim(),
        description: createDescription.trim() || null,
        assetNumber: createAssetNumber.trim() || null,
        locationId: createLocationId || null,
        departmentId: createDepartmentId || null,
        status: createStatus || 'active',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets', activeTenantId] })
      toast.success('Asset created')
      setCreateName('')
      setCreateDescription('')
      setCreateAssetNumber('')
      setCreateLocationId('')
      setCreateDepartmentId('')
      setCreateStatus('active')
      closeCreateModal()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const columns = React.useMemo<ColumnDef<AssetRow>[]>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Name" />
        ),
        cell: ({ row }) => {
          const asset = row.original
          const name = asset.name ?? '—'
          return asset.id ? (
            <Link
              to="/dashboard/assets/$id"
              params={{ id: asset.id }}
              className="font-medium text-primary hover:underline"
            >
              {name}
            </Link>
          ) : (
            <span className="font-medium">{name}</span>
          )
        },
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
        cell: ({ row }) => (
          <StatusBadge
            statusKey={row.getValue('status') as string | null}
            statusCatalog={assetStatusCatalog}
          />
        ),
        meta: {
          label: 'Status',
          variant: 'multiSelect',
          options: assetStatusOptions,
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
    [locationIdToName, departmentIdToName, assetStatusOptions, assetStatusCatalog],
  )

  const pageCount = Math.ceil(assets.length / DEFAULT_PAGE_SIZE) || 1
  const { table } = useDataTable({
    data: assets,
    columns,
    pageCount,
    initialState: {
      pagination: { pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE },
    },
    queryKeys: ASSETS_QUERY_KEYS,
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
        <DataTableSkeleton columnCount={7} rowCount={10} />
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
          {canCreateAsset && (
            <Button onClick={openCreateModal} size="sm" variant="outline">
              <Plus className="size-4" />
              New asset
            </Button>
          )}
        </div>
      </ExtensionPoint>

      <DataTable table={table}>
        <DataTableToolbar table={table} />
      </DataTable>

      {/* Create asset modal */}
      <ResponsiveDialog
        open={isCreateModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeCreateModal()
            setCreateName('')
            setCreateDescription('')
            setCreateAssetNumber('')
            setCreateLocationId('')
            setCreateDepartmentId('')
            setCreateStatus('active')
          }
        }}
      >
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>New asset</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Create a new asset
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">Name *</Label>
              <Input
                id="create-name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Asset name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-asset-number">Asset Number</Label>
              <Input
                id="create-asset-number"
                value={createAssetNumber}
                onChange={(e) => setCreateAssetNumber(e.target.value)}
                placeholder="Asset number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-description">Description</Label>
              <Textarea
                id="create-description"
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                placeholder="Asset description"
                rows={3}
                className="resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-status">Status</Label>
              <Select value={createStatus} onValueChange={setCreateStatus}>
                <SelectTrigger id="create-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assetStatusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="create-location">Location</Label>
                <Select value={createLocationId} onValueChange={setCreateLocationId}>
                  <SelectTrigger id="create-location">
                    <SelectValue placeholder="Select location (optional)" />
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
              <div className="space-y-2">
                <Label htmlFor="create-department">Department</Label>
                <Select value={createDepartmentId} onValueChange={setCreateDepartmentId}>
                  <SelectTrigger id="create-department">
                    <SelectValue placeholder="Select department (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id as string}>
                        {dept.name ?? dept.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
