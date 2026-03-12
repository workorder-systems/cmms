import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import type { ColumnDef, Row } from '@tanstack/react-table'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ListOrdered, Plus } from 'lucide-react'
import type { StatusCatalogRow } from '@workorder-systems/sdk'
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
import { IconPicker } from '@workspace/ui/components/icon-picker/icon-picker'
import { toast } from 'sonner'

const ENTITY_TYPE_OPTIONS = [
  { value: 'work_order', label: 'Work order' },
  { value: 'asset', label: 'Asset' },
] as const

const STATUS_CATEGORY_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
  { value: 'final', label: 'Final' },
] as const

const QUERY_KEYS = createDataTableQueryKeys('catalogsStatuses')

export const Route = createFileRoute('/_protected/dashboard/catalogs/statuses')({
  component: CatalogsStatusesPage,
})

function CatalogsStatusesPage() {
  const { activeTenantId } = useTenant()
  const client = getDbClient()
  const queryClient = useQueryClient()

  const { data: statuses = [], isLoading, isError, error } = useQuery({
    ...catalogQueryOptions.statuses(activeTenantId ?? '', client),
    enabled: !!activeTenantId,
  })

  const [addOpen, setAddOpen] = React.useState(false)
  const [formEntityType, setFormEntityType] = React.useState<string>('work_order')
  const [formKey, setFormKey] = React.useState('')
  const [formName, setFormName] = React.useState('')
  const [formCategory, setFormCategory] = React.useState<string>('open')
  const [formColor, setFormColor] = React.useState('#94a3b8')
  const [formDisplayOrder, setFormDisplayOrder] = React.useState('0')
  const [formIcon, setFormIcon] = React.useState<string | null>(null)

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!activeTenantId) throw new Error('No tenant')
      return client.catalogs.createStatus({
        tenantId: activeTenantId,
        entityType: formEntityType,
        key: formKey.trim(),
        name: formName.trim(),
        category: formCategory,
        color: formColor || null,
        displayOrder: parseInt(formDisplayOrder, 10) || 0,
        icon: formIcon ?? null,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogs'] })
      toast.success('Status created')
      handleCloseAddDialog()
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to create status')
    },
  })

  const handleCloseAddDialog = () => {
    setAddOpen(false)
    setFormEntityType('work_order')
    setFormKey('')
    setFormName('')
    setFormCategory('open')
    setFormColor('#94a3b8')
    setFormDisplayOrder('0')
    setFormIcon(null)
  }

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formKey.trim() || !formName.trim()) return
    createMutation.mutate()
  }

  const columns = React.useMemo<ColumnDef<StatusCatalogRow>[]>(
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
        filterFn: (row: Row<StatusCatalogRow>, id: string, filterValue: unknown) => {
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
        id: 'category',
        accessorKey: 'category',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Category" />
        ),
        cell: ({ row }) => {
          const v = row.getValue('category') as string | null
          return (
            <span>{STATUS_CATEGORY_OPTIONS.find((o) => o.value === v)?.label ?? v ?? '—'}</span>
          )
        },
        meta: {
          label: 'Category',
          variant: 'multiSelect',
          options: [...STATUS_CATEGORY_OPTIONS],
        },
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
    ],
    []
  )

  const pageCount = Math.ceil(statuses.length / DEFAULT_PAGE_SIZE) || 1
  const { table } = useDataTable({
    data: statuses as StatusCatalogRow[],
    columns,
    pageCount,
    initialState: {
      pagination: { pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE },
    },
    queryKeys: QUERY_KEYS,
    getRowId: (row) => row.id ?? `${row.entity_type ?? ''}-${row.key ?? ''}`,
  })

  if (isError) {
    return (
      <DataTableErrorMessage
        resourceName="statuses"
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
          Add status
        </Button>
      </ExtensionPoint>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Statuses</h1>
          <p className="text-muted-foreground text-sm">
            Workflow statuses for work orders and assets. Filter by entity type or
            category in the toolbar.
          </p>
        </div>

        <DataTable table={table}>
          <DataTableToolbar table={table} />
        </DataTable>
      </div>

      <ResponsiveDialog open={addOpen} onOpenChange={(open) => !open && handleCloseAddDialog()}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Add status</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Create a new workflow status. Key must be unique per entity type (e.g.
              in_progress). Use lowercase letters, numbers, and underscores.
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
              <FieldLabel htmlFor="status-key">Key</FieldLabel>
              <Input
                id="status-key"
                value={formKey}
                onChange={(e) => setFormKey(e.target.value.replace(/[^a-z0-9_]/g, ''))}
                placeholder="e.g. in_progress"
                autoFocus
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="status-name">Name</FieldLabel>
              <Input
                id="status-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. In progress"
              />
            </Field>
            <Field>
              <FieldLabel>Category</FieldLabel>
              <Select
                value={formCategory}
                onValueChange={setFormCategory}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_CATEGORY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="status-color">Color</FieldLabel>
              <div className="flex gap-2">
                <input
                  id="status-color"
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
            <Field>
              <FieldLabel htmlFor="status-display-order">Display order</FieldLabel>
              <Input
                id="status-display-order"
                type="number"
                min={0}
                value={formDisplayOrder}
                onChange={(e) => setFormDisplayOrder(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel>Icon</FieldLabel>
              <IconPicker value={formIcon} onChange={setFormIcon} />
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
