import * as React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Download, FileSpreadsheet, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { DataGrid } from '@workspace/ui/components/data-grid/data-grid'
import { useDataGrid } from '@workspace/ui/hooks/use-data-grid'
import { Button } from '@workspace/ui/components/button'

export type RequiredFieldKey = 'name' | 'title'

/** Row must have id and at least the required field (name or title) for the import. */
export interface CsvImportPageProps<T extends { id: string; name?: string; title?: string }> {
  title: string
  description: React.ReactNode
  entityLabelSingular: string
  entityLabelPlural: string
  requiredFieldKey: RequiredFieldKey
  columns: ColumnDef<T>[]
  createEmptyRow: () => T
  getRowId: (row: T) => string
  templateFilename: string
  parseFileToRows: (text: string) => T[]
  getTemplateCsv: () => string
  onImport: (rows: T[], context: { skipped: number }) => Promise<void>
}

function getRequiredFieldValue<T extends { id: string; name?: string; title?: string }>(
  row: T,
  key: RequiredFieldKey,
): string {
  const v = row[key]
  return typeof v === 'string' ? v : ''
}

export function CsvImportPage<T extends { id: string; name?: string; title?: string }>({
  title,
  description,
  entityLabelSingular,
  entityLabelPlural,
  requiredFieldKey,
  columns,
  createEmptyRow,
  getRowId,
  templateFilename,
  parseFileToRows,
  getTemplateCsv,
  onImport,
}: CsvImportPageProps<T>) {
  const [rows, setRows] = React.useState<T[]>([])
  const [importing, setImporting] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const rowsWithRequired = rows.filter(
    (r) => getRequiredFieldValue(r, requiredFieldKey).trim().length > 0,
  )
  const requiredLabel = requiredFieldKey === 'name' ? 'name' : 'title'

  const onRowAdd = React.useCallback(() => {
    const newRow = createEmptyRow()
    const newIndex = rows.length
    setRows((prev) => [...prev, newRow])
    return { rowIndex: newIndex, columnId: requiredFieldKey }
  }, [rows.length, createEmptyRow, requiredFieldKey])

  const { table, ...dataGridProps } = useDataGrid({
    data: rows,
    columns,
    onDataChange: setRows,
    onRowAdd,
    getRowId,
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
        setRows(parseFileToRows(text))
      }
      reader.readAsText(file, 'UTF-8')
      e.target.value = ''
    },
    [parseFileToRows],
  )

  const downloadTemplate = React.useCallback(() => {
    const template = getTemplateCsv()
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = templateFilename
    a.click()
    URL.revokeObjectURL(url)
  }, [getTemplateCsv, templateFilename])

  const [isDragOver, setIsDragOver] = React.useState(false)

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file?.name.endsWith('.csv') || file?.type === 'text/csv') {
        const reader = new FileReader()
        reader.onload = () => {
          setRows(parseFileToRows(String(reader.result ?? '')))
        }
        reader.readAsText(file, 'UTF-8')
      } else {
        toast.error('Please drop a CSV file')
      }
    },
    [parseFileToRows],
  )

  const runImport = React.useCallback(async () => {
    if (rowsWithRequired.length === 0) {
      if (rows.length > 0) {
        toast.error(`Add at least one ${entityLabelSingular} with a ${requiredLabel}`)
      }
      return
    }
    setImporting(true)
    try {
      const skipped = rows.length - rowsWithRequired.length
      await onImport(rowsWithRequired, { skipped })
    } finally {
      setImporting(false)
    }
  }, [rows.length, rowsWithRequired, entityLabelSingular, requiredLabel, onImport])

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <p className="text-muted-foreground text-sm">{description}</p>
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

      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <p className="text-muted-foreground text-sm">
          {rows.length === 0 ? (
            'Drop a CSV file on the grid or use Upload CSV to load data. You can also add rows in the grid.'
          ) : (
            <>
              {rows.length} row(s) · {rowsWithRequired.length} with {requiredLabel} (will be
              imported)
            </>
          )}
        </p>
        <div
          className={`relative min-h-0 flex-1 rounded-md border transition-colors ${isDragOver ? 'border-primary bg-muted/50' : 'border-border'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <DataGrid
            table={table}
            {...dataGridProps}
            height={520}
            stretchColumns
            className="rounded-md"
          />
          {isDragOver && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-md border-2 border-dashed border-primary bg-primary/5">
              <span className="text-muted-foreground flex items-center gap-2 rounded-md bg-background/90 px-4 py-2 text-sm font-medium">
                <FileSpreadsheet className="size-5" />
                Drop CSV to import
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-4 border-t pt-4">
        <Button
          onClick={runImport}
          disabled={importing || rowsWithRequired.length === 0}
        >
          {importing
            ? 'Importing…'
            : `Import ${rowsWithRequired.length} ${rowsWithRequired.length === 1 ? entityLabelSingular : entityLabelPlural}`}
        </Button>
      </div>
    </div>
  )
}
