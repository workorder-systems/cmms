"use client"

import * as React from "react"

export type ChatExecuteContextValue = {
  executeAndReport: (
    action: string,
    params: Record<string, unknown>,
    toolCallId: string
  ) => Promise<void>
}

const ChatExecuteContext = React.createContext<ChatExecuteContextValue | null>(null)

export function useChatExecute(): ChatExecuteContextValue | null {
  return React.useContext(ChatExecuteContext)
}

export const ChatExecuteContextProvider = ChatExecuteContext.Provider
