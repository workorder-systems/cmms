"use client"

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import { Card, CardContent } from "@workspace/ui/components/card"
import { CatalogStatusBadge, type StatusCatalogEntry } from "@workspace/ui/components/catalog-status-badge"

export interface AssetCardProps {
  name: string
  assetNumber?: string | null
  statusKey?: string | null
  statusCatalog?: StatusCatalogEntry[]
  locationLabel?: string | null
  locationBreadcrumb?: React.ReactNode
  meterSummary?: string | null
  href?: string
  onClick?: () => void
  actions?: React.ReactNode
  className?: string
}

/**
 * Compact card for an asset: name, status, optional location, optional meter summary.
 * Use in asset grid view or dashboard.
 */
export function AssetCard({
  name,
  assetNumber,
  statusKey,
  statusCatalog,
  locationLabel,
  locationBreadcrumb,
  meterSummary,
  href,
  onClick,
  actions,
  className,
}: AssetCardProps) {
  const content = (
    <Card
      data-slot="asset-card"
      className={cn(
        "py-4 transition-colors",
        (href ?? onClick) && "cursor-pointer hover:bg-accent/50",
        className
      )}
      onClick={!href ? onClick : undefined}
    >
      <CardContent className="flex flex-col gap-3 px-4 py-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="font-medium">{name}</div>
            {assetNumber ? (
              <div className="text-muted-foreground text-xs">{assetNumber}</div>
            ) : null}
          </div>
          {actions ? (
            <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
              {actions}
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {statusKey !== undefined ? (
            <CatalogStatusBadge statusKey={statusKey} statusCatalog={statusCatalog} />
          ) : null}
        </div>
        {locationBreadcrumb ?? locationLabel ? (
          <div className="text-muted-foreground text-xs">
            {locationBreadcrumb ?? locationLabel}
          </div>
        ) : null}
        {meterSummary ? (
          <p className="text-muted-foreground text-xs">{meterSummary}</p>
        ) : null}
      </CardContent>
    </Card>
  )

  if (href) {
    return (
      <a href={href} className="block text-inherit no-underline">
        {content}
      </a>
    )
  }

  return content
}
