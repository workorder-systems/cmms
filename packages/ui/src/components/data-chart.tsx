"use client"

import * as React from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Area,
  AreaChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart"
import { cn } from "@workspace/ui/lib/utils"

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const

/** Minimal data row: category + one or more numeric values. */
export type DataChartDataRow = Record<string, string | number>

export type DataChartProps = {
  /** Chart kind: bar, line, area, or pie. */
  type: "bar" | "line" | "area" | "pie"
  /** Data rows. Each row must have the category key and value keys. */
  data: DataChartDataRow[]
  /** Key in each row used for category / x-axis / pie label. */
  categoryKey: string
  /** Keys in each row for values (one for pie, one or more for bar/line/area). */
  valueKeys: string[]
  /** Optional display names for value keys (e.g. { count: "Work orders" }). */
  valueLabels?: Record<string, string>
  /** Optional chart title. */
  title?: string
  /** Height in pixels. Default 280. */
  height?: number
  className?: string
}

/**
 * Prop-driven chart for AI/assistant use. Pass data + categoryKey + valueKeys;
 * no need to wire Recharts by hand. Uses existing ChartContainer and theme colors.
 */
export function DataChart({
  type,
  data,
  categoryKey,
  valueKeys,
  valueLabels = {},
  title,
  height = 280,
  className,
}: DataChartProps) {
  const config: ChartConfig = React.useMemo(() => {
    const c: ChartConfig = {}
    valueKeys.forEach((key, i) => {
      c[key] = {
        label: valueLabels[key] ?? key,
        color: CHART_COLORS[i % CHART_COLORS.length],
      }
    })
    return c
  }, [valueKeys, valueLabels])

  const content = React.useMemo(() => {
    if (!data.length) {
      return (
        <div className="text-muted-foreground flex h-full min-h-[120px] items-center justify-center text-sm">
          No data to display
        </div>
      )
    }

    const commonChartProps = { data }

    switch (type) {
      case "pie": {
        const valueKey = valueKeys[0] ?? "value"
        const pieData = data.map((row) => ({
          name: String(row[categoryKey] ?? ""),
          value: Number(row[valueKey] ?? 0),
        }))
        return (
          <PieChart data={pieData}>
            <ChartTooltip content={<ChartTooltipContent />} />
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={2}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            >
              {pieData.map((_, index) => (
                <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        )
      }
      case "bar":
        return (
          <BarChart {...commonChartProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey={categoryKey}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip content={<ChartTooltipContent />} />
            {valueKeys.map((key) => (
              <Bar
                key={key}
                dataKey={key}
                fill={`var(--color-${key})`}
                radius={4}
              />
            ))}
          </BarChart>
        )
      case "line":
        return (
          <LineChart {...commonChartProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey={categoryKey}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip content={<ChartTooltipContent />} />
            {valueKeys.map((key) => (
              <Line
                key={key}
                dataKey={key}
                type="monotone"
                stroke={`var(--color-${key})`}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        )
      case "area":
        return (
          <AreaChart {...commonChartProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey={categoryKey}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip content={<ChartTooltipContent />} />
            {valueKeys.map((key) => (
              <Area
                key={key}
                dataKey={key}
                type="monotone"
                fill={`var(--color-${key})`}
                stroke={`var(--color-${key})`}
                strokeWidth={2}
                fillOpacity={0.4}
              />
            ))}
          </AreaChart>
        )
      default:
        return (
          <div className="text-muted-foreground flex h-full min-h-[120px] items-center justify-center text-sm">
            Unsupported chart type
          </div>
        )
    }
  }, [type, data, categoryKey, valueKeys])

  return (
    <div className={cn("w-full", className)}>
      {title && (
        <p className="text-foreground mb-2 text-sm font-medium">{title}</p>
      )}
      <ChartContainer
        config={config}
        className="w-full"
        style={{ height: `${height}px` }}
      >
        {content}
      </ChartContainer>
    </div>
  )
}
