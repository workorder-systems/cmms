import * as React from 'react'
import { Badge } from '@workspace/ui/components/badge'
import { cn } from '@workspace/ui/lib/utils'

/** Minimal catalog entry for lookup by key. */
export interface StatusCatalogEntry {
  key: string
  name?: string | null
  color?: string | null
}

export interface StatusBadgeProps {
  /** Status key (e.g. "draft", "completed"). */
  statusKey: string | null | undefined
  /** Catalog entries to resolve label and color. When omitted, key is shown as label with neutral style. */
  statusCatalog?: StatusCatalogEntry[]
  /** Optional class name. */
  className?: string
  /** When true, render as plain text (no pill). Useful for dense layouts. */
  variant?: 'badge' | 'text'
}

/**
 * Resolves label and color from catalog by key.
 */
function resolveFromCatalog(
  key: string | null | undefined,
  catalog: StatusCatalogEntry[] | undefined
): { label: string; color: string | null } {
  if (key == null || key === '') return { label: '—', color: null }
  const entry = catalog?.find((e) => e.key === key)
  const label = entry?.name ?? entry?.key ?? key
  const color = entry?.color ?? null
  return { label, color }
}

/**
 * Reusable status badge for tables, detail pages, and forms.
 * Uses catalog name and color when provided; falls back to key with neutral style.
 */
export function StatusBadge({
  statusKey,
  statusCatalog,
  className,
  variant = 'badge',
}: StatusBadgeProps) {
  const { label, color } = resolveFromCatalog(statusKey, statusCatalog)

  if (variant === 'text') {
    return <span className={cn('text-sm', className)}>{label}</span>
  }

  const style: React.CSSProperties = {}
  if (color) {
    style.borderColor = color
    style.backgroundColor = `${color}18`
    style.color = color
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        'border-2 font-semibold px-3 py-1',
        !color && 'bg-muted/50 text-muted-foreground border-border/50',
        className
      )}
      style={Object.keys(style).length > 0 ? style : undefined}
    >
      {label}
    </Badge>
  )
}
