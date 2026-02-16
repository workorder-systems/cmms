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

const ASSETS_CSV_OPTIONS = {
  canonicalColumns: [
    'name',
    'description',
    'asset_number',
    'status',
    'location_id',
    'department_id',
  ] as const,
  requiredColumn: 'name',
  headerAliases: {
    name: [/^(name|title|assetname)$/],
    description: [/^(description|desc|notes)$/],
    asset_number: [/^(assetnumber|asset_number|number|tag)$/],
    status: [/^(status|state)$/],
    location_id: [/^(locationid|location_id|location)$/i],
    department_id: [/^(departmentid|department_id|department)$/i],
  },
}

function createEmptyRow(): AssetImportRow {
  return {
    id: generateImportRowId(),
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
  beforeLoad: async ({ context }) => ensureTenantContext(context),
  component: AssetsImportPage,
})

function AssetsImportPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const client = getDbClient()
  const { activeTenantId } = useTenant()

  const columns = React.useMemo<ColumnDef<AssetImportRow>[]>(
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
        id: 'asset_number',
        accessorKey: 'asset_number',
        header: 'Asset number',
        meta: { label: 'Asset number', cell: { variant: 'short-text' as const } },
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: 'Status',
        meta: {
          label: 'Status',
          cell: { variant: 'select' as const, options: ASSET_STATUS_OPTIONS },
        },
      },
      {
        id: 'location_id',
        accessorKey: 'location_id',
        header: 'Location ID',
        meta: { label: 'Location ID', cell: { variant: 'short-text' as const } },
      },
      {
        id: 'department_id',
        accessorKey: 'department_id',
        header: 'Department ID',
        meta: { label: 'Department ID', cell: { variant: 'short-text' as const } },
      },
    ],
    [],
  )

  const parseFileToRows = React.useCallback((text: string): AssetImportRow[] => {
    const parsed = parseCsv(text, ASSETS_CSV_OPTIONS)
    return parsed.map((p, i) => ({
      id: `import-${i}-${Date.now()}`,
      name: p.name ?? '',
      description: p.description ?? '',
      asset_number: p.asset_number ?? '',
      status: (p.status ?? '').trim() || 'active',
      location_id: p.location_id ?? '',
      department_id: p.department_id ?? '',
    }))
  }, [])

  const onImport = React.useCallback(
    async (rows: AssetImportRow[], context: { skipped: number }) => {
      if (!activeTenantId || rows.length === 0) return
      const payload = rows.map((row) => ({
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
        toast.success(`Imported ${ok} asset${ok !== 1 ? 's' : ''}`)
      }
      await queryClient.invalidateQueries({ queryKey: ['assets', activeTenantId] })
      if (ok > 0) navigate({ to: '/dashboard/assets' })
    },
    [activeTenantId, client.assets, queryClient, navigate],
  )

  return (
    <CsvImportPage<AssetImportRow>
      title="Import assets"
      description={
        <>
          Upload a CSV or add rows below. Columns: <strong>name</strong> (required), description,
          asset_number, status (active/inactive/retired), location_id, department_id (UUIDs). Rows
          with an empty name are skipped.
        </>
      }
      entityLabelSingular="asset"
      entityLabelPlural="assets"
      requiredFieldKey="name"
      columns={columns}
      createEmptyRow={createEmptyRow}
      getRowId={(row) => row.id}
      templateFilename="assets-import-template.csv"
      parseFileToRows={parseFileToRows}
      getTemplateCsv={getCsvTemplate}
      onImport={onImport}
    />
  )
}
