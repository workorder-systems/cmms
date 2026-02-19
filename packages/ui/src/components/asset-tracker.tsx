"use client"

import * as React from "react"
import { cn } from "@workspace/ui/lib/utils"
import { MapPin, Clock } from "lucide-react"

export interface AssetTrackerEntry {
  label: string
  value: string
}

export interface AssetTrackerProps {
  /** Current or last known location (e.g. "Building A · Floor 2"). */
  location?: string | null
  /** Last seen / last updated (e.g. "2 min ago", "Today 10:30"). */
  lastSeen?: string | null
  /** Optional 1–3 key-value rows for the AI to pass (e.g. runtime, sensor status). */
  entries?: AssetTrackerEntry[]
  className?: string
}

/**
 * Lightweight tracker for asset location/status. Designed for AI-driven UIs:
 * minimal props, no heavy data. Use as child of AssetCard in chat or lists.
 */
export function AssetTracker({
  location,
  lastSeen,
  entries = [],
  className,
}: AssetTrackerProps) {
  const hasLocation = location != null && location !== ""
  const hasLastSeen = lastSeen != null && lastSeen !== ""
  const hasEntries = entries.length > 0
  if (!hasLocation && !hasLastSeen && !hasEntries) return null

  return (
    <div
      data-slot="asset-tracker"
      className={cn(
        "text-muted-foreground mt-2 flex flex-col gap-1 border-t border-border/60 pt-2 text-xs",
        className
      )}
    >
      {hasLocation && (
        <div className="flex items-center gap-1.5">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          <span>{location}</span>
        </div>
      )}
      {hasLastSeen && (
        <div className="flex items-center gap-1.5">
          <Clock className="size-3.5 shrink-0" aria-hidden />
          <span>{lastSeen}</span>
        </div>
      )}
      {hasEntries && (
        <ul className="mt-0.5 space-y-0.5">
          {entries.slice(0, 5).map((e, i) => (
            <li key={i} className="flex justify-between gap-2">
              <span>{e.label}</span>
              <span className="text-foreground font-medium tabular-nums">{e.value}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
