"use client"

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import {
  Timeline,
  TimelineItem,
  TimelineItemDate,
  TimelineItemDescription,
  TimelineItemTitle,
} from "@workspace/ui/components/timeline"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia } from "@workspace/ui/components/empty"
import { History } from "lucide-react"

/**
 * Minimal audit item shape for entity audit timeline.
 * Consumers (e.g. web app) map from API (e.g. v_audit_entity_changes) to this interface.
 */
export interface EntityAuditItem {
  id?: string | number
  operation: string
  created_at: string
  table_name?: string
  record_id?: string
  user_id?: string
  user_display_name?: string
  changed_fields?: string[]
}

function formatOperationLabel(operation: string): string {
  const lower = operation?.toLowerCase() ?? ""
  if (lower === "insert") return "Created"
  if (lower === "update") return "Updated"
  if (lower === "delete") return "Deleted"
  return operation || "Changed"
}

function formatTableLabel(tableName: string | undefined): string {
  if (!tableName) return ""
  return tableName.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export interface EntityAuditTimelineProps {
  /** Audit items, newest or oldest first depending on sort in the app. */
  items: EntityAuditItem[]
  /** Custom date formatter. Default: toLocaleDateString with dateStyle + timeStyle short. */
  formatDate?: (date: Date) => string
  /** Message when items is empty. */
  emptyMessage?: React.ReactNode
  className?: string
}

const defaultFormatDate = (date: Date): string => {
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

export function EntityAuditTimeline({
  items,
  formatDate = defaultFormatDate,
  emptyMessage = "No audit history",
  className,
}: EntityAuditTimelineProps) {
  if (!items || items.length === 0) {
    return (
      <div
        data-slot="entity-audit-timeline-empty"
        className={cn("flex flex-col", className)}
      >
        <Empty>
          <EmptyMedia variant="icon">
            <History className="size-6" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyDescription>{emptyMessage}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    )
  }

  return (
    <div
      data-slot="entity-audit-timeline"
      className={cn("w-full max-w-xl", className)}
    >
      <Timeline orientation="vertical" alternating={false} alignment="top/left">
        {items.map((item, index) => {
          const date = new Date(item.created_at)
          const dateDisplay = formatDate(date)
          const operationLabel = formatOperationLabel(item.operation)
          const tableLabel = formatTableLabel(item.table_name)
          const title =
            tableLabel ? `${operationLabel} (${tableLabel})` : operationLabel
          const parts: string[] = []
          if (item.user_display_name) parts.push(`By ${item.user_display_name}`)
          if (item.changed_fields?.length) {
            parts.push(`Fields: ${item.changed_fields.join(", ")}`)
          }
          const description = parts.join(" · ")

          return (
            <TimelineItem key={item.id ?? index}>
              <TimelineItemDate>{dateDisplay}</TimelineItemDate>
              <TimelineItemTitle>{title}</TimelineItemTitle>
              {description ? (
                <TimelineItemDescription>{description}</TimelineItemDescription>
              ) : null}
            </TimelineItem>
          )
        })}
      </Timeline>
    </div>
  )
}
