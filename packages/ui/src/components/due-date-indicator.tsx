import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@workspace/ui/lib/utils"

const dueDateIndicatorVariants = cva(
  "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium w-fit",
  {
    variants: {
      variant: {
        overdue: "bg-destructive/10 text-destructive border border-destructive/20",
        "due-soon":
          "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20",
        "on-time": "text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "on-time",
    },
  }
)

function getVariant(
  dueDate: Date,
  dueSoonDays: number
): "overdue" | "due-soon" | "on-time" {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dueStart = new Date(
    dueDate.getFullYear(),
    dueDate.getMonth(),
    dueDate.getDate()
  )
  if (dueStart < todayStart) return "overdue"
  if (dueStart.getTime() === todayStart.getTime()) return "due-soon"
  const soonEnd = new Date(todayStart)
  soonEnd.setDate(soonEnd.getDate() + dueSoonDays)
  if (dueStart <= soonEnd) return "due-soon"
  return "on-time"
}

export interface DueDateIndicatorProps
  extends VariantProps<typeof dueDateIndicatorVariants> {
  /** Due date; when null/undefined, shows "—" with muted style. */
  dueDate: string | Date | null | undefined
  /** Custom date formatter. Default: toLocaleDateString with dateStyle "medium". */
  format?: (date: Date) => string
  /** Number of days ahead to consider "due soon". Default 3. */
  dueSoonDays?: number
  /** Optional label prefix (e.g. "Due"). */
  label?: string
  className?: string
}

const defaultFormat = (date: Date): string =>
  date.toLocaleDateString(undefined, { dateStyle: "medium" })

export function DueDateIndicator({
  dueDate,
  format = defaultFormat,
  dueSoonDays = 3,
  label,
  className,
  variant: variantOverride,
}: DueDateIndicatorProps) {
  const parsed =
    dueDate == null ? null : typeof dueDate === "string" ? new Date(dueDate) : dueDate
  const isValid = parsed != null && !Number.isNaN(parsed.getTime())

  if (!isValid || parsed == null) {
    return (
      <span
        data-slot="due-date-indicator"
        className={cn("text-muted-foreground text-xs", className)}
      >
        {label ? `${label} —` : "—"}
      </span>
    )
  }

  const variant = variantOverride ?? getVariant(parsed, dueSoonDays)
  const formatted = format(parsed)
  const text = label ? `${label} ${formatted}` : formatted

  return (
    <span
      data-slot="due-date-indicator"
      data-variant={variant}
      className={cn(dueDateIndicatorVariants({ variant }), className)}
    >
      {text}
    </span>
  )
}
