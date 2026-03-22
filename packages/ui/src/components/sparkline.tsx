"use client"

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

export interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  variant?: "line" | "area" | "bar"
  strokeWidth?: number
  color?: string
  className?: string
  showDots?: boolean
  showGradient?: boolean
  curve?: "linear" | "smooth"
}

/**
 * Sparkline - A small, word-sized chart component for showing trends
 * 
 * Sparklines are data-intense, design-simple graphics that can be embedded
 * in text, tables, or other UI elements to show trends at a glance.
 */
export function Sparkline({
  data,
  width = 100,
  height = 30,
  variant = "line",
  strokeWidth = 1.5,
  color,
  className,
  showDots = false,
  showGradient = false,
  curve = "smooth",
}: SparklineProps) {
  if (!data || data.length === 0) {
    return null
  }

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1 // Avoid division by zero

  // Normalize data to 0-1 range, then scale to height
  const normalized = data.map((value) => (value - min) / range)
  const points = normalized.map((y, i) => {
    const x = (i / (data.length - 1)) * width
    const yPos = height - y * height
    return { x, y: yPos }
  })

  // Generate path string
  const pathData = React.useMemo(() => {
    if (points.length === 0) return ""

    if (curve === "linear" || points.length === 1) {
      return points
        .map((point, i) => `${i === 0 ? "M" : "L"} ${point.x} ${point.y}`)
        .join(" ")
    }

    // Smooth curve using quadratic bezier
    const p0 = points[0]
    if (!p0) return ""
    let path = `M ${p0.x} ${p0.y}`
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1]
      const curr = points[i]
      const next = points[i + 1]

      if (prev && curr && next) {
        const cp1x = prev.x + (curr.x - prev.x) / 2
        const cp1y = prev.y
        const cp2x = curr.x - (next.x - curr.x) / 2
        const cp2y = curr.y
        path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`
      } else if (curr) {
        path += ` L ${curr.x} ${curr.y}`
      }
    }
    return path
  }, [points, curve])

  // Area path (closed path)
  const areaPath = React.useMemo(() => {
    if (points.length === 0) return ""
    const first = points[0]
    const last = points[points.length - 1]
    if (!first || !last) return ""
    return `${pathData} L ${last.x} ${height} L ${first.x} ${height} Z`
  }, [pathData, points, height])

  const strokeColor = color || "currentColor"
  const fillColor = color || "currentColor"

  const gradientId = `sparkline-gradient-${React.useId().replace(/:/g, "")}`

  return (
    <svg
      data-slot="sparkline"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("overflow-visible", className)}
      aria-hidden="true"
    >
      {showGradient && variant === "area" && (
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop
              offset="0%"
              stopColor={fillColor}
              stopOpacity={0.3}
            />
            <stop
              offset="100%"
              stopColor={fillColor}
              stopOpacity={0}
            />
          </linearGradient>
        </defs>
      )}

      {/* Area fill */}
      {variant === "area" && (
        <path
          d={areaPath}
          fill={showGradient ? `url(#${gradientId})` : fillColor}
          fillOpacity={showGradient ? 1 : 0.1}
          className="transition-opacity"
        />
      )}

      {/* Bars */}
      {variant === "bar" && (
        <g>
          {points.map((point, i) => {
            const barWidth = width / data.length
            const barHeight = height - point.y
            return (
              <rect
                key={i}
                x={point.x - barWidth / 2}
                y={point.y}
                width={barWidth * 0.8}
                height={barHeight}
                fill={fillColor}
                fillOpacity={0.6}
                className="transition-opacity"
              />
            )
          })}
        </g>
      )}

      {/* Line */}
      {(variant === "line" || variant === "area") && (
        <path
          d={pathData}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-all"
        />
      )}

      {/* Dots */}
      {showDots && (variant === "line" || variant === "area") && (
        <g>
          {points.map((point, i) => (
            <circle
              key={i}
              cx={point.x}
              cy={point.y}
              r={2}
              fill={strokeColor}
              className="transition-opacity"
            />
          ))}
        </g>
      )}
    </svg>
  )
}
