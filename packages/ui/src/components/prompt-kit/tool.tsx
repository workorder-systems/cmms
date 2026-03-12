"use client"

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
  Clock,
} from "lucide-react"
import * as React from "react"
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
  /** When true, show "Awaiting" instead of "Completed" (e.g. for create tools pending user confirm). */
  awaitingConfirmation?: boolean
  defaultOpen?: boolean
  className?: string
  /** When provided and output is available, renders instead of the default JSON output block (e.g. DataGrid or DataChart). */
  customOutput?: React.ReactNode
}

/** Convert snake_case tool type to human-readable title (e.g. create_work_order → Create Work Order). */
function toolTypeToLabel(type: string): string {
  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}

const Tool = ({
  toolPart,
  awaitingConfirmation = false,
  defaultOpen = false,
  className,
  customOutput,
}: ToolProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const { state, input, output, toolCallId } = toolPart

  const getStateIcon = () => {
    if (awaitingConfirmation) return <Clock className="size-4 text-amber-600 dark:text-amber-400" />
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
    if (awaitingConfirmation) {
      return (
        <span className={cn(baseClasses, "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400")}>
          Awaiting
        </span>
      )
    }
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
    if (typeof value === "object") return JSON.stringify(value, null, 2)
    return String(value)
  }

  /** User-friendly output when customOutput is not provided: no raw JSON. */
  const renderFriendlyOutput = (value: unknown): React.ReactNode => {
    if (value === null || value === undefined) return <span className="text-muted-foreground">—</span>
    if (typeof value === "string") {
      return <p className="text-sm">{value}</p>
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return <p className="text-sm">{String(value)}</p>
    }
    if (Array.isArray(value)) {
      const len = value.length
      if (len === 0) return <p className="text-muted-foreground text-sm">No items</p>
      const first = value[0]
      const isObject = first != null && typeof first === "object" && !Array.isArray(first)
      return (
        <div className="flex flex-col gap-2">
          <p className="text-muted-foreground text-xs font-medium">{len} item{len !== 1 ? "s" : ""}</p>
          {isObject && (
            <ul className="flex flex-col gap-1.5 text-sm">
              {(value as Record<string, unknown>[]).slice(0, 10).map((item, i) => (
                <li key={i} className="rounded border bg-muted/50 px-2 py-1.5">
                  {Object.entries(item).map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <span className="text-muted-foreground shrink-0">{k}:</span>
                      <span>{typeof v === "object" && v !== null ? JSON.stringify(v) : String(v ?? "—")}</span>
                    </div>
                  ))}
                </li>
              ))}
              {len > 10 && <li className="text-muted-foreground text-xs">… and {len - 10} more</li>}
            </ul>
          )}
          {!isObject && <p className="text-sm">{value.slice(0, 5).map((v) => String(v)).join(", ")}{len > 5 ? " …" : ""}</p>}
        </div>
      )
    }
    if (typeof value === "object") {
      const obj = value as Record<string, unknown>
      const entries = Object.entries(obj).filter(([, v]) => v !== undefined && v !== null)
      if (entries.length === 0) return <p className="text-muted-foreground text-sm">—</p>
      return (
        <dl className="grid gap-1.5 text-sm">
          {entries.map(([k, v]) => (
            <div key={k} className="flex gap-2">
              <dt className="text-muted-foreground shrink-0 font-medium">{k}:</dt>
              <dd className="min-w-0">
                {typeof v === "object" && v !== null && !Array.isArray(v)
                  ? renderFriendlyOutput(v)
                  : <span>{String(v)}</span>}
              </dd>
            </div>
          ))}
        </dl>
      )
    }
    return <p className="text-sm">{String(value)}</p>
  }

  return (
    <div className="flex flex-col gap-2">
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

              {output && !awaitingConfirmation && customOutput == null && (
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground text-xs font-medium">Result</span>
                  <div className="rounded-md border bg-muted/30 p-3">
                    {renderFriendlyOutput(output)}
                  </div>
                </div>
              )}

              {awaitingConfirmation && (
                <p className="text-muted-foreground text-sm">Confirm below to complete. Output will appear after confirmation.</p>
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
      {customOutput != null ? (
        <div className="mt-1 w-full">{customOutput}</div>
      ) : null}
    </div>
  )
}

export { Tool }
