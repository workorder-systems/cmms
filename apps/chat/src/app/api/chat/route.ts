import { openai } from "@ai-sdk/openai"
import { streamText, convertToCoreMessages } from "ai"
import type { UIMessage } from "ai"
import type { CoreMessage } from "ai"

/** Max sequential LLM steps (tool rounds) per turn. Default is 1; set higher so model can e.g. list_assets then create_work_order. */
const MAX_TOOL_STEPS = 5
import { getDbClientForUser } from "@/lib/chat-db"
import { createChatTools } from "./tools"

export const maxDuration = 30

/** Max messages to send (user + assistant); keeps input tokens and cost low. */
const MAX_MESSAGES = 12

/** Max tokens the model can generate per reply; keeps responses short and cheap. */
const MAX_OUTPUT_TOKENS = 192

/** Category A: stateless list/dashboard/semantic tools. Replace full result with short summary in context. */
const CATEGORY_A_TOOLS = new Set([
  "list_work_orders",
  "list_assets",
  "list_locations",
  "get_dashboard_open_work_orders",
  "get_dashboard_overdue_work_orders",
  "search_similar_work_orders",
  "get_dashboard_metrics",
])

/** One-line summary per Category A tool for context (tool result ≠ conversation memory). */
function summaryForCategoryATool(toolName: string, result: unknown): string {
  if (result == null) return `${toolName}: no result.`
  const str = typeof result === "string" ? result : JSON.stringify(result)
  const len = str.length
  if (len > 2000) {
    const rows = (str.match(/\n/g) ?? []).length + (str.startsWith("[") ? 1 : 0)
    if (rows > 1) return `${toolName}: ${rows} rows returned. Displayed in UI.`
  }
  if (toolName === "list_work_orders") return "Listed work orders. Displayed in grid."
  if (toolName === "list_assets") return "Listed assets. Displayed in grid."
  if (toolName === "list_locations") return "Listed locations. Displayed in grid."
  if (toolName === "get_dashboard_open_work_orders") return "Listed open work orders. Displayed in grid."
  if (toolName === "get_dashboard_overdue_work_orders") return "Listed overdue work orders. Displayed in grid."
  if (toolName === "search_similar_work_orders") return "Similar past work orders returned. Displayed in grid."
  if (toolName === "get_dashboard_metrics") return "Dashboard metrics (charts) returned. Displayed in UI."
  return `${toolName}: result displayed in UI.`
}

/** Replace Category A tool results with short summary; leave Category B (detail) as-is. */
function replaceCategoryAToolResults(messages: CoreMessage[]): CoreMessage[] {
  return messages.map((msg) => {
    if (msg.role !== "tool" || !Array.isArray(msg.content)) return msg
    const newContent = msg.content.map((part) => {
      if (part.type !== "tool-result" || !CATEGORY_A_TOOLS.has(part.toolName)) return part
      return {
        ...part,
        result: summaryForCategoryATool(part.toolName, part.result),
      }
    })
    return { ...msg, content: newContent } as CoreMessage
  })
}

/** Strip tool result content from all tool messages before the last user message (pruneMessages-style). */
function pruneToolCallsBeforeLastMessage(messages: CoreMessage[]): CoreMessage[] {
  const lastUserIndex = messages.map((m) => m.role).lastIndexOf("user")
  if (lastUserIndex < 0) return messages
  return messages.map((msg, i) => {
    if (msg.role !== "tool" || !Array.isArray(msg.content)) return msg
    if (i > lastUserIndex) return msg
    const newContent = msg.content.map((part) => ({
      ...part,
      result: "[Result omitted from context.]",
    }))
    return { ...msg, content: newContent } as CoreMessage
  })
}

/** System prompt when tools are available (user authenticated with tenant). */
const SYSTEM_PROMPT_WITH_TOOLS = `You are a CMMS assistant in a chat app. Talk like a coworker on WhatsApp: short, plain text only. One line per reply unless the user asks for more.

Rules:
- Use tools for all data. Never assume execution without a tool result.
- After a tool runs, reply with ONE short line only (e.g. "Here are the overdue work orders." or "Here's the work order."). Never list, repeat, or format tool result data in your message—no bullets, no markdown tables, no "Title - description (priority, due: date)". The data is already shown in the UI (grid/card). Do not duplicate it.
- Only ask for strictly required fields; use tools to resolve the rest. Do not ask for optional fields when the user has given enough.

When the user asks to create a work order and mentions equipment or a place (e.g. HVAC, airco, pump, motor), call list_assets first. If the list has a matching asset, call create_work_order with that asset's id as assetId. Same for list_locations and locationId when they mention a location.`

/** System prompt when no tools (unauthenticated or no tenant). */
const SYSTEM_PROMPT = `You are a concise maintenance assistant. Keep answers short and actionable. Use at most 2–3 sentences unless the user explicitly asks for detail. To list or create work orders and assets, the user must sign in and select a tenant.`

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const messages = body.messages as UIMessage[] | undefined
    const accessToken = body.accessToken as string | undefined
    const refreshToken = (body.refreshToken as string | undefined) ?? null
    const tenantId = body.tenantId as string | undefined

    const trimmed =
      Array.isArray(messages) && messages.length > MAX_MESSAGES
        ? messages.slice(-MAX_MESSAGES)
        : messages ?? []

    let coreMessages = await convertToCoreMessages(trimmed)
    coreMessages = replaceCategoryAToolResults(coreMessages)
    coreMessages = pruneToolCallsBeforeLastMessage(coreMessages)
    const hasAuth = Boolean(
      accessToken && tenantId && accessToken.length > 0 && tenantId.length > 0
    )

    let tools: ReturnType<typeof createChatTools> | undefined

    if (hasAuth && accessToken && tenantId) {
      try {
        const db = await getDbClientForUser(accessToken, refreshToken, tenantId)
        tools = createChatTools(db)
      } catch (err) {
        console.warn("Chat API: could not create authenticated client:", err)
      }
    }

    const systemContent = tools ? SYSTEM_PROMPT_WITH_TOOLS : SYSTEM_PROMPT
    const withSystem = [
      { role: "system" as const, content: systemContent },
      ...coreMessages,
    ]

    const result = streamText({
      model: openai("gpt-4o-mini"),
      messages: withSystem,
      maxTokens: MAX_OUTPUT_TOKENS,
      ...(tools && {
        tools,
        maxSteps: MAX_TOOL_STEPS,
      }),
    })
    return result.toDataStreamResponse()
  } catch (error) {
    console.error("Chat API error:", error)
    return new Response(
      JSON.stringify({ error: "Failed to process chat" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
