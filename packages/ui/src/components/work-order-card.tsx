"use client"

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
  ItemActions,
  ItemFooter,
} from "@workspace/ui/components/item"
import { CatalogStatusBadge, type StatusCatalogEntry } from "@workspace/ui/components/catalog-status-badge"
import { CatalogPriorityBadge, type PriorityCatalogEntry } from "@workspace/ui/components/catalog-priority-badge"
import { DueDateIndicator } from "@workspace/ui/components/due-date-indicator"
import { AssigneeChip } from "@workspace/ui/components/assignee-chip"
import { ChecklistProgress } from "@workspace/ui/components/checklist-progress"

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
  /** Checklist progress (e.g. tasks). When total > 0, shows "X of Y" with optional bar. */
  checklistCompleted?: number
  checklistTotal?: number
  checklistLabel?: string
  checklistShowBar?: boolean
  href?: string
  onClick?: () => void
  actions?: React.ReactNode
  className?: string
}

/**
 * Compact work order row built with Item: title, status, priority, due date, assignee, optional asset/location, optional checklist.
 * Use in work order lists, "My work" views, dashboard widgets, or search results.
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
  checklistCompleted,
  checklistTotal,
  checklistLabel,
  checklistShowBar = false,
  href,
  onClick,
  actions,
  className,
}: WorkOrderCardProps) {
  const secondaryLabel = assetLabel ?? locationLabel ?? null
  const showChecklist =
    checklistTotal != null &&
    checklistTotal > 0 &&
    checklistCompleted != null &&
    checklistCompleted >= 0

  const meta = (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {statusKey !== undefined ? (
        <CatalogStatusBadge statusKey={statusKey} statusCatalog={statusCatalog} />
      ) : null}
      {priorityKey !== undefined ? (
        <CatalogPriorityBadge priorityKey={priorityKey} priorityCatalog={priorityCatalog} />
      ) : null}
      {dueDate != null ? <DueDateIndicator dueDate={dueDate} /> : null}
      <AssigneeChip
        displayName={assigneeDisplayName}
        avatarUrl={assigneeAvatarUrl}
        size="sm"
      />
    </div>
  )

  const inner = (
    <>
      <ItemContent className="min-w-0 flex-1">
        <ItemTitle>{title}</ItemTitle>
        <div className="mt-1.5 flex flex-col gap-1">
          {meta}
          {secondaryLabel ? (
            <ItemDescription className="mt-0.5 text-xs">
              {secondaryLabel}
            </ItemDescription>
          ) : null}
        </div>
      </ItemContent>
      {actions ? (
        <ItemActions onClick={(e) => e.stopPropagation()}>
          {actions}
        </ItemActions>
      ) : null}
      {showChecklist ? (
        <ItemFooter>
          <ChecklistProgress
            completed={checklistCompleted ?? 0}
            total={checklistTotal ?? 0}
            label={checklistLabel}
            showBar={checklistShowBar}
          />
        </ItemFooter>
      ) : null}
    </>
  )

  return (
    <Item
      data-slot="work-order-card"
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
        <a href={href} className="flex min-w-0 flex-1 items-center gap-4 text-inherit no-underline outline-none">
          {inner}
        </a>
      ) : (
        inner
      )}
    </Item>
  )
}
