import * as React from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getDbClient } from '../lib/db-client'
import { catalogQueryOptions } from '../lib/catalog-queries'
import { useTenant } from '../contexts/tenant'
import { ensureTenantContextWithCatalogs } from '../lib/route-loaders'
import { generateImportRowId } from '../lib/import-row-id'
import { parseCsv } from '../lib/csv-import'
import { CsvImportPage } from '../components/csv-import-page'

const WORK_ORDER_ENTITY_TYPE = 'work_order'

export interface WorkOrderImportRow {
  id: string
  title: string
  description: string
  cause: string
  resolution: string
  status: string
  priority: string
  due_date: string
}

const WORKORDERS_CSV_OPTIONS = {
  canonicalColumns: ['title', 'description', 'cause', 'resolution', 'status', 'priority', 'due_date'] as const,
  requiredColumn: 'title',
  headerAliases: {
    title: [/^(title|name|subject)$/],
    description: [
      /^(description|desc|body|notes|details|comment|content|summary)$/,
    ],
    cause: [/^(cause|root.?cause|rootcause)$/i],
    resolution: [/^(resolution|resolve|fix|solution|resolution.?notes)$/i],
    status: [/^(status|state|stage)$/],
    priority: [/^priority$/],
    due_date: [/^(duedate|due_date)$/i],
  },
}

/** Fallback when catalog has no work_order priorities. */
const FALLBACK_PRIORITY_OPTIONS = [
  { label: 'Low', value: 'low', color: '#22c55e' as const },
  { label: 'Medium', value: 'medium', color: '#3b82f6' as const },
  { label: 'High', value: 'high', color: '#f59e0b' as const },
]

function createEmptyRow(priorityDefault = 'medium'): WorkOrderImportRow {
  return {
    id: generateImportRowId(),
    title: '',
    description: '',
    cause: '',
    resolution: '',
    status: '',
    priority: priorityDefault,
    due_date: '',
  }
}

function getCsvTemplate(statusKeys: string[], priorityKeys: string[]): string {
  const statusCol = statusKeys.length > 0 ? statusKeys[0]! : 'draft'
  const priorityCol = priorityKeys.length > 0 ? priorityKeys[0]! : 'medium'
  return `title,description,cause,resolution,status,priority,due_date
"Repair HVAC unit in Building A","Inspect and replace filters","Worn filters","Replaced filters and cleaned duct",${statusCol},high,2025-03-15
"Monthly fire extinguisher check","Check all units on floor 2",,,${statusCol},medium,2025-03-01
"Replace light fixtures","Conference room B",,,${statusCol},low,
`
}

export const Route = createFileRoute('/_protected/dashboard/workorders/import')({
  beforeLoad: async ({ context }) => ensureTenantContextWithCatalogs(context),
  component: WorkOrdersImportPage,
})

function WorkOrdersImportPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const client = getDbClient()
  const { activeTenantId } = useTenant()

  const tenantId = activeTenantId ?? ''
  const { data: statusCatalog = [] } = useQuery({
    ...catalogQueryOptions.statuses(tenantId, client),
    enabled: !!tenantId,
  })
  const { data: priorityCatalog = [] } = useQuery({
    ...catalogQueryOptions.priorities(tenantId, client),
    enabled: !!tenantId,
  })

  const statusOptions = React.useMemo(() => {
    return statusCatalog
      .filter((s) => s.entity_type === WORK_ORDER_ENTITY_TYPE)
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
      .map((s) => ({
        label: s.name ?? s.key ?? '',
        value: s.key ?? '',
        color: s.color ?? null,
      }))
      .filter((o) => o.value !== '')
  }, [statusCatalog])

  const priorityOptions = React.useMemo(() => {
    const opts = priorityCatalog
      .filter((p) => p.entity_type === WORK_ORDER_ENTITY_TYPE)
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
      .map((p) => ({
        label: p.name ?? p.key ?? '',
        value: p.key ?? '',
        color: p.color ?? null,
      }))
      .filter((o) => o.value)
    return opts.length > 0 ? opts : FALLBACK_PRIORITY_OPTIONS
  }, [priorityCatalog])

  const defaultPriorityKey = priorityOptions[0]?.value ?? 'medium'

  const columns = React.useMemo<ColumnDef<WorkOrderImportRow>[]>(
    () => [
      {
        id: 'title',
        accessorKey: 'title',
        header: 'Title',
        meta: {
          label: 'Title',
          cell: { variant: 'short-text' as const },
        },
      },
      {
        id: 'description',
        accessorKey: 'description',
        header: 'Description',
        meta: {
          label: 'Description',
          cell: { variant: 'long-text' as const },
        },
      },
      {
        id: 'cause',
        accessorKey: 'cause',
        header: 'Cause',
        meta: {
          label: 'Cause',
          cell: { variant: 'long-text' as const },
        },
      },
      {
        id: 'resolution',
        accessorKey: 'resolution',
        header: 'Resolution',
        meta: {
          label: 'Resolution',
          cell: { variant: 'long-text' as const },
        },
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: 'Status',
        meta: {
          label: 'Status',
          cell: {
            variant: 'select' as const,
            options: statusOptions,
          },
        },
      },
      {
        id: 'priority',
        accessorKey: 'priority',
        header: 'Priority',
        meta: {
          label: 'Priority',
          cell: {
            variant: 'select' as const,
            options: priorityOptions,
          },
        },
      },
      {
        id: 'due_date',
        accessorKey: 'due_date',
        header: 'Due date',
        meta: {
          label: 'Due date',
          cell: { variant: 'date' as const },
        },
      },
    ],
    [statusOptions, priorityOptions],
  )

  const parseFileToRows = React.useCallback(
    (text: string): WorkOrderImportRow[] => {
      const parsed = parseCsv(text, WORKORDERS_CSV_OPTIONS)
      const priorityKeys = priorityOptions.map((o) => o.value)
      return parsed.map((p, i) => {
        const pri = (p.priority ?? '').trim()
        const status = (p.status ?? '').trim()
        return {
          id: `import-${i}-${Date.now()}`,
          title: p.title ?? '',
          description: p.description ?? '',
          cause: p.cause ?? '',
          resolution: p.resolution ?? '',
          status,
          priority: priorityKeys.includes(pri) ? pri : priorityKeys[0] ?? 'medium',
          due_date: p.due_date ?? '',
        }
      })
    },
    [priorityOptions],
  )

  const getTemplateCsv = React.useCallback(() => {
    const statusKeys = statusOptions.map((o) => o.value)
    const priorityKeys = priorityOptions.map((o) => o.value)
    return getCsvTemplate(statusKeys, priorityKeys)
  }, [statusOptions, priorityOptions])

  const onImport = React.useCallback(
    async (rows: WorkOrderImportRow[], context: { skipped: number }) => {
      if (!activeTenantId || rows.length === 0) return
      const payload = rows.map((row) => ({
        title: (row.title ?? '').trim(),
        description: (row.description ?? '').trim() || null,
        cause: (row.cause ?? '').trim() || null,
        resolution: (row.resolution ?? '').trim() || null,
        status: (row.status ?? '').trim() || null,
        priority: (row.priority ?? defaultPriorityKey).trim() || defaultPriorityKey,
        due_date: (row.due_date ?? '').trim() || null,
      }))
      const result = await client.workOrders.bulkImport({
        tenantId: activeTenantId,
        rows: payload,
      })
      const ok = result.created_ids.length
      const failed = result.errors.length
      if (context.skipped > 0) {
        toast.info(`Skipped ${context.skipped} row(s) with empty title`)
      }
      if (failed > 0) {
        const messages = result.errors
          .slice(0, 3)
          .map((e) => `Row ${e.index + 1}: ${e.message}`)
        toast.error(`Imported ${ok}, failed ${failed}`, {
          description: messages.join('; ') + (failed > 3 ? ` and ${failed - 3} more` : ''),
        })
      } else {
        toast.success(`Imported ${ok} work order${ok !== 1 ? 's' : ''}`)
      }
      await queryClient.invalidateQueries({ queryKey: ['work-orders', activeTenantId] })
      if (ok > 0) navigate({ to: '/dashboard/workorders' })
    },
    [activeTenantId, client.workOrders, defaultPriorityKey, queryClient, navigate],
  )

  return (
    <CsvImportPage<WorkOrderImportRow>
      title="Import work orders"
      description={
        <>
          Upload a CSV or add rows below. Columns: <strong>title</strong> (required), description,
          cause, resolution, status, priority, due_date (YYYY-MM-DD). Cause and resolution are
          optional (e.g. for completed work orders). Status and priority use your tenant catalog
          keys. Rows with an empty title are skipped on import.
        </>
      }
      entityLabelSingular="work order"
      entityLabelPlural="work orders"
      requiredFieldKey="title"
      columns={columns}
      createEmptyRow={() => createEmptyRow(defaultPriorityKey)}
      getRowId={(row) => row.id}
      templateFilename="work-orders-import-template.csv"
      parseFileToRows={parseFileToRows}
      getTemplateCsv={getTemplateCsv}
      onImport={onImport}
    />
  )
}
