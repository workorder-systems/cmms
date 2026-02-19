import type { Meta, StoryObj } from "@storybook/react"
import { fn } from "@storybook/test"
import { CMMSChat, type ChatMessage } from "./index"
import { useState, useMemo } from "react"

const meta = {
  title: "CMMS Chat",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "CMMS chat UI: create work orders (with confirm), query urgency, asset tracking, suggest next steps, and reports/charts. Prop-driven; only CMMSChat from cmms-chat is used.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta

export default meta

type Story = StoryObj<typeof meta>

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
const ASSET_STATUS_CATALOG = [
  { key: "operational", name: "Operational", color: "#22c55e" },
  { key: "maintenance", name: "Under maintenance", color: "#eab308" },
  { key: "down", name: "Down", color: "#ef4444" },
]

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

const SOURCE_WORK_ORDERS = {
  href: "https://app.cmms.example/work-orders",
  label: "Work orders",
  title: "Work orders list",
  description: "Open and overdue work orders used for this summary.",
}

/**
 * **CMMS Chat** – Create WO (with confirm), urgency, suggest next, and chart. All via CMMSChat only.
 */
export const CMMSChatComponent: Story = {
  render: function CMMSChatComponentRender() {
    const [confirmed, setConfirmed] = useState(false)
    const [feedbackClosed, setFeedbackClosed] = useState(false)
    const [inputValue, setInputValue] = useState("")
    const [extraMessages, setExtraMessages] = useState<ChatMessage[]>([])

    const messages: ChatMessage[] = useMemo(() => {
      const base: ChatMessage[] = [
        {
          role: "welcome",
          content:
            "Hi, I'm the maintenance assistant. Describe a problem, ask what's urgent, or check an asset — I'll create work orders, summarize priorities, and suggest next steps.",
        },
        {
          role: "user",
          content:
            "Pump P-101 is making a grinding noise near the motor. Can you create a work order?",
        },
        {
          role: "assistant",
          parts: [
            {
              type: "tool",
              toolPart: {
                type: "create_work_order",
                state: "output-available",
                toolCallId: "call_wo_1",
                input: {
                  title: "Inspect and repair pump P-101 - grinding noise near motor",
                  asset_id: "asset_p101",
                  priority: "high",
                  description:
                    "Reported grinding noise near motor. Requires inspection and possible bearing/seal work.",
                },
                output: {
                  id: "wo-2024-042",
                  status: "draft",
                  created_at: "2024-02-19T10:30:00Z",
                },
              },
              confirm: {
                message:
                  "Confirm to create work order WO-2024-042. You can edit details after creation.",
                confirmLabel: "Confirm & create",
                onConfirm: () => setConfirmed(true),
              },
              confirmed,
              successMessage: (
                <>
                  Work order <strong>WO-2024-042</strong> created. {"It's"} in Draft; you can assign and
                  schedule it from the work orders list.
                </>
              ),
            },
            {
              type: "text",
              content:
                "I'll create a work order for **Pump P-101** based on your report. Here's what I'm about to do:",
            },
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
            ...(confirmed && !feedbackClosed
              ? [
                  {
                    type: "feedbackBar" as const,
                    title: "Was this helpful?",
                    onHelpful: fn(),
                    onNotHelpful: fn(),
                    onClose: () => setFeedbackClosed(true),
                  },
                ]
              : []),
          ],
        },
        { role: "user", content: "What's urgent right now?" },
        {
          role: "assistant",
          content:
            "I'd tackle **WO-2024-038** first (overdue), then **WO-2024-042** (P-101) and **WO-2024-040** this week.",
          sourceSuffix: SOURCE_WORK_ORDERS,
          parts: [
            {
              type: "steps",
              trigger: "Urgency breakdown",
              source: SOURCE_WORK_ORDERS,
              sections: [
                {
                  label: "Overdue",
                  items: ["WO-2024-038 – Replace filter F-02 (2 days overdue)"],
                },
                {
                  label: "Due this week",
                  items: [
                    "WO-2024-042 – Pump P-101 grinding noise (just created)",
                    "WO-2024-040 – HVAC inspection Bldg A",
                  ],
                },
              ],
            },
          ],
        },
        { role: "user", content: "Suggest what I should do next." },
        {
          role: "assistant",
          parts: [
            {
              type: "tool",
              toolPart: {
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
              },
            },
            {
              type: "text",
              content: "Based on urgency, here are the next actions I recommend:",
            },
            {
              type: "steps",
              trigger: "Recommended next steps",
              sections: [
                {
                  label: "1. Assign WO-2024-038 (Replace filter F-02) — overdue; assign to a tech and schedule.",
                  items: [],
                },
                {
                  label: "2. Schedule WO-2024-042 (Pump P-101) — high priority; book inspection or parts.",
                  items: [],
                },
                {
                  label: "3. Run HVAC inspection for WO-2024-040 (Bldg A) — due this week.",
                  items: [],
                },
              ],
            },
            {
              type: "hint",
              text: 'You can say "Assign WO-2024-038 to John" or "View all urgent" to continue.',
            },
            { type: "followUps", suggestions: [...FOLLOW_UP_SUGGESTIONS], onSuggestionClick: setInputValue },
          ],
        },
        { role: "user", content: "Show me work orders by status." },
        {
          role: "assistant",
          parts: [
            {
              type: "text",
              content: "Here's how work orders break down by status right now:",
            },
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
            {
              type: "hint",
              text: 'Try "Chart by priority" or "Monthly trend" for more views.',
            },
          ],
        },
      ]
      return [...base, ...extraMessages]
    }, [confirmed, feedbackClosed, extraMessages])

    const handleSubmit = () => {
      fn()()
      const text = inputValue.trim()
      if (!text) return
      setExtraMessages((prev) => [
        ...prev,
        { role: "user", content: text },
        {
          role: "assistant",
          content:
            "Got it. You can ask for a work order, what's urgent, or suggest next steps — or type something else.",
        },
      ])
      setInputValue("")
    }

    return (
      <CMMSChat
        messages={messages}
        inputValue={inputValue}
        onInputChange={setInputValue}
        onSubmit={handleSubmit}
        suggestedPrompts={[...SUGGESTED_PROMPTS]}
        onFilesAdded={fn()}
      />
    )
  },
}

/**
 * **Report / chart** – User asks for data; assistant responds with a chart part.
 */
export const CMMSChatReportChart: Story = {
  render: function CMMSChatReportChartRender() {
    const [inputValue, setInputValue] = useState("")
    const messages: ChatMessage[] = [
      {
        role: "welcome",
        content:
          "Hi, I'm the maintenance assistant. Ask for work orders, reports, or charts — I can show data by status, priority, or over time.",
      },
      { role: "user", content: "Show me work orders by status." },
      {
        role: "assistant",
        parts: [
          {
            type: "text",
            content: "Here's how work orders break down by status right now:",
          },
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
          {
            type: "hint",
            text: 'Try "Show a pie chart by priority" or "Trend this year".',
          },
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
 * **Asset tracking** – User asks for asset status; assistant replies with a tracker part (AssetCard + AssetTracker as child).
 */
export const CMMSChatAssetTracker: Story = {
  render: function CMMSChatAssetTrackerRender() {
    const [inputValue, setInputValue] = useState("")
    const messages: ChatMessage[] = [
      {
        role: "welcome",
        content:
          "Hi, I'm the maintenance assistant. Ask about an asset (e.g. status, location) and I'll show tracking info.",
      },
      { role: "user", content: "What's the status of Pump P-101?" },
      {
        role: "assistant",
        parts: [
          {
            type: "text",
            content: "Here's **Pump P-101** — operational, last seen in Building A.",
          },
          {
            type: "tracker",
            name: "Pump P-101",
            assetNumber: "AST-001",
            statusKey: "operational",
            statusCatalog: ASSET_STATUS_CATALOG,
            locationLabel: "Building A · Floor 2",
            location: "Building A · Floor 2",
            lastSeen: "2 min ago",
            entries: [
              { label: "Runtime", value: "1,234 h" },
              { label: "Last service", value: "Jan 15" },
            ],
          },
          { type: "hint", text: 'Try "Where is P-101?" or "Status of HVAC Unit 3".' },
        ],
      },
    ]
    return (
      <CMMSChat
        messages={messages}
        inputValue={inputValue}
        onInputChange={setInputValue}
        onSubmit={() => {}}
        suggestedPrompts={["Asset status", "Where is P-101?", "Show pump runtime"]}
      />
    )
  },
}

/** AI-friendly 24h blocks: statusKey only (colors from TRACKER_STATUS_CATALOG in tracker.tsx). */
const TRACKER_24H_BLOCKS = Array.from({ length: 24 }, (_, i) => {
  const hour = `${i.toString().padStart(2, "0")}:00`
  if (i >= 2 && i < 6) return { statusKey: "idle", tooltip: `${hour} – Idle` }
  if (i >= 10 && i < 12) return { statusKey: "maintenance", tooltip: `${hour} – Maintenance` }
  return { statusKey: "running", tooltip: `${hour} – Running` }
})

/** Last 90 days activity for heatmap (date YYYY-MM-DD, value 0–20). */
function buildHeatmapData90(): { date: string; value: number }[] {
  const data: { date: string; value: number }[] = []
  const today = new Date()
  for (let i = 0; i < 90; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - (89 - i))
    data.push({
      date: d.toISOString().slice(0, 10),
      value: Math.floor(Math.random() * 21),
    })
  }
  return data
}

const HEATMAP_90D_DATA = buildHeatmapData90()

function heatmapStartEnd(): { startDate: string; endDate: string } {
  const end = new Date()
  const start = new Date(end)
  start.setDate(start.getDate() - 89)
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  }
}

const HEATMAP_RANGE = heatmapStartEnd()

/** Red scale for error heatmap: neutral for 0, red for days with errors. */
const HEATMAP_ERROR_COLOR_SCALE = ["#f8fafc", "#fef2f2", "#fecaca", "#f87171", "#ef4444"]

/** Errors per day over 90 days (value 0 = no errors, 1+ = error count); red on error days. */
function buildErrorsHeatmapData90(): { date: string; value: number }[] {
  const data: { date: string; value: number }[] = []
  const today = new Date()
  for (let i = 0; i < 90; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - (89 - i))
    const dateStr = d.toISOString().slice(0, 10)
    const seed = (d.getTime() % 31) + (i % 7)
    const value = seed % 5 === 0 ? 1 + (seed % 3) : 0
    data.push({ date: dateStr, value })
  }
  return data
}

const ERROR_HEATMAP_90D_DATA = buildErrorsHeatmapData90()

/**
 * **24h tracker + heatmap + errors** – 24h data, activity heatmap, then errors over 90 days.
 */
export const CMMSChatTracker24h: Story = {
  render: function CMMSChatTracker24hRender() {
    const [inputValue, setInputValue] = useState("")
    const messages: ChatMessage[] = [
      {
        role: "welcome",
        content:
          "Hi, I'm the maintenance assistant. Ask for asset status, 24h data, activity heatmap, or reports.",
      },
      { role: "user", content: "Show me 24h data for Pump P-101." },
      {
        role: "assistant",
        parts: [
          {
            type: "text",
            content:
              "Here's the last 24 hours for **Pump P-101** — running (green), maintenance (amber), idle (gray). Hover a block for the time.",
          },
          {
            type: "tracker24h",
            blocks: TRACKER_24H_BLOCKS,
            hoverEffect: true,
          },
          { type: "hint", text: 'Try "Activity last 90 days" or "Weekly view".' },
        ],
      },
      { role: "user", content: "Show activity over the last 90 days." },
      {
        role: "assistant",
        parts: [
          {
            type: "text",
            content:
              "Activity for **Pump P-101** over the last 90 days. Darker = more runtime or events.",
          },
          {
            type: "heatmap",
            data: HEATMAP_90D_DATA,
            startDate: HEATMAP_RANGE.startDate,
            endDate: HEATMAP_RANGE.endDate,
            colorMode: "discrete",
            cellSize: 12,
            gap: 3,
          },
          { type: "hint", text: 'Try "Interpolate colors" or "Bubbles style" for a different view.' },
        ],
      },
      { role: "user", content: "And show errors over past 90 days." },
      {
        role: "assistant",
        parts: [
          {
            type: "text",
            content:
              "Errors for **Pump P-101** over the past 90 days. Red = days with errors; gray = no errors.",
          },
          {
            type: "heatmap",
            data: ERROR_HEATMAP_90D_DATA,
            startDate: HEATMAP_RANGE.startDate,
            endDate: HEATMAP_RANGE.endDate,
            colorMode: "discrete",
            colorScale: HEATMAP_ERROR_COLOR_SCALE,
            cellSize: 12,
            gap: 3,
          },
          { type: "hint", text: 'Ask "Which day had the most?" or "Trend this year".' },
        ],
      },
    ]
    return (
      <CMMSChat
        messages={messages}
        inputValue={inputValue}
        onInputChange={setInputValue}
        onSubmit={() => {}}
        suggestedPrompts={["24h data for P-101", "Activity last 90 days", "Errors past 90 days", "Asset status"]}
      />
    )
  },
}
