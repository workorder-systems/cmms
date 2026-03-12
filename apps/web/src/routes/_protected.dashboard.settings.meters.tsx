import * as React from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Gauge } from 'lucide-react'
import type { AssetMeterRow } from '@workorder-systems/sdk'
import { getDbClient } from '../lib/db-client'
import { useTenant } from '../contexts/tenant'
import { ensureTenantContext } from '../lib/route-loaders'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@workspace/ui/components/empty'
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from '@workspace/ui/components/item'

export const Route = createFileRoute('/_protected/dashboard/settings/meters')({
  beforeLoad: async ({ context }) => ensureTenantContext(context),
  component: SettingsMetersPage,
})

function formatReading(value: number | null | undefined, decimals: number | null | undefined): string {
  if (value == null) return '—'
  const d = typeof decimals === 'number' && decimals > 0 ? decimals : 0
  return d > 0 ? Number(value).toFixed(d) : String(Math.round(value))
}

function SettingsMetersPage() {
  const { activeTenantId } = useTenant()
  const client = getDbClient()

  const { data: meters = [], isLoading } = useQuery({
    queryKey: ['meters', activeTenantId],
    queryFn: () => client.meters.list(),
    enabled: !!activeTenantId,
  })

  const activeMeters = React.useMemo(
    () => (meters as AssetMeterRow[]).filter((m) => m.is_active !== false),
    [meters]
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Meters</h1>
        <p className="text-muted-foreground text-sm">
          All asset meters for this tenant. Add or edit meters on each asset&apos;s page.
        </p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : activeMeters.length === 0 ? (
        <Empty className="min-h-[240px] border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Gauge className="size-6" />
            </EmptyMedia>
            <EmptyTitle>No meters yet</EmptyTitle>
            <EmptyDescription>
              Meters are added per asset. Open an asset and add a meter to track runtime hours,
              cycles, or other usage.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ItemGroup className='grid grid-cols-1 grid-cols-2 gap-2'>
          {activeMeters.map((m, index) => (
            <React.Fragment key={m.id ?? index}>
              <Item size="sm" variant="outline" asChild>
                <Link to="/dashboard/assets/$id" params={{ id: m.asset_id ?? '' }} className="flex flex-col items-start">
                  <div className='flex items-center gap-2'>
                  <ItemMedia variant="icon">
                    <Gauge className="size-4" />
                  </ItemMedia>
                  <div className="flex flex-col">
                  <ItemTitle>
                      {m.name ?? '—'}

                    </ItemTitle>
                    <ItemDescription>
                      {formatReading(m.current_reading, m.decimal_places)} {m.unit ?? ''}
                    </ItemDescription>
                  </div>
                  </div>
                  <ItemContent>
                    
                   

                    {m.asset_name && (
                        <span className="font-normal text-foreground">
                          {m.asset_name}
                        </span>
                      )}
                  </ItemContent>
                </Link>
              </Item>
            </React.Fragment>
          ))}
        </ItemGroup>
      )}
    </div>
  )
}
