"use client"

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { ChevronRight } from "lucide-react"
import { TextShimmer } from "./text-shimmer"

type ThinkingBarProps = {
  className?: string
  text?: string
  onStop?: () => void
  stopLabel?: string
  onClick?: () => void
}

export function ThinkingBar({
  className,
  text = "Thinking",
  onStop,
  stopLabel = "Answer now",
  onClick,
}: ThinkingBarProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-lg border bg-muted/50 px-3 py-2",
        className
      )}
    >
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="text-muted-foreground hover:text-foreground flex flex-1 items-center gap-2 text-left text-sm"
        >
          <TextShimmer>{text}</TextShimmer>
          <ChevronRight className="size-4 shrink-0" />
        </button>
      ) : (
        <span className="text-muted-foreground flex flex-1 items-center text-sm">
          <TextShimmer>{text}</TextShimmer>
        </span>
      )}
      {onStop ? (
        <Button variant="ghost" size="sm" onClick={onStop}>
          {stopLabel}
        </Button>
      ) : null}
    </div>
  )
}
