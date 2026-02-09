"use client"

import * as React from "react"
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  MoreVertical,
} from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { Card, CardHeader, CardTitle, CardAction, CardContent, CardFooter } from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { Progress } from "@workspace/ui/components/progress"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"

export type GoalStatus = "not_started" | "in_progress" | "completed"

export interface GoalStep {
  id: string
  title: string
  isComplete: boolean
}

export interface GoalRoadmap {
  title: string
  nodes: GoalStep[]
}

export interface GoalCardProps {
  id: string
  title: string
  progress: number // 0-100
  createdAt?: string | Date
  roadmap?: GoalRoadmap
  onClick?: (id: string) => void
  onDelete?: (id: string) => void
  className?: string
}

const formatDate = (date: string | Date): string => {
  const d = new Date(date)
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function GoalCard({
  id,
  title,
  progress,
  createdAt,
  roadmap,
  onClick,
  onDelete,
  className,
}: GoalCardProps) {
  // Calculate status based on progress and roadmap
  const nodes = roadmap?.nodes || []
  const totalSteps = nodes.length
  const completedSteps = nodes.filter((node) => node.isComplete).length
  const hasSteps = totalSteps > 0

  const getStatus = (): GoalStatus => {
    if (!hasSteps) return "not_started"
    if (progress === 100) return "completed"
    if (progress > 0) return "in_progress"
    return "not_started"
  }

  const status = getStatus()

  const statusConfig = {
    not_started: {
      label: "Not Started",
      bgColor: "bg-amber-500/10 dark:bg-amber-500/20",
      textColor: "text-amber-600 dark:text-amber-400",
    },
    in_progress: {
      label: "In Progress",
      bgColor: "bg-sky-500/10 dark:bg-sky-500/20",
      textColor: "text-blue-600 dark:text-blue-400",
    },
    completed: {
      label: "Completed",
      bgColor: "bg-green-500/10 dark:bg-green-500/20",
      textColor: "text-green-600 dark:text-green-400",
    },
  }

  const statusInfo = statusConfig[status]
  const displayTitle = roadmap?.title || title

  return (
    <Card
      data-slot="goal-card"
      data-status={status}
      className={cn("group relative w-full cursor-pointer transition-colors hover:bg-accent/50", className)}
      onClick={onClick ? () => onClick(id) : undefined}
    >
      <CardHeader>
        <CardTitle className="truncate">
          {displayTitle}
        </CardTitle>
        {onDelete && (
          <CardAction>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => e.stopPropagation()}
                  className="opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label="Goal options"
                >
                  <MoreVertical size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(id)
                  }}
                  className="text-destructive"
                >
                  Delete Goal
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardAction>
        )}
      </CardHeader>

      <CardContent>
        {/* Progress bar */}
        <div className="flex items-center justify-between gap-3">
          <Progress value={progress || 0} className="flex-1 h-2.5" />
          <span className="text-sm font-medium text-muted-foreground min-w-[2.5rem] text-right">
            {progress || 0}%
          </span>
        </div>
      </CardContent>

      <CardFooter className="flex-wrap items-center justify-between gap-2">
        {/* Status and metadata */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status chip */}
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
              statusInfo.bgColor,
              statusInfo.textColor,
            )}
          >
            {statusInfo.label}
          </span>

          {/* Steps chip */}
          {hasSteps && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
              <CheckCircle2 size={14} />
              {completedSteps}/{totalSteps} steps
            </span>
          )}

          {/* Created date */}
          {createdAt && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar size={14} />
              {formatDate(createdAt)}
            </span>
          )}
        </div>

        {/* View button */}
        {onClick && (
          <Button
            variant="default"
            size="xs"
            onClick={(e) => {
              e.stopPropagation()
              onClick(id)
            }}
            className="gap-1.5"
          >
            View Goal
            <ArrowRight size={14} />
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
