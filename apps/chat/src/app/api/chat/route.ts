import { openai } from "@ai-sdk/openai"
import { streamText, convertToCoreMessages } from "ai"
import type { UIMessage } from "ai"

export const maxDuration = 30

/** Max messages to send (user + assistant); keeps input tokens and cost low. */
const MAX_MESSAGES = 20

/** Max tokens the model can generate per reply; keeps responses short and cheap. */
const MAX_OUTPUT_TOKENS = 256

/** System prompt to encourage brief, focused answers. */
const SYSTEM_PROMPT = `You are a concise maintenance assistant. Keep answers short and actionable. Use at most 2–3 sentences unless the user explicitly asks for detail.`

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json()
    const trimmed =
      Array.isArray(messages) && messages.length > MAX_MESSAGES
        ? messages.slice(-MAX_MESSAGES)
        : messages ?? []

    const coreMessages = await convertToCoreMessages(trimmed)
    const withSystem = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      ...coreMessages,
    ]

    const result = streamText({
      model: openai("gpt-4o-mini"),
      messages: withSystem,
      maxTokens: MAX_OUTPUT_TOKENS,
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
