import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { Send } from "lucide-react"
import { Button } from "./button"
import { Textarea } from "./textarea"
import { ScrollArea } from "./scroll-area"
import { Avatar, AvatarFallback } from "./avatar"
import { cn } from "@workspace/ui/lib/utils"

/**
 * ChatGPT-style chat interface: header, scrollable message list (user/assistant),
 * and a fixed input area. For demo purposes only; no real API calls.
 */
function ChatGPTInterface() {
  const [input, setInput] = useState("")

  const messages: { id: string; role: "user" | "assistant"; content: string }[] = [
    {
      id: "1",
      role: "user",
      content: "What's the best way to structure a React component for a chat UI?",
    },
    {
      id: "2",
      role: "assistant",
      content:
        "A common approach is to separate concerns: a container that holds state and fetches data, a message list component that renders the scrollable thread, and a presentational input bar. Use a ref on the message list container and scroll to bottom when new messages arrive so the latest message stays in view.",
    },
    {
      id: "3",
      role: "user",
      content: "Can you show a minimal example with hooks?",
    },
    {
      id: "4",
      role: "assistant",
      content:
        "Sure. You could use `useState` for messages and input value, `useRef` for the scroll container, and `useEffect` to scroll when `messages.length` changes. The input form calls a handler that appends a user message and then (in a real app) triggers an API request; the response would be appended as an assistant message.",
    },
  ]

  return (
    <div
      className={cn(
        "bg-background text-foreground flex h-[600px] w-full max-w-2xl flex-col overflow-hidden rounded-xl border shadow-lg"
      )}
    >
      {/* Header */}
      <header className="border-b bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar size="sm" className="size-8">
            <AvatarFallback className="bg-primary/10 text-primary">AI</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="font-semibold">Assistant</h1>
            <p className="text-muted-foreground text-xs">Always here to help</p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-4">
        <div className="flex flex-col gap-6">
          {messages.map((msg) =>
            msg.role === "user" ? (
              <div key={msg.id} className="flex justify-end">
                <div
                  className={cn(
                    "bg-primary text-primary-foreground max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 text-sm"
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ) : (
              <div key={msg.id} className="flex gap-3">
                <Avatar size="sm" className="size-8 shrink-0">
                  <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                    AI
                  </AvatarFallback>
                </Avatar>
                <div
                  className={cn(
                    "bg-muted/60 max-w-[85%] rounded-2xl rounded-bl-md px-4 py-2.5 text-sm"
                  )}
                >
                  {msg.content}
                </div>
              </div>
            )
          )}
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="border-t bg-muted/20 p-4">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (input.trim()) setInput("")
          }}
        >
          <Textarea
            placeholder="Message Assistant…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                if (input.trim()) setInput("")
              }
            }}
            className="min-h-10 max-h-32 resize-none py-2.5"
            rows={1}
          />
          <Button type="submit" size="icon" className="shrink-0" disabled={!input.trim()}>
            <Send className="size-4" aria-hidden />
            <span className="sr-only">Send</span>
          </Button>
        </form>
        <p className="text-muted-foreground mt-2 text-center text-xs">
          This is a demo. Messages are not sent anywhere.
        </p>
      </div>
    </div>
  )
}

const meta = {
  title: "Demos/ChatGPT Interface",
  component: ChatGPTInterface,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ChatGPTInterface>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
