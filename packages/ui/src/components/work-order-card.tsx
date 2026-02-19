"use client"

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import { Card, CardContent } from "@workspace/ui/components/card"
import { CatalogStatusBadge, type StatusCatalogEntry } from "@workspace/ui/components/catalog-status-badge"
import { CatalogPriorityBadge, type PriorityCatalogEntry } from "@workspace/ui/components/catalog-priority-badge"
import { DueDateIndicator } from "@workspace/ui/components/due-date-indicator"
import { AssigneeChip } from "@workspace/ui/components/assignee-chip"

export interface WorkOrderCardProps {
  title: string
  statusKey?: string | null
  statusCatalog?: StatusCatalogEntry[]
  priorityKey?: string | null
  priorityCatalog?: PriorityCatalogEntry[]
  dueDate?: string | Date | null
  assigneeDisplayName?: string | null
  assigneeAvatarUrl?: string | null
  assetLabel?: string | null
  locationLabel?: string | null
  href?: string
  onClick?: () => void
  actions?: React.ReactNode
  className?: string
}

/**
 * Compact card for a work order: title, status, priority, due date, assignee, optional asset/location.
 * Use in card grids, "My work" views, dashboard widgets, or search results.
 */
export function WorkOrderCard({
  title,
  statusKey,
  statusCatalog,
  priorityKey,
  priorityCatalog,
  dueDate,
  assigneeDisplayName,
  assigneeAvatarUrl,
  assetLabel,
  locationLabel,
  href,
  onClick,
  actions,
  className,
}: WorkOrderCardProps) {
  const secondaryLabel = assetLabel ?? locationLabel ?? null

  const content = (
    <Card
      data-slot="work-order-card"
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
            <span className="font-medium">{title}</span>
          </div>
          {actions ? (
            <div
              className="shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              {actions}
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {statusKey !== undefined ? (
            <CatalogStatusBadge statusKey={statusKey} statusCatalog={statusCatalog} />
          ) : null}
          {priorityKey !== undefined ? (
            <CatalogPriorityBadge priorityKey={priorityKey} priorityCatalog={priorityCatalog} />
          ) : null}
          {dueDate != null ? (
            <DueDateIndicator dueDate={dueDate} />
          ) : null}
          <AssigneeChip
            displayName={assigneeDisplayName}
            avatarUrl={assigneeAvatarUrl}
            size="sm"
          />
        </div>
        {secondaryLabel ? (
          <p className="text-muted-foreground text-xs">{secondaryLabel}</p>
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
