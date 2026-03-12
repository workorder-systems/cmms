import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

export interface EntityHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Page or entity title. */
  title: React.ReactNode
  /** Optional breadcrumb or hierarchy (e.g. above the title). */
  breadcrumb?: React.ReactNode
  /** Optional meta row below title (e.g. status, priority, due date, assignee). */
  meta?: React.ReactNode
  /** Optional actions (e.g. Edit, Complete) aligned right of the title. */
  actions?: React.ReactNode
}

/**
 * Reusable header for entity detail pages (work order, asset, location, etc.).
 * Layout: breadcrumb (top) → title + actions (row) → meta (row).
 */
export function EntityHeader({
  title,
  breadcrumb,
  meta,
  actions,
  className,
  ...props
}: EntityHeaderProps) {
  return (
    <header
      data-slot="entity-header"
      className={cn("flex flex-col gap-3", className)}
      {...props}
    >
      {breadcrumb ? (
        <div data-slot="entity-header-breadcrumb" className="min-w-0">
          {breadcrumb}
        </div>
      ) : null}
      <div
        data-slot="entity-header-title-row"
        className="flex flex-wrap items-start justify-between gap-4"
      >
        <div data-slot="entity-header-title" className="min-w-0 flex-1">
          {typeof title === "string" ? (
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          ) : (
            title
          )}
        </div>
        {actions ? (
          <div
            data-slot="entity-header-actions"
            className="flex shrink-0 items-center gap-2"
          >
            {actions}
          </div>
        ) : null}
      </div>
      {meta ? (
        <div
          data-slot="entity-header-meta"
          className="flex flex-wrap items-center gap-2 text-sm"
        >
          {meta}
        </div>
      ) : null}
    </header>
  )
}
