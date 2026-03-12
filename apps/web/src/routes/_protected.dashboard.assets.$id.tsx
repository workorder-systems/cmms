import * as React from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Wrench, ClipboardList, Gauge, Plus, Activity } from 'lucide-react'
import type { AssetRow, AssetMeterRow, MeterReadingRow } from '@workorder-systems/sdk'
import { getDbClient } from '../lib/db-client'
import { workOrdersListQueryKey } from '../lib/data-table-query-keys'
import { useTenant } from '../contexts/tenant'
import { ensureTenantContextWithCatalogs } from '../lib/route-loaders'
import { catalogQueryOptions } from '../lib/catalog-queries'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Label } from '@workspace/ui/components/label'
import { Input } from '@workspace/ui/components/input'
import { Button } from '@workspace/ui/components/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { StatCard } from '@workspace/ui/components/stat-card'
import { Sparkline } from '@workspace/ui/components/sparkline'
import { StatusBadge } from '../components/status-badge'
import { DataTableErrorMessage } from '../components/data-table-error-message'
import { DataTable } from '@workspace/ui/components/data-table/data-table'
import { DataTableColumnHeader } from '@workspace/ui/components/data-table/data-table-column-header'
import { DataTableSkeleton } from '@workspace/ui/components/data-table/data-table-skeleton'
import type { ColumnDef, Column, Row } from '@tanstack/react-table'
import { getCoreRowModel, useReactTable } from '@tanstack/react-table'
import type { WorkOrderRow } from '@workorder-systems/sdk'
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

const ASSET_ENTITY_TYPE = 'asset'

const FALLBACK_ASSET_STATUS_OPTIONS = [
  { label: 'Active', value: 'active', color: '#22c55e' as const },
  { label: 'Inactive', value: 'inactive', color: '#94a3b8' as const },
  { label: 'Retired', value: 'retired', color: '#64748b' as const },
]

const METER_TYPE_OPTIONS = [
  { value: 'runtime_hours', label: 'Runtime hours' },
  { value: 'cycles', label: 'Cycles' },
  { value: 'miles', label: 'Miles' },
  { value: 'production_units', label: 'Production units' },
  { value: 'custom', label: 'Custom' },
] as const

const READING_DIRECTION_OPTIONS = [
  { value: 'increasing', label: 'Increasing' },
  { value: 'decreasing', label: 'Decreasing' },
  { value: 'reset', label: 'Reset' },
] as const

const SPARKLINE_READINGS_COUNT = 20

export const Route = createFileRoute('/_protected/dashboard/assets/$id')({
  beforeLoad: async ({ context }) => ensureTenantContextWithCatalogs(context),
  loader: async ({ context, params }) => {
    if (typeof window === 'undefined' || !params.id) return
    await context.queryClient.prefetchQuery({
      queryKey: ['asset', params.id],
      queryFn: () => context.dbClient.assets.getById(params.id),
    })
  },
  component: AssetDetailPage,
})

function AssetDetailPage() {
  const { id } = Route.useParams()
  const client = getDbClient()
  const queryClient = useQueryClient()
  const { activeTenantId } = useTenant()

  const [addMeterOpen, setAddMeterOpen] = React.useState(false)
  const [recordReadingMeter, setRecordReadingMeter] = React.useState<AssetMeterRow | null>(null)

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
    queryKey: workOrdersListQueryKey(activeTenantId),
    queryFn: () => client.workOrders.list(),
    enabled: !!activeTenantId && !!asset,
  })

  const { data: meters = [] } = useQuery({
    queryKey: ['meters', activeTenantId],
    queryFn: () => client.meters.list(),
    enabled: !!activeTenantId && !!asset,
  })

  const { data: meterReadings = [] } = useQuery({
    queryKey: ['meter-readings', activeTenantId],
    queryFn: () => client.meters.getReadings(),
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

  const openWorkOrdersForAsset = React.useMemo(
    () => workOrdersForAsset.filter((wo) => wo.status !== 'completed'),
    [workOrdersForAsset]
  )

  const metersForAsset = React.useMemo(
    () => (meters as AssetMeterRow[]).filter((m) => m.asset_id === id),
    [meters, id]
  )

  const getSparklineDataForMeter = React.useCallback(
    (meterId: string | null): number[] => {
      if (!meterId) return []
      const readings = (meterReadings as MeterReadingRow[])
        .filter((r) => r.meter_id === meterId)
        .sort((a, b) => {
          const da = a.reading_date ?? ''
          const db = b.reading_date ?? ''
          return da.localeCompare(db)
        })
      return readings
        .slice(-SPARKLINE_READINGS_COUNT)
        .map((r) => r.reading_value ?? 0)
    },
    [meterReadings]
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
              className="font-medium text-foreground hover:underline"
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
        cell: ({ row }: { row: Row<WorkOrderRow> }) => (
          <span className="text-muted-foreground text-sm">
            {row.getValue('status') ?? '—'}
          </span>
        ),
      },
      {
        id: 'due_date',
        accessorKey: 'due_date',
        header: 'Due',
        cell: ({ row }: { row: Row<WorkOrderRow> }) => {
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

  const createMeterMutation = useMutation({
    mutationFn: (params: {
      name: string
      meterType: string
      unit: string
      currentReading?: number
      readingDirection?: string
      decimalPlaces?: number
      description?: string | null
    }) =>
      client.meters.create({
        tenantId: activeTenantId!,
        assetId: id,
        name: params.name,
        meterType: params.meterType,
        unit: params.unit,
        currentReading: params.currentReading,
        readingDirection: params.readingDirection ?? 'increasing',
        decimalPlaces: params.decimalPlaces ?? 0,
        description: params.description ?? null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meters', activeTenantId] })
      queryClient.invalidateQueries({ queryKey: ['meter-readings', activeTenantId] })
      setAddMeterOpen(false)
      toast.success('Meter created')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const recordReadingMutation = useMutation({
    mutationFn: (params: { meterId: string; readingValue: number; readingDate?: string | null; notes?: string | null }) =>
      client.meters.recordReading({
        tenantId: activeTenantId!,
        meterId: params.meterId,
        readingValue: params.readingValue,
        readingDate: params.readingDate ?? null,
        readingType: 'manual',
        notes: params.notes ?? null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meter-readings', activeTenantId] })
      queryClient.invalidateQueries({ queryKey: ['meters', activeTenantId] })
      queryClient.invalidateQueries({ queryKey: ['asset', id] })
      setRecordReadingMeter(null)
      toast.success('Reading recorded')
    },
    onError: (err: Error) => toast.error(err.message),
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

      {/* StatCards: open work orders + per-meter with optional sparkline (gradient style) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <StatCard
          variant="gradient"
          label="Open work orders"
          value={openWorkOrdersForAsset.length}
          footerSummary={openWorkOrdersForAsset.length > 0 ? 'View work orders below' : undefined}
          footerDescription={openWorkOrdersForAsset.length === 0 ? 'No open work orders' : undefined}
        />
        {metersForAsset.map((meter) => {
          const sparklineData = getSparklineDataForMeter(meter.id ?? null)
          const hasTrend = sparklineData.length >= 2
          const trendDirection =
            hasTrend && sparklineData[sparklineData.length - 1]! >= sparklineData[0]! ? 'up' : hasTrend ? 'down' : undefined
          return (
            <StatCard
              key={meter.id ?? ''}
              variant="gradient"
              label={meter.name ?? 'Meter'}
              value={formatMeterReading(meter.current_reading, meter.decimal_places)}
              trend={
                trendDirection
                  ? { value: trendDirection === 'up' ? 'Increasing' : 'Decreasing', direction: trendDirection }
                  : undefined
              }
              footerDescription={meter.unit ?? undefined}
              sparkline={
                sparklineData.length > 0
                  ? {
                      data: sparklineData,
                      sparklineProps: {
                        width: 80,
                        height: 28,
                        variant: 'area' as const,
                        showGradient: true,
                      },
                    }
                  : undefined
              }
            />
          )
        })}
      </div>

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

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Gauge className="size-4" />
              Meters
            </CardTitle>
            <CardDescription>
              Meters attached to this asset. Record readings to track usage.
            </CardDescription>
            <div className="flex justify-end pt-2">
              <Button size="sm" onClick={() => setAddMeterOpen(true)}>
                <Plus className="size-4" />
                Add meter
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {metersForAsset.length === 0 ? (
              <p className="text-muted-foreground text-sm">No meters for this asset. Add one to start tracking.</p>
            ) : (
              <div className="space-y-3">
                {metersForAsset.map((meter) => (
                  <div
                    key={meter.id ?? ''}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3"
                  >
                    <div>
                      <p className="font-medium">{meter.name ?? '—'}</p>
                      <p className="text-muted-foreground text-sm">
                        {formatMeterReading(meter.current_reading, meter.decimal_places)} {meter.unit ?? ''}
                        {meter.last_reading_date
                          ? ` · Last: ${new Date(meter.last_reading_date).toLocaleDateString(undefined, { dateStyle: 'short' })}`
                          : ''}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRecordReadingMeter(meter)}
                    >
                      <Activity className="size-4" />
                      Record reading
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add meter dialog */}
      <AddMeterDialog
        open={addMeterOpen}
        onOpenChange={setAddMeterOpen}
        onSubmit={(values) => createMeterMutation.mutate(values)}
        isPending={createMeterMutation.isPending}
      />

      {/* Record reading dialog */}
      {recordReadingMeter && (
        <RecordReadingDialog
          meter={recordReadingMeter}
          open={!!recordReadingMeter}
          onOpenChange={(open) => !open && setRecordReadingMeter(null)}
          onSubmit={(values) =>
            recordReadingMutation.mutate({
              meterId: recordReadingMeter.id!,
              readingValue: values.readingValue,
              readingDate: values.readingDate || null,
              notes: values.notes || null,
            })
          }
          isPending={recordReadingMutation.isPending}
        />
      )}
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

function AddMeterDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: {
    name: string
    meterType: string
    unit: string
    currentReading?: number
    readingDirection?: string
    decimalPlaces?: number
    description?: string | null
  }) => void
  isPending: boolean
}) {
  const [name, setName] = React.useState('')
  const [meterType, setMeterType] = React.useState<string>('runtime_hours')
  const [unit, setUnit] = React.useState('')
  const [currentReading, setCurrentReading] = React.useState<string>('')
  const [readingDirection, setReadingDirection] = React.useState<string>('increasing')
  const [decimalPlaces, setDecimalPlaces] = React.useState<string>('0')
  const [description, setDescription] = React.useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !unit.trim()) return
    onSubmit({
      name: name.trim(),
      meterType,
      unit: unit.trim(),
      currentReading: currentReading === '' ? undefined : Number(currentReading),
      readingDirection,
      decimalPlaces: decimalPlaces === '' ? undefined : Number(decimalPlaces),
      description: description.trim() || null,
    })
    setName('')
    setUnit('')
    setCurrentReading('')
    setReadingDirection('increasing')
    setDecimalPlaces('0')
    setDescription('')
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Add meter</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Add a meter to track usage (e.g. runtime hours, cycles) for this asset.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="meter-name">Name</Label>
            <Input
              id="meter-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Main engine hours"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="meter-type">Type</Label>
            <Select value={meterType} onValueChange={setMeterType}>
              <SelectTrigger id="meter-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METER_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="meter-unit">Unit</Label>
            <Input
              id="meter-unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="e.g. hours, miles"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="meter-current">Initial reading (optional)</Label>
            <Input
              id="meter-current"
              type="number"
              min={0}
              step="any"
              value={currentReading}
              onChange={(e) => setCurrentReading(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="meter-direction">Reading direction</Label>
            <Select value={readingDirection} onValueChange={setReadingDirection}>
              <SelectTrigger id="meter-direction">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {READING_DIRECTION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="meter-decimals">Decimal places (0–6)</Label>
            <Input
              id="meter-decimals"
              type="number"
              min={0}
              max={6}
              value={decimalPlaces}
              onChange={(e) => setDecimalPlaces(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="meter-desc">Description (optional)</Label>
            <Input
              id="meter-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes"
            />
          </div>
          <ResponsiveDialogFooter>
            <ResponsiveDialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </ResponsiveDialogClose>
            <Button type="submit" disabled={isPending || !name.trim() || !unit.trim()}>
              {isPending ? 'Creating…' : 'Create meter'}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}

function RecordReadingDialog({
  meter,
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  meter: AssetMeterRow
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: { readingValue: number; readingDate?: string | null; notes?: string | null }) => void
  isPending: boolean
}) {
  const today = new Date().toISOString().slice(0, 16)
  const [readingValue, setReadingValue] = React.useState('')
  const [readingDate, setReadingDate] = React.useState(today)
  const [notes, setNotes] = React.useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const value = Number(readingValue)
    if (Number.isNaN(value) || value < 0) return
    onSubmit({
      readingValue: value,
      readingDate: readingDate ? new Date(readingDate).toISOString() : null,
      notes: notes.trim() || null,
    })
    setReadingValue('')
    setReadingDate(today)
    setNotes('')
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Record reading – {meter.name ?? 'Meter'}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Current reading: {formatMeterReading(meter.current_reading, meter.decimal_places)} {meter.unit ?? ''}.
            Enter the new value (backend validates date range and direction).
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reading-value">Value</Label>
            <Input
              id="reading-value"
              type="number"
              min={0}
              step={typeof meter.decimal_places === 'number' && meter.decimal_places > 0 ? 0.1 : 1}
              value={readingValue}
              onChange={(e) => setReadingValue(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reading-date">Reading date</Label>
            <Input
              id="reading-date"
              type="datetime-local"
              value={readingDate}
              onChange={(e) => setReadingDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reading-notes">Notes (optional)</Label>
            <Input
              id="reading-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
            />
          </div>
          <ResponsiveDialogFooter>
            <ResponsiveDialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </ResponsiveDialogClose>
            <Button type="submit" disabled={isPending || readingValue === ''}>
              {isPending ? 'Recording…' : 'Record reading'}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}

function formatMeterReading(value: number | null | undefined, decimalPlaces: number | null | undefined): string {
  if (value == null) return '—'
  const dp = typeof decimalPlaces === 'number' ? decimalPlaces : 0
  return value.toFixed(dp)
}
