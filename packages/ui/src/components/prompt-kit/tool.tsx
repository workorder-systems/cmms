"use client"

import { Button } from "@workspace/ui/components/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible"
import { cn } from "@workspace/ui/lib/utils"
import {
  CheckCircle,
  ChevronDown,
  Loader2,
  Settings,
  XCircle,
} from "lucide-react"
import { useState } from "react"

export type ToolPart = {
  type: string
  state:
    | "input-streaming"
    | "input-available"
    | "output-available"
    | "output-error"
  input?: Record<string, unknown>
  output?: Record<string, unknown>
  toolCallId?: string
  errorText?: string
}

export type ToolProps = {
  toolPart: ToolPart
  defaultOpen?: boolean
  className?: string
}

/** Convert snake_case tool type to human-readable title (e.g. create_work_order → Create Work Order). */
function toolTypeToLabel(type: string): string {
  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}

const Tool = ({ toolPart, defaultOpen = false, className }: ToolProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const { state, input, output, toolCallId } = toolPart

  const getStateIcon = () => {
    switch (state) {
      case "input-streaming":
        return <Loader2 className="size-4 animate-spin" />
      case "input-available":
        return <Settings className="size-4" />
      case "output-available":
        return <CheckCircle className="size-4 text-green-600" />
      case "output-error":
        return <XCircle className="size-4 text-destructive" />
      default:
        return <Settings className="size-4" />
    }
  }

  const getStateBadge = () => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium"
    switch (state) {
      case "input-streaming":
        return (
          <span className={cn(baseClasses, "bg-muted text-muted-foreground")}>
            Processing
          </span>
        )
      case "input-available":
        return (
          <span className={cn(baseClasses, "bg-muted text-muted-foreground")}>
            Ready
          </span>
        )
      case "output-available":
        return (
          <span className={cn(baseClasses, "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400")}>
            Completed
          </span>
        )
      case "output-error":
        return (
          <span className={cn(baseClasses, "bg-destructive/10 text-destructive")}>
            Error
          </span>
        )
      default:
        return (
          <span className={cn(baseClasses, "bg-muted text-muted-foreground")}>
            Pending
          </span>
        )
    }
  }

  const formatValue = (value: unknown): string => {
    if (value === null) return "null"
    if (value === undefined) return "undefined"
    if (typeof value === "string") return value
    if (typeof value === "object") {
      return JSON.stringify(value, null, 2)
    }
    return String(value)
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={cn("rounded-lg border", className)}>
      <div className="flex flex-col gap-2 p-3">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-2 text-left"
          >
            {getStateIcon()}
            <span className="font-medium">{toolTypeToLabel(toolPart.type)}</span>
            {getStateBadge()}
            <ChevronDown
              className={cn("ml-auto size-4 transition-transform", isOpen && "rotate-180")}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="flex flex-col gap-3 pt-2">
            {input && Object.keys(input).length > 0 && (
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs font-medium">Input</span>
                <pre className="bg-muted overflow-x-auto rounded-md p-2 text-xs">
                  {Object.entries(input).map(([key, value]) => (
                    <div key={key}>
                      {key}: {formatValue(value)}
                    </div>
                  ))}
                </pre>
              </div>
            )}

            {output && (
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs font-medium">Output</span>
                <pre className="bg-muted overflow-x-auto rounded-md p-2 text-xs">
                  {formatValue(output)}
                </pre>
              </div>
            )}

            {state === "output-error" && toolPart.errorText && (
              <div className="text-destructive text-sm">
                <span className="font-medium">Error </span>
                {toolPart.errorText}
              </div>
            )}

            {state === "input-streaming" && (
              <p className="text-muted-foreground text-sm">Processing tool call...</p>
            )}

            {toolCallId && (
              <p className="text-muted-foreground text-xs">Call ID: {toolCallId}</p>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

export { Tool }
