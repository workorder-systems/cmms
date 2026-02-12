import * as React from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { useQueryClient } from '@tanstack/react-query'
import { Upload, FileSpreadsheet, Download } from 'lucide-react'
import { toast } from 'sonner'
import { getDbClient } from '../lib/db-client'
import { prefetchCatalogs } from '../lib/catalog-queries'
import { useTenant } from '../contexts/tenant'
import { DataGrid } from '@workspace/ui/components/data-grid/data-grid'
import { useDataGrid } from '@workspace/ui/hooks/use-data-grid'
import { Button } from '@workspace/ui/components/button'

const TENANT_STORAGE_KEY = 'dashboard_tenant_id'

/** Normalize header to camelCase for mapping (e.g. "Due date" -> dueDate). */
function headerToKey(header: string): string {
  const trimmed = header.trim().toLowerCase()
  return trimmed
    .replace(/[^a-z0-9]+(\w)/g, (_, c) => (c as string).toUpperCase())
    .replace(/^./, (c) => c.toLowerCase())
}

/** Parse CSV text into array of objects. First row = headers. Handles quoted fields. */
function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0)
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
        out.push(cell)
      } else {
        const comma = line.indexOf(',', i)
        if (comma === -1) {
          out.push(line.slice(i).trim())
          break
        }
        out.push(line.slice(i, comma).trim())
        i = comma + 1
      }
    }
    return out
  }

  const headers = parseRow(lines[0]!).map((h) => headerToKey(h.trim()))
  const mapKeys: Record<string, string> = {}
  const wanted = ['title', 'description', 'priority', 'duedate', 'due_date']
  for (const w of wanted) {
    const idx = headers.indexOf(w)
    if (idx !== -1) mapKeys[headers[idx]!] = w === 'duedate' ? 'due_date' : w
  }
  if (!mapKeys['title']) {
    const t = headers.find((h) => /title|name|subject/.test(h))
    if (t) mapKeys[t] = 'title'
  }
  if (!mapKeys['description']) {
    const d = headers.find((h) => /description|desc|body|notes/.test(h))
    if (d) mapKeys[d] = 'description'
  }
  if (!mapKeys['priority']) {
    const p = headers.find((h) => /priority/.test(h))
    if (p) mapKeys[p] = 'priority'
  }
  if (!mapKeys['due_date']) {
    const due = headers.find((h) => h === 'dueDate' || h === 'due_date' || /^due/i.test(h))
    if (due) mapKeys[due] = 'due_date'
  }

  const rows: Record<string, string>[] = []
  for (let r = 1; r < lines.length; r++) {
    const values = parseRow(lines[r]!)
    const obj: Record<string, string> = {}
    for (let c = 0; c < headers.length; c++) {
      const key = mapKeys[headers[c]!]
      if (key) obj[key] = values[c]?.trim() ?? ''
    }
    if (obj.title) rows.push(obj)
  }
  return rows
}

export interface WorkOrderImportRow {
  id: string
  title: string
  description: string
  priority: string
  due_date: string
}

const PRIORITY_OPTIONS = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
]

const CSV_TEMPLATE = 'title,description,priority,due_date\n"Sample work order","Optional description",medium,\n'

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
        id: 'priority',
        accessorKey: 'priority',
        header: 'Priority',
        meta: {
          label: 'Priority',
          cell: {
            variant: 'select' as const,
            options: PRIORITY_OPTIONS,
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
    [],
  )

  const { table, ...dataGridProps } = useDataGrid({
    data: rows,
    columns,
    onDataChange: setRows,
    getRowId: (row) => row.id,
    enableSearch: false,
    readOnly: false,
  })

  const onFileChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        const text = String(reader.result ?? '')
        const parsed = parseCsv(text)
        const withIds: WorkOrderImportRow[] = parsed.map((p, i) => ({
          id: `import-${i}-${Date.now()}`,
          title: p.title ?? '',
          description: p.description ?? '',
          priority: p.priority && ['low', 'medium', 'high'].includes(p.priority.toLowerCase()) ? p.priority.toLowerCase() : 'medium',
          due_date: p.due_date ?? '',
        }))
        setRows(withIds)
      }
      reader.readAsText(file, 'UTF-8')
      e.target.value = ''
    },
    [],
  )

  const downloadTemplate = React.useCallback(() => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'work-orders-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const runImport = React.useCallback(async () => {
    if (!activeTenantId || rows.length === 0) return
    setImporting(true)
    let ok = 0
    const errors: string[] = []
    for (const row of rows) {
      try {
        await client.workOrders.create({
          tenantId: activeTenantId,
          title: row.title,
          description: row.description || null,
          priority: row.priority || 'medium',
          dueDate: row.due_date || null,
        })
        ok += 1
      } catch (err) {
        errors.push(`${row.title}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
    setImporting(false)
    if (errors.length > 0) {
      toast.error(`Imported ${ok}, failed ${errors.length}`, {
        description: errors.slice(0, 3).join('; ') + (errors.length > 3 ? ` and ${errors.length - 3} more` : ''),
      })
    } else {
      toast.success(`Imported ${ok} work order${ok !== 1 ? 's' : ''}`)
    }
    await queryClient.invalidateQueries({ queryKey: ['work-orders', activeTenantId] })
    if (ok > 0) navigate({ to: '/dashboard/workorders' })
  }, [activeTenantId, client.workOrders, queryClient, rows, navigate])

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-muted-foreground text-sm">
          Upload a CSV with columns: title (required), description, priority, due_date. You can edit rows below before importing.
        </p>
        <div className="flex items-center gap-2">
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
            accept=".csv"
            className="hidden"
            onChange={onFileChange}
          />
          <Button type="button" variant="ghost" size="sm" onClick={downloadTemplate}>
            <Download className="size-4" />
            Template
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div
          className="border-border flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-muted/30 p-8"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const file = e.dataTransfer.files[0]
            if (file?.name.endsWith('.csv')) {
              const reader = new FileReader()
              reader.onload = () => {
                const text = String(reader.result ?? '')
                const parsed = parseCsv(text)
                setRows(
                  parsed.map((p, i) => ({
                    id: `import-${i}-${Date.now()}`,
                    title: p.title ?? '',
                    description: p.description ?? '',
                    priority: p.priority && ['low', 'medium', 'high'].includes(p.priority.toLowerCase()) ? p.priority.toLowerCase() : 'medium',
                    due_date: p.due_date ?? '',
                  })),
                )
              }
              reader.readAsText(file, 'UTF-8')
            }
          }}
        >
          <FileSpreadsheet className="text-muted-foreground size-12" />
          <p className="text-muted-foreground text-sm">Drop a CSV file here or use Upload CSV</p>
        </div>
      ) : (
        <>
          <DataGrid table={table} {...dataGridProps} height={500} />
          <div className="flex items-center justify-between">
            <Link to="/dashboard/workorders" className="text-muted-foreground text-sm hover:underline">
              Back to work orders
            </Link>
            <Button onClick={runImport} disabled={importing}>
              {importing ? 'Importing…' : `Import ${rows.length} work order${rows.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
