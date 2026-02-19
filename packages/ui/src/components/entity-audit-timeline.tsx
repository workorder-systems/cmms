"use client"

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia } from "@workspace/ui/components/empty"
import { Badge } from "@workspace/ui/components/badge"
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

function getOperationVariant(
  operation: string
): "default" | "secondary" | "destructive" | "outline" {
  const lower = operation?.toLowerCase() ?? ""
  if (lower === "insert") return "default"
  if (lower === "update") return "secondary"
  if (lower === "delete") return "destructive"
  return "outline"
}

export interface EntityAuditTimelineProps {
  /** Audit items, newest or oldest first depending on sort in the app. */
  items: EntityAuditItem[]
  /** Custom date formatter. Default: medium date + short time. */
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
      className={cn("relative w-full max-w-xl", className)}
      role="list"
      aria-label="Audit history"
    >
      {/* Vertical line: fixed-width track so it centers with dots */}
      <div
        className="absolute left-0 top-0 bottom-0 w-3 flex justify-center"
        aria-hidden
      >
        <div className="h-full w-px min-h-0 bg-border/60" role="presentation" />
      </div>
      {items.map((item, index) => {
        const date = new Date(item.created_at)
        const dateDisplay = formatDate(date)
        const operationLabel = formatOperationLabel(item.operation)
        const tableLabel = formatTableLabel(item.table_name)
        const variant = getOperationVariant(item.operation)

        return (
          <div
            key={item.id ?? index}
            role="listitem"
            className="flex gap-4 pb-6 last:pb-0"
          >
            {/* Dot column: same width as line track, dot centered */}
            <div className="relative w-3 shrink-0 flex justify-center pt-2.5">
              <div
                className={cn(
                  "size-2.5 rounded-full border-2 border-background shadow-sm",
                  variant === "destructive" && "bg-destructive",
                  variant === "secondary" && "bg-muted-foreground",
                  variant !== "destructive" && variant !== "secondary" && "bg-primary"
                )}
              />
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="rounded-lg border border-border/80 bg-card px-4 py-3 shadow-sm transition-colors hover:border-border">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <time
                    dateTime={date.toISOString()}
                    className="text-muted-foreground text-xs tabular-nums"
                  >
                    {dateDisplay}
                  </time>
                  <Badge variant={variant} className="text-xs font-medium">
                    {operationLabel}
                  </Badge>
                  {tableLabel ? (
                    <span className="text-muted-foreground text-xs">
                      {tableLabel}
                    </span>
                  ) : null}
                </div>
                {(item.user_display_name || (item.changed_fields?.length ?? 0) > 0) ? (
                  <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
                    {item.user_display_name ? (
                      <span>By {item.user_display_name}</span>
                    ) : null}
                    {item.user_display_name && item.changed_fields?.length ? " · " : null}
                    {item.changed_fields?.length ? (
                      <span>
                        Fields: {item.changed_fields.join(", ")}
                      </span>
                    ) : null}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
