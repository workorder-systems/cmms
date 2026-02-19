"use client"

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@workspace/ui/components/hover-card"

export interface TrackerBlockProps {
  key?: string | number
  color?: string
  tooltip?: string
  hoverEffect?: boolean
  defaultBackgroundColor?: string
}

const Block = ({
  color,
  tooltip,
  defaultBackgroundColor,
  hoverEffect,
}: TrackerBlockProps) => {
  const [open, setOpen] = React.useState(false)
  return (
    <HoverCard open={open} onOpenChange={setOpen} openDelay={0} closeDelay={0}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="min-h-full min-w-[2px] flex-1 basis-0 overflow-hidden px-[0.5px] transition first:rounded-l-[4px] first:pl-0 last:rounded-r-[4px] last:pr-0 sm:px-px focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <div
            className={cn(
              "size-full rounded-[1px]",
              color ?? defaultBackgroundColor,
              hoverEffect ? "hover:opacity-50" : ""
            )}
          />
        </button>
      </HoverCardTrigger>
      <HoverCardContent
        side="top"
        align="center"
        sideOffset={10}
        avoidCollisions
        className="w-auto px-2 py-1 text-sm"
      >
        {tooltip}
      </HoverCardContent>
    </HoverCard>
  )
}

Block.displayName = "TrackerBlock"

export interface TrackerProps extends React.HTMLAttributes<HTMLDivElement> {
  data: TrackerBlockProps[]
  defaultBackgroundColor?: string
  hoverEffect?: boolean
}

const Tracker = React.forwardRef<HTMLDivElement, TrackerProps>(
  (
    {
      data = [],
      defaultBackgroundColor = "bg-muted",
      className,
      hoverEffect,
      ...props
    },
    forwardedRef
  ) => {
    return (
      <div
        ref={forwardedRef}
        className={cn("group flex h-8 min-h-8 min-w-0 w-full items-stretch", className)}
        {...props}
      >
        {data.map((blockProps, index) => (
          <Block
            key={blockProps.key ?? index}
            defaultBackgroundColor={defaultBackgroundColor}
            hoverEffect={hoverEffect}
            {...blockProps}
          />
        ))}
      </div>
    )
  }
)

Tracker.displayName = "Tracker"

/* -------------------------------------------------------------------------
 * AI-friendly wrapper: pass statusKey + optional tooltip; catalog maps to color.
 * No raw CSS — use semantic keys (running, idle, maintenance, fault).
 * ------------------------------------------------------------------------- */

export type TrackerBlockCatalogEntry = { key: string; color: string }

/** Default catalog aligned with tracker.stories (bg-success, bg-muted, etc.). */
export const TRACKER_STATUS_CATALOG: TrackerBlockCatalogEntry[] = [
  { key: "running", color: "bg-success" },
  { key: "idle", color: "bg-muted" },
  { key: "off", color: "bg-muted" },
  { key: "no_data", color: "bg-muted" },
  { key: "maintenance", color: "bg-warning" },
  { key: "degraded", color: "bg-warning" },
  { key: "warning", color: "bg-warning" },
  { key: "fault", color: "bg-destructive" },
  { key: "down", color: "bg-destructive" },
  { key: "destructive", color: "bg-destructive" },
]

export type TrackerBlockInput = { statusKey: string; tooltip?: string }

export interface TrackerWithCatalogProps extends Omit<TrackerProps, "data"> {
  /** AI-friendly: one entry per block with statusKey (and optional tooltip). */
  blocks: TrackerBlockInput[]
  /** Optional; defaults to TRACKER_STATUS_CATALOG. */
  statusCatalog?: TrackerBlockCatalogEntry[]
}

function getColorForKey(
  statusKey: string,
  catalog: TrackerBlockCatalogEntry[]
): string | undefined {
  const normalized = statusKey.toLowerCase().trim()
  const entry = catalog.find((e) => e.key.toLowerCase() === normalized)
  return entry?.color
}

/**
 * Wrapper for Tracker: AI passes statusKey + tooltip per block; catalog maps statusKey → color.
 * Use this in chat or any place where the caller should not supply raw CSS classes.
 */
export function TrackerWithCatalog({
  blocks,
  statusCatalog = TRACKER_STATUS_CATALOG,
  defaultBackgroundColor = "bg-muted",
  hoverEffect,
  className,
  ...props
}: TrackerWithCatalogProps) {
  const data: TrackerBlockProps[] = blocks.map((b, i) => {
    const color = getColorForKey(b.statusKey, statusCatalog)
    return {
      key: i,
      color,
      defaultBackgroundColor: color ? undefined : defaultBackgroundColor,
      tooltip: b.tooltip,
    }
  })
  return (
    <Tracker
      data={data}
      defaultBackgroundColor={defaultBackgroundColor}
      hoverEffect={hoverEffect}
      className={className}
      {...props}
    />
  )
}

export { Tracker }
