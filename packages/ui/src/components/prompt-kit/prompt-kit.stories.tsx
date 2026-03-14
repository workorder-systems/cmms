import type { Meta, StoryObj } from "@storybook/react"
import { fn } from "@storybook/test"
import {
  ChatContainerRoot,
  ChatContainerContent,
  ChatContainerScrollAnchor,
  Message,
  MessageAvatar,
  MessageContent,
  MessageActions,
  MessageAction,
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
  PromptInputAction,
  ResponseStream,
  Tool,
  Steps,
  StepsItem,
  StepsTrigger,
  StepsContent,
  SystemMessage,
  ChainOfThought,
  ChainOfThoughtStep,
  ChainOfThoughtTrigger,
  ChainOfThoughtContent,
  ThinkingBar,
  FeedbackBar,
  ScrollButton,
  FileUpload,
  FileUploadTrigger,
  FileUploadContent,
  Source,
  SourceTrigger,
  SourceContent,
  JsxPreview,
  Markdown,
  CodeBlock,
  CodeBlockCode,
  CodeBlockGroup,
  Loader,
  TextShimmer,
  Image,
  CMMSChat,
  type ChatMessage,
} from "./index"
import { CatalogPriorityBadge } from "@workspace/ui/components/catalog-priority-badge"
import { CatalogStatusBadge } from "@workspace/ui/components/catalog-status-badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader } from "@workspace/ui/components/card"
import { ArrowUp, Copy, Paperclip, Send, ThumbsDown, ThumbsUp } from "lucide-react"
import { useState, useMemo } from "react"

const meta = {
  title: "Prompt Kit/AI-first CMMS Chat",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "An AI-first CMMS where the chat is the operating system: intent → AI interprets → structured result → confirm → execute → log. Multiple cases: create work order, query urgency, next-action suggestions; suggestion chips guide discovery and follow-ups.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta

export default meta

type Story = StoryObj<typeof meta>

/* Catalogs for work order preview (status/priority colors). */
const PREVIEW_STATUS_CATALOG = [
  { key: "draft", name: "Draft", color: "#94a3b8" },
  { key: "in_progress", name: "In progress", color: "#3b82f6" },
  { key: "completed", name: "Completed", color: "#22c55e" },
]
const PREVIEW_PRIORITY_CATALOG = [
  { key: "low", name: "Low", color: "#22c55e" },
  { key: "medium", name: "Medium", color: "#eab308" },
  { key: "high", name: "High", color: "#f97316" },
  { key: "urgent", name: "Urgent", color: "#ef4444" },
]

/* Suggested prompts: reusable chip row */
const SUGGESTED_PROMPTS = [
  "Report a problem",
  "What's urgent?",
  "Asset status",
  "Create work order",
  "Show a report",
] as const

const FOLLOW_UP_SUGGESTIONS = [
  "Assign WO-2024-038",
  "View all urgent",
  "Create another WO",
] as const

/**
 * **Full conversation: AI-first CMMS — multiple cases, suggestions**
 *
 * **Flow:** (1) Welcome + suggested prompts. (2) **Create:** Tool, preview, confirm, FeedbackBar. (3) **Query:** Steps + Source. (4) **Suggest:** Tool + Steps + follow-up chips.
 */
export const CMMSChatConversation: Story = {
  render: function CMMSChatConversationRender() {
    const [confirmed, setConfirmed] = useState(false)
    const [feedbackClosed, setFeedbackClosed] = useState(false)
    const [inputValue, setInputValue] = useState("")

    return (
      <div className="bg-background flex h-screen w-full flex-col overflow-hidden">
        <div className="sr-only">
          <h2 className="font-semibold">Maintenance Assistant</h2>
          <p className="text-muted-foreground text-sm">
            Describe a problem, ask about an asset, or say what’s urgent.
          </p>
        </div>

        <ChatContainerRoot className="relative flex-1 space-y-0">
          <ChatContainerContent className="space-y-12 px-4 py-12">
            {/* Welcome */}
            <Message className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-2 md:px-10 items-start">
              <div className="group flex w-full flex-col gap-0">
                <MessageContent className="text-foreground prose w-full min-w-0 rounded-lg bg-transparent p-0" markdown>
                  {`Hi, I'm the maintenance assistant. Describe a problem, ask what's urgent, or check an asset — I'll create work orders, summarize priorities, and suggest next steps.`}
                </MessageContent>
              </div>
            </Message>

            {/* Turn 1 – User: describe problem */}
            <Message className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-2 md:px-10 items-end">
              <div className="group flex w-full flex-col items-end gap-1">
                <MessageContent className="bg-muted text-foreground max-w-[85%] rounded-3xl px-5 py-2.5 whitespace-pre-wrap sm:max-w-[75%]">
                  Pump P-101 is making a grinding noise near the motor. Can you create a work order?
                </MessageContent>
                <MessageActions className="flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                  <MessageAction tooltip="Copy" delayDuration={100}>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <Copy className="size-4" />
                    </Button>
                  </MessageAction>
                </MessageActions>
              </div>
            </Message>

            {/* Turn 1 – Assistant: Tool, intro, preview, confirm */}
            <Message className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-2 md:px-10 items-start">
              <div className="group flex w-full flex-col gap-0 space-y-2">
                <div className="w-full">
                  <Tool
                    toolPart={{
                      type: "create_work_order",
                      state: "output-available",
                      toolCallId: "call_wo_1",
                      input: {
                        title: "Inspect and repair pump P-101 - grinding noise near motor",
                        asset_id: "asset_p101",
                        priority: "high",
                        description: "Reported grinding noise near motor. Requires inspection and possible bearing/seal work.",
                      },
                      output: {
                        id: "wo-2024-042",
                        status: "draft",
                        created_at: "2024-02-19T10:30:00Z",
                      },
                    }}
                  />
                </div>
                <MessageContent
                  className="text-foreground prose w-full min-w-0 flex-1 rounded-lg bg-transparent p-0"
                  markdown
                >
                  {`I'll create a work order for **Pump P-101** based on your report. Here's what I'm about to do:`}
                </MessageContent>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
                    Preview
                  </p>
                  <Card className="py-4">
                    <CardHeader className="space-y-2 pb-2">
                      <p className="font-medium leading-snug">Inspect and repair pump P-101 – grinding noise near motor</p>
                      <p className="text-muted-foreground text-sm">Pump P-101</p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <CatalogStatusBadge statusKey="draft" statusCatalog={PREVIEW_STATUS_CATALOG} className="font-normal" />
                        <CatalogPriorityBadge priorityKey="high" priorityCatalog={PREVIEW_PRIORITY_CATALOG} className="font-normal" />
                      </div>
                    </CardHeader>
                    <CardContent className="text-muted-foreground pt-0 text-sm">
                      Will be created when you confirm below.
                    </CardContent>
                  </Card>
                </div>

                {!confirmed ? (
                  <SystemMessage
                    variant="action"
                    fill
                    cta={{
                      label: "Confirm & create",
                      variant: "solid",
                      onClick: () => setConfirmed(true),
                    }}
                  >
                    Confirm to create work order WO-2024-042. You can edit details after creation.
                  </SystemMessage>
                ) : (
                  <>
                    <SystemMessage variant="action" fill>
                      Work order <strong>WO-2024-042</strong> created. It’s in Draft; you can assign
                      and schedule it from the work orders list.
                    </SystemMessage>
                    {!feedbackClosed && (
                      <FeedbackBar
                        title="Was this helpful?"
                        onHelpful={fn()}
                        onNotHelpful={fn()}
                        onClose={() => setFeedbackClosed(true)}
                      />
                    )}
                  </>
                )}
                <MessageActions className="-ml-2.5 flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                  <MessageAction tooltip="Copy" delayDuration={100}>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <Copy className="size-4" />
                    </Button>
                  </MessageAction>
                  <MessageAction tooltip="Upvote" delayDuration={100}>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <ThumbsUp className="size-4" />
                    </Button>
                  </MessageAction>
                  <MessageAction tooltip="Downvote" delayDuration={100}>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <ThumbsDown className="size-4" />
                    </Button>
                  </MessageAction>
                </MessageActions>
              </div>
            </Message>

            {/* Turn 2 – User: what's urgent */}
            <Message className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-2 md:px-10 items-end">
              <div className="group flex w-full flex-col items-end gap-1">
                <MessageContent className="bg-muted text-foreground max-w-[85%] rounded-3xl px-5 py-2.5 whitespace-pre-wrap sm:max-w-[75%]">
                  {`What's urgent right now?`}
                </MessageContent>
                <MessageActions className="flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                  <MessageAction tooltip="Copy" delayDuration={100}>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <Copy className="size-4" />
                    </Button>
                  </MessageAction>
                </MessageActions>
              </div>
            </Message>

            {/* Turn 2 – Assistant: urgency breakdown (Steps + Source) */}
            <Message className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-2 md:px-10 items-start">
              <div className="group flex w-full flex-col gap-0 space-y-2">
                <Steps>
                  <StepsTrigger>Urgency breakdown</StepsTrigger>
                  <StepsContent>
                    <div className="space-y-2">
                      <StepsItem>Overdue</StepsItem>
                      <ul className="text-muted-foreground list-inside list-disc text-sm">
                        <li>WO-2024-038 – Replace filter F-02 (2 days overdue)</li>
                      </ul>
                      <StepsItem>Due this week</StepsItem>
                      <ul className="text-muted-foreground list-inside list-disc text-sm">
                        <li>WO-2024-042 – Pump P-101 grinding noise (just created)</li>
                        <li>WO-2024-040 – HVAC inspection Bldg A</li>
                      </ul>
                      <div className="flex flex-wrap gap-1.5">
                        <Source href="https://app.cmms.example/work-orders">
                          <SourceTrigger label="Work orders" showFavicon />
                          <SourceContent
                            title="Work orders list"
                            description="Open and overdue work orders used for this summary."
                          />
                        </Source>
                      </div>
                    </div>
                  </StepsContent>
                </Steps>

                <MessageContent
                  className="text-foreground prose w-full min-w-0 flex-1 rounded-lg bg-transparent p-0"
                  markdown={false}
                >
                  <Markdown className="text-foreground prose w-full min-w-0 rounded-lg bg-transparent p-0">
                    {`I'd tackle **WO-2024-038** first (overdue), then **WO-2024-042** (P-101) and **WO-2024-040** this week.`}
                  </Markdown>
                  {" "}
                  Data from{" "}
                  <Source href="https://app.cmms.example/work-orders">
                    <SourceTrigger label="Work orders" showFavicon />
                    <SourceContent
                      title="Work orders list"
                      description="Open and overdue work orders used for this summary."
                    />
                  </Source>
                  .
                </MessageContent>
                <MessageActions className="-ml-2.5 flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                  <MessageAction tooltip="Copy" delayDuration={100}>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <Copy className="size-4" />
                    </Button>
                  </MessageAction>
                  <MessageAction tooltip="Upvote" delayDuration={100}>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <ThumbsUp className="size-4" />
                    </Button>
                  </MessageAction>
                  <MessageAction tooltip="Downvote" delayDuration={100}>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <ThumbsDown className="size-4" />
                    </Button>
                  </MessageAction>
                </MessageActions>
              </div>
            </Message>

            {/* Turn 3 – User: suggest next */}
            <Message className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-2 md:px-10 items-end">
              <div className="group flex w-full flex-col items-end gap-1">
                <MessageContent className="bg-muted text-foreground max-w-[85%] rounded-3xl px-5 py-2.5 whitespace-pre-wrap sm:max-w-[75%]">
                  Suggest what I should do next.
                </MessageContent>
                <MessageActions className="flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                  <MessageAction tooltip="Copy" delayDuration={100}>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <Copy className="size-4" />
                    </Button>
                  </MessageAction>
                </MessageActions>
              </div>
            </Message>

            {/* Turn 3 – Assistant: next-action suggestions (Tool + Steps + follow-up chips) */}
            <Message className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-2 md:px-10 items-start">
              <div className="group flex w-full flex-col gap-0 space-y-2">
                <Tool
                  toolPart={{
                    type: "get_next_actions",
                    state: "output-available",
                    toolCallId: "call_sugg_1",
                    input: { context: "urgency_summary" },
                    output: {
                      suggestions: [
                        { id: "wo-038", action: "Assign WO-2024-038", reason: "Overdue" },
                        { id: "wo-042", action: "Schedule WO-2024-042", reason: "High priority" },
                        { id: "inspect", action: "Run HVAC inspection", reason: "Due this week" },
                      ],
                    },
                  }}
                />
                <MessageContent
                  className="text-foreground prose w-full min-w-0 flex-1 rounded-lg bg-transparent p-0"
                  markdown
                >
                  Based on urgency, here are the next actions I recommend:
                </MessageContent>
                <Steps>
                  <StepsTrigger>Recommended next steps</StepsTrigger>
                  <StepsContent>
                    <div className="space-y-2">
                      <StepsItem>1. Assign WO-2024-038 (Replace filter F-02) — overdue; assign to a tech and schedule.</StepsItem>
                      <StepsItem>2. Schedule WO-2024-042 (Pump P-101) — high priority; book inspection or parts.</StepsItem>
                      <StepsItem>3. Run HVAC inspection for WO-2024-040 (Bldg A) — due this week.</StepsItem>
                    </div>
                  </StepsContent>
                </Steps>
                <p className="text-muted-foreground text-sm">
                  {`You can say "Assign WO-2024-038 to John" or "View all urgent" to continue.`}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {FOLLOW_UP_SUGGESTIONS.map((label) => (
                    <Button
                      key={label}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full text-xs"
                      onClick={() => setInputValue(label)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
                <MessageActions className="-ml-2.5 flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                  <MessageAction tooltip="Copy" delayDuration={100}>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <Copy className="size-4" />
                    </Button>
                  </MessageAction>
                  <MessageAction tooltip="Upvote" delayDuration={100}>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <ThumbsUp className="size-4" />
                    </Button>
                  </MessageAction>
                  <MessageAction tooltip="Downvote" delayDuration={100}>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <ThumbsDown className="size-4" />
                    </Button>
                  </MessageAction>
                </MessageActions>
              </div>
            </Message>

            <ChatContainerScrollAnchor />
          </ChatContainerContent>
          <div className="absolute right-4 bottom-4">
            <ScrollButton />
          </div>
        </ChatContainerRoot>

        <div className="inset-x-0 bottom-0 mx-auto w-full max-w-3xl shrink-0 px-3 pb-3 md:px-5 md:pb-5">
          <div className="mb-2 flex flex-wrap gap-2">
            <span className="text-muted-foreground text-xs font-medium self-center">Try asking:</span>
            {SUGGESTED_PROMPTS.map((label) => (
              <Button
                key={label}
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full text-xs"
                onClick={() => setInputValue(label)}
              >
                {label}
              </Button>
            ))}
          </div>
          <FileUpload onFilesAdded={fn()}>
            <PromptInput
              onSubmit={fn()}
              value={inputValue}
              onValueChange={setInputValue}
              className="border-input bg-popover relative z-10 w-full rounded-3xl border p-0 pt-1 shadow-xs"
            >
              <div className="flex flex-col">
                <PromptInputTextarea
                  placeholder="Describe a problem, ask about an asset, or report downtime..."
                  className="min-h-[44px] pt-3 pl-4 text-base leading-[1.3] sm:text-base md:text-base"
                />
                <PromptInputActions className="mt-3 flex w-full items-center justify-between gap-2 p-2">
                  <PromptInputAction tooltip="Attach file" side="top">
                    <FileUploadTrigger asChild>
                      <Button type="button" variant="ghost" size="icon" aria-label="Attach">
                        <Paperclip className="size-4" />
                      </Button>
                    </FileUploadTrigger>
                  </PromptInputAction>
                  <PromptInputAction tooltip="Send" side="top">
                    <Button type="button" size="icon" className="size-9 rounded-full" aria-label="Send">
                      <ArrowUp className="size-4" />
                    </Button>
                  </PromptInputAction>
                </PromptInputActions>
              </div>
            </PromptInput>
            <FileUploadContent />
          </FileUpload>
        </div>
      </div>
    )
  },
}

/**
 * **Chat basic** – Matches the docs’ “Conversation with scroll to bottom” + “Conversation with prompt input”:
 * ChatContainerRoot → ChatContainerContent (messages) → ChatContainerScrollAnchor → ScrollButton,
 * then PromptInput at the bottom. No CMMS, no Tool/Steps/FileUpload.
 */
const SOURCE_WORK_ORDERS = {
  href: "https://app.cmms.example/work-orders",
  label: "Work orders",
  title: "Work orders list",
  description: "Open and overdue work orders used for this summary.",
}

/**
 * **CMMSChat component** – Same look as CMMSChatConversation but fully driven by props.
 * Parent owns: messages array, inputValue, onInputChange, onSubmit. No internal conversation state.
 */
export const CMMSChatComponent: Story = {
  render: function CMMSChatComponentRender() {
    const [confirmed, setConfirmed] = useState(false)
    const [feedbackClosed, setFeedbackClosed] = useState(false)
    const [inputValue, setInputValue] = useState("")
    const [extraMessages, setExtraMessages] = useState<ChatMessage[]>([])

    const messages: ChatMessage[] = useMemo(() => {
      const base: ChatMessage[] = [
        { role: "welcome", content: "Hi, I'm the maintenance assistant. Describe a problem, ask what's urgent, or check an asset — I'll create work orders, summarize priorities, and suggest next steps." },
        { role: "user", content: "Pump P-101 is making a grinding noise near the motor. Can you create a work order?" },
        {
          role: "assistant",
          parts: [
            {
              type: "tool",
              toolPart: { type: "create_work_order", state: "output-available", toolCallId: "call_wo_1", input: { title: "Inspect and repair pump P-101 - grinding noise near motor", asset_id: "asset_p101", priority: "high", description: "Reported grinding noise near motor. Requires inspection and possible bearing/seal work." }, output: { id: "wo-2024-042", status: "draft", created_at: "2024-02-19T10:30:00Z" } },
              confirm: {
                message: "Confirm to create work order WO-2024-042. You can edit details after creation.",
                confirmLabel: "Confirm & create",
                onConfirm: () => setConfirmed(true),
              },
              confirmed,
              successMessage: <>Work order <strong>WO-2024-042</strong> created. {"It's"} in Draft; you can assign and schedule it from the work orders list.</>,
            },
            { type: "text", content: "I'll create a work order for **Pump P-101** based on your report. Here's what I'm about to do:" },
            {
              type: "preview",
              title: "Inspect and repair pump P-101 – grinding noise near motor",
              assetLabel: "Pump P-101",
              statusKey: "draft",
              statusCatalog: PREVIEW_STATUS_CATALOG,
              priorityKey: "high",
              priorityCatalog: PREVIEW_PRIORITY_CATALOG,
              pendingConfirm: !confirmed,
            },
            ...(confirmed && !feedbackClosed ? [{ type: "feedbackBar" as const, title: "Was this helpful?", onHelpful: fn(), onNotHelpful: fn(), onClose: () => setFeedbackClosed(true) }] : []),
          ],
        },
        { role: "user", content: "What's urgent right now?" },
        { role: "assistant", content: "I'd tackle **WO-2024-038** first (overdue), then **WO-2024-042** (P-101) and **WO-2024-040** this week.", sourceSuffix: SOURCE_WORK_ORDERS, parts: [{ type: "steps", trigger: "Urgency breakdown", source: SOURCE_WORK_ORDERS, sections: [{ label: "Overdue", items: ["WO-2024-038 – Replace filter F-02 (2 days overdue)"] }, { label: "Due this week", items: ["WO-2024-042 – Pump P-101 grinding noise (just created)", "WO-2024-040 – HVAC inspection Bldg A"] }] }] },
        { role: "user", content: "Suggest what I should do next." },
        { role: "assistant", parts: [{ type: "tool", toolPart: { type: "get_next_actions", state: "output-available", toolCallId: "call_sugg_1", input: { context: "urgency_summary" }, output: { suggestions: [{ id: "wo-038", action: "Assign WO-2024-038", reason: "Overdue" }, { id: "wo-042", action: "Schedule WO-2024-042", reason: "High priority" }, { id: "inspect", action: "Run HVAC inspection", reason: "Due this week" }] } } }, { type: "text", content: "Based on urgency, here are the next actions I recommend:" }, { type: "steps", trigger: "Recommended next steps", sections: [{ label: "1. Assign WO-2024-038 (Replace filter F-02) — overdue; assign to a tech and schedule.", items: [] }, { label: "2. Schedule WO-2024-042 (Pump P-101) — high priority; book inspection or parts.", items: [] }, { label: "3. Run HVAC inspection for WO-2024-040 (Bldg A) — due this week.", items: [] }] }, { type: "hint", text: "You can say \"Assign WO-2024-038 to John\" or \"View all urgent\" to continue." }, { type: "followUps", suggestions: [...FOLLOW_UP_SUGGESTIONS], onSuggestionClick: setInputValue }] },
        { role: "user", content: "Show me work orders by status." },
        {
          role: "assistant",
          parts: [
            { type: "text", content: "Here's how work orders break down by status right now:" },
            {
              type: "chart",
              chartType: "bar",
              data: [
                { status: "Draft", count: 12 },
                { status: "In progress", count: 8 },
                { status: "Completed", count: 24 },
                { status: "Overdue", count: 3 },
              ],
              categoryKey: "status",
              valueKeys: ["count"],
              valueLabels: { count: "Work orders" },
              title: "Work orders by status",
              height: 260,
            },
            { type: "hint", text: 'Try "Chart by priority" or "Monthly trend" for more views.' },
          ],
        },
      ]
      return [...base, ...extraMessages]
    }, [confirmed, feedbackClosed, extraMessages])

    const handleSubmit = () => {
      fn()()
      const text = inputValue.trim()
      if (!text) return
      setExtraMessages((prev) => [...prev, { role: "user", content: text }, { role: "assistant", content: "Got it. I've noted that. You can ask for a work order, what's urgent, or suggest next steps — or type something else." }])
      setInputValue("")
    }

    return (
      <CMMSChat messages={messages} inputValue={inputValue} onInputChange={setInputValue} onSubmit={handleSubmit} suggestedPrompts={[...SUGGESTED_PROMPTS]} onFilesAdded={fn()} />
    )
  },
}

/**
 * **Report / chart** – User asks for data or a report; assistant responds with a chart part.
 * DataChart is driven only by props (type, data, categoryKey, valueKeys) so the AI can emit it easily.
 */
export const CMMSChatReportChart: Story = {
  render: function CMMSChatReportChartRender() {
    const [inputValue, setInputValue] = useState("")
    const messages: ChatMessage[] = [
      { role: "welcome", content: "Hi, I'm the maintenance assistant. Ask for work orders, reports, or charts — I can show data by status, priority, or over time." },
      { role: "user", content: "Show me work orders by status." },
      {
        role: "assistant",
        parts: [
          { type: "text", content: "Here’s how work orders break down by status right now:" },
          {
            type: "chart",
            chartType: "bar",
            data: [
              { status: "Draft", count: 12 },
              { status: "In progress", count: 8 },
              { status: "Completed", count: 24 },
              { status: "Overdue", count: 3 },
            ],
            categoryKey: "status",
            valueKeys: ["count"],
            valueLabels: { count: "Work orders" },
            title: "Work orders by status",
            height: 260,
          },
          { type: "hint", text: 'Try "Show a pie chart by priority" or "Trend this year".' },
        ],
      },
    ]
    return (
      <CMMSChat
        messages={messages}
        inputValue={inputValue}
        onInputChange={setInputValue}
        onSubmit={() => {}}
        suggestedPrompts={["Work orders by status", "Chart by priority", "Monthly trend"]}
      />
    )
  },
}

/**
 * **Chat basic** – Matches the docs' "Conversation with scroll to bottom" + "Conversation with prompt input":
 * ChatContainerRoot → ChatContainerContent (messages) → ChatContainerScrollAnchor → ScrollButton,
 * then PromptInput at the bottom. No CMMS, no Tool/Steps/FileUpload.
 */
export const ChatBasic: Story = {
  render: function ChatBasicRender() {
    return (
      <div className="bg-background flex h-[500px] w-full max-w-2xl flex-col rounded-xl border shadow-lg">
        <div className="relative min-h-0 min-w-0 flex-1">
          <ChatContainerRoot className="relative h-full min-w-0">
            <ChatContainerContent className="space-y-4 p-4">
              <Message>
                <MessageAvatar
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=user1"
                  alt="User"
                  fallback="U"
                />
                <MessageContent>Hello, I need help with a maintenance request.</MessageContent>
              </Message>
              <Message>
                <MessageAvatar
                  src="https://api.dicebear.com/7.x/bottts/svg?seed=assistant"
                  alt="Assistant"
                  fallback="AI"
                />
                <MessageContent markdown>
                  Hi! I’m the maintenance assistant. You can describe a problem, ask about an asset, or
                  say what’s urgent. How can I help?
                </MessageContent>
              </Message>
              <Message>
                <MessageAvatar
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=user1"
                  alt="User"
                  fallback="U"
                />
                <MessageContent>What’s the status of pump P-101?</MessageContent>
              </Message>
              <ChatContainerScrollAnchor />
            </ChatContainerContent>
            <div className="absolute right-4 bottom-4">
              <ScrollButton />
            </div>
          </ChatContainerRoot>
        </div>
        <div className="border-t p-3">
          <PromptInput onSubmit={fn()}>
            <PromptInputTextarea placeholder="Type a message..." />
            <PromptInputActions>
              <PromptInputAction tooltip="Send" side="top">
                <Button type="button" size="icon" aria-label="Send">
                  <Send className="size-4" />
                </Button>
              </PromptInputAction>
            </PromptInputActions>
          </PromptInput>
        </div>
      </div>
    )
  },
}

/**
 * **All Prompt Kit components** in one place for reference.
 * Not a single narrative; use this to see each building block.
 */
export const AllComponentsShowcase: Story = {
  render: function AllComponentsShowcaseRender() {
    return (
      <div className="bg-background flex flex-col gap-8 p-6">
        <section>
          <h3 className="mb-3 font-semibold">Chat container + Messages + Input</h3>
          <div className="rounded-lg border p-4">
            <ChatContainerRoot className="h-48">
              <ChatContainerContent className="space-y-4">
                <Message>
                  <MessageAvatar
                    src="https://api.dicebear.com/7.x/avataaars/svg?seed=a"
                    alt="User"
                    fallback="U"
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <MessageContent>User message with **markdown**.</MessageContent>
                    <MessageActions>
                      <MessageAction tooltip="Copy">
                        <Button variant="ghost" size="icon" aria-label="Copy">
                          <Copy className="size-4" />
                        </Button>
                      </MessageAction>
                    </MessageActions>
                  </div>
                </Message>
                <Message>
                  <MessageAvatar
                    src="https://api.dicebear.com/7.x/bottts/svg?seed=b"
                    alt="Assistant"
                    fallback="AI"
                  />
                  <MessageContent markdown>
                    Assistant reply with **markdown** and `code` support.
                  </MessageContent>
                </Message>
                <ChatContainerScrollAnchor />
              </ChatContainerContent>
            </ChatContainerRoot>
            <div className="mt-3">
              <PromptInput onSubmit={fn()}>
                <PromptInputTextarea placeholder="Type here..." />
                <PromptInputActions>
                  <PromptInputAction tooltip="Send" side="top">
                    <Button type="button" size="icon" aria-label="Send">
                      <Send className="size-4" />
                    </Button>
                  </PromptInputAction>
                </PromptInputActions>
              </PromptInput>
            </div>
          </div>
        </section>

        <section>
          <h3 className="mb-3 font-semibold">ResponseStream (typewriter)</h3>
          <div className="rounded-lg border p-4">
            <ResponseStream
              textStream="This is streaming text. The assistant response appears gradually."
              mode="typewriter"
              speed={30}
            />
          </div>
        </section>

        <section>
          <h3 className="mb-3 font-semibold">Tool (tool call)</h3>
          <Tool
            toolPart={{
              type: "get_asset_health",
              state: "output-available",
              input: { asset_id: "P-101" },
              output: { status: "degraded", last_inspection: "2024-02-01" },
            }}
          />
        </section>

        <section>
          <h3 className="mb-3 font-semibold">Steps</h3>
          <div className="space-y-4">
            <Steps>
              <StepsTrigger>Steps example</StepsTrigger>
              <StepsContent>
                <div className="space-y-2">
                  <StepsItem>Step 1: First item.</StepsItem>
                  <StepsItem>Step 2: Second item.</StepsItem>
                </div>
              </StepsContent>
            </Steps>
          </div>
        </section>

        <section>
          <h3 className="mb-3 font-semibold">ChainOfThought</h3>
          <ChainOfThought>
            <ChainOfThoughtStep>
              <ChainOfThoughtTrigger>Reasoning step</ChainOfThoughtTrigger>
              <ChainOfThoughtContent>
                <p className="text-muted-foreground text-sm">Collapsible reasoning content.</p>
              </ChainOfThoughtContent>
            </ChainOfThoughtStep>
          </ChainOfThought>
        </section>

        <section>
          <h3 className="mb-3 font-semibold">SystemMessage</h3>
          <div className="flex flex-col gap-2">
            <SystemMessage variant="action" fill>
              Action / info message with optional CTA.
            </SystemMessage>
            <SystemMessage variant="warning" fill cta={{ label: "Review" }}>
              Warning: confirm before proceeding.
            </SystemMessage>
            <SystemMessage variant="error" fill>
              Error message.
            </SystemMessage>
          </div>
        </section>

        <section>
          <h3 className="mb-3 font-semibold">ThinkingBar + FeedbackBar</h3>
          <div className="flex flex-col gap-2">
            <ThinkingBar text="Thinking..." onStop={fn()} stopLabel="Stop" />
            <FeedbackBar
              title="Was this helpful?"
              onHelpful={fn()}
              onNotHelpful={fn()}
              onClose={fn()}
            />
          </div>
        </section>

        <section>
          <h3 className="mb-3 font-semibold">Markdown + CodeBlock</h3>
          <Markdown className="rounded-lg border p-3">
            {"## Heading\n\nParagraph with **bold** and `code`. List:\n- One\n- Two"}
          </Markdown>
          <CodeBlockGroup>
            <CodeBlock>
              <CodeBlockCode code='const wo = { id: "wo-042", title: "Pump P-101" }' language="typescript" />
            </CodeBlock>
          </CodeBlockGroup>
        </section>

        <section>
          <h3 className="mb-3 font-semibold">JsxPreview</h3>
          <JsxPreview
            jsx='<div className="rounded border border-border bg-muted/50 p-2 text-sm">Rendered JSX preview</div>'
          />
        </section>

        <section>
          <h3 className="mb-3 font-semibold">Source (citation)</h3>
          <Source href="https://example.com/doc">
            <SourceTrigger label="Example doc" showFavicon />
            <SourceContent
              title="Example document"
              description="Source description for hover card."
            />
          </Source>
        </section>

        <section>
          <h3 className="mb-3 font-semibold">Image (base64)</h3>
          <div className="max-w-xs">
            <Image
              alt="Placeholder"
              base64="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
              mediaType="image/png"
            />
          </div>
        </section>

        <section>
          <h3 className="mb-3 font-semibold">Loaders + TextShimmer</h3>
          <div className="flex flex-wrap items-center gap-4">
            <Loader variant="circular" size="sm" />
            <Loader variant="typing" />
            <Loader variant="pulse" />
            <TextShimmer>Loading...</TextShimmer>
          </div>
        </section>
      </div>
    )
  },
}
