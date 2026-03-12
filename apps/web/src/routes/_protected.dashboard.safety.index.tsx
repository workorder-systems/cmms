import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Shield } from 'lucide-react'
import type {
  InspectionTemplateRow,
  InspectionScheduleRow,
  InspectionRunRow,
  IncidentRow,
} from '@workorder-systems/sdk'
import { getDbClient } from '../lib/db-client'
import { useTenant } from '../contexts/tenant'
import { ensureTenantContext } from '../lib/route-loaders'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs'
import { DataTable } from '@workspace/ui/components/data-table/data-table'
import { DataTableColumnHeader } from '@workspace/ui/components/data-table/data-table-column-header'
import { DataTableSkeleton } from '@workspace/ui/components/data-table/data-table-skeleton'
import { DataTableErrorMessage } from '../components/data-table-error-message'
import type { ColumnDef } from '@tanstack/react-table'
import { getCoreRowModel, useReactTable } from '@tanstack/react-table'

export const Route = createFileRoute('/_protected/dashboard/safety/')({
  beforeLoad: async ({ context }) => ensureTenantContext(context),
  component: SafetyPage,
})

function SafetyPage() {
  const { activeTenantId } = useTenant()
  const client = getDbClient()

  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['safety-templates', activeTenantId],
    queryFn: () => client.safetyCompliance.listTemplates(),
    enabled: !!activeTenantId,
  })

  const { data: schedules = [], isLoading: schedulesLoading } = useQuery({
    queryKey: ['safety-schedules', activeTenantId],
    queryFn: () => client.safetyCompliance.listSchedules(),
    enabled: !!activeTenantId,
  })

  const { data: runs = [], isLoading: runsLoading } = useQuery({
    queryKey: ['safety-runs', activeTenantId],
    queryFn: () => client.safetyCompliance.listRuns(),
    enabled: !!activeTenantId,
  })

  const { data: incidents = [], isLoading: incidentsLoading } = useQuery({
    queryKey: ['safety-incidents', activeTenantId],
    queryFn: () => client.safetyCompliance.listIncidents(),
    enabled: !!activeTenantId,
  })

  const templatesColumns = React.useMemo<ColumnDef<InspectionTemplateRow>[]>(
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

  const templatesTable = useReactTable({
    data: templates,
    columns: templatesColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row: InspectionTemplateRow) => row.id ?? '',
  })

  const incidentsColumns = React.useMemo<ColumnDef<IncidentRow>[]>(
    () => [
      {
        id: 'title',
        accessorKey: 'title',
        header: ({ column }: { column: any }) => (
          <DataTableColumnHeader column={column} label="Title" />
        ),
        cell: ({ row }: { row: any }) => (
          <span className="font-medium">{row.getValue('title') ?? '—'}</span>
        ),
      },
      {
        id: 'severity',
        accessorKey: 'severity',
        header: ({ column }: { column: any }) => (
          <DataTableColumnHeader column={column} label="Severity" />
        ),
        cell: ({ row }: { row: any }) => (
          <span className="text-sm">{row.getValue('severity') ?? '—'}</span>
        ),
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: ({ column }: { column: any }) => (
          <DataTableColumnHeader column={column} label="Status" />
        ),
        cell: ({ row }: { row: any }) => (
          <span className="text-sm">{row.getValue('status') ?? '—'}</span>
        ),
      },
    ],
    []
  )

  const incidentsTable = useReactTable({
    data: incidents,
    columns: incidentsColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row: IncidentRow) => row.id ?? '',
  })

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Safety & Compliance</h1>
        <p className="text-sm text-muted-foreground">Manage inspections, schedules, runs, and incidents</p>
      </div>

      <Tabs defaultValue="templates" className="w-full">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="schedules">Schedules</TabsTrigger>
          <TabsTrigger value="runs">Runs</TabsTrigger>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
        </TabsList>

        <TabsContent value="templates">
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Inspection Templates
              </CardTitle>
            </CardHeader>
            <CardContent>
              {templatesLoading ? (
                <DataTableSkeleton columnCount={2} rowCount={5} />
              ) : templates.length === 0 ? (
                <div className="py-12 text-center">
                  <Shield className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No inspection templates</p>
                </div>
              ) : (
                <DataTable table={templatesTable} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedules">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Inspection Schedules
              </CardTitle>
            </CardHeader>
            <CardContent>
              {schedulesLoading ? (
                <DataTableSkeleton columnCount={2} rowCount={5} />
              ) : schedules.length === 0 ? (
                <p className="text-sm text-muted-foreground">No inspection schedules</p>
              ) : (
                <p className="text-sm text-muted-foreground">Inspection schedules data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="runs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Inspection Runs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {runsLoading ? (
                <DataTableSkeleton columnCount={2} rowCount={5} />
              ) : runs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No inspection runs</p>
              ) : (
                <p className="text-sm text-muted-foreground">Inspection runs data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="incidents">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Incidents
              </CardTitle>
            </CardHeader>
            <CardContent>
              {incidentsLoading ? (
                <DataTableSkeleton columnCount={3} rowCount={5} />
              ) : incidents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No incidents</p>
              ) : (
                <DataTable table={incidentsTable} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
