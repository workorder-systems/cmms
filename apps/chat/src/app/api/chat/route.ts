import { openai } from "@ai-sdk/openai"
import { streamText, convertToCoreMessages } from "ai"
import type { UIMessage } from "ai"
import { getDbClientForUser } from "@/lib/chat-db"
import { createChatTools } from "./tools"

export const maxDuration = 30

/** Max messages to send (user + assistant); keeps input tokens and cost low. */
const MAX_MESSAGES = 20

/** Max tokens the model can generate per reply; keeps responses short and cheap. */
const MAX_OUTPUT_TOKENS = 256

/** System prompt when tools are available (user authenticated with tenant). */
const SYSTEM_PROMPT_WITH_TOOLS = `You are a concise maintenance assistant with access to the user's CMMS data. You can:
- Read: list and get work orders, assets, locations, dashboard open/overdue work orders, and catalogs. These run immediately.
- Write: create work orders, transition status, complete work orders, create/update assets. These require the user to confirm before anything is changed; you will receive a pending confirmation and should ask the user to confirm.
Keep answers short. Use tools to answer questions about work orders, assets, and status. For create/update, summarize what you will do and tell the user they need to confirm.`

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

    const coreMessages = await convertToCoreMessages(trimmed)
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
      ...(tools && { tools }),
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
