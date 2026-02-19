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
        className={cn("group flex h-8 min-w-0 w-full min-h-[2rem] items-stretch", className)}
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

export { Tracker }
