"use client"

import * as React from "react"
import { TrendingDown, TrendingUp } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import { Sparkline, type SparklineProps } from "@workspace/ui/components/sparkline"

const TITLE_CLASS =
  "text-2xl font-semibold tabular-nums tracking-tight @[250px]/card:text-3xl"

export interface StatCardBackgroundChartProps {
  data: number[]
  variant?: "line" | "area"
  color?: string
  className?: string
}

function StatCardBackgroundChart({
  data,
  variant = "area",
  color = "var(--muted-foreground)",
  className,
}: StatCardBackgroundChartProps) {
  const gradientId = `stat-card-bg-${React.useId().replace(/:/g, "")}`
  const width = 200
  const height = 80
  const points = React.useMemo(() => {
    if (!data?.length) return []
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1
    const normalized = data.map((v) => (v - min) / range)
    return normalized.map((y, i) => ({
      x: (i / (data.length - 1)) * width,
      y: height - y * height,
    }))
  }, [data])

  const pathData = React.useMemo(() => {
    if (points.length === 0) return ""
    let path = `M ${points[0]!.x} ${points[0]!.y}`
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1]!
      const curr = points[i]!
      const next = points[i + 1]
      if (next !== undefined) {
        const cp1x = prev.x + (curr.x - prev.x) / 2
        const cp2x = curr.x - (next.x - curr.x) / 2
        path += ` C ${cp1x} ${prev.y}, ${cp2x} ${curr.y}, ${curr.x} ${curr.y}`
      } else {
        path += ` L ${curr.x} ${curr.y}`
      }
    }
    return path
  }, [points])

  const areaPath =
    points.length === 0
      ? ""
      : `${pathData} L ${points[points.length - 1]!.x} ${height} L ${points[0]!.x} ${height} Z`

  if (points.length === 0) return null

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
          <path d={areaPath} fill={`url(#${gradientId})`} className="transition-opacity" />
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
  label?: React.ReactNode
  value?: React.ReactNode
  trend?:
    | React.ReactNode
    | { value: React.ReactNode; direction?: StatCardTrendDirection }
  footerSummary?: React.ReactNode
  footerDescription?: React.ReactNode
  sparkline?: StatCardSparklineProps
  backgroundChart?: StatCardBackgroundChartProps
  variant?: "default" | "gradient"
  className?: string
  children?: React.ReactNode
}

function isTrendConfig(
  trend: StatCardProps["trend"]
): trend is { value: React.ReactNode; direction?: StatCardTrendDirection } {
  return (
    trend != null &&
    typeof trend === "object" &&
    !React.isValidElement(trend) &&
    "value" in trend
  )
}

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
  const trendConfig = isTrendConfig(trend) ? trend : null
  const trendContent =
    trend != null &&
    (trendConfig ? (
      <Badge variant="outline" className="gap-1">
        {trendConfig.direction === "down" && <TrendingDown className="size-3.5" />}
        {(trendConfig.direction === "up" || trendConfig.direction == null) && (
          <TrendingUp className="size-3.5" />
        )}
        {trendConfig.value}
      </Badge>
    ) : (
      <Badge variant="outline">{trend as React.ReactNode}</Badge>
    ))

  const hasSparkline = (sparkline?.data?.length ?? 0) > 0
  const hasBackgroundChart = (backgroundChart?.data?.length ?? 0) > 0
  const showSparkline = hasSparkline
  const showBackgroundChart = hasBackgroundChart && !hasSparkline

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

  const hasFooter =
    footerSummary != null ||
    footerDescription != null ||
    children != null
  const useCardGradient =
    variant === "gradient" || (showBackgroundChart && backgroundChart)

  return (
    <Card
      data-slot="stat-card"
      className={cn(
        "relative pb-2 overflow-hidden @container/card group",
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
      {trendContent && <div className="top-0 right-0 absolute p-2 opacity-50 group-hover:opacity-100 duration-200">{trendContent}</div>}

      <div className="relative z-10 flex flex-1 flex-col h-full justify-between gap-4">

        <CardHeader className="bg-transparent items-end">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            {/* badge / trend content */}
            {value != null && (
              <CardTitle data-slot="stat-card-value" className={TITLE_CLASS}>
                {value}
              </CardTitle>
            )}
            {label != null && (
              <CardDescription
                data-slot="stat-card-label"
                className="text-muted-foreground text-sm"
              >
                {label}
              </CardDescription>
            )}
          </div>
          {trendContent && <CardAction className="flex items-center h-full justify-end">{sparklineEl}</CardAction>}
        </CardHeader>

        {hasFooter && (
          <footer
            data-slot="stat-card-footer"
            className="flex w-full h-min items-end justify-between gap-4 border-t border-border px-6 pt-4 text-sm"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
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
          </footer>
        )}
      </div>
    </Card>
  )
}
