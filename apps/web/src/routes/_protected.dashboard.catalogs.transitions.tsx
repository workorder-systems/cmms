import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import type { ColumnDef, Row } from '@tanstack/react-table'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowRightLeft, Plus } from 'lucide-react'
import type { StatusTransitionRow } from '@workorder-systems/sdk'
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

const QUERY_KEYS = createDataTableQueryKeys('catalogsTransitions')

export const Route = createFileRoute('/_protected/dashboard/catalogs/transitions')({
  component: CatalogsTransitionsPage,
})

function CatalogsTransitionsPage() {
  const { activeTenantId } = useTenant()
  const client = getDbClient()
  const queryClient = useQueryClient()

  const { data: transitions = [], isLoading, isError, error } = useQuery({
    ...catalogQueryOptions.transitions(activeTenantId ?? '', client),
    enabled: !!activeTenantId,
  })

  const { data: statuses = [] } = useQuery({
    ...catalogQueryOptions.statuses(activeTenantId ?? '', client),
    enabled: !!activeTenantId,
  })

  const [addOpen, setAddOpen] = React.useState(false)
  const [formEntityType, setFormEntityType] = React.useState<string>('work_order')
  const [formFromKey, setFormFromKey] = React.useState('')
  const [formToKey, setFormToKey] = React.useState('')
  const [formRequiredPermission, setFormRequiredPermission] = React.useState('')

  const statusOptionsForEntity = React.useMemo(() => {
    return (statuses as { entity_type: string | null; key: string | null; name: string | null }[])
      .filter((s) => s.entity_type === formEntityType && s.key)
      .sort((a, b) => ((a.key ?? '').localeCompare(b.key ?? '')))
      .map((s) => ({ value: s.key!, label: s.name ?? s.key ?? s.key! }))
  }, [statuses, formEntityType])

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!activeTenantId) throw new Error('No tenant')
      return client.catalogs.createStatusTransition({
        tenantId: activeTenantId,
        entityType: formEntityType,
        fromStatusKey: formFromKey,
        toStatusKey: formToKey,
        requiredPermission: formRequiredPermission.trim() || null,
        guardCondition: null,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogs'] })
      toast.success('Transition created')
      handleCloseAddDialog()
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : 'Failed to create transition'
      )
    },
  })

  const handleCloseAddDialog = () => {
    setAddOpen(false)
    setFormEntityType('work_order')
    setFormFromKey('')
    setFormToKey('')
    setFormRequiredPermission('')
  }

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formFromKey || !formToKey) return
    createMutation.mutate()
  }

  const columns = React.useMemo<ColumnDef<StatusTransitionRow>[]>(
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
        filterFn: (row: Row<StatusTransitionRow>, id: string, filterValue: unknown) => {
          const value = row.getValue(id) as string | null
          const values = Array.isArray(filterValue) ? filterValue : [filterValue]
          if (!values.length) return true
          return value != null && values.includes(value)
        },
      },
      {
        id: 'from_status_key',
        accessorKey: 'from_status_key',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="From" />
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.getValue('from_status_key') ?? '—'}</span>
        ),
      },
      {
        id: 'to_status_key',
        accessorKey: 'to_status_key',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="To" />
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.getValue('to_status_key') ?? '—'}</span>
        ),
      },
      {
        id: 'required_permission',
        accessorKey: 'required_permission',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Permission" />
        ),
        cell: ({ row }) => {
          const perm = row.getValue('required_permission') as string | null
          if (!perm) return <span className="text-muted-foreground">—</span>
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="font-mono text-sm">{perm}</span>
              </TooltipTrigger>
              <TooltipContent>
                Permission required to perform this transition
              </TooltipContent>
            </Tooltip>
          )
        },
      },
    ],
    []
  )

  const pageCount = Math.ceil(transitions.length / DEFAULT_PAGE_SIZE) || 1
  const { table } = useDataTable({
    data: transitions as StatusTransitionRow[],
    columns,
    pageCount,
    initialState: {
      pagination: { pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE },
    },
    queryKeys: QUERY_KEYS,
    getRowId: (row) =>
      row.id ??
      `${row.entity_type ?? ''}-${row.from_status_key ?? ''}-${row.to_status_key ?? ''}`,
  })

  if (isError) {
    return (
      <DataTableErrorMessage
        resourceName="transitions"
        error={error ?? null}
      />
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <DataTableSkeleton columnCount={4} rowCount={10} />
      </div>
    )
  }

  return (
    <>
      <ExtensionPoint name="header.right">
        <Button onClick={() => setAddOpen(true)} size="sm" variant="outline">
          <Plus className="size-4" />
          Add transition
        </Button>
      </ExtensionPoint>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Transitions</h1>
          <p className="text-muted-foreground text-sm">
            Allowed status transitions for work orders and assets. Filter by
            entity type in the toolbar.
          </p>
        </div>

        <DataTable table={table}>
          <DataTableToolbar table={table} />
        </DataTable>
      </div>

      <ResponsiveDialog open={addOpen} onOpenChange={(open) => !open && handleCloseAddDialog()}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Add transition</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Define an allowed status change. From and to must be existing
              statuses for the selected entity type. Optional permission can
              restrict who may perform this transition.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <Field>
              <FieldLabel>Entity type</FieldLabel>
              <Select
                value={formEntityType}
                onValueChange={(v) => {
                  setFormEntityType(v)
                  setFormFromKey('')
                  setFormToKey('')
                }}
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
              <FieldLabel>From status</FieldLabel>
              <Select
                value={formFromKey}
                onValueChange={setFormFromKey}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select from status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptionsForEntity.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>To status</FieldLabel>
              <Select
                value={formToKey}
                onValueChange={setFormToKey}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select to status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptionsForEntity.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="transition-permission">
                Required permission (optional)
              </FieldLabel>
              <Input
                id="transition-permission"
                value={formRequiredPermission}
                onChange={(e) => setFormRequiredPermission(e.target.value)}
                placeholder="e.g. workorder.edit"
              />
            </Field>
          </form>
          <ResponsiveDialogFooter>
            <ResponsiveDialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </ResponsiveDialogClose>
            <Button
              onClick={() => {
                if (formFromKey && formToKey) createMutation.mutate()
              }}
              disabled={
                !formFromKey ||
                !formToKey ||
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
