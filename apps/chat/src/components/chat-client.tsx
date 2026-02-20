"use client"

import { CMMSChat, type ChatMessage } from "@workspace/ui/components/prompt-kit"
import { useChat } from "@ai-sdk/react"

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

function mapUIMessagesToChatMessages(
  uiMessages: { role: string; content: string }[]
): ChatMessage[] {
  const out: ChatMessage[] = [WELCOME_MESSAGE]
  for (const msg of uiMessages) {
    if (msg.role === "user") {
      out.push({ role: "user", content: msg.content ?? "" })
    } else if (msg.role === "assistant") {
      out.push({
        role: "assistant",
        content: msg.content ?? "",
      })
    }
  }
  return out
}

export function ChatClient() {
  const { messages, input, setInput, handleSubmit, status } = useChat({
    api: "/api/chat",
  })

  const chatMessages = mapUIMessagesToChatMessages(messages)

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
      suggestedPrompts={SUGGESTED_PROMPTS}
      placeholder="Describe a problem, ask about an asset, or report downtime..."
      ariaTitle="Maintenance Assistant"
      ariaDescription="Describe a problem, ask about an asset, or say what's urgent."
    />
  )
}
