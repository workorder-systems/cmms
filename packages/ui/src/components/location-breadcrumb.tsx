import * as React from "react"
import { ChevronRight } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

export interface LocationBreadcrumbItem {
  id?: string
  label: string
}

export interface LocationBreadcrumbProps {
  /** Hierarchy items (e.g. Site → Building → Floor → Asset). */
  items: LocationBreadcrumbItem[]
  /** Separator between items. Default: ChevronRight icon. */
  separator?: React.ReactNode
  /** Custom render for each item. When provided, (item, isLast) => ReactNode. Use to wrap in router Link. */
  renderItem?: (
    item: LocationBreadcrumbItem,
    isLast: boolean,
    index: number
  ) => React.ReactNode
  className?: string
}

const defaultSeparator = <ChevronRight className="text-muted-foreground size-4 shrink-0" />

/**
 * Displays a hierarchy path (e.g. Site > Building > Floor > Asset).
 * Use renderItem to wrap labels in links for navigation.
 */
export function LocationBreadcrumb({
  items,
  separator = defaultSeparator,
  renderItem,
  className,
}: LocationBreadcrumbProps) {
  if (!items?.length) {
    return null
  }

  return (
    <nav
      data-slot="location-breadcrumb"
      aria-label="Location hierarchy"
      className={cn(
        "flex flex-wrap items-center gap-1 text-sm text-muted-foreground",
        className
      )}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        const content =
          renderItem != null ? (
            renderItem(item, isLast, index)
          ) : (
            <span
              className={cn(
                "truncate",
                isLast && "text-foreground font-medium"
              )}
            >
              {item.label}
            </span>
          )

        return (
          <React.Fragment key={item.id ?? index}>
            {index > 0 ? separator : null}
            <span className="inline-flex min-w-0 items-center gap-1">
              {content}
            </span>
          </React.Fragment>
        )
      })}
    </nav>
  )
}
