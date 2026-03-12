import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, Building2, Wrench } from 'lucide-react'
import { getDbClient } from '../lib/db-client'
import { useTenant } from '../contexts/tenant'
import { DataTableErrorMessage } from '../components/data-table-error-message'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'

export const Route = createFileRoute('/_protected/dashboard/locations/portfolio')({
  component: LocationsPortfolioPage,
})

function LocationsPortfolioPage() {
  const { activeTenantId } = useTenant()
  const client = getDbClient()

  const { data: sites = [], isLoading, isError, error } = useQuery({
    queryKey: ['siteRollup', activeTenantId],
    queryFn: () => client.dashboard.listSiteRollup(),
    enabled: !!activeTenantId,
  })

  if (isError) {
    return (
      <DataTableErrorMessage
        resourceName="portfolio"
        error={error ?? null}
      />
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="grid gap-4 @md:grid-cols-2 @lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-5 w-32 rounded bg-muted" />
                <div className="h-4 w-24 rounded bg-muted" />
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="h-4 w-full rounded bg-muted" />
                <div className="h-4 w-3/4 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Portfolio</h1>
        <p className="text-muted-foreground text-sm">
          Per-site counts for buildings, floors, rooms, assets, and work orders. Use for multi-site benchmarking.
        </p>
      </div>

      {sites.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="text-muted-foreground mb-4 size-12" />
            <p className="text-muted-foreground text-center text-sm">
              No sites yet. Add locations with type &quot;site&quot; in Hierarchy to see per-site rollups here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 @md:grid-cols-2 @lg:grid-cols-3">
          {sites.map((site) => (
            <Card key={site.site_id ?? ''}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="size-4" />
                  {site.site_name ?? 'Unnamed site'}
                </CardTitle>
                <CardDescription>
                  {site.site_code ? `Code: ${site.site_code}` : 'No code'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-muted-foreground">Buildings</div>
                  <div className="font-medium tabular-nums">{site.building_count ?? 0}</div>
                  <div className="text-muted-foreground">Floors</div>
                  <div className="font-medium tabular-nums">{site.floor_count ?? 0}</div>
                  <div className="text-muted-foreground">Rooms</div>
                  <div className="font-medium tabular-nums">{site.room_count ?? 0}</div>
                  <div className="text-muted-foreground">Zones</div>
                  <div className="font-medium tabular-nums">{site.zone_count ?? 0}</div>
                </div>
                <div className="border-t pt-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Wrench className="size-4" />
                    Assets / WOs
                  </div>
                  <div className="mt-1 grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">Assets</div>
                    <div className="tabular-nums">{site.asset_count ?? 0} ({site.active_asset_count ?? 0} active)</div>
                    <div className="text-muted-foreground">Work orders</div>
                    <div className="tabular-nums">{site.work_order_count ?? 0} ({site.active_work_order_count ?? 0} active)</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
