import * as React from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { useQueryClient } from '@tanstack/react-query'
import { Download, FileSpreadsheet, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { getDbClient } from '../lib/db-client'
import { useTenant } from '../contexts/tenant'
import { DataGrid } from '@workspace/ui/components/data-grid/data-grid'
import { useDataGrid } from '@workspace/ui/hooks/use-data-grid'
import { Button } from '@workspace/ui/components/button'

const TENANT_STORAGE_KEY = 'dashboard_tenant_id'

const BOM = '\uFEFF'

function headerToKey(header: string): string {
  const trimmed = header.replace(/\s+/g, ' ').trim().replace(BOM, '').toLowerCase()
  if (!trimmed) return ''
  return trimmed
    .replace(/[^a-z0-9]+(\w)/g, (_, c) => (c as string).toUpperCase())
    .replace(/^./, (c) => c.toLowerCase())
}

function normalizeCell(value: string | undefined): string {
  if (value == null) return ''
  return value.replace(/\r/g, '').replace(BOM, '').trim()
}

function parseRow(line: string, normalize: (s: string) => string): string[] {
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
      out.push(normalize(cell))
      if (line[i] === ',') i += 1
    } else {
      const comma = line.indexOf(',', i)
      if (comma === -1) {
        out.push(normalize(line.slice(i)))
        break
      }
      out.push(normalize(line.slice(i, comma)))
      i = comma + 1
    }
  }
  return out
}

/** Parse CSV into rows with keys: name, description, asset_number, status, location_id, department_id. */
function parseCsv(text: string): Record<string, string>[] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(BOM, '')
  const lines = normalized.split('\n').filter((line) => line.trim().length > 0)
  if (lines.length < 2) return []

  const rawHeaders = parseRow(lines[0]!, (s) => headerToKey(s.replace(BOM, '')))
  const canonical = ['name', 'description', 'asset_number', 'status', 'location_id', 'department_id'] as const
  const mapKeys: Record<string, string> = {}
  for (const k of canonical) {
    const idx = rawHeaders.indexOf(k)
    if (idx !== -1) mapKeys[rawHeaders[idx]!] = k
  }
  if (!mapKeys['name']) {
    const t = rawHeaders.find((h) => /^(name|title|assetname)$/.test(h))
    if (t) mapKeys[t] = 'name'
  }
  if (!mapKeys['description']) {
    const d = rawHeaders.find((h) => /^(description|desc|notes)$/.test(h))
    if (d) mapKeys[d] = 'description'
  }
  if (!mapKeys['asset_number']) {
    const a = rawHeaders.find((h) => /^(assetnumber|asset_number|number|tag)$/.test(h))
    if (a) mapKeys[a] = 'asset_number'
  }
  if (!mapKeys['status']) {
    const s = rawHeaders.find((h) => /^(status|state)$/.test(h))
    if (s) mapKeys[s] = 'status'
  }
  if (!mapKeys['location_id']) {
    const l = rawHeaders.find((h) => /^(locationid|location_id|location)$/.test(h))
    if (l) mapKeys[l] = 'location_id'
  }
  if (!mapKeys['department_id']) {
    const d = rawHeaders.find((h) => /^(departmentid|department_id|department)$/.test(h))
    if (d) mapKeys[d] = 'department_id'
  }

  const rows: Record<string, string>[] = []
  for (let r = 1; r < lines.length; r++) {
    const values = parseRow(lines[r]!, normalizeCell)
    const obj: Record<string, string> = {}
    for (let c = 0; c < rawHeaders.length; c++) {
      const key = mapKeys[rawHeaders[c]!]
      if (key) obj[key] = values[c] ?? ''
    }
    for (const k of canonical) {
      if (!(k in obj)) obj[k] = ''
    }
    if ((obj.name ?? '').trim()) rows.push(obj)
  }
  return rows
}

const ASSET_STATUS_OPTIONS = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'Retired', value: 'retired' },
]

export interface AssetImportRow {
  id: string
  name: string
  description: string
  asset_number: string
  status: string
  location_id: string
  department_id: string
}

function createEmptyRow(): AssetImportRow {
  return {
    id: `import-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: '',
    description: '',
    asset_number: '',
    status: 'active',
    location_id: '',
    department_id: '',
  }
}

function getCsvTemplate(): string {
  return `name,description,asset_number,status,location_id,department_id
"HVAC Unit #5","Main floor AHU",HVAC-001,active,,
"Conveyor Belt A","Warehouse line 1",CONV-A,inactive,,
"Generator G1","Backup power",,active,,
`
}

export const Route = createFileRoute('/_protected/dashboard/assets/import')({
  beforeLoad: async ({ context }) => {
    if (typeof window === 'undefined') return
    const tenantId = window.localStorage.getItem(TENANT_STORAGE_KEY)
    if (!tenantId) return
    await context.dbClient.setTenant(tenantId)
  },
  component: AssetsImportPage,
})

function AssetsImportPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const client = getDbClient()
  const { activeTenantId } = useTenant()
  const [rows, setRows] = React.useState<AssetImportRow[]>([])
  const [importing, setImporting] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const columns = React.useMemo<ColumnDef<AssetImportRow>[]>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: 'Name',
        meta: {
          label: 'Name',
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
        id: 'asset_number',
        accessorKey: 'asset_number',
        header: 'Asset number',
        meta: {
          label: 'Asset number',
          cell: { variant: 'short-text' as const },
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
            options: ASSET_STATUS_OPTIONS,
          },
        },
      },
      {
        id: 'location_id',
        accessorKey: 'location_id',
        header: 'Location ID',
        meta: {
          label: 'Location ID',
          cell: { variant: 'short-text' as const },
        },
      },
      {
        id: 'department_id',
        accessorKey: 'department_id',
        header: 'Department ID',
        meta: {
          label: 'Department ID',
          cell: { variant: 'short-text' as const },
        },
      },
    ],
    [],
  )

  const onRowAdd = React.useCallback(() => {
    const newRow = createEmptyRow()
    const newIndex = rows.length
    setRows((prev) => [...prev, newRow])
    return { rowIndex: newIndex, columnId: 'name' }
  }, [rows.length])

  const { table, ...dataGridProps } = useDataGrid({
    data: rows,
    columns,
    onDataChange: setRows,
    onRowAdd,
    getRowId: (row) => row.id,
    enableSearch: false,
    readOnly: false,
  })

  const onFileChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? '')
      const parsed = parseCsv(text)
      const withIds: AssetImportRow[] = parsed.map((p, i) => ({
        id: `import-${i}-${Date.now()}`,
        name: p.name ?? '',
        description: p.description ?? '',
        asset_number: p.asset_number ?? '',
        status: (p.status ?? '').trim() || 'active',
        location_id: p.location_id ?? '',
        department_id: p.department_id ?? '',
      }))
      setRows(withIds)
    }
    reader.readAsText(file, 'UTF-8')
    e.target.value = ''
  }, [])

  const downloadTemplate = React.useCallback(() => {
    const template = getCsvTemplate()
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'assets-import-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const runImport = React.useCallback(async () => {
    const toImport = rows.filter((r) => (r.name ?? '').trim().length > 0)
    if (!activeTenantId || toImport.length === 0) {
      if (rows.length > 0) toast.error('Add at least one asset with a name')
      return
    }
    setImporting(true)
    try {
      const payload = toImport.map((row) => ({
        name: (row.name ?? '').trim(),
        description: (row.description ?? '').trim() || null,
        asset_number: (row.asset_number ?? '').trim() || null,
        status: (row.status ?? 'active').trim() || 'active',
        location_id: (row.location_id ?? '').trim() || null,
        department_id: (row.department_id ?? '').trim() || null,
      }))
      const result = await client.assets.bulkImport({
        tenantId: activeTenantId,
        rows: payload,
      })
      const ok = result.created_ids.length
      const failed = result.errors.length
      const skipped = rows.length - toImport.length
      if (skipped > 0) {
        toast.info(`Skipped ${skipped} row(s) with empty name`)
      }
      if (failed > 0) {
        const messages = result.errors
          .slice(0, 3)
          .map((e) => `Row ${e.index + 1}: ${e.message}`)
        toast.error(`Imported ${ok}, failed ${failed}`, {
          description: messages.join('; ') + (failed > 3 ? ` and ${failed - 3} more` : ''),
        })
      } else {
        toast.success(`Imported ${ok} asset${ok !== 1 ? 's' : ''}`)
      }
      await queryClient.invalidateQueries({ queryKey: ['assets', activeTenantId] })
      if (ok > 0) navigate({ to: '/dashboard/assets' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setImporting(false)
    }
  }, [activeTenantId, client.assets, queryClient, rows, navigate])

  const rowsWithName = rows.filter((r) => (r.name ?? '').trim().length > 0)

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">Import assets</h2>
        <p className="text-muted-foreground text-sm">
          Upload a CSV or add rows below. Columns: <strong>name</strong> (required), description, asset_number, status (active/inactive/retired), location_id, department_id (UUIDs). Rows with an empty name are skipped.
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
              const reader = new FileReader()
              reader.onload = () => {
                const text = String(reader.result ?? '')
                const parsed = parseCsv(text)
                setRows(
                  parsed.map((p, i) => ({
                    id: `import-${i}-${Date.now()}`,
                    name: p.name ?? '',
                    description: p.description ?? '',
                    asset_number: p.asset_number ?? '',
                    status: (p.status ?? '').trim() || 'active',
                    location_id: p.location_id ?? '',
                    department_id: p.department_id ?? '',
                  })),
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
              {rows.length} row(s) · {rowsWithName.length} with name (will be imported)
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
            <Link to="/dashboard/assets" className="text-muted-foreground text-sm hover:underline">
              Back to assets
            </Link>
            <Button
              onClick={runImport}
              disabled={importing || rowsWithName.length === 0}
            >
              {importing
                ? 'Importing…'
                : `Import ${rowsWithName.length} asset${rowsWithName.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
