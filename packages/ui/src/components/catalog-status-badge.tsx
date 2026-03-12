import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import { Badge } from "@workspace/ui/components/badge"

/** Minimal catalog entry for lookup by key. */
export interface StatusCatalogEntry {
  key: string
  name?: string | null
  color?: string | null
}

export interface CatalogStatusBadgeProps {
  /** Status key (e.g. "draft", "completed"). */
  statusKey: string | null | undefined
  /** Catalog entries to resolve label and color. When omitted, key is shown as label with neutral style. */
  statusCatalog?: StatusCatalogEntry[]
  /** Optional class name. */
  className?: string
  /** When true, render as plain text (no pill). Useful for dense layouts. */
  variant?: "badge" | "text"
}

function resolveFromCatalog(
  key: string | null | undefined,
  catalog: StatusCatalogEntry[] | undefined
): { label: string; color: string | null } {
  if (key == null || key === "") return { label: "—", color: null }
  const entry = catalog?.find((e) => e.key === key)
  const label = entry?.name ?? entry?.key ?? key
  const color = entry?.color ?? null
  return { label, color }
}

/**
 * Reusable status badge for CMMS: work orders, assets, etc.
 * Uses catalog name and color when provided; falls back to key with neutral style.
 */
export function CatalogStatusBadge({
  statusKey,
  statusCatalog,
  className,
  variant = "badge",
}: CatalogStatusBadgeProps) {
  const { label, color } = resolveFromCatalog(statusKey, statusCatalog)

  if (variant === "text") {
    return (
      <span
        data-slot="catalog-status-badge-text"
        className={cn("text-sm", className)}
      >
        {label}
      </span>
    )
  }

  const style: React.CSSProperties = {}
  if (color) {
    style.borderColor = color
    style.backgroundColor = `${color}18`
    style.color = color
  }

  return (
    <Badge
      data-slot="catalog-status-badge"
      variant="outline"
      className={cn(
        "border font-medium",
        !color && "bg-muted text-muted-foreground border-transparent",
        className
      )}
      style={Object.keys(style).length > 0 ? style : undefined}
    >
      {label}
    </Badge>
  )
}
