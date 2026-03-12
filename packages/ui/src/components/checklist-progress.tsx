import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import { Progress } from "@workspace/ui/components/progress"

export interface ChecklistProgressProps {
  /** Number of completed items. */
  completed: number
  /** Total number of items. */
  total: number
  /** Optional label (e.g. "Tasks"). Shown as "3 of 5 tasks" or "3/5 tasks". */
  label?: string
  /** When true, show a progress bar below the text. */
  showBar?: boolean
  className?: string
}

/**
 * Displays completion count (e.g. "3 of 5 tasks") with optional progress bar.
 * Useful for work order checklists or PM steps.
 */
export function ChecklistProgress({
  completed,
  total,
  label,
  showBar = false,
  className,
}: ChecklistProgressProps) {
  const safeTotal = Math.max(0, total)
  const safeCompleted = Math.max(0, Math.min(completed, safeTotal))
  const percentage = safeTotal === 0 ? 0 : Math.round((safeCompleted / safeTotal) * 100)

  const textPart =
    label != null && label !== ""
      ? `${safeCompleted} of ${safeTotal} ${label}`
      : `${safeCompleted}/${safeTotal}`

  if (safeTotal === 0) {
    return (
      <div
        data-slot="checklist-progress"
        className={cn("text-muted-foreground text-sm", className)}
      >
        {label ? `0 ${label}` : "0/0"}
      </div>
    )
  }

  return (
    <div
      data-slot="checklist-progress"
      className={cn("flex flex-col gap-1.5", className)}
    >
      <span className="text-sm font-medium tabular-nums">{textPart}</span>
      {showBar ? (
        <Progress value={percentage} className="h-1.5 w-24" />
      ) : null}
    </div>
  )
}
