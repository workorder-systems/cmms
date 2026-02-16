import * as React from 'react'
import { Badge } from '@workspace/ui/components/badge'
import { cn } from '@workspace/ui/lib/utils'

/** Minimal catalog entry for lookup by key. */
export interface PriorityCatalogEntry {
  key: string
  name?: string | null
  color?: string | null
}

export interface PriorityBadgeProps {
  /** Priority key (e.g. "low", "medium", "high"). */
  priorityKey: string | null | undefined
  /** Catalog entries to resolve label and color. When omitted, key is shown as label with neutral style. */
  priorityCatalog?: PriorityCatalogEntry[]
  /** Optional class name. */
  className?: string
  /** When true, render as plain text (no pill). */
  variant?: 'badge' | 'text'
}

function resolveFromCatalog(
  key: string | null | undefined,
  catalog: PriorityCatalogEntry[] | undefined
): { label: string; color: string | null } {
  if (key == null || key === '') return { label: '—', color: null }
  const entry = catalog?.find((e) => e.key === key)
  const label = entry?.name ?? entry?.key ?? key
  const color = entry?.color ?? null
  return { label, color }
}

/**
 * Reusable priority badge for tables, detail pages, and forms.
 * Uses catalog name and color when provided.
 */
export function PriorityBadge({
  priorityKey,
  priorityCatalog,
  className,
  variant = 'badge',
}: PriorityBadgeProps) {
  const { label, color } = resolveFromCatalog(priorityKey, priorityCatalog)

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
        'border font-medium',
        !color && 'bg-muted text-muted-foreground border-transparent',
        className
      )}
      style={Object.keys(style).length > 0 ? style : undefined}
    >
      {label}
    </Badge>
  )
}
