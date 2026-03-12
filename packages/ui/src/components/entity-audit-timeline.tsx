"use client"

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia } from "@workspace/ui/components/empty"
import { Badge } from "@workspace/ui/components/badge"
import type { PriorityCatalogEntry } from "@workspace/ui/components/catalog-priority-badge"
import type { StatusCatalogEntry } from "@workspace/ui/components/catalog-status-badge"
import type { LucideIcon } from "lucide-react"
import {
  ClipboardList,
  FileText,
  History,
  Package,
  Paperclip,
} from "lucide-react"

/**
 * Minimal audit item shape for entity audit timeline.
 * Consumers (e.g. web app) map from API (e.g. v_audit_entity_changes) to this interface.
 * Pass old_data and new_data from the audit view to show "what changed" (old → new) per field.
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
  /** Previous record state (UPDATE/DELETE). From v_audit_entity_changes.old_data. */
  old_data?: Record<string, unknown> | null
  /** New record state (INSERT/UPDATE). From v_audit_entity_changes.new_data. */
  new_data?: Record<string, unknown> | null
}

function formatOperationLabel(operation: string): string {
  const lower = operation?.toLowerCase() ?? ""
  if (lower === "insert") return "Created"
  if (lower === "update") return "Updated"
  if (lower === "delete") return "Deleted"
  return operation || "Changed"
}

/** Icon component for a given audit table name. Used for entity type in the timeline. */
const TABLE_ICONS: Record<string, LucideIcon> = {
  work_orders: ClipboardList,
  attachments: Paperclip,
  assets: Package,
}
const DEFAULT_TABLE_ICON = FileText

function getTableIcon(tableName: string | undefined): LucideIcon | null {
  if (!tableName) return null
  const normalized = tableName.toLowerCase().trim()
  return TABLE_ICONS[normalized] ?? DEFAULT_TABLE_ICON
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

/** Turn snake_case into readable label, e.g. "assigned_to_id" → "Assigned to" */
function humanizeFieldName(field: string): string {
  return field
    .replace(/_id$/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Resolve a catalog key to its display name. */
function resolveCatalogLabel(
  key: string | null | undefined,
  catalog: { key: string; name?: string | null }[] | undefined
): string | null {
  if (key == null || key === "") return null
  const entry = catalog?.find((e) => e.key === key)
  return (entry?.name ?? entry?.key ?? key) || null
}

/** Format a raw value for display in the audit trail. */
function formatValueForDisplay(value: unknown): string {
  if (value === null || value === undefined) return "—"
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return "—"
    const asDate = new Date(trimmed)
    if (!Number.isNaN(asDate.getTime()) && trimmed.length >= 10) {
      return asDate.toLocaleDateString(undefined, { dateStyle: "short" })
    }
    return trimmed.length > 40 ? `${trimmed.slice(0, 37)}…` : trimmed
  }
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (typeof value === "number") return String(value)
  if (typeof value === "object") return JSON.stringify(value).slice(0, 40) + (JSON.stringify(value).length > 40 ? "…" : "")
  return String(value)
}

/** Format value for audit change list; uses status/priority catalogs when field and catalog are provided. */
function formatChangeValue(
  field: string,
  value: unknown,
  options: {
    statusCatalog?: StatusCatalogEntry[]
    priorityCatalog?: PriorityCatalogEntry[]
  }
): string {
  const key = value === null || value === undefined ? null : String(value).trim()
  if (field === "status") {
    const label = resolveCatalogLabel(key, options.statusCatalog)
    if (label != null) return label
  }
  if (field === "priority") {
    const label = resolveCatalogLabel(key, options.priorityCatalog)
    if (label != null) return label
  }
  return formatValueForDisplay(value)
}

export interface EntityAuditTimelineProps {
  /** Audit items, newest or oldest first depending on sort in the app. */
  items: EntityAuditItem[]
  /** Status catalog for resolving status keys to labels in change list (e.g. draft → Draft). */
  statusCatalog?: StatusCatalogEntry[]
  /** Priority catalog for resolving priority keys to labels in change list (e.g. high → High). */
  priorityCatalog?: PriorityCatalogEntry[]
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
  statusCatalog,
  priorityCatalog,
  formatDate = defaultFormatDate,
  emptyMessage = "No audit history",
  className,
}: EntityAuditTimelineProps) {
  const catalogOptions = React.useMemo(
    () => ({ statusCatalog, priorityCatalog }),
    [statusCatalog, priorityCatalog]
  )
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
        const TableIcon = getTableIcon(item.table_name)
        const variant = getOperationVariant(item.operation)
        const tableTitle = item.table_name
          ? item.table_name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
          : null

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
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between gap-x-2 gap-y-1">
                    <div className="flex items-center gap-x-2">
                    <Badge variant={variant} className="text-xs font-medium">
                      {operationLabel}
                    </Badge>
                    {item.user_display_name ? (
                      <span className="text-muted-foreground text-xs">
                        By {item.user_display_name}
                      </span>
                    ) : null}
                    
                    </div>
                    {TableIcon ? (
                      <span
                        className="text-muted-foreground inline-flex items-center"
                        title={tableTitle ?? undefined}
                        aria-label={tableTitle ?? "Entity type"}
                      >
                        <TableIcon className="size-3.5 shrink-0" aria-hidden />
                      </span>
                    ) : null}
                  </div>
                  <time
                    dateTime={date.toISOString()}
                    className="text-muted-foreground text-xs tabular-nums"
                  >
                    {dateDisplay}
                  </time>
                </div>
                {(item.changed_fields?.length ?? 0) > 0 ? (
                  <div className="text-muted-foreground mt-2 text-xs leading-relaxed space-y-1">
                    {item.changed_fields?.length ? (
                      (item.old_data != null || item.new_data != null) ? (
                        <ul className="list-none space-y-1 mt-1">
                          {item.changed_fields.map((field) => {
                            const oldVal = item.old_data?.[field]
                            const newVal = item.new_data?.[field]
                            const label = humanizeFieldName(field)
                            const oldStr = formatChangeValue(field, oldVal, catalogOptions)
                            const newStr = formatChangeValue(field, newVal, catalogOptions)
                            return (
                              <li key={field}>
                                <span className="font-medium text-foreground/90">{label}:</span>{" "}
                                <span>{oldStr}</span>
                                <span className="mx-1 text-muted-foreground/80">→</span>
                                <span>{newStr}</span>
                              </li>
                            )
                          })}
                        </ul>
                      ) : (
                        <p>
                          Changed: {item.changed_fields.map(humanizeFieldName).join(", ")}
                        </p>
                      )
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
