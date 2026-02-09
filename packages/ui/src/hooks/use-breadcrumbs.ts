import * as React from "react"

export interface BreadcrumbItem {
  label: string
  href: string
  isActive?: boolean
}

export interface UseBreadcrumbsOptions {
  /**
   * The pathname to generate breadcrumbs from (e.g., "/assets/workorder/cmms")
   */
  pathname: string
  /**
   * Custom label mapping for path segments
   * @example { "assets": "Assets", "workorder": "Work Orders" }
   */
  labelMap?: Record<string, string>
  /**
   * Whether to include the home/root breadcrumb
   * @default true
   */
  includeHome?: boolean
  /**
   * Custom home label
   * @default "Home"
   */
  homeLabel?: string
  /**
   * Custom home href
   * @default "/"
   */
  homeHref?: string
  /**
   * Function to transform a path segment into a label
   * @default (segment) => segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ")
   */
  formatLabel?: (segment: string) => string
}

/**
 * Hook to generate breadcrumbs from a URL pathname
 */
export function useBreadcrumbs({
  pathname,
  labelMap = {},
  includeHome = true,
  homeLabel = "Home",
  homeHref = "/",
  formatLabel = (segment) => {
    // Capitalize first letter and replace hyphens with spaces
    return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ")
  },
}: UseBreadcrumbsOptions): BreadcrumbItem[] {
  return React.useMemo(() => {
    const items: BreadcrumbItem[] = []

    // Add home breadcrumb if enabled
    if (includeHome) {
      items.push({
        label: homeLabel,
        href: homeHref,
        isActive: pathname === homeHref,
      })
    }

    // Split pathname into segments and filter out empty strings
    const segments = pathname
      .split("/")
      .filter(Boolean)
      .filter((segment) => segment !== homeHref.replace("/", ""))

    // Build breadcrumbs from segments
    let currentPath = ""
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`
      const isLast = index === segments.length - 1

      items.push({
        label: labelMap[segment] ?? formatLabel(segment),
        href: currentPath,
        isActive: isLast,
      })
    })

    return items
  }, [pathname, labelMap, includeHome, homeLabel, homeHref, formatLabel])
}
