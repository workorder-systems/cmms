import * as React from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Wrench, ClipboardList } from 'lucide-react'
import type { AssetRow } from '@workorder-systems/sdk'
import { getDbClient } from '../lib/db-client'
import { useTenant } from '../contexts/tenant'
import { ensureTenantContextWithCatalogs } from '../lib/route-loaders'
import { catalogQueryOptions } from '../lib/catalog-queries'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Label } from '@workspace/ui/components/label'
import { StatusBadge } from '../components/status-badge'
import { DataTableErrorMessage } from '../components/data-table-error-message'
import { DataTable } from '@workspace/ui/components/data-table/data-table'
import { DataTableColumnHeader } from '@workspace/ui/components/data-table/data-table-column-header'
import { DataTableSkeleton } from '@workspace/ui/components/data-table/data-table-skeleton'
import type { ColumnDef, Column, Row } from '@tanstack/react-table'
import { getCoreRowModel, useReactTable } from '@tanstack/react-table'
import type { WorkOrderRow } from '@workorder-systems/sdk'

const ASSET_ENTITY_TYPE = 'asset'

const FALLBACK_ASSET_STATUS_OPTIONS = [
  { label: 'Active', value: 'active', color: '#22c55e' as const },
  { label: 'Inactive', value: 'inactive', color: '#94a3b8' as const },
  { label: 'Retired', value: 'retired', color: '#64748b' as const },
]

export const Route = createFileRoute('/_protected/dashboard/assets/$id')({
  beforeLoad: async ({ context }) => ensureTenantContextWithCatalogs(context),
  component: AssetDetailPage,
})

function AssetDetailPage() {
  const { id } = Route.useParams()
  const client = getDbClient()
  const { activeTenantId } = useTenant()

  const { data: asset, isLoading, isError, error } = useQuery({
    queryKey: ['asset', id],
    queryFn: () => client.assets.getById(id),
    enabled: !!id,
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

  const { data: workOrders = [], isLoading: workOrdersLoading } = useQuery({
    queryKey: ['work-orders', activeTenantId],
    queryFn: () => client.workOrders.list(),
    enabled: !!activeTenantId && !!asset,
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

  const workOrdersForAsset = React.useMemo(
    () => workOrders.filter((wo) => (wo as WorkOrderRow).asset_id === id),
    [workOrders, id]
  )

  const workOrderColumns = React.useMemo<ColumnDef<WorkOrderRow>[]>(
    () => [
      {
        id: 'title',
        accessorKey: 'title',
        header: ({ column }: { column: Column<WorkOrderRow, unknown> }) => (
          <DataTableColumnHeader column={column} label="Title" />
        ),
        cell: ({ row }: { row: Row<WorkOrderRow> }) => {
          const wo = row.original
          return (
            <Link
              to="/dashboard/workorders/$id"
              params={{ id: wo.id ?? '' }}
              className="font-medium text-primary hover:underline"
            >
              {wo.title ?? 'Untitled'}
            </Link>
          )
        },
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {row.getValue('status') ?? '—'}
          </span>
        ),
      },
      {
        id: 'due_date',
        accessorKey: 'due_date',
        header: 'Due',
        cell: ({ row }) => {
          const due = row.getValue('due_date') as string | null
          return due
            ? new Date(due).toLocaleDateString(undefined, { dateStyle: 'medium' })
            : '—'
        },
      },
    ],
    []
  )

  const workOrdersTable = useReactTable({
    data: workOrdersForAsset,
    columns: workOrderColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row: WorkOrderRow) => row.id ?? '',
  })

  if (isError) {
    return (
      <DataTableErrorMessage resourceName="asset" error={error ?? null} />
    )
  }

  if (isLoading || !asset) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="h-32 w-full animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  const locationId = asset.location_id ?? null
  const departmentId = asset.department_id ?? null
  const locationName = locationId ? locationIdToName.get(locationId) ?? locationId : null
  const departmentName = departmentId ? departmentIdToName.get(departmentId) ?? departmentId : null

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      <h1 className="truncate text-xl font-semibold">
        {asset.name ?? 'Asset'}
      </h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wrench className="size-4" />
              Details
            </CardTitle>
            <CardDescription>Asset information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <DetailRow
              label="Asset number"
              value={asset.asset_number ?? undefined}
            />
            <DetailRow
              label="Status"
              value={
                <StatusBadge
                  statusKey={asset.status}
                  statusCatalog={assetStatusCatalog}
                />
              }
            />
            <DetailRow label="Location" value={locationName ?? undefined} />
            <DetailRow label="Department" value={departmentName ?? undefined} />
            <DetailRow
              label="Created"
              value={
                asset.created_at
                  ? new Date(asset.created_at).toLocaleDateString(undefined, {
                      dateStyle: 'medium',
                    })
                  : undefined
              }
            />
            <DetailRow
              label="Updated"
              value={
                asset.updated_at
                  ? new Date(asset.updated_at).toLocaleDateString(undefined, {
                      dateStyle: 'medium',
                    })
                  : undefined
              }
            />
            {asset.description ? (
              <div className="space-y-1">
                <Label className="text-muted-foreground">Description</Label>
                <p className="whitespace-pre-wrap text-sm">{asset.description}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="size-4" />
              Work orders
            </CardTitle>
            <CardDescription>
              Work orders linked to this asset
            </CardDescription>
          </CardHeader>
          <CardContent>
            {workOrdersLoading ? (
              <DataTableSkeleton columnCount={3} rowCount={3} />
            ) : workOrdersForAsset.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No work orders for this asset.
              </p>
            ) : (
              <DataTable table={workOrdersTable} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function DetailRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  if (value == null || value === '') return null
  return (
    <div className="space-y-1">
      <Label className="text-muted-foreground">{label}</Label>
      <div className="text-sm">{value}</div>
    </div>
  )
}
