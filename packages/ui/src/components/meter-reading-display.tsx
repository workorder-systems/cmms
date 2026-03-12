"use client"

import * as React from "react"
import { TrendingDown, TrendingUp } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@workspace/ui/lib/utils"

const meterReadingDisplayVariants = cva(
  "inline-flex items-baseline gap-1.5 text-sm tabular-nums",
  {
    variants: {
      trend: {
        up: "text-foreground",
        down: "text-muted-foreground",
        neutral: "text-foreground",
      },
    },
    defaultVariants: {
      trend: "neutral",
    },
  }
)

export interface MeterReadingDisplayProps extends VariantProps<typeof meterReadingDisplayVariants> {
  /** Formatted reading (e.g. "1,234" or 1234.5). When number, optional decimalPlaces applied. */
  value: number | string
  /** Unit (e.g. "h", "km", "°C"). */
  unit?: string | null
  /** Meter or label (e.g. "Runtime"). */
  label?: string | null
  /** Visual trend. */
  trend?: "up" | "down" | "neutral"
  /** Optional text for trend (e.g. "↑ from last"). When provided, shown instead of icon only. */
  trendLabel?: string | null
  /** When value is number, format with this many decimal places. */
  decimalPlaces?: number
  className?: string
}

function formatValue(value: number | string, decimalPlaces?: number): string {
  if (typeof value === "string") return value
  if (decimalPlaces != null) return value.toFixed(decimalPlaces)
  return value.toLocaleString()
}

export function MeterReadingDisplay({
  value,
  unit,
  label,
  trend = "neutral",
  trendLabel,
  decimalPlaces,
  className,
}: MeterReadingDisplayProps) {
  const displayValue = formatValue(value, decimalPlaces)

  return (
    <div
      data-slot="meter-reading-display"
      data-trend={trend}
      className={cn(meterReadingDisplayVariants({ trend }), className)}
    >
      {label ? (
        <span className="text-muted-foreground text-xs font-normal">{label}: </span>
      ) : null}
      <span className="font-medium">{displayValue}</span>
      {unit ? <span className="text-muted-foreground text-xs">{unit}</span> : null}
      {trend !== "neutral" || trendLabel ? (
        <span className="inline-flex items-center gap-0.5 text-xs">
          {trendLabel != null && trendLabel !== "" ? (
            <span className="text-muted-foreground">{trendLabel}</span>
          ) : (
            <>
              {trend === "up" ? (
                <TrendingUp className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : trend === "down" ? (
                <TrendingDown className="size-3.5 text-muted-foreground" />
              ) : null}
            </>
          )}
        </span>
      ) : null}
    </div>
  )
}
