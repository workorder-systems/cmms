"use client"

import * as React from "react"
import {
  AlertCircle,
  Check,
  Clock,
  ExternalLink,
  Loader2,
} from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { Item, ItemContent, ItemTitle, ItemDescription, ItemActions, ItemHeader, ItemFooter } from "@workspace/ui/components/item"
import { Button } from "@workspace/ui/components/button"

export type NotificationStatus = "unread" | "read" | "archived"
export type ActionType = "redirect" | "api_call" | "workflow" | "modal"
export type ActionStyle = "primary" | "danger" | "default"

export interface NotificationAction {
  id: string
  label: string
  type: ActionType
  style?: ActionStyle
  executed?: boolean
}

export interface NotificationCardProps {
  id: string
  title: string
  body: string
  status?: NotificationStatus
  createdAt?: string | Date
  actions?: NotificationAction[]
  onMarkAsRead?: (id: string) => void
  onAction?: (
    notificationId: string,
    actionId: string,
    actionType: ActionType,
  ) => void
  loadingActionId?: string
  className?: string
}

const formatDate = (date: string | Date): string => {
  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

const getActionIcon = (actionType: ActionType) => {
  const iconProps = { size: 12, strokeWidth: 2.5 }
  switch (actionType) {
    case "redirect":
      return <ExternalLink {...iconProps} />
    case "api_call":
      return <Check {...iconProps} />
    case "workflow":
      return <Clock {...iconProps} />
    case "modal":
      return <AlertCircle {...iconProps} />
    default:
      return null
  }
}

export function NotificationCard({
  id,
  title,
  body,
  status = "unread",
  createdAt,
  actions = [],
  onMarkAsRead,
  onAction,
  loadingActionId,
  className,
}: NotificationCardProps) {
  const isUnread = status === "unread"

  return (
    <Item
      data-slot="notification-card"
      data-status={status}
      variant={isUnread ? "muted" : "default"}
      className={cn(
        "group relative w-full transition-all",
        className,
      )}
    >
      <ItemHeader>
        <ItemContent>
          <ItemTitle className="flex items-center gap-2">
            <span
              className={cn(
                isUnread
                  ? "text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {title}
            </span>
            {isUnread && (
              <div className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-sky-500" />
            )}
          </ItemTitle>
          <ItemDescription
            className={cn(
              isUnread
                ? "text-foreground/80"
                : "text-muted-foreground",
            )}
          >
            {body}
          </ItemDescription>
        </ItemContent>
        {isUnread && onMarkAsRead && (
          <ItemActions>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onMarkAsRead(id)}
              aria-label="Mark as read"
            >
              <Check size={16} />
            </Button>
          </ItemActions>
        )}
      </ItemHeader>

      {(actions.length > 0 || createdAt) && (
        <ItemFooter>
          {/* Actions */}
          {actions.length > 0 && (
            <ItemActions
              className={cn(
                "flex flex-wrap items-center gap-2",
                !isUnread && "opacity-60",
              )}
            >
              {actions.map((action) => {
                const isLoading = loadingActionId === action.id
                const isExecuted = action.executed || false
                const showLoading = isLoading && action.type !== "modal"

                return (
                  <Button
                    key={action.id}
                    variant={
                      action.style === "primary"
                        ? "default"
                        : action.style === "danger"
                          ? "destructive"
                          : "outline"
                    }
                    size="xs"
                    disabled={isLoading || isExecuted}
                    onClick={() => onAction?.(id, action.id, action.type)}
                    className={cn(
                      "gap-1.5",
                      action.style === "primary"
                        ? "bg-sky-500/10 text-blue-600 hover:bg-sky-500/20 dark:text-blue-400 dark:hover:bg-sky-500/20 border-sky-500/20"
                        : action.style === "danger"
                          ? "bg-red-500/10 text-red-600 hover:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/20 border-red-500/20"
                          : "",
                      showLoading && "opacity-50",
                      isExecuted && "cursor-not-allowed opacity-60",
                    )}
                  >
                    {showLoading ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <>
                        <span>{action.label}</span>
                        {isExecuted ? (
                          <Check size={12} strokeWidth={2.5} />
                        ) : (
                          getActionIcon(action.type)
                        )}
                      </>
                    )}
                  </Button>
                )
              })}
            </ItemActions>
          )}

          {/* Timestamp */}
          {createdAt && (
            <span className="inline-block text-[11px] text-muted-foreground shrink-0">
              {formatDate(createdAt)}
            </span>
          )}
        </ItemFooter>
      )}
    </Item>
  )
}
