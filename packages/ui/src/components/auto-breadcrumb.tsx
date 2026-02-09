"use client"

import * as React from "react"
import { Home } from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./breadcrumb"
import { useBreadcrumbs, type UseBreadcrumbsOptions } from "../hooks/use-breadcrumbs"
import { cn } from "../lib/utils"

export interface AutoBreadcrumbProps
  extends Omit<UseBreadcrumbsOptions, "pathname">,
    Omit<React.ComponentProps<typeof Breadcrumb>, "children"> {
  /**
   * The pathname to generate breadcrumbs from
   * Required - must be provided by the consuming application
   */
  pathname: string
  /**
   * Custom link component (for use with routing libraries)
   * @default <a>
   */
  linkComponent?: React.ComponentType<React.PropsWithChildren<{ href: string; className?: string }>>
  /**
   * Maximum number of breadcrumb items to show before collapsing
   * @default undefined (show all)
   */
  maxItems?: number
}

/**
 * AutoBreadcrumb - Automatically generates breadcrumbs from a URL pathname
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <AutoBreadcrumb pathname="/assets/workorder/cmms" />
 * 
 * // With custom labels
 * <AutoBreadcrumb 
 *   pathname="/assets/workorder/cmms"
 *   labelMap={{ "assets": "Assets", "workorder": "Work Orders" }}
 * />
 * 
 * // With custom link component (e.g., Next.js Link)
 * <AutoBreadcrumb 
 *   pathname={pathname}
 *   linkComponent={Link}
 * />
 * ```
 */
export function AutoBreadcrumb({
  pathname,
  labelMap,
  includeHome,
  homeLabel,
  homeHref,
  formatLabel,
  linkComponent,
  maxItems,
  className,
  ...props
}: AutoBreadcrumbProps) {
  const breadcrumbs = useBreadcrumbs({
    pathname,
    labelMap,
    includeHome,
    homeLabel,
    homeHref,
    formatLabel,
  })

  // Handle maxItems by showing first, ellipsis, and last items
  const displayBreadcrumbs = React.useMemo(() => {
    if (!maxItems || breadcrumbs.length <= maxItems) {
      return breadcrumbs
    }

    const first = breadcrumbs.slice(0, 1)
    const last = breadcrumbs.slice(-(maxItems - 2))
    return [...first, ...last]
  }, [breadcrumbs, maxItems])

  if (breadcrumbs.length === 0) {
    return null
  }

  return (
    <Breadcrumb className={cn(className)} {...props}>
      <BreadcrumbList>
        {displayBreadcrumbs.map((item: { label: string; href: string; isActive?: boolean }, index: number) => {
          const isLast = index === displayBreadcrumbs.length - 1
          const isEllipsis = maxItems && breadcrumbs.length > maxItems && index === 1
          const isHome = item.href === (homeHref || "/") && includeHome !== false

          return (
            <React.Fragment key={`${item.href}-${index}`}>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                ) : isEllipsis ? (
                  <span className="text-muted-foreground">...</span>
                ) : isHome ? (
                  linkComponent ? (
                    <BreadcrumbLink asChild>
                      {React.createElement(
                        linkComponent,
                        { href: item.href, className: "hover:text-foreground" },
                        <Home className="h-4 w-4" />,
                        <span className="sr-only">{item.label}</span>
                      )}
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbLink href={item.href} className="hover:text-foreground">
                      <Home className="h-4 w-4" />
                      <span className="sr-only">{item.label}</span>
                    </BreadcrumbLink>
                  )
                ) : linkComponent ? (
                  <BreadcrumbLink asChild>
                    {React.createElement(
                      linkComponent,
                      { href: item.href, className: "hover:text-foreground" },
                      item.label
                    )}
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbLink href={item.href} className="hover:text-foreground">
                    {item.label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </React.Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
