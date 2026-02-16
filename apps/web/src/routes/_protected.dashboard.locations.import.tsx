import * as React from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getDbClient } from '../lib/db-client'
import { useTenant } from '../contexts/tenant'
import { ensureTenantContext } from '../lib/route-loaders'
import { generateImportRowId } from '../lib/import-row-id'
import { parseCsv } from '../lib/csv-import'
import { CsvImportPage } from '../components/csv-import-page'

export interface LocationImportRow {
  id: string
  name: string
  description: string
  parent_location_id: string
}

const LOCATIONS_CSV_OPTIONS = {
  canonicalColumns: ['name', 'description', 'parent_location_id'] as const,
  requiredColumn: 'name',
  headerAliases: {
    name: [/^(name|title)$/],
    description: [/^(description|desc|notes)$/],
    parent_location_id: [/^(parentlocationid|parent_location_id|parent)$/i],
  },
}

function createEmptyRow(): LocationImportRow {
  return {
    id: generateImportRowId(),
    name: '',
    description: '',
    parent_location_id: '',
  }
}

function getCsvTemplate(): string {
  return `name,description,parent_location_id
"Building A","Main facility",,
"Warehouse 1","North site",,
"Room 201","Floor 2",,
`
}

export const Route = createFileRoute('/_protected/dashboard/locations/import')({
  beforeLoad: async ({ context }) => ensureTenantContext(context),
  component: LocationsImportPage,
})

function LocationsImportPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const client = getDbClient()
  const { activeTenantId } = useTenant()

  const columns = React.useMemo<ColumnDef<LocationImportRow>[]>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: 'Name',
        meta: { label: 'Name', cell: { variant: 'short-text' as const } },
      },
      {
        id: 'description',
        accessorKey: 'description',
        header: 'Description',
        meta: { label: 'Description', cell: { variant: 'long-text' as const } },
      },
      {
        id: 'parent_location_id',
        accessorKey: 'parent_location_id',
        header: 'Parent location ID',
        meta: { label: 'Parent location ID', cell: { variant: 'short-text' as const } },
      },
    ],
    [],
  )

  const parseFileToRows = React.useCallback((text: string): LocationImportRow[] => {
    const parsed = parseCsv(text, LOCATIONS_CSV_OPTIONS)
    return parsed.map((p, i) => ({
      id: `import-${i}-${Date.now()}`,
      name: p.name ?? '',
      description: p.description ?? '',
      parent_location_id: p.parent_location_id ?? '',
    }))
  }, [])

  const onImport = React.useCallback(
    async (rows: LocationImportRow[], context: { skipped: number }) => {
      if (!activeTenantId || rows.length === 0) return
      const payload = rows.map((row) => ({
        name: (row.name ?? '').trim(),
        description: (row.description ?? '').trim() || null,
        parent_location_id: (row.parent_location_id ?? '').trim() || null,
      }))
      const result = await client.locations.bulkImport({
        tenantId: activeTenantId,
        rows: payload,
      })
      const ok = result.created_ids.length
      const failed = result.errors.length
      if (context.skipped > 0) {
        toast.info(`Skipped ${context.skipped} row(s) with empty name`)
      }
      if (failed > 0) {
        const messages = result.errors
          .slice(0, 3)
          .map((e) => `Row ${e.index + 1}: ${e.message}`)
        toast.error(`Imported ${ok}, failed ${failed}`, {
          description: messages.join('; ') + (failed > 3 ? ` and ${failed - 3} more` : ''),
        })
      } else {
        toast.success(`Imported ${ok} location${ok !== 1 ? 's' : ''}`)
      }
      await queryClient.invalidateQueries({ queryKey: ['locations', activeTenantId] })
      if (ok > 0) navigate({ to: '/dashboard/locations' })
    },
    [activeTenantId, client.locations, queryClient, navigate],
  )

  return (
    <CsvImportPage<LocationImportRow>
      title="Import locations"
      description={
        <>
          Upload a CSV or add rows below. Columns: <strong>name</strong> (required), description,
          parent_location_id (UUID). Rows with an empty name are skipped.
        </>
      }
      entityLabelSingular="location"
      entityLabelPlural="locations"
      requiredFieldKey="name"
      columns={columns}
      createEmptyRow={createEmptyRow}
      getRowId={(row) => row.id}
      templateFilename="locations-import-template.csv"
      parseFileToRows={parseFileToRows}
      getTemplateCsv={getCsvTemplate}
      onImport={onImport}
    />
  )
}
