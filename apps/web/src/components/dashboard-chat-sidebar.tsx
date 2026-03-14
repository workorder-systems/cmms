'use client'

import * as React from 'react'
import { create } from 'zustand'
import { ArrowUp, Copy, ThumbsDown, ThumbsUp, X } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import {
  ChatContainerContent,
  ChatContainerRoot,
  ChatContainerScrollAnchor,
} from '@workspace/ui/components/prompt-kit'
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
} from '@workspace/ui/components/prompt-kit'
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
  usePromptInput,
} from '@workspace/ui/components/prompt-kit'
import { ScrollButton } from '@workspace/ui/components/prompt-kit'
import { useAppShell } from '@workspace/ui/components/app-shell'
import { cn } from '@workspace/ui/lib/utils'

const MESSAGE_CLASS = 'flex w-full flex-col gap-2'
const ACTIONS_CLASS =
  'flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100'

export type ChatMessage = { role: 'user' | 'assistant'; content: string }

type DashboardChatStore = {
  messages: ChatMessage[]
  inputValue: string
  isLoading: boolean
  setInputValue: (value: string) => void
  submit: () => void
}

const useDashboardChatStore = create<DashboardChatStore>((set, get) => ({
  messages: [],
  inputValue: '',
  isLoading: false,
  setInputValue: (value) => set({ inputValue: value }),
  submit: () => {
    const { inputValue, isLoading, messages } = get()
    const text = inputValue.trim()
    if (!text || isLoading) return
    set({
      inputValue: '',
      messages: [...messages, { role: 'user', content: text }],
      isLoading: true,
    })
    setTimeout(() => {
      set((state) => ({
        messages: [
          ...state.messages,
          {
            role: 'assistant',
            content:
              'You asked: "' +
              text +
              '"\n\nThis assistant can be connected to your CMMS API to answer questions about work orders, assets, and locations.',
          },
        ],
        isLoading: false,
      }))
    }, 400)
  },
}))

function SendButton() {
  const { onSubmit } = usePromptInput()
  return (
    <Button
      type="button"
      size="icon"
      className="size-9 rounded-full"
      aria-label="Send"
      onClick={() => onSubmit?.()}
    >
      <ArrowUp className="size-4" />
    </Button>
  )
}

const WELCOME_CONTENT =
  "Hi, I'm the maintenance assistant. Describe a problem, ask what's urgent, or check an asset — I'll create work orders, summarize priorities, and suggest next steps."

function DashboardChatHeader() {
  const { rightSidebar } = useAppShell()
  return (
    <div
      data-slot="sidebar-header"
      data-sidebar="header"
      className="flex shrink-0 items-center justify-between gap-2 p-2"
    >
      <h2 className="text-sidebar-foreground truncate text-sm font-semibold">
        Ask
      </h2>
      <Button
        variant="ghost"
        size="icon"
        className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground size-7 shrink-0"
        aria-label="Close chat"
        onClick={() => rightSidebar.close()}
      >
        <X className="size-4" />
      </Button>
    </div>
  )
}

/** Messages only – rendered in sidebar.right.content so it can use full height. */
function DashboardChatMessages() {
  const messages = useDashboardChatStore((s) => s.messages)
  const isLoading = useDashboardChatStore((s) => s.isLoading)

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <ChatContainerRoot className="h-full">
        <ChatContainerContent className="space-y-6 px-4 py-4">
          <Message className={cn(MESSAGE_CLASS, 'items-start')}>
            <div className="group flex w-full flex-col gap-0">
              <MessageContent
                className="text-foreground prose w-full min-w-0 rounded-lg bg-transparent p-0"
                markdown
              >
                {WELCOME_CONTENT}
              </MessageContent>
            </div>
          </Message>

          {messages.map((msg, i) =>
            msg.role === 'user' ? (
              <Message key={i} className={cn(MESSAGE_CLASS, 'items-end')}>
                <div className="group flex w-full flex-col items-end gap-1">
                  <MessageContent className="bg-muted text-foreground max-w-[85%] whitespace-pre-wrap rounded-3xl px-5 py-2.5">
                    {msg.content}
                  </MessageContent>
                  <MessageActions className={ACTIONS_CLASS}>
                    <MessageAction tooltip="Copy" delayDuration={100}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full"
                      >
                        <Copy className="size-4" />
                      </Button>
                    </MessageAction>
                  </MessageActions>
                </div>
              </Message>
            ) : (
              <Message key={i} className={cn(MESSAGE_CLASS, 'items-start')}>
                <div className="group flex w-full flex-col gap-0 space-y-2">
                  <MessageContent
                    className="text-foreground prose w-full min-w-0 flex-1 rounded-lg bg-transparent p-0"
                    markdown
                  >
                    {msg.content}
                  </MessageContent>
                  <MessageActions className={cn('-ml-2.5', ACTIONS_CLASS)}>
                    <MessageAction tooltip="Copy" delayDuration={100}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full"
                      >
                        <Copy className="size-4" />
                      </Button>
                    </MessageAction>
                    <MessageAction tooltip="Upvote" delayDuration={100}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full"
                      >
                        <ThumbsUp className="size-4" />
                      </Button>
                    </MessageAction>
                    <MessageAction tooltip="Downvote" delayDuration={100}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full"
                      >
                        <ThumbsDown className="size-4" />
                      </Button>
                    </MessageAction>
                  </MessageActions>
                </div>
              </Message>
            )
          )}

          {isLoading && (
            <Message className={cn(MESSAGE_CLASS, 'items-start')}>
              <MessageContent className="text-muted-foreground prose w-full min-w-0 rounded-lg bg-transparent p-0">
                Thinking…
              </MessageContent>
            </Message>
          )}

          <ChatContainerScrollAnchor />
        </ChatContainerContent>
        <div className="absolute bottom-4 right-4">
          <ScrollButton />
        </div>
      </ChatContainerRoot>
    </div>
  )
}

/** Suggested prompts + input – rendered in sidebar.right.footer so it stays at bottom. */
function DashboardChatFooter() {
  const inputValue = useDashboardChatStore((s) => s.inputValue)
  const setInputValue = useDashboardChatStore((s) => s.setInputValue)
  const submit = useDashboardChatStore((s) => s.submit)
  const isLoading = useDashboardChatStore((s) => s.isLoading)

  return (
    <PromptInput
        value={inputValue}
        onValueChange={setInputValue}
        onSubmit={submit}
        disabled={isLoading}
        className="relative z-10 w-full rounded-3xl p-0 pt-1"
      >
        <div className="flex flex-col">
          <PromptInputTextarea
            placeholder="Describe a problem, ask about an asset, or report downtime..."
            className="min-h-[44px] resize-none border-0 bg-transparent pt-3 pl-4 text-base leading-[1.3] focus-visible:ring-0 dark:bg-transparent"
          />
          <PromptInputActions className="mt-3 flex w-full items-center justify-end gap-2 p-2">
            <PromptInputAction tooltip="Send" side="top">
              <SendButton />
            </PromptInputAction>
          </PromptInputActions>
        </div>
      </PromptInput>
  )
}

export { DashboardChatHeader, DashboardChatMessages, DashboardChatFooter }
