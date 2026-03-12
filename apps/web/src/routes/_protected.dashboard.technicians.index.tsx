import * as React from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { useQuery } from '@tanstack/react-query'
import { Users } from 'lucide-react'
import type { TechnicianRow } from '@workorder-systems/sdk'
import { getDbClient } from '../lib/db-client'
import { useTenant } from '../contexts/tenant'
import { ensureTenantContext } from '../lib/route-loaders'
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
import { Badge } from '@workspace/ui/components/badge'

export const Route = createFileRoute('/_protected/dashboard/technicians/')({
  beforeLoad: async ({ context }) => ensureTenantContext(context),
  component: TechniciansPage,
})

const QUERY_KEYS = createDataTableQueryKeys('technicians')

function TechniciansPage() {
  const { activeTenantId } = useTenant()
  const client = getDbClient()

  const { data: technicians = [], isLoading, isError, error } = useQuery({
    queryKey: ['technicians', activeTenantId],
    queryFn: () => client.labor.listTechnicians(),
    enabled: !!activeTenantId,
  })

  const columns = React.useMemo<ColumnDef<TechnicianRow>[]>(
    () => [
      {
        id: 'employee_number',
        accessorKey: 'employee_number',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Employee #" />
        ),
        cell: ({ row }) => {
          const technician = row.original
          const empNum = row.getValue('employee_number') as string | null
          return technician.id ? (
            <Link
              to="/dashboard/technicians/$id"
              params={{ id: technician.id }}
              className="font-medium text-primary hover:underline"
            >
              {empNum ?? '—'}
            </Link>
          ) : (
            <span className="font-medium">{empNum ?? '—'}</span>
          )
        },
      },
      {
        id: 'user_id',
        accessorKey: 'user_id',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="User ID" />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.getValue('user_id') ?? '—'}</span>
        ),
      },
      {
        id: 'is_active',
        accessorKey: 'is_active',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Status" />
        ),
        cell: ({ row }) => {
          const isActive = row.getValue('is_active') as boolean
          return (
            <Badge variant={isActive ? 'default' : 'secondary'}>
              {isActive ? 'Active' : 'Inactive'}
            </Badge>
          )
        },
      },
      {
        id: 'created_at',
        accessorKey: 'created_at',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Created" />
        ),
        cell: ({ row }) => {
          const created = row.getValue('created_at') as string
          return new Date(created).toLocaleDateString(undefined, { dateStyle: 'medium' })
        },
      },
    ],
    []
  )

  const pageCount = Math.ceil(technicians.length / DEFAULT_PAGE_SIZE) || 1
  const { table } = useDataTable({
    data: technicians,
    columns,
    pageCount,
    initialState: {
      pagination: { pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE },
    },
    queryKeys: QUERY_KEYS,
    getRowId: (row) => (row as TechnicianRow).id,
  })

  if (isError) {
    return (
      <DataTableErrorMessage resourceName="technicians" error={error ?? null} />
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
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div>
        <h1 className="text-2xl font-semibold">Technicians</h1>
        <p className="text-sm text-muted-foreground">Manage technicians and their assignments</p>
      </div>

      <DataTable table={table}>
        <DataTableToolbar table={table} />
      </DataTable>
    </div>
  )
}
