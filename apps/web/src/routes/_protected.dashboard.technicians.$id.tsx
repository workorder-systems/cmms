import * as React from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Users } from 'lucide-react'
import type { TechnicianRow } from '@workorder-systems/sdk'
import { getDbClient } from '../lib/db-client'
import { useTenant } from '../contexts/tenant'
import { ensureTenantContext } from '../lib/route-loaders'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Label } from '@workspace/ui/components/label'
import { DataTableErrorMessage } from '../components/data-table-error-message'
import { DataTableSkeleton } from '@workspace/ui/components/data-table/data-table-skeleton'
import { Badge } from '@workspace/ui/components/badge'

export const Route = createFileRoute('/_protected/dashboard/technicians/$id')({
  beforeLoad: async ({ context }) => ensureTenantContext(context),
  component: TechnicianDetailPage,
})

function TechnicianDetailPage() {
  const { id } = Route.useParams()
  const { activeTenantId } = useTenant()
  const client = getDbClient()

  const { data: technician, isLoading, isError, error } = useQuery({
    queryKey: ['technician', id],
    queryFn: () => client.labor.getTechnicianById(id),
    enabled: !!id,
  })

  if (isError) {
    return <DataTableErrorMessage resourceName="technician" error={error ?? null} />
  }

  if (isLoading || !technician) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <DataTableSkeleton columnCount={3} rowCount={5} />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      <div>
        <h1 className="text-2xl font-semibold">Technician Details</h1>
        <p className="text-sm text-muted-foreground">Technician information and assignments</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4" />
            Details
          </CardTitle>
          <CardDescription>Technician information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DetailRow label="Employee Number" value={technician.employee_number ?? undefined} />
          <DetailRow label="User ID" value={technician.user_id ?? undefined} />
          <DetailRow
            label="Status"
            value={
              <Badge variant={technician.is_active ? 'default' : 'secondary'}>
                {technician.is_active ? 'Active' : 'Inactive'}
              </Badge>
            }
          />
          <DetailRow
            label="Created"
            value={
              technician.created_at
                ? new Date(technician.created_at).toLocaleDateString(undefined, {
                    dateStyle: 'medium',
                  })
                : undefined
            }
          />
        </CardContent>
      </Card>
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
