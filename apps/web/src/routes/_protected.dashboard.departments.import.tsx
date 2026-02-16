import * as React from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getDbClient } from '../lib/db-client'
import { useTenant } from '../contexts/tenant'
import { parseCsv } from '../lib/csv-import'
import { CsvImportPage } from '../components/csv-import-page'

const TENANT_STORAGE_KEY = 'dashboard_tenant_id'

export interface DepartmentImportRow {
  id: string
  name: string
  description: string
  code: string
}

const DEPARTMENTS_CSV_OPTIONS = {
  canonicalColumns: ['name', 'description', 'code'] as const,
  requiredColumn: 'name',
  headerAliases: {
    name: [/^(name|title)$/],
    description: [/^(description|desc|notes)$/],
    code: [/^code$/],
  },
}

function createEmptyRow(): DepartmentImportRow {
  return {
    id: `import-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: '',
    description: '',
    code: '',
  }
}

function getCsvTemplate(): string {
  return `name,description,code
"Engineering","Product development",ENG
"Maintenance","Facilities and equipment",MAINT
"Facilities","Building operations",FACIL
`
}

export const Route = createFileRoute('/_protected/dashboard/departments/import')({
  beforeLoad: async ({ context }) => {
    if (typeof window === 'undefined') return
    const tenantId = window.localStorage.getItem(TENANT_STORAGE_KEY)
    if (!tenantId) return
    await context.dbClient.setTenant(tenantId)
  },
  component: DepartmentsImportPage,
})

function DepartmentsImportPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const client = getDbClient()
  const { activeTenantId } = useTenant()

  const columns = React.useMemo<ColumnDef<DepartmentImportRow>[]>(
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
        id: 'code',
        accessorKey: 'code',
        header: 'Code',
        meta: { label: 'Code', cell: { variant: 'short-text' as const } },
      },
    ],
    [],
  )

  const parseFileToRows = React.useCallback((text: string): DepartmentImportRow[] => {
    const parsed = parseCsv(text, DEPARTMENTS_CSV_OPTIONS)
    return parsed.map((p, i) => ({
      id: `import-${i}-${Date.now()}`,
      name: p.name ?? '',
      description: p.description ?? '',
      code: p.code ?? '',
    }))
  }, [])

  const onImport = React.useCallback(
    async (
      rows: DepartmentImportRow[],
      context: { skipped: number },
    ) => {
      if (!activeTenantId || rows.length === 0) return
      const payload = rows.map((row) => ({
        name: (row.name ?? '').trim(),
        description: (row.description ?? '').trim() || null,
        code: (row.code ?? '').trim() || null,
      }))
      const result = await client.departments.bulkImport({
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
        toast.success(`Imported ${ok} department${ok !== 1 ? 's' : ''}`)
      }
      await queryClient.invalidateQueries({ queryKey: ['departments', activeTenantId] })
      if (ok > 0) navigate({ to: '/dashboard/departments' })
    },
    [activeTenantId, client.departments, queryClient, navigate],
  )

  return (
    <CsvImportPage<DepartmentImportRow>
      title="Import departments"
      description={
        <>
          Upload a CSV or add rows below. Columns: <strong>name</strong> (required), description,
          code (uppercase alphanumeric + underscore, 1-20 chars). Rows with an empty name are skipped.
        </>
      }
      entityLabelSingular="department"
      entityLabelPlural="departments"
      requiredFieldKey="name"
      columns={columns}
      createEmptyRow={createEmptyRow}
      getRowId={(row) => row.id}
      templateFilename="departments-import-template.csv"
      parseFileToRows={parseFileToRows}
      getTemplateCsv={getCsvTemplate}
      onImport={onImport}
    />
  )
}
