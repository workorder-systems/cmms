"use client"

import { cn } from "@workspace/ui/lib/utils"
import React from "react"

export interface LoaderProps {
  variant?:
    | "circular"
    | "classic"
    | "pulse"
    | "pulse-dot"
    | "dots"
    | "typing"
    | "wave"
    | "bars"
    | "terminal"
    | "text-blink"
    | "text-shimmer"
    | "loading-dots"
  size?: "sm" | "md" | "lg"
  text?: string
  className?: string
}

export function CircularLoader({
  className,
  size = "md",
}: {
  className?: string
  size?: "sm" | "md" | "lg"
}) {
  const sizeClasses = {
    sm: "size-4",
    md: "size-5",
    lg: "size-6",
  }

  return (
    <div className={cn("flex items-center gap-2", className)} aria-busy aria-live="polite">
      <div
        className={cn(
          "border-2 border-primary border-t-transparent rounded-full animate-spin",
          sizeClasses[size]
        )}
      />
      <span className="sr-only">Loading</span>
    </div>
  )
}

export function ClassicLoader({
  className,
  size = "md",
}: {
  className?: string
  size?: "sm" | "md" | "lg"
}) {
  const sizeClasses = {
    sm: "size-4",
    md: "size-5",
    lg: "size-6",
  }

  const barSizes = {
    sm: { height: "6px", width: "1.5px" },
    md: { height: "8px", width: "2px" },
    lg: { height: "10px", width: "2.5px" },
  }

  return (
    <div className={cn("flex items-center gap-2", className)} aria-busy aria-live="polite">
      <div className={cn("flex gap-0.5 items-end", sizeClasses[size])}>
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="bg-primary rounded-full animate-[loader-classic_0.5s_ease-in-out_infinite]"
            style={{
              height: barSizes[size].height,
              width: barSizes[size].width,
              animationDelay: `${i * 0.05}s`,
            }}
          />
        ))}
      </div>
      <span className="sr-only">Loading</span>
    </div>
  )
}

export function PulseLoader({
  className,
  size = "md",
}: {
  className?: string
  size?: "sm" | "md" | "lg"
}) {
  const sizeClasses = {
    sm: "size-4",
    md: "size-5",
    lg: "size-6",
  }

  return (
    <div className={cn("flex items-center gap-2", className)} aria-busy aria-live="polite">
      <div
        className={cn(
          "rounded-full bg-primary animate-pulse",
          sizeClasses[size]
        )}
      />
      <span className="sr-only">Loading</span>
    </div>
  )
}

export function PulseDotLoader({
  className,
  size = "md",
}: {
  className?: string
  size?: "sm" | "md" | "lg"
}) {
  const sizeClasses = {
    sm: "size-1",
    md: "size-2",
    lg: "size-3",
  }

  return (
    <div className={cn("flex items-center gap-2", className)} aria-busy aria-live="polite">
      <div className={cn("flex gap-1", sizeClasses[size])}>
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className={cn("rounded-full bg-primary animate-pulse", sizeClasses[size])}
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
      <span className="sr-only">Loading</span>
    </div>
  )
}

export function DotsLoader({
  className,
  size = "md",
}: {
  className?: string
  size?: "sm" | "md" | "lg"
}) {
  const dotSizes = {
    sm: "h-1.5 w-1.5",
    md: "h-2 w-2",
    lg: "h-2.5 w-2.5",
  }

  const containerSizes = {
    sm: "h-4",
    md: "h-5",
    lg: "h-6",
  }

  return (
    <div className={cn("flex items-center gap-2", className)} aria-busy aria-live="polite">
      <div className={cn("flex items-end gap-1", containerSizes[size])}>
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className={cn("rounded-full bg-primary animate-bounce", dotSizes[size])}
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      <span className="sr-only">Loading</span>
    </div>
  )
}

export function TypingLoader({
  className,
  size = "md",
}: {
  className?: string
  size?: "sm" | "md" | "lg"
}) {
  const dotSizes = {
    sm: "h-1 w-1",
    md: "h-1.5 w-1.5",
    lg: "h-2 w-2",
  }

  const containerSizes = {
    sm: "h-4",
    md: "h-5",
    lg: "h-6",
  }

  return (
    <div className={cn("flex items-center gap-2", className)} aria-busy aria-live="polite">
      <div className={cn("flex items-end gap-1", containerSizes[size])}>
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className={cn("rounded-full bg-primary animate-[typing_1.4s_ease-in-out_infinite_both]", dotSizes[size])}
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
      <span className="sr-only">Loading</span>
    </div>
  )
}

export function WaveLoader({
  className,
  size = "md",
}: {
  className?: string
  size?: "sm" | "md" | "lg"
}) {
  const barWidths = {
    sm: "w-0.5",
    md: "w-0.5",
    lg: "w-1",
  }

  const containerSizes = {
    sm: "h-4",
    md: "h-5",
    lg: "h-6",
  }

  const heights = {
    sm: ["6px", "9px", "12px", "9px", "6px"],
    md: ["8px", "12px", "16px", "12px", "8px"],
    lg: ["10px", "15px", "20px", "15px", "10px"],
  }

  return (
    <div className={cn("flex items-center gap-2", className)} aria-busy aria-live="polite">
      <div className={cn("flex items-end gap-0.5", containerSizes[size])}>
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={cn("rounded-full bg-primary animate-[wave_1s_ease-in-out_infinite]", barWidths[size])}
            style={{
              height: heights[size][i],
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}
      </div>
      <span className="sr-only">Loading</span>
    </div>
  )
}

export function BarsLoader({
  className,
  size = "md",
}: {
  className?: string
  size?: "sm" | "md" | "lg"
}) {
  const barWidths = {
    sm: "w-1",
    md: "w-1.5",
    lg: "w-2",
  }

  const containerSizes = {
    sm: "h-4 gap-1",
    md: "h-5 gap-1.5",
    lg: "h-6 gap-2",
  }

  return (
    <div className={cn("flex items-center gap-2", className)} aria-busy aria-live="polite">
      <div className={cn("flex items-end", containerSizes[size])}>
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className={cn("rounded-full bg-primary animate-[bars_0.5s_ease-in-out_infinite]", barWidths[size])}
            style={{ animationDelay: `${i * 0.1}s`, height: "100%" }}
          />
        ))}
      </div>
      <span className="sr-only">Loading</span>
    </div>
  )
}

export function TerminalLoader({
  className,
  size = "md",
}: {
  className?: string
  size?: "sm" | "md" | "lg"
}) {
  const cursorSizes = {
    sm: "h-3 w-1.5",
    md: "h-4 w-2",
    lg: "h-5 w-2.5",
  }

  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  }

  const containerSizes = {
    sm: "h-4",
    md: "h-5",
    lg: "h-6",
  }

  return (
    <div className={cn("flex items-center gap-2", className)} aria-busy aria-live="polite">
      <div className={cn("flex items-center gap-1", containerSizes[size])}>
        <span className={cn("text-muted-foreground", textSizes[size])}>{">"}</span>
        <div
          className={cn("bg-primary animate-pulse", cursorSizes[size])}
        />
      </div>
      <span className="sr-only">Loading</span>
    </div>
  )
}

export function TextBlinkLoader({
  text = "Thinking",
  className,
  size = "md",
}: {
  text?: string
  className?: string
  size?: "sm" | "md" | "lg"
}) {
  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  }

  return (
    <div className={cn("flex items-center gap-2", className)} aria-busy aria-live="polite">
      <span className={cn("text-muted-foreground animate-pulse", textSizes[size])}>
        {text}
      </span>
    </div>
  )
}

export function TextShimmerLoader({
  text = "Thinking",
  className,
  size = "md",
}: {
  text?: string
  className?: string
  size?: "sm" | "md" | "lg"
}) {
  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  }

  return (
    <div className={cn("flex items-center gap-2", className)} aria-busy aria-live="polite">
      <span
        className={cn(
          "bg-gradient-to-r from-foreground via-muted-foreground to-foreground bg-[length:200%_100%] animate-shimmer bg-clip-text text-transparent",
          textSizes[size]
        )}
      >
        {text}
      </span>
    </div>
  )
}

export function TextDotsLoader({
  className,
  text = "Thinking",
  size = "md",
}: {
  className?: string
  text?: string
  size?: "sm" | "md" | "lg"
}) {
  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  }

  return (
    <div className={cn("flex items-center gap-2", className)} aria-busy aria-live="polite">
      <span className={cn("text-muted-foreground", textSizes[size])}>
        {text}
        <span className="inline-flex animate-pulse">
          .
          <span className="animate-pulse" style={{ animationDelay: "0.2s" }}>.</span>
          <span className="animate-pulse" style={{ animationDelay: "0.4s" }}>.</span>
        </span>
      </span>
    </div>
  )
}

function Loader({
  variant = "circular",
  size = "md",
  text,
  className,
}: LoaderProps) {
  switch (variant) {
    case "circular":
      return <CircularLoader className={className} size={size} />
    case "classic":
      return <ClassicLoader className={className} size={size} />
    case "pulse":
      return <PulseLoader className={className} size={size} />
    case "pulse-dot":
      return <PulseDotLoader className={className} size={size} />
    case "dots":
      return <DotsLoader className={className} size={size} />
    case "typing":
      return <TypingLoader className={className} size={size} />
    case "wave":
      return <WaveLoader className={className} size={size} />
    case "bars":
      return <BarsLoader className={className} size={size} />
    case "terminal":
      return <TerminalLoader className={className} size={size} />
    case "text-blink":
      return <TextBlinkLoader text={text} className={className} size={size} />
    case "text-shimmer":
      return <TextShimmerLoader text={text} className={className} size={size} />
    case "loading-dots":
      return <TextDotsLoader text={text} className={className} size={size} />
    default:
      return <CircularLoader className={className} size={size} />
  }
}

export { Loader }
