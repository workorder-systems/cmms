import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@workspace/ui/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"

const assigneeChipVariants = cva(
  "inline-flex items-center gap-2 rounded-md border border-transparent bg-muted/50 px-2 py-1 text-sm w-fit",
  {
    variants: {
      size: {
        sm: "gap-1.5 px-1.5 py-0.5 text-xs",
        default: "",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

export interface AssigneeChipProps extends VariantProps<typeof assigneeChipVariants> {
  /** Display name of the assignee. When missing, shows "Unassigned". */
  displayName?: string | null
  /** Optional avatar image URL. */
  avatarUrl?: string | null
  className?: string
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0]![0] + parts[parts.length - 1]![0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export function AssigneeChip({
  displayName,
  avatarUrl,
  size = "default",
  className,
}: AssigneeChipProps) {
  const hasAssignee = !!(displayName?.trim() || avatarUrl)

  if (!hasAssignee) {
    return (
      <span
        data-slot="assignee-chip"
        data-unassigned
        className={cn(
          "text-muted-foreground inline-flex items-center rounded-md px-2 py-1 text-sm",
          size === "sm" && "px-1.5 py-0.5 text-xs",
          className
        )}
      >
        Unassigned
      </span>
    )
  }

  const name = displayName?.trim() ?? ""

  return (
    <span
      data-slot="assignee-chip"
      className={cn(assigneeChipVariants({ size }), className)}
    >
      <Avatar size={size === "sm" ? "sm" : "default"}>
        {avatarUrl ? (
          <AvatarImage src={avatarUrl} alt={name || "Assignee"} />
        ) : null}
        <AvatarFallback>{getInitials(name || "?")}</AvatarFallback>
      </Avatar>
      <span className="truncate max-w-[120px]">{name || "Assigned"}</span>
    </span>
  )
}
