import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { Tags, AlertCircle, Star, ArrowRight, Plus, Loader2 } from 'lucide-react'
import type {
  StatusCatalogRow,
  PriorityCatalogRow,
  MaintenanceTypeCatalogRow,
  StatusTransitionRow,
} from '@workorder-systems/sdk'
import { getDbClient } from '../lib/db-client'
import { useTenant } from '../contexts/tenant'
import { ensureTenantContextWithCatalogs } from '../lib/route-loaders'
import { useHasPermission } from '../hooks/use-permissions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { DataTable } from '@workspace/ui/components/data-table/data-table'
import { DataTableColumnHeader } from '@workspace/ui/components/data-table/data-table-column-header'
import { DataTableSkeleton } from '@workspace/ui/components/data-table/data-table-skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
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
import { getCoreRowModel, useReactTable } from '@tanstack/react-table'

export const Route = createFileRoute('/_protected/dashboard/catalogs/')({
  beforeLoad: async ({ context }) => ensureTenantContextWithCatalogs(context),
  component: CatalogsPage,
})

function CatalogsPage() {
  const { activeTenantId } = useTenant()
  const client = getDbClient()
  const queryClient = useQueryClient()
  const { hasPermission: canCreateCatalog } = useHasPermission('tenant.admin')

  const [isCreateStatusOpen, setIsCreateStatusOpen] = React.useState(false)
  const [isCreatePriorityOpen, setIsCreatePriorityOpen] = React.useState(false)
  const [isCreateMaintenanceTypeOpen, setIsCreateMaintenanceTypeOpen] = React.useState(false)
  const [isCreateTransitionOpen, setIsCreateTransitionOpen] = React.useState(false)

  const [createStatusEntityType, setCreateStatusEntityType] = React.useState('work_order')
  const [createStatusKey, setCreateStatusKey] = React.useState('')
  const [createStatusName, setCreateStatusName] = React.useState('')
  const [createStatusCategory, setCreateStatusCategory] = React.useState('')
  const [createStatusColor, setCreateStatusColor] = React.useState('')
  const [createStatusDisplayOrder, setCreateStatusDisplayOrder] = React.useState('0')

  const [createPriorityEntityType, setCreatePriorityEntityType] = React.useState('work_order')
  const [createPriorityKey, setCreatePriorityKey] = React.useState('')
  const [createPriorityName, setCreatePriorityName] = React.useState('')
  const [createPriorityWeight, setCreatePriorityWeight] = React.useState('0')
  const [createPriorityDisplayOrder, setCreatePriorityDisplayOrder] = React.useState('0')
  const [createPriorityColor, setCreatePriorityColor] = React.useState('')

  const [createMaintenanceTypeKey, setCreateMaintenanceTypeKey] = React.useState('')
  const [createMaintenanceTypeName, setCreateMaintenanceTypeName] = React.useState('')
  const [createMaintenanceTypeCategory, setCreateMaintenanceTypeCategory] = React.useState('')
  const [createMaintenanceTypeDescription, setCreateMaintenanceTypeDescription] = React.useState('')
  const [createMaintenanceTypeColor, setCreateMaintenanceTypeColor] = React.useState('')

  const [createTransitionEntityType, setCreateTransitionEntityType] = React.useState('work_order')
  const [createTransitionFrom, setCreateTransitionFrom] = React.useState('')
  const [createTransitionTo, setCreateTransitionTo] = React.useState('')

  const createStatusMutation = useMutation({
    mutationFn: () =>
      client.catalogs.createStatus({
        tenantId: activeTenantId!,
        entityType: createStatusEntityType,
        key: createStatusKey.trim(),
        name: createStatusName.trim(),
        category: createStatusCategory.trim(),
        color: createStatusColor.trim() || null,
        displayOrder: parseInt(createStatusDisplayOrder, 10) || 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogs', 'statuses', activeTenantId] })
      toast.success('Status created')
      setIsCreateStatusOpen(false)
      setCreateStatusKey('')
      setCreateStatusName('')
      setCreateStatusCategory('')
      setCreateStatusColor('')
      setCreateStatusDisplayOrder('0')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const createPriorityMutation = useMutation({
    mutationFn: () =>
      client.catalogs.createPriority({
        tenantId: activeTenantId!,
        entityType: createPriorityEntityType,
        key: createPriorityKey.trim(),
        name: createPriorityName.trim(),
        weight: parseInt(createPriorityWeight, 10) || 0,
        displayOrder: parseInt(createPriorityDisplayOrder, 10) || 0,
        color: createPriorityColor.trim() || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogs', 'priorities', activeTenantId] })
      toast.success('Priority created')
      setIsCreatePriorityOpen(false)
      setCreatePriorityKey('')
      setCreatePriorityName('')
      setCreatePriorityWeight('0')
      setCreatePriorityDisplayOrder('0')
      setCreatePriorityColor('')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const createMaintenanceTypeMutation = useMutation({
    mutationFn: () =>
      client.catalogs.createMaintenanceType({
        tenantId: activeTenantId!,
        key: createMaintenanceTypeKey.trim(),
        name: createMaintenanceTypeName.trim(),
        category: createMaintenanceTypeCategory.trim(),
        description: createMaintenanceTypeDescription.trim() || null,
        color: createMaintenanceTypeColor.trim() || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogs', 'maintenance-types', activeTenantId] })
      toast.success('Maintenance type created')
      setIsCreateMaintenanceTypeOpen(false)
      setCreateMaintenanceTypeKey('')
      setCreateMaintenanceTypeName('')
      setCreateMaintenanceTypeCategory('')
      setCreateMaintenanceTypeDescription('')
      setCreateMaintenanceTypeColor('')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const createTransitionMutation = useMutation({
    mutationFn: () =>
      client.catalogs.createStatusTransition({
        tenantId: activeTenantId!,
        entityType: createTransitionEntityType,
        fromStatusKey: createTransitionFrom.trim(),
        toStatusKey: createTransitionTo.trim(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogs', 'status-transitions', activeTenantId] })
      toast.success('Status transition created')
      setIsCreateTransitionOpen(false)
      setCreateTransitionFrom('')
      setCreateTransitionTo('')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const { data: statuses = [], isLoading: statusesLoading } = useQuery({
    queryKey: ['catalogs', 'statuses', activeTenantId],
    queryFn: () => client.catalogs.listStatuses(),
    enabled: !!activeTenantId,
  })

  const { data: priorities = [], isLoading: prioritiesLoading } = useQuery({
    queryKey: ['catalogs', 'priorities', activeTenantId],
    queryFn: () => client.catalogs.listPriorities(),
    enabled: !!activeTenantId,
  })

  const { data: maintenanceTypes = [], isLoading: maintenanceTypesLoading } = useQuery({
    queryKey: ['catalogs', 'maintenance-types', activeTenantId],
    queryFn: () => client.catalogs.listMaintenanceTypes(),
    enabled: !!activeTenantId,
  })

  const { data: statusTransitions = [], isLoading: transitionsLoading } = useQuery({
    queryKey: ['catalogs', 'status-transitions', activeTenantId],
    queryFn: () => client.catalogs.listStatusTransitions(),
    enabled: !!activeTenantId,
  })

  const statusesColumns = React.useMemo<ColumnDef<StatusCatalogRow>[]>(
    () => [
      {
        id: 'key',
        accessorKey: 'key',
        header: ({ column }: { column: any }) => <DataTableColumnHeader column={column} label="Key" />,
        cell: ({ row }: { row: any }) => {
          const key = row.getValue('key') as string | null
          return <span className="font-mono text-sm">{key ?? '—'}</span>
        },
      },
      {
        id: 'name',
        accessorKey: 'name',
        header: ({ column }: { column: any }) => <DataTableColumnHeader column={column} label="Name" />,
        cell: ({ row }: { row: any }) => {
          const name = row.getValue('name') as string | null
          return <span className="font-medium">{name ?? '—'}</span>
        },
      },
      {
        id: 'entity_type',
        accessorKey: 'entity_type',
        header: ({ column }: { column: any }) => <DataTableColumnHeader column={column} label="Entity Type" />,
        cell: ({ row }: { row: any }) => {
          const entityType = row.getValue('entity_type') as string | null
          return <Badge variant="outline">{entityType ?? '—'}</Badge>
        },
      },
      {
        id: 'category',
        accessorKey: 'category',
        header: ({ column }: { column: any }) => <DataTableColumnHeader column={column} label="Category" />,
        cell: ({ row }: { row: any }) => {
          const category = row.getValue('category') as string | null
          return <span className="text-sm text-muted-foreground">{category ?? '—'}</span>
        },
      },
      {
        id: 'color',
        accessorKey: 'color',
        header: ({ column }: { column: any }) => <DataTableColumnHeader column={column} label="Color" />,
        cell: ({ row }: { row: any }) => {
          const color = row.getValue('color') as string | null
          if (!color) return <span>—</span>
          return (
            <div className="flex items-center gap-2">
              <div
                className="h-4 w-4 rounded border"
                style={{ backgroundColor: color, borderColor: color }}
              />
              <span className="text-sm text-muted-foreground">{color}</span>
            </div>
          )
        },
      },
      {
        id: 'display_order',
        accessorKey: 'display_order',
        header: ({ column }: { column: any }) => <DataTableColumnHeader column={column} label="Order" />,
        cell: ({ row }: { row: any }) => {
          const order = row.getValue('display_order') as number | null
          return <span className="text-sm">{order ?? '—'}</span>
        },
      },
    ],
    []
  )

  const statusesTable = useReactTable({
    data: statuses,
    columns: statusesColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row: StatusCatalogRow) => row.id ?? '',
  })

  const prioritiesColumns = React.useMemo<ColumnDef<PriorityCatalogRow>[]>(
    () => [
      {
        id: 'key',
        accessorKey: 'key',
        header: ({ column }: { column: any }) => <DataTableColumnHeader column={column} label="Key" />,
        cell: ({ row }: { row: any }) => {
          const key = row.getValue('key') as string | null
          return <span className="font-mono text-sm">{key ?? '—'}</span>
        },
      },
      {
        id: 'name',
        accessorKey: 'name',
        header: ({ column }: { column: any }) => <DataTableColumnHeader column={column} label="Name" />,
        cell: ({ row }: { row: any }) => {
          const name = row.getValue('name') as string | null
          return <span className="font-medium">{name ?? '—'}</span>
        },
      },
      {
        id: 'entity_type',
        accessorKey: 'entity_type',
        header: ({ column }: { column: any }) => <DataTableColumnHeader column={column} label="Entity Type" />,
        cell: ({ row }: { row: any }) => {
          const entityType = row.getValue('entity_type') as string | null
          return <Badge variant="outline">{entityType ?? '—'}</Badge>
        },
      },
      {
        id: 'weight',
        accessorKey: 'weight',
        header: ({ column }: { column: any }) => <DataTableColumnHeader column={column} label="Weight" />,
        cell: ({ row }: { row: any }) => {
          const weight = row.getValue('weight') as number | null
          return <span className="text-sm">{weight ?? '—'}</span>
        },
      },
      {
        id: 'color',
        accessorKey: 'color',
        header: ({ column }: { column: any }) => <DataTableColumnHeader column={column} label="Color" />,
        cell: ({ row }: { row: any }) => {
          const color = row.getValue('color') as string | null
          if (!color) return <span>—</span>
          return (
            <div className="flex items-center gap-2">
              <div
                className="h-4 w-4 rounded border"
                style={{ backgroundColor: color, borderColor: color }}
              />
              <span className="text-sm text-muted-foreground">{color}</span>
            </div>
          )
        },
      },
      {
        id: 'display_order',
        accessorKey: 'display_order',
        header: ({ column }: { column: any }) => <DataTableColumnHeader column={column} label="Order" />,
        cell: ({ row }: { row: any }) => {
          const order = row.getValue('display_order') as number | null
          return <span className="text-sm">{order ?? '—'}</span>
        },
      },
    ],
    []
  )

  const prioritiesTable = useReactTable({
    data: priorities,
    columns: prioritiesColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row: PriorityCatalogRow) => row.id ?? '',
  })

  const maintenanceTypesColumns = React.useMemo<ColumnDef<MaintenanceTypeCatalogRow>[]>(
    () => [
      {
        id: 'key',
        accessorKey: 'key',
        header: ({ column }: { column: any }) => <DataTableColumnHeader column={column} label="Key" />,
        cell: ({ row }: { row: any }) => {
          const key = row.getValue('key') as string | null
          return <span className="font-mono text-sm">{key ?? '—'}</span>
        },
      },
      {
        id: 'name',
        accessorKey: 'name',
        header: ({ column }: { column: any }) => <DataTableColumnHeader column={column} label="Name" />,
        cell: ({ row }: { row: any }) => {
          const name = row.getValue('name') as string | null
          return <span className="font-medium">{name ?? '—'}</span>
        },
      },
      {
        id: 'category',
        accessorKey: 'category',
        header: ({ column }: { column: any }) => <DataTableColumnHeader column={column} label="Category" />,
        cell: ({ row }: { row: any }) => {
          const category = row.getValue('category') as string | null
          return <span className="text-sm text-muted-foreground">{category ?? '—'}</span>
        },
      },
      {
        id: 'description',
        accessorKey: 'description',
        header: ({ column }: { column: any }) => <DataTableColumnHeader column={column} label="Description" />,
        cell: ({ row }: { row: any }) => {
          const desc = row.getValue('description') as string | null
          return <span className="text-sm text-muted-foreground">{desc ?? '—'}</span>
        },
      },
      {
        id: 'color',
        accessorKey: 'color',
        header: ({ column }: { column: any }) => <DataTableColumnHeader column={column} label="Color" />,
        cell: ({ row }: { row: any }) => {
          const color = row.getValue('color') as string | null
          if (!color) return <span>—</span>
          return (
            <div className="flex items-center gap-2">
              <div
                className="h-4 w-4 rounded border"
                style={{ backgroundColor: color, borderColor: color }}
              />
              <span className="text-sm text-muted-foreground">{color}</span>
            </div>
          )
        },
      },
    ],
    []
  )

  const maintenanceTypesTable = useReactTable({
    data: maintenanceTypes,
    columns: maintenanceTypesColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row: MaintenanceTypeCatalogRow) => row.id ?? '',
  })

  const statusTransitionsColumns = React.useMemo<ColumnDef<StatusTransitionRow>[]>(
    () => [
      {
        id: 'entity_type',
        accessorKey: 'entity_type',
        header: ({ column }: { column: any }) => <DataTableColumnHeader column={column} label="Entity Type" />,
        cell: ({ row }: { row: any }) => {
          const entityType = row.getValue('entity_type') as string | null
          return <Badge variant="outline">{entityType ?? '—'}</Badge>
        },
      },
      {
        id: 'from_status_key',
        accessorKey: 'from_status_key',
        header: ({ column }: { column: any }) => <DataTableColumnHeader column={column} label="From Status" />,
        cell: ({ row }: { row: any }) => {
          const fromStatus = row.getValue('from_status_key') as string | null
          return <span className="font-medium">{fromStatus ?? '—'}</span>
        },
      },
      {
        id: 'to_status_key',
        accessorKey: 'to_status_key',
        header: ({ column }: { column: any }) => <DataTableColumnHeader column={column} label="To Status" />,
        cell: ({ row }: { row: any }) => {
          const toStatus = row.getValue('to_status_key') as string | null
          return <span className="font-medium">{toStatus ?? '—'}</span>
        },
      },
      {
        id: 'required_permission',
        accessorKey: 'required_permission',
        header: ({ column }: { column: any }) => <DataTableColumnHeader column={column} label="Required Permission" />,
        cell: ({ row }: { row: any }) => {
          const permission = row.getValue('required_permission') as string | null
          return <span className="text-sm text-muted-foreground">{permission ?? '—'}</span>
        },
      },
    ],
    []
  )

  const statusTransitionsTable = useReactTable({
    data: statusTransitions,
    columns: statusTransitionsColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row: StatusTransitionRow) => row.id ?? '',
  })

  return (
    <div className="flex flex-1 flex-col gap-8 p-6 pt-8">
      <div className="space-y-1.5">
        <h1 className="text-3xl font-bold tracking-tight">Catalogs</h1>
        <p className="text-base text-muted-foreground">
          Manage statuses, priorities, maintenance types, and status transitions
        </p>
      </div>

      <Tabs defaultValue="statuses" className="w-full">
        <TabsList>
          <TabsTrigger value="statuses">Statuses</TabsTrigger>
          <TabsTrigger value="priorities">Priorities</TabsTrigger>
          <TabsTrigger value="maintenance-types">Maintenance Types</TabsTrigger>
          <TabsTrigger value="transitions">Status Transitions</TabsTrigger>
        </TabsList>

        <TabsContent value="statuses" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Tags className="h-5 w-5" />
                    Status Catalog
                  </CardTitle>
                  <CardDescription>Available statuses for different entity types</CardDescription>
                </div>
                {canCreateCatalog && (
                  <Button size="sm" onClick={() => setIsCreateStatusOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Status
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {statusesLoading ? (
                <DataTableSkeleton columnCount={6} rowCount={5} />
              ) : statuses.length === 0 ? (
                <div className="py-12 text-center">
                  <Tags className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No statuses configured</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {canCreateCatalog ? 'Create your first status to get started' : 'Contact an administrator to add statuses'}
                  </p>
                </div>
              ) : (
                <DataTable table={statusesTable} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="priorities" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Priority Catalog
                  </CardTitle>
                  <CardDescription>Available priorities for different entity types</CardDescription>
                </div>
                {canCreateCatalog && (
                  <Button size="sm" onClick={() => setIsCreatePriorityOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Priority
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {prioritiesLoading ? (
                <DataTableSkeleton columnCount={6} rowCount={5} />
              ) : priorities.length === 0 ? (
                <div className="py-12 text-center">
                  <Star className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No priorities configured</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {canCreateCatalog ? 'Create your first priority to get started' : 'Contact an administrator to add priorities'}
                  </p>
                </div>
              ) : (
                <DataTable table={prioritiesTable} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance-types" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Maintenance Type Catalog
                  </CardTitle>
                  <CardDescription>Types of maintenance work</CardDescription>
                </div>
                {canCreateCatalog && (
                  <Button size="sm" onClick={() => setIsCreateMaintenanceTypeOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Type
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {maintenanceTypesLoading ? (
                <DataTableSkeleton columnCount={5} rowCount={5} />
              ) : maintenanceTypes.length === 0 ? (
                <div className="py-12 text-center">
                  <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No maintenance types configured</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {canCreateCatalog ? 'Create your first maintenance type to get started' : 'Contact an administrator to add maintenance types'}
                  </p>
                </div>
              ) : (
                <DataTable table={maintenanceTypesTable} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transitions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowRight className="h-5 w-5" />
                    Status Transitions
                  </CardTitle>
                  <CardDescription>Allowed status transitions for different entity types</CardDescription>
                </div>
                {canCreateCatalog && (
                  <Button size="sm" onClick={() => setIsCreateTransitionOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Transition
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {transitionsLoading ? (
                <DataTableSkeleton columnCount={4} rowCount={5} />
              ) : statusTransitions.length === 0 ? (
                <div className="py-12 text-center">
                  <ArrowRight className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No status transitions configured</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {canCreateCatalog ? 'Create your first status transition to get started' : 'Contact an administrator to add transitions'}
                  </p>
                </div>
              ) : (
                <DataTable table={statusTransitionsTable} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Status Dialog */}
      <ResponsiveDialog open={isCreateStatusOpen} onOpenChange={setIsCreateStatusOpen}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Create Status</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>Add a new status to the catalog</ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="status-entity-type">Entity Type</Label>
              <Select value={createStatusEntityType} onValueChange={setCreateStatusEntityType}>
                <SelectTrigger id="status-entity-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="work_order">Work Order</SelectItem>
                  <SelectItem value="asset">Asset</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                The type of entity this status applies to
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status-key">
                Key <span className="text-destructive">*</span>
              </Label>
              <Input
                id="status-key"
                value={createStatusKey}
                onChange={(e) => setCreateStatusKey(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                placeholder="e.g. in_progress"
                required
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Unique identifier (lowercase, underscores). Used in code and API calls.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="status-name"
                value={createStatusName}
                onChange={(e) => setCreateStatusName(e.target.value)}
                placeholder="e.g. In Progress"
                required
              />
              <p className="text-xs text-muted-foreground">
                Display name shown to users
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status-category">
                Category <span className="text-destructive">*</span>
              </Label>
              <Input
                id="status-category"
                value={createStatusCategory}
                onChange={(e) => setCreateStatusCategory(e.target.value.toLowerCase())}
                placeholder="e.g. active, completed, cancelled"
                required
              />
              <p className="text-xs text-muted-foreground">
                Groups related statuses (e.g., "active", "completed")
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="status-color">Color</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="status-color"
                    type="color"
                    value={createStatusColor || '#3b82f6'}
                    onChange={(e) => setCreateStatusColor(e.target.value)}
                    className="h-10 w-20 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={createStatusColor}
                    onChange={(e) => setCreateStatusColor(e.target.value)}
                    placeholder="#3b82f6"
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Color used in badges and status indicators
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status-order">Display Order</Label>
                <Input
                  id="status-order"
                  type="number"
                  min="0"
                  value={createStatusDisplayOrder}
                  onChange={(e) => setCreateStatusDisplayOrder(e.target.value)}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground">
                  Lower numbers appear first in lists
                </p>
              </div>
            </div>
          </div>
          <ResponsiveDialogFooter>
            <ResponsiveDialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </ResponsiveDialogClose>
            <Button
              onClick={() => {
                if (!createStatusKey.trim() || !createStatusName.trim() || !createStatusCategory.trim()) {
                  toast.error('Key, name, and category are required')
                  return
                }
                createStatusMutation.mutate()
              }}
              disabled={createStatusMutation.isPending || !createStatusKey.trim() || !createStatusName.trim() || !createStatusCategory.trim()}
            >
              {createStatusMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating…
                </>
              ) : (
                'Create Status'
              )}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Create Priority Dialog */}
      <ResponsiveDialog open={isCreatePriorityOpen} onOpenChange={setIsCreatePriorityOpen}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Create Priority</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>Add a new priority to the catalog</ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="priority-entity-type">Entity Type</Label>
              <Select value={createPriorityEntityType} onValueChange={setCreatePriorityEntityType}>
                <SelectTrigger id="priority-entity-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="work_order">Work Order</SelectItem>
                  <SelectItem value="asset">Asset</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority-key">Key *</Label>
              <Input
                id="priority-key"
                value={createPriorityKey}
                onChange={(e) => setCreatePriorityKey(e.target.value)}
                placeholder="e.g. high"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority-name">Name *</Label>
              <Input
                id="priority-name"
                value={createPriorityName}
                onChange={(e) => setCreatePriorityName(e.target.value)}
                placeholder="e.g. High"
                required
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="priority-weight">Weight</Label>
                <Input
                  id="priority-weight"
                  type="number"
                  value={createPriorityWeight}
                  onChange={(e) => setCreatePriorityWeight(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority-order">Display Order</Label>
                <Input
                  id="priority-order"
                  type="number"
                  value={createPriorityDisplayOrder}
                  onChange={(e) => setCreatePriorityDisplayOrder(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority-color">Color</Label>
                <Input
                  id="priority-color"
                  type="color"
                  value={createPriorityColor}
                  onChange={(e) => setCreatePriorityColor(e.target.value)}
                />
              </div>
            </div>
          </div>
          <ResponsiveDialogFooter>
            <ResponsiveDialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </ResponsiveDialogClose>
            <Button
              onClick={() => {
                if (!createPriorityKey.trim() || !createPriorityName.trim()) {
                  toast.error('Key and name are required')
                  return
                }
                createPriorityMutation.mutate()
              }}
              disabled={createPriorityMutation.isPending}
            >
              {createPriorityMutation.isPending ? 'Creating…' : 'Create'}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Create Maintenance Type Dialog */}
      <ResponsiveDialog open={isCreateMaintenanceTypeOpen} onOpenChange={setIsCreateMaintenanceTypeOpen}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Create Maintenance Type</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>Add a new maintenance type to the catalog</ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="mt-key">Key *</Label>
              <Input
                id="mt-key"
                value={createMaintenanceTypeKey}
                onChange={(e) => setCreateMaintenanceTypeKey(e.target.value)}
                placeholder="e.g. preventive"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mt-name">Name *</Label>
              <Input
                id="mt-name"
                value={createMaintenanceTypeName}
                onChange={(e) => setCreateMaintenanceTypeName(e.target.value)}
                placeholder="e.g. Preventive Maintenance"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mt-category">Category *</Label>
              <Input
                id="mt-category"
                value={createMaintenanceTypeCategory}
                onChange={(e) => setCreateMaintenanceTypeCategory(e.target.value)}
                placeholder="e.g. scheduled"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mt-description">Description</Label>
              <Input
                id="mt-description"
                value={createMaintenanceTypeDescription}
                onChange={(e) => setCreateMaintenanceTypeDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mt-color">Color</Label>
              <Input
                id="mt-color"
                type="color"
                value={createMaintenanceTypeColor}
                onChange={(e) => setCreateMaintenanceTypeColor(e.target.value)}
              />
            </div>
          </div>
          <ResponsiveDialogFooter>
            <ResponsiveDialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </ResponsiveDialogClose>
            <Button
              onClick={() => {
                if (!createMaintenanceTypeKey.trim() || !createMaintenanceTypeName.trim() || !createMaintenanceTypeCategory.trim()) {
                  toast.error('Key, name, and category are required')
                  return
                }
                createMaintenanceTypeMutation.mutate()
              }}
              disabled={createMaintenanceTypeMutation.isPending}
            >
              {createMaintenanceTypeMutation.isPending ? 'Creating…' : 'Create'}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Create Status Transition Dialog */}
      <ResponsiveDialog open={isCreateTransitionOpen} onOpenChange={setIsCreateTransitionOpen}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Create Status Transition</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>Add a new allowed status transition</ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="transition-entity-type">Entity Type</Label>
              <Select value={createTransitionEntityType} onValueChange={setCreateTransitionEntityType}>
                <SelectTrigger id="transition-entity-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="work_order">Work Order</SelectItem>
                  <SelectItem value="asset">Asset</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="transition-from">From Status Key *</Label>
              <Input
                id="transition-from"
                value={createTransitionFrom}
                onChange={(e) => setCreateTransitionFrom(e.target.value)}
                placeholder="e.g. draft"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="transition-to">To Status Key *</Label>
              <Input
                id="transition-to"
                value={createTransitionTo}
                onChange={(e) => setCreateTransitionTo(e.target.value)}
                placeholder="e.g. in_progress"
                required
              />
            </div>
          </div>
          <ResponsiveDialogFooter>
            <ResponsiveDialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </ResponsiveDialogClose>
            <Button
              onClick={() => {
                if (!createTransitionFrom.trim() || !createTransitionTo.trim()) {
                  toast.error('From and to status keys are required')
                  return
                }
                createTransitionMutation.mutate()
              }}
              disabled={createTransitionMutation.isPending}
            >
              {createTransitionMutation.isPending ? 'Creating…' : 'Create'}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  )
}
