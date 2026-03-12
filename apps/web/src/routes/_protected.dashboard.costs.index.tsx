import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { DollarSign } from 'lucide-react'
import type {
  WorkOrderCostRow,
  AssetCostRow,
  LocationCostRow,
  DepartmentCostRow,
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

export const Route = createFileRoute('/_protected/dashboard/costs/')({
  beforeLoad: async ({ context }) => ensureTenantContext(context),
  component: CostsPage,
})

function CostsPage() {
  const { activeTenantId } = useTenant()
  const client = getDbClient()

  const { data: workOrderCosts = [], isLoading: woLoading } = useQuery({
    queryKey: ['work-order-costs', activeTenantId],
    queryFn: () => client.costs.listWorkOrderCosts(),
    enabled: !!activeTenantId,
  })

  const { data: assetCosts = [], isLoading: assetLoading } = useQuery({
    queryKey: ['asset-costs', activeTenantId],
    queryFn: () => client.costs.listAssetCosts(),
    enabled: !!activeTenantId,
  })

  const { data: locationCosts = [], isLoading: locationLoading } = useQuery({
    queryKey: ['location-costs', activeTenantId],
    queryFn: () => client.costs.listLocationCosts(),
    enabled: !!activeTenantId,
  })

  const { data: departmentCosts = [], isLoading: deptLoading } = useQuery({
    queryKey: ['department-costs', activeTenantId],
    queryFn: () => client.costs.listDepartmentCosts(),
    enabled: !!activeTenantId,
  })

  const workOrderCostsColumns = React.useMemo<ColumnDef<WorkOrderCostRow>[]>(
    () => [
      {
        id: 'work_order_id',
        accessorKey: 'work_order_id',
        header: ({ column }: { column: any }) => (
          <DataTableColumnHeader column={column} label="Work Order" />
        ),
        cell: ({ row }: { row: any }) => {
          const woId = row.getValue('work_order_id') as string | null
          return <span className="font-medium">{woId ?? '—'}</span>
        },
      },
      {
        id: 'total_cost',
        accessorKey: 'total_cost',
        header: ({ column }: { column: any }) => (
          <DataTableColumnHeader column={column} label="Total Cost" />
        ),
        cell: ({ row }: { row: any }) => {
          const cost = row.getValue('total_cost') as number | null
          return <span className="font-medium">${cost?.toFixed(2) ?? '0.00'}</span>
        },
      },
    ],
    []
  )

  const workOrderCostsTable = useReactTable({
    data: workOrderCosts,
    columns: workOrderCostsColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row: WorkOrderCostRow) => (row as Record<string, unknown>).work_order_id as string ?? '',
  })

  const assetCostsColumns = React.useMemo<ColumnDef<AssetCostRow>[]>(
    () => [
      {
        id: 'asset_id',
        accessorKey: 'asset_id',
        header: ({ column }: { column: any }) => (
          <DataTableColumnHeader column={column} label="Asset" />
        ),
        cell: ({ row }: { row: any }) => {
          const assetId = row.getValue('asset_id') as string | null
          return <span className="font-medium">{assetId ?? '—'}</span>
        },
      },
      {
        id: 'total_cost',
        accessorKey: 'total_cost',
        header: ({ column }: { column: any }) => (
          <DataTableColumnHeader column={column} label="Total Cost" />
        ),
        cell: ({ row }: { row: any }) => {
          const cost = row.getValue('total_cost') as number | null
          return <span className="font-medium">${cost?.toFixed(2) ?? '0.00'}</span>
        },
      },
    ],
    []
  )

  const assetCostsTable = useReactTable({
    data: assetCosts,
    columns: assetCostsColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row: AssetCostRow) => (row as Record<string, unknown>).asset_id as string ?? '',
  })

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Costs</h1>
        <p className="text-sm text-muted-foreground">View costs by work order, asset, location, and department</p>
      </div>

      <Tabs defaultValue="work-orders" className="w-full">
        <TabsList>
          <TabsTrigger value="work-orders">Work Orders</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
        </TabsList>

        <TabsContent value="work-orders">
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Work Order Costs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {woLoading ? (
                <DataTableSkeleton columnCount={2} rowCount={5} />
              ) : workOrderCosts.length === 0 ? (
                <div className="py-12 text-center">
                  <DollarSign className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No work order costs</p>
                </div>
              ) : (
                <DataTable table={workOrderCostsTable} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assets">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Asset Costs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {assetLoading ? (
                <DataTableSkeleton columnCount={2} rowCount={5} />
              ) : assetCosts.length === 0 ? (
                <div className="py-12 text-center">
                  <DollarSign className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No asset costs</p>
                </div>
              ) : (
                <DataTable table={assetCostsTable} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="locations">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Location Costs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {locationLoading ? (
                <DataTableSkeleton columnCount={2} rowCount={5} />
              ) : locationCosts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No location costs</p>
              ) : (
                <p className="text-sm text-muted-foreground">Location costs data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departments">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Department Costs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {deptLoading ? (
                <DataTableSkeleton columnCount={2} rowCount={5} />
              ) : departmentCosts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No department costs</p>
              ) : (
                <p className="text-sm text-muted-foreground">Department costs data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
