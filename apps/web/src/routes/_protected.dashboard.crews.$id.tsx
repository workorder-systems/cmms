import * as React from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Users, ArrowLeft } from 'lucide-react'
import type { CrewRow, CrewMemberRow } from '@workorder-systems/sdk'
import { getDbClient } from '../lib/db-client'
import { useTenant } from '../contexts/tenant'
import { ensureTenantContext } from '../lib/route-loaders'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Label } from '@workspace/ui/components/label'
import { DataTable } from '@workspace/ui/components/data-table/data-table'
import { DataTableColumnHeader } from '@workspace/ui/components/data-table/data-table-column-header'
import { DataTableSkeleton } from '@workspace/ui/components/data-table/data-table-skeleton'
import { DataTableErrorMessage } from '../components/data-table-error-message'
import type { ColumnDef } from '@tanstack/react-table'
import { getCoreRowModel, useReactTable } from '@tanstack/react-table'

export const Route = createFileRoute('/_protected/dashboard/crews/$id')({
  beforeLoad: async ({ context }) => ensureTenantContext(context),
  component: CrewDetailPage,
})

function CrewDetailPage() {
  const { id } = Route.useParams()
  const { activeTenantId } = useTenant()
  const client = getDbClient()

  const { data: crew, isLoading, isError, error } = useQuery({
    queryKey: ['crew', id],
    queryFn: () => client.labor.getCrewById(id),
    enabled: !!id,
  })

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ['crew-members', id],
    queryFn: () => client.labor.listCrewMembersByCrewId(id),
    enabled: !!id,
  })

  const membersColumns = React.useMemo<ColumnDef<CrewMemberRow>[]>(
    () => [
      {
        id: 'employee_number',
        accessorKey: 'employee_number',
        header: ({ column }: { column: any }) => (
          <DataTableColumnHeader column={column} label="Employee #" />
        ),
        cell: ({ row }: { row: any }) => {
          const empNum = row.getValue('employee_number') as string | null
          const techId = row.original.technician_id
          if (!techId) return <span>{empNum ?? '—'}</span>
          return (
            <Link
              to="/dashboard/technicians/$id"
              params={{ id: techId }}
              className="text-primary hover:underline"
            >
              {empNum ?? '—'}
            </Link>
          )
        },
      },
      {
        id: 'role',
        accessorKey: 'role',
        header: ({ column }: { column: any }) => (
          <DataTableColumnHeader column={column} label="Role" />
        ),
        cell: ({ row }: { row: any }) => (
          <span className="text-sm">{row.getValue('role') ?? '—'}</span>
        ),
      },
    ],
    []
  )

  const membersTable = useReactTable({
    data: members,
    columns: membersColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row: CrewMemberRow) => row.id ?? '',
  })

  if (isError) {
    return <DataTableErrorMessage resourceName="crew" error={error ?? null} />
  }

  if (isLoading || !crew) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <DataTableSkeleton columnCount={3} rowCount={5} />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard/crews">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">{crew.name ?? 'Crew'}</h1>
        </div>
        <p className="text-sm text-muted-foreground ml-12">Crew details and members</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="size-4" />
              Details
            </CardTitle>
            <CardDescription>Crew information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <DetailRow label="Name" value={crew.name ?? undefined} />
            <DetailRow label="Description" value={crew.description ?? undefined} />
            <DetailRow
              label="Created"
              value={
                crew.created_at
                  ? new Date(crew.created_at).toLocaleDateString(undefined, {
                      dateStyle: 'medium',
                    })
                  : undefined
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="size-4" />
              Members
            </CardTitle>
            <CardDescription>Crew members</CardDescription>
          </CardHeader>
          <CardContent>
            {membersLoading ? (
              <DataTableSkeleton columnCount={3} rowCount={3} />
            ) : members.length === 0 ? (
              <p className="text-sm text-muted-foreground">No members in this crew</p>
            ) : (
              <DataTable table={membersTable} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === '') return null
  return (
    <div className="space-y-1">
      <Label className="text-muted-foreground">{label}</Label>
      <div className="text-sm">{value}</div>
    </div>
  )
}
