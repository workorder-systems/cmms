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

/** Tools whose last result before the user message we keep in full so the model can resolve "move the X one" to the right id (search result or list). */
const TOOLS_KEEP_LAST_FOR_RESOLVE = new Set([
  "list_work_orders",
  "list_assets",
  "list_locations",
  "search_similar_work_orders",
])

/** Find (messageIndex, partIndex) of the most recent resolve-capable tool result (list or search_similar_work_orders) before the last user message. */
function findLastListResultBeforeUser(messages: CoreMessage[]): { msgIdx: number; partIdx: number; toolName: string } | null {
  const lastUserIndex = messages.map((m) => m.role).lastIndexOf("user")
  let last: { msgIdx: number; partIdx: number; toolName: string } | null = null
  for (let i = 0; i < messages.length && i < lastUserIndex; i++) {
    const msg = messages[i]
    if (!msg || msg.role !== "tool" || !Array.isArray(msg.content)) continue
    const content = msg.content as Array<{ type: string; toolName?: string }>
    for (let j = 0; j < content.length; j++) {
      const part = content[j]
      const name = part?.toolName
      if (part?.type === "tool-result" && name && TOOLS_KEEP_LAST_FOR_RESOLVE.has(name)) {
        last = { msgIdx: i, partIdx: j, toolName: name }
      }
    }
  }
  return last
}

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

/** Replace Category A tool results with short summary; leave the last list result before the user message full so the model can match "move the X one" to the correct id. */
function replaceCategoryAToolResults(
  messages: CoreMessage[],
  keepFull: { msgIdx: number; partIdx: number } | null
): CoreMessage[] {
  return messages.map((msg, msgIdx) => {
    if (msg.role !== "tool" || !Array.isArray(msg.content)) return msg
    const newContent = msg.content.map((part, partIdx) => {
      if (part.type !== "tool-result" || !CATEGORY_A_TOOLS.has(part.toolName)) return part
      if (keepFull && keepFull.msgIdx === msgIdx && keepFull.partIdx === partIdx) return part
      return {
        ...part,
        result: summaryForCategoryATool(part.toolName, part.result),
      }
    })
    return { ...msg, content: newContent } as CoreMessage
  })
}

/** Strip tool result content from all tool messages before the last user message, except the one list result we keep full so the model can match "move the X one" to the correct id. */
function pruneToolCallsBeforeLastMessage(
  messages: CoreMessage[],
  keepFull: { msgIdx: number; partIdx: number } | null
): CoreMessage[] {
  const lastUserIndex = messages.map((m) => m.role).lastIndexOf("user")
  if (lastUserIndex < 0) return messages
  return messages.map((msg, msgIdx) => {
    if (msg.role !== "tool" || !Array.isArray(msg.content)) return msg
    if (msgIdx > lastUserIndex) return msg
    const newContent = msg.content.map((part, partIdx) => {
      if (keepFull && keepFull.msgIdx === msgIdx && keepFull.partIdx === partIdx) return part
      return { ...part, result: "[Result omitted from context.]" }
    })
    return { ...msg, content: newContent } as CoreMessage
  })
}

/** System prompt when tools are available (user authenticated with tenant). */
const SYSTEM_PROMPT_WITH_TOOLS = `You are a CMMS assistant in a chat app. Talk like a coworker on WhatsApp: short, plain text only. One line per reply unless the user asks for more.

Rules:
- Use tools for all data. Never assume execution without a tool result.
- After a tool runs, reply with ONE short line only (e.g. "Here are the overdue work orders." or "Here's the work order."). Never list, repeat, or format tool result data in your message—no bullets, no markdown tables, no "Title - description (priority, due: date)". The data is already shown in the UI (grid/card). Do not duplicate it.
- Only ask for strictly required fields; use tools to resolve the rest. Do not ask for optional fields when the user has given enough.

When the user asks for work orders by priority or status (e.g. "critical work orders", "only high priority", "overdue critical"), use the list or dashboard tools with the matching priority or status filter (e.g. priority: "critical", status: "in_progress").
When the user asks to complete a work order or move one to completed (e.g. "complete the replace light fixtures", "move that to completed"), use list_work_orders with status=in_progress so completed work orders are excluded—only work orders that can still be completed are shown. Match by title/name; if multiple match, use show_work_order_picker. When completing for the first time, if the user has not yet provided cause and/or resolution, ask for them (e.g. "What was the cause and how was it resolved?") before calling complete_work_order.
When the user wants to add or update cause and resolution on an already-completed work order (e.g. "add cause to the HVAC one", "update resolution for that work order"), use list_work_orders with status=completed to find it if needed, then call complete_work_order with the work order id and the cause/resolution—it will only update those fields.
When the user refers to a work order by name for other actions (e.g. move to in_progress), use list_work_orders with an appropriate status filter.
When the user asks to create a work order and mentions equipment or a place (e.g. HVAC, airco), call list_assets. If exactly one asset matches, use its id as assetId. If multiple assets match or you are not sure which one, call show_asset_picker with the options and follow-up action—do not guess. Same for list_locations and locationId when they mention a location.`

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
    const keepFullList = findLastListResultBeforeUser(coreMessages)
    const keepFull = keepFullList ? { msgIdx: keepFullList.msgIdx, partIdx: keepFullList.partIdx } : null
    coreMessages = replaceCategoryAToolResults(coreMessages, keepFull)
    coreMessages = pruneToolCallsBeforeLastMessage(coreMessages, keepFull)
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
