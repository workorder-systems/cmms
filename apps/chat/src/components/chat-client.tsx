"use client"

import * as React from "react"
import {
  CMMSChat,
  type ChatMessage,
  type AssistantPart,
} from "@workspace/ui/components/prompt-kit"
import type { ToolPart } from "@workspace/ui/components/prompt-kit"
import { useChat } from "@ai-sdk/react"
import { useChatAuth } from "@/hooks/use-chat-auth"
import { PENDING_CONFIRM_PREFIX } from "@/app/api/chat/tools"
import { renderChatToolOutput, CreatedWorkOrderCard } from "@/components/chat-tool-output"

const WELCOME_MESSAGE: ChatMessage = {
  role: "welcome",
  content:
    "Hi, I'm the maintenance assistant. Describe a problem, ask what's urgent, or check an asset — I'll help with work orders, priorities, and next steps.",
}

const SUGGESTED_PROMPTS = [
  "Report a problem",
  "What's urgent?",
  "Asset status",
  "Create work order",
  "Show a report",
]

/** Tool invocation shape (nested under tool-invocation part or top-level toolInvocations). */
type ToolInvocationLike = {
  toolCallId: string
  toolName: string
  args?: unknown
  result?: unknown
  state?: string
}

/** AI SDK message part (step-start, text, tool-call, tool-result, tool-invocation). */
type UIMessagePart =
  | { type: "step-start" }
  | { type: "text"; text?: string }
  | { type: "tool-call"; toolCallId: string; toolName: string; args?: unknown }
  | { type: "tool-result"; toolCallId: string; result?: unknown }
  | { type: "tool-invocation"; toolInvocation: ToolInvocationLike }
  | { type: "tool-invocation"; toolCallId: string; toolName: string; args?: unknown; result?: unknown; state?: string }
  | { type: string; [k: string]: unknown }

type UIMessage = {
  id?: string
  role: string
  content?: string
  parts?: UIMessagePart[]
  toolInvocations?: ToolInvocationLike[]
}

function parsePendingConfirm(result: unknown): { action: string; params: Record<string, unknown> } | null {
  const s = typeof result === "string" ? result : ""
  if (!s.startsWith(PENDING_CONFIRM_PREFIX)) return null
  try {
    return JSON.parse(s.slice(PENDING_CONFIRM_PREFIX.length)) as {
      action: string
      params: Record<string, unknown>
    }
  } catch {
    return null
  }
}

/** Normalize tool result: parse JSON strings, return { output, isError, errorText } for ToolPart. */
function normalizeToolResult(result: unknown): {
  output: Record<string, unknown> | undefined
  state: ToolPart["state"]
  errorText?: string
} {
  if (result === undefined) {
    return { output: undefined, state: "input-available" }
  }
  let obj: Record<string, unknown> | null = null
  if (typeof result === "string") {
    if (result.startsWith(PENDING_CONFIRM_PREFIX)) {
      return { output: undefined, state: "output-available" }
    }
    try {
      const parsed = JSON.parse(result) as unknown
      if (typeof parsed === "object" && parsed !== null) {
        obj = parsed as Record<string, unknown>
      } else {
        obj = { value: parsed }
      }
    } catch {
      obj = { value: result }
    }
  } else if (typeof result === "object" && result !== null) {
    obj = result as Record<string, unknown>
  } else {
    obj = { value: result }
  }
  if (obj && "error" in obj && obj.error != null) {
    return {
      output: obj,
      state: "output-error",
      errorText: typeof obj.error === "string" ? obj.error : String(obj.error),
    }
  }
  return { output: obj ?? undefined, state: "output-available" }
}

function buildAssistantParts(
  msg: UIMessage,
  confirmedToolIds: Set<string>,
  successMessages: Record<string, string>,
  successData: Record<string, unknown>,
  onConfirm: (toolCallId: string, action: string, params: Record<string, unknown>) => () => void
): AssistantPart[] {
  const parts: AssistantPart[] = []
  const rawParts = msg.parts ?? []

  if (rawParts.length === 0 && msg.content) {
    parts.push({ type: "text", content: msg.content, markdown: true })
    return parts
  }

  const toolResultsByCallId = new Map<string, UIMessagePart>()
  for (const p of rawParts) {
    if (p.type === "tool-result" && "toolCallId" in p) {
      toolResultsByCallId.set(String(p.toolCallId), p)
    }
  }

  for (const p of rawParts) {
    if (p.type === "step-start") {
      continue
    }
    if (p.type === "text") {
      const text = "text" in p ? String(p.text ?? "") : ""
      if (text) parts.push({ type: "text", content: text, markdown: true })
      continue
    }

    let inv: ToolInvocationLike | null = null
    if (p.type === "tool-invocation" && "toolInvocation" in p && p.toolInvocation) {
      inv = p.toolInvocation as ToolInvocationLike
    } else if ((p.type === "tool-call" || p.type === "tool-invocation") && "toolCallId" in p && "toolName" in p) {
      inv = {
        toolCallId: String(p.toolCallId),
        toolName: String(p.toolName),
        args: "args" in p ? p.args : undefined,
        result: "result" in p ? p.result : undefined,
        state: "state" in p ? String(p.state) : undefined,
      }
    }

    if (inv) {
      const toolCallId = String(inv.toolCallId)
      const toolName = String(inv.toolName)
      const args = inv.args ?? {}
      const input = typeof args === "object" && args !== null ? (args as Record<string, unknown>) : {}
      const resultPart = toolResultsByCallId.get(toolCallId)
      const result =
        inv.result ?? (resultPart && "result" in resultPart ? resultPart.result : undefined)
      const resultStr = typeof result === "string" ? result : result != null ? JSON.stringify(result) : ""
      const pending = parsePendingConfirm(resultStr)
      const normalized = normalizeToolResult(result)

      const invState = inv.state?.toLowerCase()
      const state: ToolPart["state"] =
        result !== undefined
          ? normalized.state
          : invState === "result" || invState === "output-available"
            ? normalized.state
            : invState === "partial-call" || invState === "input-streaming"
              ? "input-streaming"
              : "input-available"

      const toolPart: ToolPart = {
        type: toolName,
        state,
        toolCallId,
        input,
        output: normalized.output,
        errorText: normalized.errorText,
      }

      const confirmed = confirmedToolIds.has(toolCallId)
      const successMessage = successMessages[toolCallId] ?? undefined
      const data = successData[toolCallId]
      const workOrder =
        data != null &&
        typeof data === "object" &&
        !Array.isArray(data) &&
        "workOrder" in data &&
        (data as { workOrder?: unknown }).workOrder
      const workOrderRow =
        workOrder != null && typeof workOrder === "object" && !Array.isArray(workOrder)
          ? (workOrder as Record<string, unknown>)
          : null

      if (pending && !confirmed) {
        parts.push({
          type: "tool",
          toolPart,
          confirm: {
            message: `Create work order "${String(input.title ?? "Untitled")}"?`,
            confirmLabel: "Confirm",
            onConfirm: onConfirm(toolCallId, pending.action, pending.params),
          },
          confirmed: false,
        })
      } else if (pending && confirmed && successMessage) {
        const successContent =
          toolName === "create_work_order" && workOrderRow ? (
            <div className="flex flex-col gap-2">
              <span>Work order created.</span>
              <CreatedWorkOrderCard workOrder={workOrderRow} />
            </div>
          ) : (
            successMessage
          )
        parts.push({
          type: "tool",
          toolPart,
          confirm: { message: "", confirmLabel: "", onConfirm: () => {} },
          confirmed: true,
          successMessage: successContent,
        })
      } else {
        parts.push({ type: "tool", toolPart })
      }
    }
  }

  if (parts.length === 0 && msg.content) {
    parts.push({ type: "text", content: msg.content, markdown: true })
  } else if (parts.length > 0 && !parts.some((x) => x.type === "text")) {
    const summary = humanReadableToolSummary(parts)
    if (summary) {
      parts.unshift({ type: "text", content: summary, markdown: false })
    }
  }
  return parts
}

/** One-line human-readable summary when the assistant reply is only tool output. */
function humanReadableToolSummary(parts: AssistantPart[]): string {
  const toolParts = parts.filter((p): p is AssistantPart & { type: "tool"; toolPart: ToolPart } => p.type === "tool")
  const first = toolParts[0]
  if (!first) return ""
  const name = first.toolPart.type
  const err = first.toolPart.errorText
  if (err) {
    if (name === "get_work_order") return "That work order wasn’t found."
    if (name === "get_asset") return "That asset wasn’t found."
    if (name === "get_location") return "That location wasn’t found."
    return err
  }
  if (name === "get_work_order") return "Here’s the work order."
  if (name === "list_work_orders") return "Here are the work orders."
  if (name === "list_assets") return "Here are the assets."
  if (name === "list_locations") return "Here are the locations."
  if (name === "get_dashboard_open_work_orders") return "Here are the open work orders."
  if (name === "get_dashboard_overdue_work_orders") return "Here are the overdue work orders."
  if (name === "get_asset") return "Here’s the asset."
  if (name === "get_location") return "Here’s the location."
  if (name === "list_status_catalogs") return "Here are the status options."
  if (name === "list_priority_catalogs") return "Here are the priority options."
  if (name === "search_similar_work_orders") {
    const out = first.toolPart.output as unknown
    if (typeof out === "string") {
      if (out.startsWith("error:")) return "Similar search failed."
      const lines = out.trim().split(/\r?\n/)
      if (lines.length < 2 || (lines.length === 2 && !lines[1]?.trim())) return "No similar past work orders found."
    } else if (out != null && typeof out === "object" && "results" in out) {
      const results = (out as { results?: unknown[] }).results
      if (Array.isArray(results) && results.length === 0) return "No similar past work orders found."
    }
    return "Here are similar past work orders."
  }
  return "Here’s what I found."
}

function mapUIMessagesToChatMessages(
  uiMessages: UIMessage[],
  confirmedToolIds: Set<string>,
  successMessages: Record<string, string>,
  successData: Record<string, unknown>,
  onConfirm: (toolCallId: string, action: string, params: Record<string, unknown>) => () => void
): ChatMessage[] {
  const out: ChatMessage[] = [WELCOME_MESSAGE]
  for (const msg of uiMessages) {
    if (msg.role === "user") {
      const content =
        msg.content ??
        (msg.parts?.find((p): p is UIMessagePart & { type: "text" } => p.type === "text")?.text ?? "") ??
        ""
      out.push({ role: "user", content: String(content) })
    } else if (msg.role === "assistant") {
      const assistantParts = buildAssistantParts(msg, confirmedToolIds, successMessages, successData, onConfirm)
      if (assistantParts.length === 0) {
        out.push({ role: "assistant", content: msg.content ?? "" })
      } else {
        out.push({ role: "assistant", parts: assistantParts })
      }
    }
  }
  return out
}

export function ChatClient() {
  const { session, tenantId } = useChatAuth()
  const [confirmedToolIds, setConfirmedToolIds] = React.useState<Set<string>>(new Set())
  const [successMessages, setSuccessMessages] = React.useState<Record<string, string>>({})
  const [successData, setSuccessData] = React.useState<Record<string, unknown>>({})

  const authPayload = React.useMemo(
    () => ({
      accessToken: session?.access_token ?? "",
      refreshToken: session?.refresh_token ?? "",
      tenantId: tenantId ?? "",
    }),
    [session?.access_token, session?.refresh_token, tenantId]
  )

  const { messages, input, setInput, handleSubmit } = useChat({
    api: "/api/chat",
    fetch: (input, init) => {
      let body: Record<string, unknown> = {}
      try {
        if (init?.body && typeof init.body === "string") {
          body = JSON.parse(init.body) as Record<string, unknown>
        }
      } catch {
        // ignore
      }
      return fetch(input, {
        ...init,
        body: JSON.stringify({ ...body, ...authPayload }),
      })
    },
  } as Parameters<typeof useChat>[0] & { fetch: typeof fetch })

  React.useEffect(() => {
    console.log("[chat] messages", messages)
  }, [messages])

  /** Guard: prevent double-execute when user clicks Confirm multiple times before first request completes. */
  const executingRef = React.useRef<Set<string>>(new Set())

  const onConfirm = React.useCallback(
    (toolCallId: string, action: string, params: Record<string, unknown>) => {
      return async () => {
        if (!session?.access_token || !tenantId) return
        if (executingRef.current.has(toolCallId)) return
        executingRef.current.add(toolCallId)
        try {
          const res = await fetch("/api/chat/execute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              accessToken: session.access_token,
              refreshToken: session.refresh_token ?? null,
              tenantId,
              action,
              params,
            }),
          })
          const data = (await res.json()) as { data?: unknown; error?: string }
          if (res.ok && data.data !== undefined) {
            setConfirmedToolIds((prev) => new Set(prev).add(toolCallId))
            setSuccessData((prev) => ({ ...prev, [toolCallId]: data.data }))
            if (action === "create_work_order" && data.data && typeof data.data === "object" && "workOrderId" in data.data) {
              setSuccessMessages((prev) => ({ ...prev, [toolCallId]: `Work order created.` }))
            } else {
              setSuccessMessages((prev) => ({ ...prev, [toolCallId]: "Done." }))
            }
          } else {
            setSuccessMessages((prev) => ({ ...prev, [toolCallId]: `Error: ${data.error ?? "Failed"}` }))
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : "Request failed"
          setSuccessMessages((prev) => ({ ...prev, [toolCallId]: `Error: ${message}` }))
        } finally {
          executingRef.current.delete(toolCallId)
        }
      }
    },
    [session?.access_token, session?.refresh_token, tenantId]
  )

  const chatMessages = React.useMemo(
    () =>
      mapUIMessagesToChatMessages(
        messages as UIMessage[],
        confirmedToolIds,
        successMessages,
        successData,
        onConfirm
      ),
    [messages, confirmedToolIds, successMessages, successData, onConfirm]
  )

  const onSubmit = () => {
    if (!input.trim()) return
    handleSubmit(new Event("submit") as unknown as React.FormEvent)
  }

  const onFilesAdded = (files: File[]) => {
    console.log("files", files)
  }

  return (
    <CMMSChat
      messages={chatMessages}
      inputValue={input}
      onInputChange={setInput}
      onSubmit={onSubmit}
      onFilesAdded={onFilesAdded}
      renderToolOutput={renderChatToolOutput}
      suggestedPrompts={SUGGESTED_PROMPTS}
      placeholder="Describe a problem, ask about an asset, or report downtime..."
      ariaTitle="Maintenance Assistant"
      ariaDescription="Describe a problem, ask about an asset, or say what's urgent."
    />
  )
}
