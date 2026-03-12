import * as React from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { useQuery } from '@tanstack/react-query'
import { FolderKanban } from 'lucide-react'
import type { ProjectRow } from '@workorder-systems/sdk'
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

export const Route = createFileRoute('/_protected/dashboard/projects/')({
  beforeLoad: async ({ context }) => ensureTenantContext(context),
  component: ProjectsPage,
})

const QUERY_KEYS = createDataTableQueryKeys('projects')

function ProjectsPage() {
  const { activeTenantId } = useTenant()
  const client = getDbClient()

  const { data: projects = [], isLoading, isError, error } = useQuery({
    queryKey: ['projects', activeTenantId],
    queryFn: () => client.projects.list(),
    enabled: !!activeTenantId,
  })

  const columns = React.useMemo<ColumnDef<ProjectRow>[]>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Name" />
        ),
        cell: ({ row }) => {
          const project = row.original
          const name = row.getValue('name') as string | null
          return project.id ? (
            <Link
              to="/dashboard/projects/$id"
              params={{ id: project.id }}
              className="font-medium text-primary hover:underline"
            >
              {name ?? '—'}
            </Link>
          ) : (
            <span className="font-medium">{name ?? '—'}</span>
          )
        },
      },
      {
        id: 'description',
        accessorKey: 'description',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Description" />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground max-w-[200px] truncate block">
            {row.getValue('description') ?? '—'}
          </span>
        ),
      },
      {
        id: 'created_at',
        accessorKey: 'created_at',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Created" />
        ),
        cell: ({ row }) => {
          const created = row.getValue('created_at') as string | null
          return created
            ? new Date(created).toLocaleDateString(undefined, { dateStyle: 'medium' })
            : '—'
        },
      },
    ],
    []
  )

  const pageCount = Math.ceil(projects.length / DEFAULT_PAGE_SIZE) || 1
  const { table } = useDataTable({
    data: projects,
    columns,
    pageCount,
    initialState: {
      pagination: { pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE },
    },
    queryKeys: QUERY_KEYS,
    getRowId: (row) => (row as ProjectRow).id ?? '',
  })

  if (isError) {
    return (
      <DataTableErrorMessage resourceName="projects" error={error ?? null} />
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <DataTableSkeleton columnCount={3} rowCount={10} />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div>
        <h1 className="text-2xl font-semibold">Projects</h1>
        <p className="text-sm text-muted-foreground">View projects and their associated costs</p>
      </div>

      <DataTable table={table}>
        <DataTableToolbar table={table} />
      </DataTable>
    </div>
  )
}
