import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import type { ColumnDef, Row } from '@tanstack/react-table'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Flag, Plus } from 'lucide-react'
import type { PriorityCatalogRow } from '@workorder-systems/sdk'
import { getDbClient } from '../lib/db-client'
import { useTenant } from '../contexts/tenant'
import { catalogQueryOptions } from '../lib/catalog-queries'
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@workspace/ui/components/tooltip'
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
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogClose,
} from '@workspace/ui/components/responsive-dialog'
import { toast } from 'sonner'

const ENTITY_TYPE_OPTIONS = [
  { value: 'work_order', label: 'Work order' },
  { value: 'asset', label: 'Asset' },
] as const

const QUERY_KEYS = createDataTableQueryKeys('catalogsPriorities')

export const Route = createFileRoute('/_protected/dashboard/catalogs/priorities')({
  component: CatalogsPrioritiesPage,
})

function CatalogsPrioritiesPage() {
  const { activeTenantId } = useTenant()
  const client = getDbClient()
  const queryClient = useQueryClient()

  const { data: priorities = [], isLoading, isError, error } = useQuery({
    ...catalogQueryOptions.priorities(activeTenantId ?? '', client),
    enabled: !!activeTenantId,
  })

  const [addOpen, setAddOpen] = React.useState(false)
  const [formEntityType, setFormEntityType] = React.useState<string>('work_order')
  const [formKey, setFormKey] = React.useState('')
  const [formName, setFormName] = React.useState('')
  const [formWeight, setFormWeight] = React.useState('100')
  const [formDisplayOrder, setFormDisplayOrder] = React.useState('0')
  const [formColor, setFormColor] = React.useState('#94a3b8')

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!activeTenantId) throw new Error('No tenant')
      return client.catalogs.createPriority({
        tenantId: activeTenantId,
        entityType: formEntityType,
        key: formKey.trim(),
        name: formName.trim(),
        weight: parseInt(formWeight, 10) || 0,
        displayOrder: parseInt(formDisplayOrder, 10) || 0,
        color: formColor || null,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogs'] })
      toast.success('Priority created')
      handleCloseAddDialog()
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to create priority')
    },
  })

  const handleCloseAddDialog = () => {
    setAddOpen(false)
    setFormEntityType('work_order')
    setFormKey('')
    setFormName('')
    setFormWeight('100')
    setFormDisplayOrder('0')
    setFormColor('#94a3b8')
  }

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formKey.trim() || !formName.trim()) return
    createMutation.mutate()
  }

  const columns = React.useMemo<ColumnDef<PriorityCatalogRow>[]>(
    () => [
      {
        id: 'entity_type',
        accessorKey: 'entity_type',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Entity type" />
        ),
        cell: ({ row }) => {
          const v = row.getValue('entity_type') as string | null
          const label = ENTITY_TYPE_OPTIONS.find((o) => o.value === v)?.label ?? v ?? '—'
          return <span>{label}</span>
        },
        meta: {
          label: 'Entity type',
          variant: 'multiSelect',
          options: [...ENTITY_TYPE_OPTIONS],
        },
        enableColumnFilter: true,
        filterFn: (row: Row<PriorityCatalogRow>, id: string, filterValue: unknown) => {
          const value = row.getValue(id) as string | null
          const values = Array.isArray(filterValue) ? filterValue : [filterValue]
          if (!values.length) return true
          return value != null && values.includes(value)
        },
      },
      {
        id: 'key',
        accessorKey: 'key',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Key" />
        ),
        cell: ({ row }) => {
          const key = row.getValue('key') as string | null
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="font-mono text-sm">{key ?? '—'}</span>
              </TooltipTrigger>
              <TooltipContent>
                Machine-readable key for API and workflow
              </TooltipContent>
            </Tooltip>
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
          <span className="font-medium">{row.getValue('name') ?? '—'}</span>
        ),
      },
      {
        id: 'weight',
        accessorKey: 'weight',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Weight" />
        ),
        cell: ({ row }) => (
          <Tooltip>
            <TooltipTrigger asChild>
              <span>{row.getValue('weight') ?? '—'}</span>
            </TooltipTrigger>
            <TooltipContent>Lower weight = higher priority</TooltipContent>
          </Tooltip>
        ),
      },
      {
        id: 'display_order',
        accessorKey: 'display_order',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Order" />
        ),
        cell: ({ row }) => (
          <span>{row.getValue('display_order') ?? '—'}</span>
        ),
      },
      {
        id: 'color',
        accessorKey: 'color',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Color" />
        ),
        cell: ({ row }) => {
          const color = row.getValue('color') as string | null
          if (!color) return <span className="text-muted-foreground">—</span>
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="inline-block size-5 shrink-0 rounded-full border border-border"
                  style={{ backgroundColor: color }}
                  aria-hidden
                />
              </TooltipTrigger>
              <TooltipContent>{color}</TooltipContent>
            </Tooltip>
          )
        },
      },
    ],
    []
  )

  const pageCount = Math.ceil(priorities.length / DEFAULT_PAGE_SIZE) || 1
  const { table } = useDataTable({
    data: priorities as PriorityCatalogRow[],
    columns,
    pageCount,
    initialState: {
      pagination: { pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE },
    },
    queryKeys: QUERY_KEYS,
    getRowId: (row) =>
      (row as PriorityCatalogRow).id ??
      `${(row as PriorityCatalogRow).entity_type ?? ''}-${(row as PriorityCatalogRow).key ?? ''}`,
  })

  if (isError) {
    return (
      <DataTableErrorMessage
        resourceName="priorities"
        error={error ?? null}
      />
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <DataTableSkeleton columnCount={6} rowCount={10} />
      </div>
    )
  }

  return (
    <>
      <ExtensionPoint name="header.right">
        <Button onClick={() => setAddOpen(true)} size="sm" variant="outline">
          <Plus className="size-4" />
          Add priority
        </Button>
      </ExtensionPoint>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Priorities</h1>
          <p className="text-muted-foreground text-sm">
            Priority levels for work orders and assets. Filter by entity type in
            the toolbar. Lower weight means higher priority.
          </p>
        </div>

        <DataTable table={table}>
          <DataTableToolbar table={table} />
        </DataTable>
      </div>

      <ResponsiveDialog open={addOpen} onOpenChange={(open) => !open && handleCloseAddDialog()}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Add priority</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Create a new priority. Key must be unique per entity type. Weight is used
              for sorting (lower = higher priority).
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <Field>
              <FieldLabel>Entity type</FieldLabel>
              <Select
                value={formEntityType}
                onValueChange={setFormEntityType}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select entity type" />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="priority-key">Key</FieldLabel>
              <Input
                id="priority-key"
                value={formKey}
                onChange={(e) => setFormKey(e.target.value.replace(/[^a-z0-9_]/g, ''))}
                placeholder="e.g. high"
                autoFocus
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="priority-name">Name</FieldLabel>
              <Input
                id="priority-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. High"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="priority-weight">Weight</FieldLabel>
              <Input
                id="priority-weight"
                type="number"
                min={0}
                value={formWeight}
                onChange={(e) => setFormWeight(e.target.value)}
                placeholder="100"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="priority-display-order">Display order</FieldLabel>
              <Input
                id="priority-display-order"
                type="number"
                min={0}
                value={formDisplayOrder}
                onChange={(e) => setFormDisplayOrder(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="priority-color">Color</FieldLabel>
              <div className="flex gap-2">
                <input
                  id="priority-color"
                  type="color"
                  value={formColor}
                  onChange={(e) => setFormColor(e.target.value)}
                  className="h-9 w-14 cursor-pointer rounded border border-input"
                />
                <Input
                  value={formColor}
                  onChange={(e) => setFormColor(e.target.value)}
                  placeholder="#94a3b8"
                  className="font-mono"
                />
              </div>
            </Field>
          </form>
          <ResponsiveDialogFooter>
            <ResponsiveDialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </ResponsiveDialogClose>
            <Button
              onClick={() => {
                if (formKey.trim() && formName.trim())
                  createMutation.mutate()
              }}
              disabled={
                !formKey.trim() ||
                !formName.trim() ||
                createMutation.isPending
              }
            >
              {createMutation.isPending ? 'Creating…' : 'Create'}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  )
}
