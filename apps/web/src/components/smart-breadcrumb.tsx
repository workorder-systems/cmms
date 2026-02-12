import * as React from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@workspace/ui/components/breadcrumb'
import { Home } from 'lucide-react'

/**
 * Turns a URL segment into a readable label (e.g. "work-orders" → "Work Orders").
 */
function humanizeSegment(segment: string): string {
  const withSpaces = segment.replace(/[-_]/g, ' ')
  return withSpaces
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

export interface SmartBreadcrumbProps {
  /** Override labels for specific path segments (e.g. { workorders: 'Work orders' }). */
  segmentLabels?: Record<string, string>
  /** Label for the root link when showRoot is true. */
  rootLabel?: React.ReactNode
  /** Show a root/home link as the first item. */
  showRoot?: boolean
  /** Path to use for root link when showRoot is true. Defaults to "/". */
  rootHref?: string
  /** Hide breadcrumb when path is exactly root (e.g. "/" or "/dashboard" when that is the only segment). */
  hideWhenOnlyRoot?: boolean
  /** Base path to strip from the start so breadcrumbs are relative (e.g. "/dashboard" → segments ["workorders"]). */
  basePath?: string
  className?: string
}

/**
 * Breadcrumb that derives items from the current URL path and renders readable labels.
 * Use segmentLabels to override specific segments; otherwise segments are humanized (kebab/snake → Title Case).
 */
export function SmartBreadcrumb({
  segmentLabels = {},
  rootLabel = 'Home',
  showRoot = true,
  rootHref = '/',
  hideWhenOnlyRoot = false,
  basePath = '',
  className,
}: SmartBreadcrumbProps) {
  const routerState = useRouterState()
  const pathname = routerState.location.pathname

  const segments = React.useMemo(() => {
    let path = pathname
    if (basePath && path.startsWith(basePath)) {
      path = path.slice(basePath.length) || '/'
    }
    return path.split('/').filter(Boolean)
  }, [pathname, basePath])

  const items = React.useMemo(() => {
    const result: { href: string; label: string; isLast: boolean }[] = []
    let acc = basePath || '/'
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]!
      acc = acc === '/' ? `/${segment}` : `${acc}/${segment}`
      const label = segmentLabels[segment] ?? humanizeSegment(segment)
      result.push({ href: acc, label, isLast: i === segments.length - 1 })
    }
    return result
  }, [segments, segmentLabels, basePath])

  if (hideWhenOnlyRoot && items.length === 0 && !showRoot) return null
  if (items.length === 0 && showRoot) {
    return (
      <Breadcrumb className={className}>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage className="flex items-center gap-1.5">
              {rootLabel}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    )
  }

  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        {showRoot && (
          <>
            <BreadcrumbItem className="hidden @md/main:inline-flex">
              <BreadcrumbLink asChild>
                <Link to={rootHref} className="flex items-center gap-1.5">
                  <Home className="size-4" />
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden @md/main:block" />
          </>
        )}
        {items.map((item, index) => (
          <React.Fragment key={item.href}>
            <BreadcrumbItem className={index > 0 ? 'hidden @sm/main:inline-flex' : undefined}>
              {item.isLast ? (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link to={item.href}>{item.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {!item.isLast && (
              <BreadcrumbSeparator className={index > 0 ? 'hidden @md/main:block' : 'hidden @md/main:block'} />
            )}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
