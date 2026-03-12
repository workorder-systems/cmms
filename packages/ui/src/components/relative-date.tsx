"use client"

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"

function getRelativeString(date: Date, now: Date, includeTime: boolean): string {
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const nowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diffMs = date.getTime() - now.getTime()
  const diffDays = Math.round((dateStart.getTime() - nowStart.getTime()) / (24 * 60 * 60 * 1000))

  if (diffDays === 0) {
    if (includeTime) {
      return date.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })
    }
    return "today"
  }

  if (diffDays === -1) return "yesterday"
  if (diffDays === 1) return "tomorrow"

  const absDays = Math.abs(diffDays)
  if (absDays < 7) {
    return diffDays < 0 ? `${absDays} days ago` : `in ${absDays} days`
  }
  if (absDays < 30) {
    const weeks = Math.floor(absDays / 7)
    return diffDays < 0 ? `${weeks} week${weeks === 1 ? "" : "s"} ago` : `in ${weeks} week${weeks === 1 ? "" : "s"}`
  }
  if (absDays < 365) {
    const months = Math.floor(absDays / 30)
    return diffDays < 0 ? `${months} month${months === 1 ? "" : "s"} ago` : `in ${months} month${months === 1 ? "" : "s"}`
  }

  const years = Math.floor(absDays / 365)
  return diffDays < 0 ? `${years} year${years === 1 ? "" : "s"} ago` : `in ${years} year${years === 1 ? "" : "s"}`
}

export interface RelativeDateProps {
  date: string | Date
  options?: { includeTime?: boolean; tooltip?: boolean }
  className?: string
}

/**
 * Displays a relative date ("2 days ago", "in 3 days", "today") with optional tooltip for exact date/time.
 */
export function RelativeDate({
  date,
  options = {},
  className,
}: RelativeDateProps) {
  const { includeTime = false, tooltip = true } = options
  const d = typeof date === "string" ? new Date(date) : date
  const now = new Date()

  if (Number.isNaN(d.getTime())) {
    return <span className={cn("text-muted-foreground", className)}>—</span>
  }

  const relative = getRelativeString(d, now, includeTime)
  const exact = d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: includeTime ? "short" : undefined,
  })

  const content = (
    <time
      dateTime={d.toISOString()}
      data-slot="relative-date"
      className={cn("text-sm", className)}
    >
      {relative}
    </time>
  )

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent>{exact}</TooltipContent>
      </Tooltip>
    )
  }

  return content
}
