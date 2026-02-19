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
} from "./index"
import { Card, CardContent, CardHeader } from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { Copy, Paperclip, Send } from "lucide-react"
import { useState } from "react"

const meta = {
  title: "Prompt Kit/AI-first CMMS Chat",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "An AI-first CMMS where the chat is the operating system: intent → AI interprets → structured result → confirm → execute → log. All write actions show a clear preview and require confirmation before execution.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta

export default meta

type Story = StoryObj<typeof meta>

/**
 * **Full conversation: AI-first CMMS**
 *
 * - **User** describes a problem → system creates a work order.
 * - **Assistant** shows reasoning (ChainOfThought), tool call (Tool), then a **preview** (structured card).
 * - **SystemMessage** explains what will change and asks for confirmation.
 * - After confirm: execution is **logged** in the same conversation; **FeedbackBar** for rating.
 *
 * A second turn shows: "What's urgent?" → **Steps** for analysis, structured answer, **Source** citation.
 */
export const CMMSChatConversation: Story = {
  render: function CMMSChatConversationRender() {
    const [confirmed, setConfirmed] = useState(false)
    const [feedbackClosed, setFeedbackClosed] = useState(false)

    return (
      <div className="bg-background flex h-[720px] w-full max-w-2xl flex-col rounded-xl border shadow-lg">
        <div className="border-b px-4 py-3">
          <h2 className="font-semibold">Maintenance Assistant</h2>
          <p className="text-muted-foreground text-sm">
            Describe a problem, ask about an asset, or say what’s urgent.
          </p>
        </div>

        <ChatContainerRoot className="relative min-h-0 min-w-0 flex-1">
          <ChatContainerContent className="space-y-4 p-4">
            {/* User: describe problem */}
            <Message>
              <MessageAvatar
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=user"
                alt="User"
                fallback="U"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <MessageContent>
                  Pump P-101 is making a grinding noise near the motor. Can you create a work order?
                </MessageContent>
              </div>
            </Message>

            {/* Assistant: thinking then structured response */}
            <Message>
              <MessageAvatar
                src="https://api.dicebear.com/7.x/bottts/svg?seed=cmms"
                alt="Assistant"
                fallback="AI"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <ThinkingBar
                  text="Creating work order from your description..."
                  onStop={() => {}}
                  stopLabel="Cancel"
                />

                <MessageContent markdown>
                  I’ll create a work order for **Pump P-101** based on your report. Here’s what I’m
                  about to do:
                </MessageContent>

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

                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
                    Preview
                  </p>
                  <Card>
                    <CardHeader className="pb-2">
                      <p className="font-medium">Inspect and repair pump P-101 – grinding noise near motor</p>
                      <p className="text-muted-foreground text-sm">Pump P-101 · High priority</p>
                    </CardHeader>
                    <CardContent className="text-muted-foreground text-sm">
                      Status: Draft · Will be created on confirm
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
              </div>
            </Message>

            {/* Second turn: "What's urgent?" */}
            <Message>
              <MessageAvatar
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=user2"
                alt="User"
                fallback="U"
              />
              <MessageContent>What’s urgent right now?</MessageContent>
            </Message>

            <Message>
              <MessageAvatar
                src="https://api.dicebear.com/7.x/bottts/svg?seed=cmms"
                alt="Assistant"
                fallback="AI"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <Steps defaultOpen>
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

                <MessageContent markdown>
                  I’d tackle **WO-2024-038** first (overdue), then **WO-2024-042** (P-101) and
                  **WO-2024-040** this week. Data from{" "}
                  <Source href="https://app.cmms.example/work-orders">
                    <SourceTrigger label="Work orders" showFavicon />
                    <SourceContent
                      title="Work orders list"
                      description="Open and overdue work orders used for this summary."
                    />
                  </Source>
                  .
                </MessageContent>
              </div>
            </Message>

            <ChatContainerScrollAnchor />
          </ChatContainerContent>
          <div className="absolute right-4 bottom-4">
            <ScrollButton />
          </div>
        </ChatContainerRoot>

        <div className="border-t p-3">
          <FileUpload onFilesAdded={fn()}>
            <PromptInput onSubmit={fn()} className="flex items-end gap-2">
              <PromptInputTextarea placeholder="Describe a problem, ask about an asset, or report downtime..." />
              <PromptInputActions>
                <PromptInputAction tooltip="Attach file" side="top">
                  <FileUploadTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" aria-label="Attach">
                      <Paperclip className="size-4" />
                    </Button>
                  </FileUploadTrigger>
                </PromptInputAction>
                <PromptInputAction tooltip="Send" side="top">
                  <Button type="button" size="icon" aria-label="Send">
                    <Send className="size-4" />
                  </Button>
                </PromptInputAction>
              </PromptInputActions>
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
            <Steps defaultOpen>
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
