import { ChatShell } from "@/components/chat-shell";
import { ChatClient } from "@/components/chat-client";

export default function ChatPage() {
  return (
    <ChatShell>
      <ChatClient />
    </ChatShell>
  )
}
