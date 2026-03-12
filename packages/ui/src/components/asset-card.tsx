"use client"

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
  ItemActions,
} from "@workspace/ui/components/item"
import { CatalogStatusBadge, type StatusCatalogEntry } from "@workspace/ui/components/catalog-status-badge"

export interface AssetCardProps {
  name: string
  assetNumber?: string | null
  statusKey?: string | null
  statusCatalog?: StatusCatalogEntry[]
  locationLabel?: string | null
  locationBreadcrumb?: React.ReactNode
  meterSummary?: string | null
  /** Optional asset image URL (e.g. thumbnail or product photo). */
  imageUrl?: string | null
  /** Optional custom image node instead of imageUrl (e.g. custom element or placeholder). */
  image?: React.ReactNode
  href?: string
  onClick?: () => void
  actions?: React.ReactNode
  /** Optional slot for e.g. AssetTracker (location, last seen, key-value rows). */
  children?: React.ReactNode
  className?: string
}

/**
 * Compact card for an asset built with Item: name, optional image, status, location, meter summary.
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
  imageUrl,
  image,
  href,
  onClick,
  actions,
  children,
  className,
}: AssetCardProps) {
  const hasImage = !!(image ?? imageUrl)
  const loc = locationBreadcrumb ?? locationLabel
  const description =
    loc && meterSummary ? (
      <>
        {loc} · {meterSummary}
      </>
    ) : loc ?? (meterSummary ?? null)

  const content = (
    <Item
      data-slot="asset-card"
      variant="outline"
      size="default"
      asChild={!!href}
      className={cn(
        "w-full transition-colors",
        (href ?? onClick) && "cursor-pointer hover:bg-accent/50",
        className
      )}
      onClick={!href ? onClick : undefined}
    >
      {href ? (
        <a href={href} className="flex items-center gap-4 text-inherit no-underline outline-none">
          {hasImage ? (
            <ItemMedia variant="image">
              {image ?? (
                <img
                  src={imageUrl!}
                  alt={name}
                  className="size-full object-cover rounded-sm"
                />
              )}
            </ItemMedia>
          ) : null}
          <ItemContent className="min-w-0 flex-1">
            <ItemTitle>{name}</ItemTitle>
            {(assetNumber != null || statusKey !== undefined) ? (
              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                {assetNumber ? (
                  <span className="text-muted-foreground text-xs">{assetNumber}</span>
                ) : null}
                {statusKey !== undefined ? (
                  <CatalogStatusBadge statusKey={statusKey} statusCatalog={statusCatalog} />
                ) : null}
              </div>
            ) : null}
            {description ? (
              <ItemDescription className="mt-1">{description}</ItemDescription>
            ) : null}
            {children ? <div className="mt-1 w-full">{children}</div> : null}
          </ItemContent>
          {actions ? (
            <ItemActions onClick={(e) => e.stopPropagation()}>
              {actions}
            </ItemActions>
          ) : null}
        </a>
      ) : (
        <>
          {hasImage ? (
            <ItemMedia variant="image">
              {image ?? (
                <img
                  src={imageUrl!}
                  alt={name}
                  className="size-full object-cover rounded-sm"
                />
              )}
            </ItemMedia>
          ) : null}
          <ItemContent className="min-w-0 flex-1">
            <ItemTitle>{name}</ItemTitle>
            {(assetNumber != null || statusKey !== undefined) ? (
              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                {assetNumber ? (
                  <span className="text-muted-foreground text-xs">{assetNumber}</span>
                ) : null}
                {statusKey !== undefined ? (
                  <CatalogStatusBadge statusKey={statusKey} statusCatalog={statusCatalog} />
                ) : null}
              </div>
            ) : null}
            {description ? (
              <ItemDescription className="mt-1">{description}</ItemDescription>
            ) : null}
            {children ? <div className="mt-1 w-full">{children}</div> : null}
          </ItemContent>
          {actions ? (
            <ItemActions onClick={(e) => e.stopPropagation()}>
              {actions}
            </ItemActions>
          ) : null}
        </>
      )}
    </Item>
  )

  return content
}
