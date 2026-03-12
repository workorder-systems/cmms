import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Puzzle, Download, Trash2 } from 'lucide-react'
import type { PluginRow, PluginInstallationRow } from '@workorder-systems/sdk'
import { getDbClient } from '../../lib/db-client'
import { useTenant } from '../../contexts/tenant'
import { ensureTenantContext } from '../../lib/route-loaders'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs'
import { DataTable } from '@workspace/ui/components/data-table/data-table'
import { DataTableColumnHeader } from '@workspace/ui/components/data-table/data-table-column-header'
import { DataTableSkeleton } from '@workspace/ui/components/data-table/data-table-skeleton'
import { DataTableErrorMessage } from '../../components/data-table-error-message'
import type { ColumnDef } from '@tanstack/react-table'
import { getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { toast } from 'sonner'
import { useHasPermission } from '../../hooks/use-permissions'

export const Route = createFileRoute('/_protected/dashboard/settings/plugins')({
  beforeLoad: async ({ context }) => ensureTenantContext(context),
  component: PluginsPage,
})

function PluginsPage() {
  const { activeTenantId } = useTenant()
  const client = getDbClient()
  const queryClient = useQueryClient()
  const canManagePlugins = useHasPermission('plugins.manage')

  const { data: plugins = [], isLoading: pluginsLoading } = useQuery({
    queryKey: ['plugins', activeTenantId],
    queryFn: () => client.plugins.list(),
    enabled: !!activeTenantId,
  })

  const { data: installations = [], isLoading: installationsLoading } = useQuery({
    queryKey: ['plugin-installations', activeTenantId],
    queryFn: () => client.plugins.listInstallations(),
    enabled: !!activeTenantId,
  })

  const pluginsColumns = React.useMemo<ColumnDef<PluginRow>[]>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: ({ column }: { column: any }) => (
          <DataTableColumnHeader column={column} label="Name" />
        ),
        cell: ({ row }: { row: any }) => (
          <span className="font-medium">{row.getValue('name') ?? '—'}</span>
        ),
      },
      {
        id: 'version',
        accessorKey: 'version',
        header: ({ column }: { column: any }) => (
          <DataTableColumnHeader column={column} label="Version" />
        ),
        cell: ({ row }: { row: any }) => (
          <span className="text-sm text-muted-foreground">{row.getValue('version') ?? '—'}</span>
        ),
      },
      {
        id: 'description',
        accessorKey: 'description',
        header: ({ column }: { column: any }) => (
          <DataTableColumnHeader column={column} label="Description" />
        ),
        cell: ({ row }: { row: any }) => (
          <span className="text-sm text-muted-foreground max-w-[200px] truncate block">
            {row.getValue('description') ?? '—'}
          </span>
        ),
      },
    ],
    []
  )

  const installPluginMutation = useMutation({
    mutationFn: (pluginKey: string) =>
      client.plugins.install({
        tenantId: activeTenantId!,
        pluginKey,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plugin-installations', activeTenantId] })
      toast.success('Plugin installed')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const uninstallPluginMutation = useMutation({
    mutationFn: (installationId: string) =>
      client.plugins.uninstall({
        tenantId: activeTenantId!,
        installationId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plugin-installations', activeTenantId] })
      toast.success('Plugin uninstalled')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const installationsColumns = React.useMemo<ColumnDef<PluginInstallationRow>[]>(
    () => [
      {
        id: 'plugin_name',
        accessorKey: 'plugin_name',
        header: ({ column }: { column: any }) => (
          <DataTableColumnHeader column={column} label="Plugin" />
        ),
        cell: ({ row }: { row: any }) => (
          <span className="font-medium">{row.getValue('plugin_name') ?? '—'}</span>
        ),
      },
      {
        id: 'version',
        accessorKey: 'version',
        header: ({ column }: { column: any }) => (
          <DataTableColumnHeader column={column} label="Version" />
        ),
        cell: ({ row }: { row: any }) => (
          <span className="text-sm text-muted-foreground">{row.getValue('version') ?? '—'}</span>
        ),
      },
      {
        id: 'is_enabled',
        accessorKey: 'is_enabled',
        header: ({ column }: { column: any }) => (
          <DataTableColumnHeader column={column} label="Status" />
        ),
        cell: ({ row }: { row: any }) => {
          const isEnabled = row.getValue('is_enabled') as boolean
          return (
            <Badge variant={isEnabled ? 'default' : 'secondary'}>
              {isEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
          )
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }: { row: any }) => {
          const installation = row.original
          return canManagePlugins && installation.id ? (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                if (confirm('Uninstall this plugin?')) {
                  uninstallPluginMutation.mutate(installation.id as string)
                }
              }}
              disabled={uninstallPluginMutation.isPending}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          ) : null
        },
      },
    ],
    [canManagePlugins, uninstallPluginMutation]
  )

  const pluginsColumnsWithActions = React.useMemo<ColumnDef<PluginRow>[]>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: ({ column }: { column: any }) => (
          <DataTableColumnHeader column={column} label="Name" />
        ),
        cell: ({ row }: { row: any }) => (
          <span className="font-medium">{row.getValue('name') ?? '—'}</span>
        ),
      },
      {
        id: 'version',
        accessorKey: 'version',
        header: ({ column }: { column: any }) => (
          <DataTableColumnHeader column={column} label="Version" />
        ),
        cell: ({ row }: { row: any }) => (
          <span className="text-sm text-muted-foreground">{row.getValue('version') ?? '—'}</span>
        ),
      },
      {
        id: 'description',
        accessorKey: 'description',
        header: ({ column }: { column: any }) => (
          <DataTableColumnHeader column={column} label="Description" />
        ),
        cell: ({ row }: { row: any }) => (
          <span className="text-sm text-muted-foreground max-w-[200px] truncate block">
            {row.getValue('description') ?? '—'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }: { row: any }) => {
          const plugin = row.original
          // Try to get plugin key/id from the row data
          const pluginKey = (plugin as Record<string, unknown>).key as string | undefined ?? 
                           (plugin as Record<string, unknown>).id as string | undefined
          const isInstalled = installations.some((inst) => {
            const instKey = (inst as Record<string, unknown>).plugin_key as string | undefined ??
                          (inst as Record<string, unknown>).plugin_id as string | undefined
            return instKey && pluginKey && instKey === pluginKey
          })
          return canManagePlugins && !isInstalled && pluginKey ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                installPluginMutation.mutate(pluginKey)
              }}
              disabled={installPluginMutation.isPending}
            >
              <Download className="h-3 w-3 mr-1" />
              Install
            </Button>
          ) : null
        },
      },
    ],
    [canManagePlugins, installPluginMutation, installations]
  )

  const pluginsTable = useReactTable({
    data: plugins,
    columns: pluginsColumnsWithActions,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row: PluginRow) => (row as Record<string, unknown>).id as string ?? '',
  })

  const installationsTable = useReactTable({
    data: installations,
    columns: installationsColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row: PluginInstallationRow) => (row as Record<string, unknown>).id as string ?? '',
  })

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Plugins</h1>
        <p className="text-sm text-muted-foreground">Manage plugin installations</p>
      </div>

      <Tabs defaultValue="available" className="w-full">
        <TabsList>
          <TabsTrigger value="available">Available Plugins</TabsTrigger>
          <TabsTrigger value="installed">Installed</TabsTrigger>
        </TabsList>

        <TabsContent value="available">
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Puzzle className="h-5 w-5" />
                Available Plugins
              </CardTitle>
              <CardDescription>Plugins available for installation</CardDescription>
            </CardHeader>
            <CardContent>
              {pluginsLoading ? (
                <DataTableSkeleton columnCount={3} rowCount={5} />
              ) : plugins.length === 0 ? (
                <div className="py-12 text-center">
                  <Puzzle className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No plugins available</p>
                </div>
              ) : (
                <DataTable table={pluginsTable} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="installed">
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Puzzle className="h-5 w-5" />
                Installed Plugins
              </CardTitle>
              <CardDescription>Plugins currently installed</CardDescription>
            </CardHeader>
            <CardContent>
              {installationsLoading ? (
                <DataTableSkeleton columnCount={3} rowCount={5} />
              ) : installations.length === 0 ? (
                <div className="py-12 text-center">
                  <Puzzle className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No plugins installed</p>
                  <p className="text-xs text-muted-foreground mt-1">Install plugins from the Available tab</p>
                </div>
              ) : (
                <DataTable table={installationsTable} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
