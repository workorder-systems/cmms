"use client"

import { cn } from "@workspace/ui/lib/utils"

export type TextShimmerProps = {
  as?: string
  duration?: number
  spread?: number
  children: React.ReactNode
} & React.HTMLAttributes<HTMLElement>

export function TextShimmer({
  as = "span",
  className,
  duration = 4,
  spread = 20,
  children,
  ...props
}: TextShimmerProps) {
  const dynamicSpread = Math.min(Math.max(spread, 5), 45)
  const Component = as as React.ElementType

  return (
    <Component
      className={cn(
        "bg-gradient-to-r from-foreground via-foreground/80 to-foreground bg-[length:200%_100%] bg-clip-text text-transparent animate-shimmer",
        className
      )}
      style={
        {
          "--shimmer-duration": `${duration}s`,
          "--shimmer-spread": `${dynamicSpread}%`,
        } as React.CSSProperties
      }
      {...props}
    >
      {children}
    </Component>
  )
}
