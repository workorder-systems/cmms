import * as React from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Upload, FileSpreadsheet, Download } from 'lucide-react'
import { toast } from 'sonner'
import { getDbClient } from '../lib/db-client'
import { prefetchCatalogs, catalogQueryOptions } from '../lib/catalog-queries'
import { useTenant } from '../contexts/tenant'
import { DataGrid } from '@workspace/ui/components/data-grid/data-grid'
import { useDataGrid } from '@workspace/ui/hooks/use-data-grid'
import { Button } from '@workspace/ui/components/button'

const TENANT_STORAGE_KEY = 'dashboard_tenant_id'

const BOM = '\uFEFF'

/** Normalize header to camelCase for mapping (e.g. "Due date" -> dueDate). Strips BOM. */
function headerToKey(header: string): string {
  const trimmed = header.replace(/\s+/g, ' ').trim().replace(BOM, '').toLowerCase()
  if (!trimmed) return ''
  return trimmed
    .replace(/[^a-z0-9]+(\w)/g, (_, c) => (c as string).toUpperCase())
    .replace(/^./, (c) => c.toLowerCase())
}

/** Trim and normalize cell value (strip BOM and trailing \\r). */
function normalizeCell(value: string | undefined): string {
  if (value == null) return ''
  return value.replace(/\r/g, '').replace(BOM, '').trim()
}

/** Parse CSV text into array of objects. First row = headers. Handles quoted fields. */
function parseCsv(text: string): Record<string, string>[] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(BOM, '')
  const lines = normalized.split('\n').filter((line) => line.trim().length > 0)
  if (lines.length < 2) return []

  const parseRow = (line: string): string[] => {
    const out: string[] = []
    let i = 0
    while (i < line.length) {
      if (line[i] === '"') {
        i += 1
        let cell = ''
        while (i < line.length) {
          if (line[i] === '"') {
            i += 1
            if (line[i] === '"') {
              cell += '"'
              i += 1
            } else break
          } else {
            cell += line[i]
            i += 1
          }
        }
        out.push(normalizeCell(cell))
        if (line[i] === ',') i += 1
      } else {
        const comma = line.indexOf(',', i)
        if (comma === -1) {
          out.push(normalizeCell(line.slice(i)))
          break
        }
        out.push(normalizeCell(line.slice(i, comma)))
        i = comma + 1
      }
    }
    return out
  }

  const rawHeaders = parseRow(lines[0]!)
  const headers = rawHeaders.map((h) => headerToKey(h))
  const mapKeys: Record<string, string> = {}
  const canonical = ['title', 'description', 'status', 'priority', 'due_date'] as const

  for (const w of canonical) {
    const idx = headers.indexOf(w)
    if (idx !== -1) mapKeys[headers[idx]!] = w
  }
  if (!mapKeys['title']) {
    const t = headers.find((h) => /^(title|name|subject)$/.test(h))
    if (t) mapKeys[t] = 'title'
  }
  if (!mapKeys['description']) {
    const d = headers.find((h) =>
      /^(description|desc|body|notes|details|comment|content|summary)$/.test(h),
    )
    if (d) mapKeys[d] = 'description'
  }
  if (!mapKeys['status']) {
    const s = headers.find((h) => /^(status|state|stage)$/.test(h))
    if (s) mapKeys[s] = 'status'
  }
  if (!mapKeys['priority']) {
    const p = headers.find((h) => /^priority$/.test(h))
    if (p) mapKeys[p] = 'priority'
  }
  if (!mapKeys['due_date']) {
    const due = headers.find((h) =>
      /^(duedate|due_date)$/i.test(h) || /^due\s*date$/i.test(h),
    )
    if (due) mapKeys[due] = 'due_date'
  }

  for (const h of headers) {
    const lower = h.toLowerCase()
    if ((lower === 'duedate' || lower === 'due_date') && !mapKeys[h]) mapKeys[h] = 'due_date'
  }

  const rows: Record<string, string>[] = []
  for (let r = 1; r < lines.length; r++) {
    const values = parseRow(lines[r]!)
    const obj: Record<string, string> = {}
    for (let c = 0; c < headers.length; c++) {
      const key = mapKeys[headers[c]!]
      if (key) obj[key] = normalizeCell(values[c])
    }
    for (const k of canonical) {
      if (!(k in obj)) obj[k] = ''
    }
    if (obj.title) rows.push(obj)
  }
  return rows
}

const WORK_ORDER_ENTITY_TYPE = 'work_order'

export interface WorkOrderImportRow {
  id: string
  title: string
  description: string
  status: string
  priority: string
  due_date: string
}

/** Fallback when catalog has no work_order priorities. */
const FALLBACK_PRIORITY_OPTIONS = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
]

function createEmptyRow(priorityDefault = 'medium'): WorkOrderImportRow {
  return {
    id: `import-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    title: '',
    description: '',
    status: '',
    priority: priorityDefault,
    due_date: '',
  }
}

/** Build CSV template with status column; status/priority use keys (user can replace with catalog keys). */
function getCsvTemplate(statusKeys: string[], priorityKeys: string[]): string {
  const statusCol = statusKeys.length > 0 ? statusKeys[0]! : 'open'
  const priorityCol = priorityKeys.length > 0 ? priorityKeys[0]! : 'medium'
  return `title,description,status,priority,due_date
"Repair HVAC unit in Building A","Inspect and replace filters",${statusCol},high,2025-03-15
"Monthly fire extinguisher check","Check all units on floor 2",${statusCol},medium,2025-03-01
"Replace light fixtures","Conference room B",${statusCol},low,
`
}

export const Route = createFileRoute('/_protected/dashboard/workorders/import')({
  beforeLoad: async ({ context }) => {
    if (typeof window === 'undefined') return
    const tenantId = window.localStorage.getItem(TENANT_STORAGE_KEY)
    if (!tenantId) return
    await context.dbClient.setTenant(tenantId)
    await prefetchCatalogs(context.queryClient, context.dbClient, tenantId)
  },
  component: WorkOrdersImportPage,
})

function WorkOrdersImportPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const client = getDbClient()
  const { activeTenantId } = useTenant()
  const [rows, setRows] = React.useState<WorkOrderImportRow[]>([])
  const [importing, setImporting] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

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
      .map((s) => ({ label: s.name ?? s.key ?? '', value: s.key ?? '' }))
      .filter((o) => o.value !== '')
  }, [statusCatalog])

  const priorityOptions = React.useMemo(() => {
    const opts = priorityCatalog
      .filter((p) => p.entity_type === WORK_ORDER_ENTITY_TYPE)
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
      .map((p) => ({ label: p.name ?? p.key ?? '', value: p.key ?? '' }))
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

  const onRowAdd = React.useCallback(() => {
    const newRow = createEmptyRow(defaultPriorityKey)
    const newIndex = rows.length
    setRows((prev) => [...prev, newRow])
    return { rowIndex: newIndex, columnId: 'title' }
  }, [rows.length, defaultPriorityKey])

  const { table, ...dataGridProps } = useDataGrid({
    data: rows,
    columns,
    onDataChange: setRows,
    onRowAdd,
    getRowId: (row) => row.id,
    enableSearch: false,
    readOnly: false,
  })

  const onFileChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      const priorityKeys = priorityOptions.map((o) => o.value)
      const reader = new FileReader()
      reader.onload = () => {
        const text = String(reader.result ?? '')
        const parsed = parseCsv(text)
        const withIds: WorkOrderImportRow[] = parsed.map((p, i) => {
          const pri = (p.priority ?? '').trim()
          const status = (p.status ?? '').trim()
          return {
            id: `import-${i}-${Date.now()}`,
            title: p.title ?? '',
            description: p.description ?? '',
            status,
            priority: priorityKeys.includes(pri) ? pri : priorityKeys[0] ?? 'medium',
            due_date: p.due_date ?? '',
          }
        })
        setRows(withIds)
      }
      reader.readAsText(file, 'UTF-8')
      e.target.value = ''
    },
    [priorityOptions, statusOptions],
  )

  const downloadTemplate = React.useCallback(() => {
    const statusKeys = statusOptions.map((o) => o.value)
    const priorityKeys = priorityOptions.map((o) => o.value)
    const template = getCsvTemplate(statusKeys, priorityKeys)
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'work-orders-import-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }, [statusOptions, priorityOptions])

  const runImport = React.useCallback(async () => {
    const toImport = rows.filter((r) => (r.title ?? '').trim().length > 0)
    if (!activeTenantId || toImport.length === 0) {
      if (rows.length > 0) toast.error('Add at least one work order with a title')
      return
    }
    setImporting(true)
    try {
      const payload = toImport.map((row) => ({
        title: (row.title ?? '').trim(),
        description: (row.description ?? '').trim() || null,
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
      const skipped = rows.length - toImport.length
      if (skipped > 0) {
        toast.info(`Skipped ${skipped} row(s) with empty title`)
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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setImporting(false)
    }
  }, [activeTenantId, client.workOrders, defaultPriorityKey, queryClient, rows, navigate])

  const rowsWithTitle = rows.filter((r) => (r.title ?? '').trim().length > 0)

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">Import work orders</h2>
        <p className="text-muted-foreground text-sm">
          Upload a CSV or add rows below. Columns: <strong>title</strong> (required), description, status, priority, due_date (YYYY-MM-DD). Status and priority use your tenant catalog keys. Rows with an empty title are skipped on import.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="size-4" />
          Upload CSV
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={onFileChange}
        />
        <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
          <Download className="size-4" />
          Download template
        </Button>
      </div>

      {rows.length === 0 ? (
        <div
          className="border-border flex min-h-[360px] flex-col items-center justify-center gap-4 rounded-lg border border-dashed bg-muted/30 p-10"
          onDragOver={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
          onDrop={(e) => {
            e.preventDefault()
            e.stopPropagation()
            const file = e.dataTransfer.files[0]
            if (file?.name.endsWith('.csv') || file?.type === 'text/csv') {
              const priorityKeys = priorityOptions.map((o) => o.value)
              const reader = new FileReader()
              reader.onload = () => {
                const text = String(reader.result ?? '')
                const parsed = parseCsv(text)
                setRows(
                  parsed.map((p, i) => {
                    const pri = (p.priority ?? '').trim()
                    const status = (p.status ?? '').trim()
                    return {
                      id: `import-${i}-${Date.now()}`,
                      title: p.title ?? '',
                      description: p.description ?? '',
                      status,
                      priority: priorityKeys.includes(pri) ? pri : priorityKeys[0] ?? 'medium',
                      due_date: p.due_date ?? '',
                    }
                  }),
                )
              }
              reader.readAsText(file, 'UTF-8')
            } else {
              toast.error('Please drop a CSV file')
            }
          }}
        >
          <FileSpreadsheet className="text-muted-foreground size-14" />
          <p className="text-muted-foreground text-center text-sm">
            Drop a CSV file here or click <strong>Upload CSV</strong>. You can also add rows in the grid after loading a file.
          </p>
        </div>
      ) : (
        <>
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <p className="text-muted-foreground text-sm">
              {rows.length} row(s) · {rowsWithTitle.length} with title (will be imported)
            </p>
            <div className="min-h-0 flex-1 rounded-md border">
              <DataGrid
                table={table}
                {...dataGridProps}
                height={520}
                stretchColumns
                className="rounded-md"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-4">
            <Link to="/dashboard/workorders" className="text-muted-foreground text-sm hover:underline">
              Back to work orders
            </Link>
            <Button
              onClick={runImport}
              disabled={importing || rowsWithTitle.length === 0}
            >
              {importing
                ? 'Importing…'
                : `Import ${rowsWithTitle.length} work order${rowsWithTitle.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
