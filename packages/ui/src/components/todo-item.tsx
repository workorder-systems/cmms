"use client"

import * as React from "react"
import { CalendarIcon, ChevronDownIcon, ChevronRightIcon } from "lucide-react"
import { format, isPast, isToday, parseISO } from "date-fns"

import { cn } from "@workspace/ui/lib/utils"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"

export type TodoPriority = "high" | "medium" | "low" | "none"

export interface TodoLabel {
  id: string
  name: string
  color?: string
}

export interface TodoSubtask {
  id: string
  title: string
  completed: boolean
}

export interface TodoProject {
  id: string
  name: string
  color?: string
}

export interface TodoItemProps {
  id: string
  title: string
  description?: string
  completed: boolean
  priority: TodoPriority
  dueDate?: string | Date
  labels?: TodoLabel[]
  subtasks?: TodoSubtask[]
  project?: TodoProject
  onToggleComplete?: (id: string, completed: boolean) => void
  onClick?: (id: string) => void
  isSelected?: boolean
  className?: string
}

export const priorityConfig = {
  high: {
    textColor: "text-red-500 dark:text-red-400",
    bgColor: "bg-red-500/10 dark:bg-red-400/10",
    borderColor: "border-red-500",
  },
  medium: {
    textColor: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-500/10 dark:bg-yellow-400/10",
    borderColor: "border-yellow-500",
  },
  low: {
    textColor: "text-blue-500 dark:text-blue-400",
    bgColor: "bg-sky-500/10 dark:bg-sky-400/10",
    borderColor: "border-blue-500",
  },
  none: {
    textColor: "text-zinc-500 dark:text-zinc-500",
    bgColor: "bg-zinc-500/10 dark:bg-zinc-500/10",
    borderColor: "border-zinc-400 dark:border-zinc-500",
  },
} as const

function TodoItem({
  id,
  title,
  description,
  completed,
  priority,
  dueDate,
  labels = [],
  subtasks = [],
  project,
  onToggleComplete,
  onClick,
  isSelected = false,
  className,
}: TodoItemProps) {
  const [showSubtasks, setShowSubtasks] = React.useState(false)

  const hasSubtasks = subtasks.length > 0
  const completedSubtasks = subtasks.filter((st) => st.completed).length
  const allSubtasksCompleted = hasSubtasks && completedSubtasks === subtasks.length

  const handleToggleComplete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleComplete?.(id, !completed)
  }

  const handleClick = () => {
    onClick?.(id)
  }

  const handleSubtaskToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowSubtasks(!showSubtasks)
  }

  const formatDueDate = (date: string | Date): string => {
    try {
      const dateObj = typeof date === "string" ? parseISO(date) : date
      if (isToday(dateObj)) {
        return "Today"
      }
      if (isPast(dateObj)) {
        return format(dateObj, "MMM d, yyyy")
      }
      return format(dateObj, "MMM d")
    } catch {
      return ""
    }
  }

  const getDueDateVariant = (date: string | Date): "default" | "destructive" | "secondary" => {
    if (!date) return "default"
    try {
      const dateObj = typeof date === "string" ? parseISO(date) : date
      if (isPast(dateObj) && !isToday(dateObj)) {
        return "destructive"
      }
      if (isToday(dateObj)) {
        return "secondary"
      }
      return "default"
    } catch {
      return "default"
    }
  }

  const priorityStyle = priorityConfig[priority]

  return (
    <div
      data-slot="todo-item"
      data-completed={completed}
      data-priority={priority}
      data-selected={isSelected}
      className={cn(
        "group/todo-item flex flex-col gap-2 rounded-lg border border-border bg-card p-4 transition-colors",
        "hover:bg-accent/50 hover:border-border",
        isSelected && "border-primary bg-accent",
        completed && "opacity-60",
        className
      )}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={completed}
          onCheckedChange={(checked) => onToggleComplete?.(id, checked as boolean)}
          onClick={handleToggleComplete}
          className="mt-0.5 shrink-0"
          aria-label={`Mark "${title}" as ${completed ? "incomplete" : "complete"}`}
        />

        <div className="flex flex-1 flex-col gap-2 min-w-0">
          <div className="flex items-start gap-2">
            <div className="flex flex-1 flex-col gap-1.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3
                  className={cn(
                    "text-sm font-medium leading-snug",
                    completed && "line-through text-muted-foreground",
                    !completed && "text-foreground"
                  )}
                >
                  {title}
                </h3>

                {priority !== "none" && (
                  <div
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full border",
                      priorityStyle.bgColor,
                      priorityStyle.borderColor
                    )}
                    aria-label={`Priority: ${priority}`}
                    title={`Priority: ${priority}`}
                  />
                )}
              </div>

              {description && (
                <p
                  className={cn(
                    "text-sm leading-normal text-muted-foreground line-clamp-2",
                    completed && "line-through"
                  )}
                >
                  {description}
                </p>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                {project && (
                  <Badge
                    variant="outline"
                    className="text-xs"
                    style={project.color ? { borderColor: project.color, color: project.color } : undefined}
                  >
                    {project.name}
                  </Badge>
                )}

                {labels.map((label) => (
                  <Badge
                    key={label.id}
                    variant="outline"
                    className="text-xs"
                    style={label.color ? { borderColor: label.color, color: label.color } : undefined}
                  >
                    {label.name}
                  </Badge>
                ))}

                {dueDate && (
                  <Badge
                    variant={getDueDateVariant(dueDate)}
                    className="text-xs gap-1"
                  >
                    <CalendarIcon className="size-3" />
                    {formatDueDate(dueDate)}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {hasSubtasks && (
            <div className="flex flex-col gap-1.5">
              <Button
                variant="ghost"
                size="xs"
                onClick={handleSubtaskToggle}
                className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground justify-start w-fit"
              >
                {showSubtasks ? (
                  <ChevronDownIcon className="size-3" />
                ) : (
                  <ChevronRightIcon className="size-3" />
                )}
                <span>
                  {completedSubtasks} of {subtasks.length} subtasks completed
                </span>
              </Button>

              {showSubtasks && (
                <div className="ml-4 flex flex-col gap-1.5 border-l-2 border-border pl-3">
                  {subtasks.map((subtask) => (
                    <div
                      key={subtask.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Checkbox
                        checked={subtask.completed}
                        className="size-3.5"
                        disabled
                        aria-label={`Subtask: ${subtask.title}`}
                      />
                      <span
                        className={cn(
                          "text-sm",
                          subtask.completed && "line-through text-muted-foreground"
                        )}
                      >
                        {subtask.title}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export { TodoItem }
