"use client"

import { Badge } from "@workspace/ui/components/badge"
import { CatalogPriorityBadge } from "@workspace/ui/components/catalog-priority-badge"
import type { PriorityCatalogEntry } from "@workspace/ui/components/catalog-priority-badge"
import { CatalogStatusBadge } from "@workspace/ui/components/catalog-status-badge"
import type { StatusCatalogEntry } from "@workspace/ui/components/catalog-status-badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader } from "@workspace/ui/components/card"
import {
  ChatContainerContent,
  ChatContainerRoot,
  ChatContainerScrollAnchor,
} from "./chat-container"
import { FileUpload, FileUploadContent, FileUploadTrigger } from "./file-upload"
import { FeedbackBar } from "./feedback-bar"
import { Markdown } from "./markdown"
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
} from "./message"
import {
  PromptInput,
  PromptInputActions,
  PromptInputAction,
  PromptInputTextarea,
  usePromptInput,
} from "./prompt-input"
import { ScrollButton } from "./scroll-button"
import { Source, SourceContent, SourceTrigger } from "./source"
import { Steps, StepsContent, StepsItem, StepsTrigger } from "./steps"
import { SystemMessage } from "./system-message"
import { Tool } from "./tool"
import type { ToolPart } from "./tool"
import { AssetCard } from "@workspace/ui/components/asset-card"
import { AssetTracker } from "@workspace/ui/components/asset-tracker"
import type { AssetTrackerEntry } from "@workspace/ui/components/asset-tracker"
import { DataChart } from "@workspace/ui/components/data-chart"
import type { DataChartDataRow } from "@workspace/ui/components/data-chart"
import { Heatmap } from "@workspace/ui/components/heatmap"
import type { HeatmapData } from "@workspace/ui/components/heatmap"
import {
  TrackerWithCatalog,
  type TrackerBlockCatalogEntry,
  type TrackerBlockInput,
} from "@workspace/ui/components/tracker"
import { ArrowUp, Copy, Paperclip, ThumbsDown, ThumbsUp } from "lucide-react"
import * as React from "react"

/* -------------------------------------------------------------------------
 * Types: all message and part shapes are prop-driven; parent owns state.
 * ------------------------------------------------------------------------- */

/** Tool types that mutate data (e.g. create_*) should always require user confirmation. */
export function isCreateOrMutationTool(toolPart: ToolPart): boolean {
  const t = toolPart.type.toLowerCase()
  return t.startsWith("create_") || t.startsWith("update_") || t.startsWith("delete_")
}

export type AssistantPart =
  | {
      type: "tool"
      toolPart: ToolPart
      /** For create/mutation tools: require user confirmation before the action is considered done. */
      confirm?: {
        message: React.ReactNode
        confirmLabel: string
        onConfirm: () => void
      }
      confirmed?: boolean
      /** Shown after user confirms (e.g. "Work order WO-2024-042 created."). */
      successMessage?: React.ReactNode
    }
  | { type: "text"; content: string; markdown?: boolean }
  | {
      type: "steps"
      trigger: string
      sections: { label: string; items: string[] }[]
      source?: { href: string; label: string; title: string; description: string }
    }
  | {
      type: "preview"
      title: string
      subtitle?: string
      status?: string
      /** Work-order-style: use catalog for colors/labels. */
      statusKey?: string | null
      statusCatalog?: StatusCatalogEntry[]
      priorityKey?: string | null
      priorityCatalog?: PriorityCatalogEntry[]
      /** Fallback when catalog not used (plain badges). */
      statusLabel?: string
      priorityLabel?: string
      /** Asset or location line (e.g. "Pump P-101"). */
      assetLabel?: string
      /** When true, show "Will be created on confirm" instead of treating as completed. */
      pendingConfirm?: boolean
    }
  | {
      type: "systemMessage"
      variant: "action" | "warning" | "error"
      children: React.ReactNode
      cta?: { label: string; variant?: "solid" | "outline"; onClick: () => void }
    }
  | {
      type: "feedbackBar"
      title?: string
      onHelpful: () => void
      onNotHelpful: () => void
      onClose: () => void
    }
  | {
      type: "followUps"
      suggestions: string[]
      onSuggestionClick: (text: string) => void
    }
  | {
      type: "source"
      href: string
      label: string
      title: string
      description: string
    }
  | {
      type: "chart"
      /** Chart kind: bar, line, area, or pie. */
      chartType: "bar" | "line" | "area" | "pie"
      data: DataChartDataRow[]
      categoryKey: string
      valueKeys: string[]
      valueLabels?: Record<string, string>
      title?: string
      height?: number
    }
  | {
      type: "tracker"
      /** Asset identity and optional status. */
      name: string
      assetNumber?: string | null
      statusKey?: string | null
      statusCatalog?: StatusCatalogEntry[]
      /** Location line on card (e.g. "Building A · Floor 2"). */
      locationLabel?: string | null
      /** Tracker: last known location (can mirror or extend locationLabel). */
      location?: string | null
      /** Tracker: last seen / last updated (e.g. "2 min ago"). */
      lastSeen?: string | null
      /** Tracker: optional key-value rows (e.g. runtime, sensor). */
      entries?: AssetTrackerEntry[]
    }
  | {
      type: "tracker24h"
      /** AI-friendly: one block per period (e.g. 24h). statusKey maps to color via statusCatalog. */
      blocks: TrackerBlockInput[]
      /** Optional; defaults to TRACKER_STATUS_CATALOG (running, idle, maintenance, fault). */
      statusCatalog?: TrackerBlockCatalogEntry[]
      defaultBackgroundColor?: string
      hoverEffect?: boolean
    }
  | {
      type: "heatmap"
      /** Activity per day: date (YYYY-MM-DD), value (e.g. count or hours). */
      data: HeatmapData
      /** Start of range (ISO date string). */
      startDate: string
      /** End of range (ISO date string). */
      endDate: string
      /** discrete = color scale buckets; interpolate = gradient. */
      colorMode: "discrete" | "interpolate"
      /** For discrete: optional hex/class scale; for interpolate: minColor, maxColor, interpolation. */
      colorScale?: string[]
      minColor?: string
      maxColor?: string
      interpolation?: "linear" | "sqrt" | "log"
      cellSize?: number
      gap?: number
      displayStyle?: "squares" | "bubbles"
    }
  | { type: "hint"; text: string }

export type ChatMessage =
  | { role: "welcome"; content: string }
  | { role: "user"; content: string }
  | {
      role: "assistant"
      /** Optional short content (e.g. one line) rendered after tool/steps if no "text" part is used. */
      content?: string
      /** Optional: "Data from [Source]." appended after content. */
      sourceSuffix?: { href: string; label: string; title: string; description: string }
      /** Ordered parts: tool, text, steps, preview, systemMessage, feedbackBar, followUps, hint, source. */
      parts?: AssistantPart[]
    }

export type CMMSChatProps = {
  /** Ordered list of messages (welcome, user, assistant, …). Parent manages this array. */
  messages: ChatMessage[]
  /** Current input value. Controlled by parent. */
  inputValue: string
  /** Called when input text changes. */
  onInputChange: (value: string) => void
  /** Called when user submits (Enter or Send). Parent should append user message and handle reply. */
  onSubmit: () => void
  /** Optional suggested prompts above the input (e.g. "Report a problem"). */
  suggestedPrompts?: string[]
  /** Optional placeholder for the textarea. */
  placeholder?: string
  /** Optional file upload handler. If provided, attach button is shown. */
  onFilesAdded?: (files: File[]) => void
  /** Optional: render custom output for tool parts (e.g. DataGrid for list_* tools, DataChart for metrics). Return null to use default JSON output. */
  renderToolOutput?: (toolPart: ToolPart) => React.ReactNode | null
  /** Accessibility: title for the chat (sr-only). */
  ariaTitle?: string
  /** Accessibility: description for the chat (sr-only). */
  ariaDescription?: string
  /** Optional class for the root container. */
  className?: string
  /** Optional class for the messages content area. */
  contentClassName?: string
}

const MESSAGE_CLASS = "mx-auto flex w-full max-w-3xl flex-col gap-2 px-2 md:px-10"
const ACTIONS_CLASS = "flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100"

/** Coerce to string for display; never pass objects to Markdown (avoids [object Object]). */
function toMarkdownString(value: unknown): string {
  if (value == null) return ""
  if (typeof value === "string") return value
  if (typeof value === "number") return String(value)
  return ""
}

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

function renderAssistantPart(
  part: AssistantPart,
  onSuggestionClick: (text: string) => void,
  index: number,
  renderToolOutput?: (toolPart: ToolPart) => React.ReactNode | null
) {
  const key = `${part.type}-${index}`
  switch (part.type) {
    case "text":
      return (
        <MessageContent
          className="text-foreground prose w-full min-w-0 flex-1 rounded-lg bg-transparent p-0"
          markdown={part.markdown ?? true}
          key={key}
        >
          {toMarkdownString(part.content)}
        </MessageContent>
      )
    case "tool": {
      const awaitingConfirmation = Boolean(part.confirm && !part.confirmed)
      const customOutput = renderToolOutput?.(part.toolPart) ?? undefined
      const toolBlock = (
        <div className="w-full" key={key}>
          <Tool
            toolPart={part.toolPart}
            awaitingConfirmation={awaitingConfirmation}
            customOutput={customOutput}
          />
        </div>
      )
      if (!part.confirm) return toolBlock
      const safeConfirmMessage =
        typeof part.confirm.message === "string" ||
        typeof part.confirm.message === "number" ||
        React.isValidElement(part.confirm.message)
          ? part.confirm.message
          : toMarkdownString(part.confirm.message)
      const safeSuccessMessage =
        part.successMessage != null
          ? typeof part.successMessage === "string" ||
              typeof part.successMessage === "number" ||
              React.isValidElement(part.successMessage)
            ? part.successMessage
            : toMarkdownString(part.successMessage)
          : null
      if (part.confirmed) {
        return (
          <React.Fragment key={key}>
            {toolBlock}
            {safeSuccessMessage != null && (
              <SystemMessage key={`${key}-success`} variant="action" fill>
                {safeSuccessMessage}
              </SystemMessage>
            )}
          </React.Fragment>
        )
      }
      return (
        <React.Fragment key={key}>
          {toolBlock}
          <SystemMessage
            key={`${key}-confirm`}
            variant="action"
            fill
            cta={{
              label: part.confirm.confirmLabel,
              variant: "solid",
              onClick: part.confirm.onConfirm,
            }}
          >
            {safeConfirmMessage}
          </SystemMessage>
        </React.Fragment>
      )
    }
    case "steps": {
      const { trigger, sections, source } = part
      return (
        <Steps key={key}>
          <StepsTrigger>{trigger}</StepsTrigger>
          <StepsContent>
            <div className="space-y-2">
              {sections.map((section, i) => (
                <React.Fragment key={i}>
                  <StepsItem>{toMarkdownString(section.label)}</StepsItem>
                  {section.items.length > 0 && (
                    <ul className="text-muted-foreground list-inside list-disc text-sm">
                      {section.items.map((item, j) => (
                        <li key={j}>{item}</li>
                      ))}
                    </ul>
                  )}
                </React.Fragment>
              ))}
              {source && (
                <div className="flex flex-wrap gap-1.5">
                  <Source href={source.href}>
                    <SourceTrigger label={source.label} showFavicon />
                    <SourceContent title={source.title} description={source.description} />
                  </Source>
                </div>
              )}
            </div>
          </StepsContent>
        </Steps>
      )
    }
    case "preview": {
      return (
        <div className="rounded-lg border bg-muted/30 p-3" key={key}>
          <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
            Preview
          </p>
          <Card className="py-4">
            <CardHeader className="space-y-2 pb-2">
              <p className="font-medium leading-snug">{part.title}</p>
              {(part.assetLabel ?? part.subtitle) && (
                <p className="text-muted-foreground text-sm">
                  {part.assetLabel ?? part.subtitle}
                </p>
              )}
              {((part.statusKey != null && part.statusKey !== "") ||
                (part.priorityKey != null && part.priorityKey !== "") ||
                part.statusLabel != null ||
                part.priorityLabel != null) && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {(part.statusKey != null && part.statusKey !== "") ? (
                    <CatalogStatusBadge
                      statusKey={part.statusKey}
                      statusCatalog={part.statusCatalog}
                      className="font-normal"
                    />
                  ) : part.statusLabel != null ? (
                    <Badge variant="secondary" className="font-normal">
                      {part.statusLabel}
                    </Badge>
                  ) : null}
                  {(part.priorityKey != null && part.priorityKey !== "") ? (
                    <CatalogPriorityBadge
                      priorityKey={part.priorityKey}
                      priorityCatalog={part.priorityCatalog}
                      className="font-normal"
                    />
                  ) : part.priorityLabel != null ? (
                    <Badge variant="outline" className="font-normal">
                      {part.priorityLabel}
                    </Badge>
                  ) : null}
                </div>
              )}
            </CardHeader>
            {(part.status != null || part.pendingConfirm === true) && (
              <CardContent className="text-muted-foreground pt-0 text-sm">
                {part.pendingConfirm
                  ? "Will be created when you confirm below."
                  : part.status}
              </CardContent>
            )}
          </Card>
        </div>
      )
    }
    case "systemMessage": {
      const children = part.children
      const safeChildren =
        typeof children === "string" ||
        typeof children === "number" ||
        React.isValidElement(children)
          ? children
          : toMarkdownString(children)
      return (
        <SystemMessage
          key={key}
          variant={part.variant}
          fill
          cta={part.cta}
        >
          {safeChildren}
        </SystemMessage>
      )
    }
    case "feedbackBar":
      return (
        <FeedbackBar
          key={key}
          title={part.title ?? "Was this helpful?"}
          onHelpful={part.onHelpful}
          onNotHelpful={part.onNotHelpful}
          onClose={part.onClose}
        />
      )
    case "followUps":
      return (
        <div className="flex flex-wrap gap-2 pt-1" key={key}>
          {part.suggestions.map((label) => (
            <Button
              key={label}
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full text-xs"
              onClick={() => (part.onSuggestionClick ?? onSuggestionClick)(label)}
            >
              {label}
            </Button>
          ))}
        </div>
      )
    case "source":
      return (
        <span key={key}>
          {" "}
          Data from{" "}
          <Source href={part.href}>
            <SourceTrigger label={part.label} showFavicon />
            <SourceContent title={part.title} description={part.description} />
          </Source>
          .
        </span>
      )
    case "chart":
      return (
        <div className="w-full" key={key}>
          <DataChart
            type={part.chartType}
            data={part.data}
            categoryKey={part.categoryKey}
            valueKeys={part.valueKeys}
            valueLabels={part.valueLabels}
            title={part.title}
            height={part.height}
          />
        </div>
      )
    case "hint":
      return (
        <p className="text-muted-foreground text-sm" key={key}>
          {toMarkdownString(part.text)}
        </p>
      )
    case "tracker": {
      const { name, assetNumber, statusKey, statusCatalog, locationLabel, location, lastSeen, entries } = part
      return (
        <div className="w-full max-w-md" key={key}>
          <AssetCard
            name={name}
            assetNumber={assetNumber ?? undefined}
            statusKey={statusKey ?? undefined}
            statusCatalog={statusCatalog}
            locationLabel={locationLabel ?? undefined}
          >
            <AssetTracker
              location={location ?? locationLabel ?? undefined}
              lastSeen={lastSeen ?? undefined}
              entries={entries}
            />
          </AssetCard>
        </div>
      )
    }
    case "tracker24h":
      return (
        <div className="w-full max-w-md" key={key}>
          <TrackerWithCatalog
            blocks={part.blocks}
            statusCatalog={part.statusCatalog}
            defaultBackgroundColor={part.defaultBackgroundColor}
            hoverEffect={part.hoverEffect}
          />
        </div>
      )
    case "heatmap": {
      const start = new Date(part.startDate)
      const end = new Date(part.endDate)
      const colorOpts =
        part.colorMode === "discrete"
          ? { colorMode: "discrete" as const, colorScale: part.colorScale }
          : {
              colorMode: "interpolate" as const,
              minColor: part.minColor,
              maxColor: part.maxColor,
              interpolation: part.interpolation,
            }
      return (
        <div className="w-full" key={key}>
          <Heatmap
            data={part.data}
            startDate={start}
            endDate={end}
            {...colorOpts}
            cellSize={part.cellSize ?? 12}
            gap={part.gap ?? 3}
            displayStyle={part.displayStyle}
          />
        </div>
      )
    }
    default:
      return null
  }
}

/**
 * CMMS-style chat UI: prop-driven, no internal conversation state.
 * Parent controls messages, inputValue, onInputChange, onSubmit.
 * Renders welcome/user/assistant messages and optional tool, steps, preview,
 * systemMessage, feedbackBar, follow-ups, and suggestion chips.
 */
export function CMMSChat({
  messages,
  inputValue,
  onInputChange,
  onSubmit,
  suggestedPrompts = [],
  placeholder = "Describe a problem, ask about an asset, or report downtime...",
  onFilesAdded,
  renderToolOutput,
  ariaTitle = "Maintenance Assistant",
  ariaDescription = "Describe a problem, ask about an asset, or say what's urgent.",
  className,
  contentClassName,
}: CMMSChatProps) {
  const handleSuggestClick = (text: string) => {
    onInputChange(text)
  }

  return (
    <div className={`bg-background flex h-screen w-full flex-col overflow-hidden ${className ?? ""}`}>
      <div className="sr-only">
        <h2 className="font-semibold">{ariaTitle}</h2>
        <p className="text-muted-foreground text-sm">{ariaDescription}</p>
      </div>

      <ChatContainerRoot className="relative flex-1 space-y-0">
        <ChatContainerContent className={`space-y-12 px-4 py-12 ${contentClassName ?? ""}`}>
          {messages.map((msg, idx) => {
            if (msg.role === "welcome") {
              return (
                <Message className={`${MESSAGE_CLASS} items-start`} key={idx}>
                  <div className="group flex w-full flex-col gap-0">
                <MessageContent
                  className="text-foreground prose w-full min-w-0 rounded-lg bg-transparent p-0"
                  markdown
                >
                  {toMarkdownString(msg.content)}
                </MessageContent>
              </div>
            </Message>
          )
        }
        if (msg.role === "user") {
              return (
                <Message className={`${MESSAGE_CLASS} items-end`} key={idx}>
                  <div className="group flex w-full flex-col items-end gap-1">
                    <MessageContent className="bg-muted text-primary max-w-[85%] rounded-3xl px-5 py-2.5 whitespace-pre-wrap sm:max-w-[75%]">
                      {toMarkdownString(msg.content)}
                    </MessageContent>
                    <MessageActions className={ACTIONS_CLASS}>
                      <MessageAction tooltip="Copy" delayDuration={100}>
                        <Button variant="ghost" size="icon" className="rounded-full">
                          <Copy className="size-4" />
                        </Button>
                      </MessageAction>
                    </MessageActions>
                  </div>
                </Message>
              )
            }
            if (msg.role === "assistant") {
              return (
                <Message className={`${MESSAGE_CLASS} items-start`} key={idx}>
                  <div className="group flex w-full flex-col gap-0 space-y-2">
                    {msg.parts?.map((p, i) => renderAssistantPart(p, handleSuggestClick, i, renderToolOutput))}
                    {msg.content != null && msg.content !== "" && !msg.parts?.some((p) => p.type === "text") && (
                      <MessageContent
                        className="text-foreground prose w-full min-w-0 flex-1 rounded-lg bg-transparent p-0"
                        markdown={false}
                      >
                        {msg.sourceSuffix ? (
                          <>
                            <Markdown className="text-foreground prose inline min-w-0 rounded-lg bg-transparent p-0">
                              {toMarkdownString(msg.content)}
                            </Markdown>
                            {" "}
                            Data from{" "}
                            <Source href={msg.sourceSuffix.href}>
                              <SourceTrigger label={msg.sourceSuffix.label} showFavicon />
                              <SourceContent
                                title={msg.sourceSuffix.title}
                                description={msg.sourceSuffix.description}
                              />
                            </Source>
                            .
                          </>
                        ) : (
                          <Markdown className="text-foreground prose w-full min-w-0 rounded-lg bg-transparent p-0">
                            {toMarkdownString(msg.content)}
                          </Markdown>
                        )}
                      </MessageContent>
                    )}
                    <MessageActions className={`-ml-2.5 ${ACTIONS_CLASS}`}>
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
              )
            }
            return null
          })}

          <ChatContainerScrollAnchor />
        </ChatContainerContent>
        <div className="absolute right-4 bottom-4">
          <ScrollButton />
        </div>

        {suggestedPrompts.length > 0 && (
      <div className="inset-x-0 absolute bottom-0 mx-auto w-full max-w-3xl shrink-0 px-3 md:px-5">

          <div className="mb-2 flex flex-wrap gap-2">
            {suggestedPrompts.map((label) => (
              <Button
                key={label}
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full text-xs shadow-2xl"
                onClick={() => handleSuggestClick(label)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        )}
      </ChatContainerRoot>

      
      <div className="inset-x-0 bottom-0 mx-auto w-full max-w-3xl shrink-0 px-3 pb-3 md:px-5 md:pb-5">
        
        {onFilesAdded ? (
          <FileUpload onFilesAdded={onFilesAdded}>
            <PromptInput
              onSubmit={onSubmit}
              value={inputValue}
              onValueChange={onInputChange}
              className="border-input bg-popover relative z-10 w-full rounded-3xl border p-0 pt-1 shadow-xs"
            >
              <div className="flex flex-col">
                <PromptInputTextarea
                  placeholder={placeholder}
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
                    <SendButton />
                  </PromptInputAction>
                </PromptInputActions>
              </div>
            </PromptInput>
            <FileUploadContent />
          </FileUpload>
        ) : (
          <PromptInput
            onSubmit={onSubmit}
            value={inputValue}
            onValueChange={onInputChange}
            className="border-input bg-popover relative z-10 w-full rounded-3xl border p-0 pt-1 shadow-xs"
          >
            <div className="flex flex-col">
              <PromptInputTextarea
                placeholder={placeholder}
                className="min-h-[44px] pt-3 pl-4 text-base leading-[1.3] sm:text-base md:text-base"
              />
              <PromptInputActions className="mt-3 flex w-full items-center justify-between gap-2 p-2">
                <PromptInputAction tooltip="Send" side="top">
                  <SendButton />
                </PromptInputAction>
              </PromptInputActions>
            </div>
          </PromptInput>
        )}
      </div>
    </div>
  )
}
