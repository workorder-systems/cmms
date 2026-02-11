"use client"

import * as React from "react"
import { TrendingDown, TrendingUp } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import { Sparkline, type SparklineProps } from "@workspace/ui/components/sparkline"

export interface StatCardBackgroundChartProps {
  data: number[]
  variant?: "line" | "area"
  color?: string
  className?: string
}

/**
 * Renders a faint background chart that fills the card.
 */
function StatCardBackgroundChart({
  data,
  variant = "area",
  color = "var(--muted-foreground)",
  className,
}: StatCardBackgroundChartProps) {
  if (!data?.length) return null

  const width = 200
  const height = 80
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const normalized = data.map((value) => (value - min) / range)
  const points = normalized.map((y, i) => {
    const x = (i / (data.length - 1)) * width
    const yPos = height - y * height
    return { x, y: yPos }
  })

  const pathData = React.useMemo(() => {
    if (points.length === 0) return ""
    let path = `M ${points[0].x} ${points[0].y}`
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1]
      const curr = points[i]
      const next = points[i + 1]
      if (next) {
        const cp1x = prev.x + (curr.x - prev.x) / 2
        const cp1y = prev.y
        const cp2x = curr.x - (next.x - curr.x) / 2
        const cp2y = curr.y
        path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`
      } else {
        path += ` L ${curr.x} ${curr.y}`
      }
    }
    return path
  }, [points])

  const areaPath =
    points.length === 0
      ? ""
      : `${pathData} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`

  const gradientId = `stat-card-bg-${React.useId().replace(/:/g, "")}`

  return (
    <div
      data-slot="stat-card-background-chart"
      className={cn(
        "pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-xl",
        className
      )}
      aria-hidden
    >
      <svg
        className="h-full w-full opacity-[0.035] dark:opacity-[0.05]"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity={0.2} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        {variant === "area" && (
          <path
            d={areaPath}
            fill={variant === "area" ? `url(#${gradientId})` : "none"}
            className="transition-opacity"
          />
        )}
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth={1}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-opacity"
        />
      </svg>
    </div>
  )
}

export interface StatCardSparklineProps {
  data: number[]
  sparklineProps?: Partial<SparklineProps>
}

export type StatCardTrendDirection = "up" | "down" | "neutral"

export interface StatCardProps extends React.ComponentProps<typeof Card> {
  /** Label above the value (e.g. "Total Revenue") */
  label?: React.ReactNode
  /** Main metric value (e.g. "$1,250.00", "1,234") */
  value?: React.ReactNode
  /** Trend shown in a badge; string (e.g. "+12.5%") or { value, direction } for icon */
  trend?:
    | React.ReactNode
    | { value: React.ReactNode; direction?: StatCardTrendDirection }
  /** First line in footer (e.g. "Trending up this month") – can include an icon */
  footerSummary?: React.ReactNode
  /** Muted line in footer (e.g. "Visitors for the last 6 months") */
  footerDescription?: React.ReactNode
  /** Sparkline shown in the header action area (right side). Mutually exclusive with backgroundChart. */
  sparkline?: StatCardSparklineProps
  /** Faint background chart behind a gradient for readability. Mutually exclusive with sparkline. */
  backgroundChart?: StatCardBackgroundChartProps
  /** Card visual variant */
  variant?: "default" | "gradient"
  /** Optional container class for responsive title (e.g. @container/card) */
  className?: string
  children?: React.ReactNode
}

/**
 * StatCard – metric card built from Card primitives. Header: label, value, and
 * action (trend badge + optional sparkline). Footer: summary and description.
 */
export function StatCard({
  label,
  value,
  trend,
  footerSummary,
  footerDescription,
  sparkline,
  backgroundChart,
  variant = "default",
  className,
  children,
  ...cardProps
}: StatCardProps) {
  const trendConfig =
    trend != null &&
    typeof trend === "object" &&
    !React.isValidElement(trend) &&
    "value" in trend

  const trendObj = trendConfig ? (trend as { value: React.ReactNode; direction?: StatCardTrendDirection }) : null

  const trendContent =
    trend != null &&
    (trendObj ? (
      <Badge variant="outline" className="gap-1">
        {trendObj.direction === "down" && <TrendingDown className="size-3.5" />}
        {(trendObj.direction === "up" || trendObj.direction == null) && (
          <TrendingUp className="size-3.5" />
        )}
        {trendObj.value}
      </Badge>
    ) : (
      <Badge variant="outline">{trend}</Badge>
    ))

  const hasSparkline = (sparkline?.data?.length ?? 0) > 0
  const hasBackgroundChart = (backgroundChart?.data?.length ?? 0) > 0
  const showSparkline = hasSparkline
  const showBackgroundChart = hasBackgroundChart && !hasSparkline
  // Sparkline and background chart are mutually exclusive; when both set, only sparkline is shown

  const sparklineEl =
    showSparkline && sparkline ? (
      <div data-slot="stat-card-sparkline" className="flex shrink-0 items-end">
        <Sparkline
          data={sparkline.data}
          width={sparkline.sparklineProps?.width ?? 100}
          height={sparkline.sparklineProps?.height ?? 28}
          variant={sparkline.sparklineProps?.variant ?? "area"}
          showGradient={sparkline.sparklineProps?.showGradient ?? true}
          {...sparkline.sparklineProps}
        />
      </div>
    ) : null

  const hasAction = trendContent

  const useCardGradient =
    variant === "gradient" || (showBackgroundChart && backgroundChart)

  return (
    <Card
      data-slot="stat-card"
      className={cn(
        "relative overflow-hidden @container/card",
        useCardGradient &&
          "bg-linear-to-t from-primary/5 to-card shadow-xs dark:bg-card",
        className
      )}
      {...cardProps}
    >
      {showBackgroundChart && backgroundChart && (
        <>
          <StatCardBackgroundChart
            data={backgroundChart.data}
            variant={backgroundChart.variant}
            color={backgroundChart.color}
            className={backgroundChart.className}
          />
          <div
            data-slot="stat-card-chart-gradient"
            className="pointer-events-none absolute inset-0 z-1 rounded-xl bg-linear-to-t from-card via-card/85 to-card/25"
            aria-hidden
          />
        </>
      )}

      <CardHeader className="relative z-10 bg-transparent">
        {label != null && (
          <CardDescription data-slot="stat-card-label">{label}</CardDescription>
        )}
        {value != null && (
          <CardTitle
            data-slot="stat-card-value"
            className="text-2xl font-semibold tabular-nums tracking-tight @[250px]/card:text-3xl"
          >
            {value}
          </CardTitle>
        )}
        {hasAction && (
          <CardAction>
            {trendContent}
          </CardAction>
        )}
      </CardHeader>

      {(footerSummary != null || footerDescription != null || children || sparklineEl) && (
        <CardFooter className="relative z-10 flex w-full items-end justify-between gap-4 bg-transparent text-sm">
          <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
            {footerSummary != null && (
              <div
                data-slot="stat-card-footer-summary"
                className="line-clamp-1 flex gap-2 font-medium"
              >
                {footerSummary}
              </div>
            )}
            {footerDescription != null && (
              <div
                data-slot="stat-card-footer-description"
                className="text-muted-foreground"
              >
                {footerDescription}
              </div>
            )}
            {children}
          </div>
          {sparklineEl}
        </CardFooter>
      )}
    </Card>
  )
}
