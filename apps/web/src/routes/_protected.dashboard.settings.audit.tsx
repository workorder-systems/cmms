import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { FileText } from 'lucide-react'
import type {
  AuditEntityChangeRow,
  AuditPermissionChangeRow,
  AuditRetentionConfigRow,
} from '@workorder-systems/sdk'
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

export const Route = createFileRoute('/_protected/dashboard/settings/audit')({
  beforeLoad: async ({ context }) => ensureTenantContext(context),
  component: AuditPage,
})

function AuditPage() {
  const { activeTenantId } = useTenant()
  const client = getDbClient()

  const { data: entityChanges = [], isLoading: entityLoading } = useQuery({
    queryKey: ['audit-entity-changes', activeTenantId],
    queryFn: () => client.audit.listEntityChanges(),
    enabled: !!activeTenantId,
  })

  const { data: permissionChanges = [], isLoading: permissionLoading } = useQuery({
    queryKey: ['audit-permission-changes', activeTenantId],
    queryFn: () => client.audit.listPermissionChanges(),
    enabled: !!activeTenantId,
  })

  const { data: retentionConfigs = [], isLoading: retentionLoading } = useQuery({
    queryKey: ['audit-retention-configs', activeTenantId],
    queryFn: () => client.audit.listRetentionConfigs(),
    enabled: !!activeTenantId,
  })

  const entityChangesColumns = React.useMemo<ColumnDef<AuditEntityChangeRow>[]>(
    () => [
      {
        id: 'entity_type',
        accessorKey: 'entity_type',
        header: ({ column }: { column: any }) => (
          <DataTableColumnHeader column={column} label="Entity Type" />
        ),
        cell: ({ row }: { row: any }) => (
          <span className="font-medium">{row.getValue('entity_type') ?? '—'}</span>
        ),
      },
      {
        id: 'entity_id',
        accessorKey: 'entity_id',
        header: ({ column }: { column: any }) => (
          <DataTableColumnHeader column={column} label="Entity ID" />
        ),
        cell: ({ row }: { row: any }) => (
          <span className="text-sm text-muted-foreground">{row.getValue('entity_id') ?? '—'}</span>
        ),
      },
      {
        id: 'change_type',
        accessorKey: 'change_type',
        header: ({ column }: { column: any }) => (
          <DataTableColumnHeader column={column} label="Change Type" />
        ),
        cell: ({ row }: { row: any }) => (
          <span className="text-sm">{row.getValue('change_type') ?? '—'}</span>
        ),
      },
      {
        id: 'changed_at',
        accessorKey: 'changed_at',
        header: ({ column }: { column: any }) => (
          <DataTableColumnHeader column={column} label="Changed At" />
        ),
        cell: ({ row }: { row: any }) => {
          const changed = row.getValue('changed_at') as string | null
          return changed
            ? new Date(changed).toLocaleString(undefined, {
                dateStyle: 'short',
                timeStyle: 'short',
              })
            : '—'
        },
      },
    ],
    []
  )

  const permissionChangesColumns = React.useMemo<ColumnDef<AuditPermissionChangeRow>[]>(
    () => [
      {
        id: 'permission_key',
        accessorKey: 'permission_key',
        header: ({ column }: { column: any }) => (
          <DataTableColumnHeader column={column} label="Permission" />
        ),
        cell: ({ row }: { row: any }) => (
          <span className="font-medium">{row.getValue('permission_key') ?? '—'}</span>
        ),
      },
      {
        id: 'change_type',
        accessorKey: 'change_type',
        header: ({ column }: { column: any }) => (
          <DataTableColumnHeader column={column} label="Change Type" />
        ),
        cell: ({ row }: { row: any }) => (
          <span className="text-sm">{row.getValue('change_type') ?? '—'}</span>
        ),
      },
      {
        id: 'changed_at',
        accessorKey: 'changed_at',
        header: ({ column }: { column: any }) => (
          <DataTableColumnHeader column={column} label="Changed At" />
        ),
        cell: ({ row }: { row: any }) => {
          const changed = row.getValue('changed_at') as string | null
          return changed
            ? new Date(changed).toLocaleString(undefined, {
                dateStyle: 'short',
                timeStyle: 'short',
              })
            : '—'
        },
      },
    ],
    []
  )

  const entityChangesTable = useReactTable({
    data: entityChanges,
    columns: entityChangesColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row: AuditEntityChangeRow) => row.id ?? '',
  })

  const permissionChangesTable = useReactTable({
    data: permissionChanges,
    columns: permissionChangesColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row: AuditPermissionChangeRow) => row.id ?? '',
  })

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Audit Log</h1>
        <p className="text-sm text-muted-foreground">View audit trails for entity and permission changes</p>
      </div>

      <Tabs defaultValue="entities" className="w-full">
        <TabsList>
          <TabsTrigger value="entities">Entity Changes</TabsTrigger>
          <TabsTrigger value="permissions">Permission Changes</TabsTrigger>
          <TabsTrigger value="retention">Retention Configs</TabsTrigger>
        </TabsList>

        <TabsContent value="entities">
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Entity Changes
              </CardTitle>
              <CardDescription>Audit trail of entity modifications</CardDescription>
            </CardHeader>
            <CardContent>
              {entityLoading ? (
                <DataTableSkeleton columnCount={4} rowCount={5} />
              ) : entityChanges.length === 0 ? (
                <div className="py-12 text-center">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No entity changes recorded</p>
                </div>
              ) : (
                <DataTable table={entityChangesTable} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions">
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Permission Changes
              </CardTitle>
              <CardDescription>Audit trail of permission modifications</CardDescription>
            </CardHeader>
            <CardContent>
              {permissionLoading ? (
                <DataTableSkeleton columnCount={3} rowCount={5} />
              ) : permissionChanges.length === 0 ? (
                <div className="py-12 text-center">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No permission changes recorded</p>
                </div>
              ) : (
                <DataTable table={permissionChangesTable} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="retention">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Retention Configurations
              </CardTitle>
              <CardDescription>Audit data retention policies</CardDescription>
            </CardHeader>
            <CardContent>
              {retentionLoading ? (
                <DataTableSkeleton columnCount={2} rowCount={5} />
              ) : retentionConfigs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No retention configs</p>
              ) : (
                <p className="text-sm text-muted-foreground">Retention configs data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
