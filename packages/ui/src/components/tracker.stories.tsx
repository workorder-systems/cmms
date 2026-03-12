import type { Meta, StoryObj } from "@storybook/react"
import {
  Tracker,
  TrackerWithCatalog,
  type TrackerBlockProps,
  type TrackerBlockInput,
} from "./tracker"

const meta = {
  title: "Data Display/Tracker",
  component: Tracker,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    data: {
      description: "Array of block configs (color, tooltip) for each time segment or asset",
      control: false,
    },
    defaultBackgroundColor: {
      description: "Background for segments with no status (e.g. offline, no data)",
      control: "text",
    },
    hoverEffect: {
      description: "Reduce opacity on hover",
      control: "boolean",
    },
  },
} satisfies Meta<typeof Tracker>

export default meta
type Story = StoryObj<typeof meta>

/** 48 hours status for one machine: Running (green), Fault (red), Degraded (amber). */
const machine48hData: TrackerBlockProps[] = (() => {
  const segments: TrackerBlockProps[] = []
  for (let i = 0; i < 8; i++) segments.push({ color: "bg-success", tooltip: "Running" })
  segments.push({ color: "bg-destructive", tooltip: "Fault: Spindle overload – WO-2847" })
  for (let i = 0; i < 6; i++) segments.push({ color: "bg-success", tooltip: "Running" })
  segments.push({ color: "bg-destructive", tooltip: "Fault: Door interlock – WO-2849" })
  for (let i = 0; i < 10; i++) segments.push({ color: "bg-success", tooltip: "Running" })
  segments.push({ color: "bg-warning", tooltip: "Degraded: Vibration above threshold" })
  while (segments.length < 48) segments.push({ color: "bg-success", tooltip: "Running" })
  return segments.map((item, i) => {
    const day = Math.floor(i / 24) + 1
    const h = i % 24
    const label = `Day ${day} ${String(h).padStart(2, "0")}:00`
    return { ...item, tooltip: `${label} – ${item.tooltip}` }
  })
})()

/** Weekly availability by day (e.g. one asset). */
const weeklyAvailabilityData: TrackerBlockProps[] = [
  { color: "bg-success", tooltip: "Mon: 96% uptime · 0.4h downtime" },
  { color: "bg-success", tooltip: "Tue: 100% uptime" },
  { color: "bg-warning", tooltip: "Wed: Planned maintenance · 4h" },
  { color: "bg-success", tooltip: "Thu: 100% uptime" },
  { color: "bg-destructive", tooltip: "Fri: Unplanned downtime 2h · WO-2851" },
  { defaultBackgroundColor: "bg-muted", tooltip: "Sat: Off – no production" },
  { defaultBackgroundColor: "bg-muted", tooltip: "Sun: Off – no production" },
]

/** Last 30 days availability (one segment per day). */
const monthlyAvailabilityData: TrackerBlockProps[] = Array.from(
  { length: 30 },
  (_, i) => {
    const day = i + 1
    const rand = (day * 7) % 5
    if (rand === 0)
      return {
        color: "bg-destructive",
        tooltip: `Day ${day}: Fault – see WO-${2840 + day}`,
      }
    if (rand === 1)
      return {
        color: "bg-warning",
        tooltip: `Day ${day}: Degraded or short stoppage`,
      }
    if (rand === 2)
      return {
        color: "bg-muted",
        tooltip: `Day ${day}: No data / offline`,
      }
    return {
      color: "bg-success",
      tooltip: `Day ${day}: Normal operation`,
    }
  }
)

/**
 * Machine status over 48 hours (e.g. CNC or press).
 * Each segment = 1 hour. Green = running, red = fault, amber = degraded, gray = off/no data.
 */
export const MachineStatus48h: Story = {
  args: {
    data: machine48hData,
    hoverEffect: true,
  },
  render: (args) => (
    <div className="w-[600px]">
      <Tracker {...args} />
    </div>
  ),
}

/**
 * Weekly availability bar for one asset.
 * Use for dashboards or asset detail to show Mon–Sun at a glance.
 */
export const WeeklyAvailability: Story = {
  args: {
    data: weeklyAvailabilityData,
  },
  render: (args) => (
    <div className="w-[320px]">
      <Tracker {...args} />
    </div>
  ),
}

/**
 * Weekly bar with hover effect for emphasis.
 */
export const WeeklyAvailabilityWithHover: Story = {
  args: {
    data: weeklyAvailabilityData,
    hoverEffect: true,
  },
  render: (args) => (
    <div className="w-[320px]">
      <Tracker {...args} />
    </div>
  ),
}

/**
 * Inspection or PM compliance: segments = assets or periods.
 * Filled = completed, muted = pending or overdue.
 */
export const InspectionCompliance: Story = {
  args: {
    data: [
      { color: "bg-success", tooltip: "Press-01: Inspection completed 12 Feb" },
      { color: "bg-success", tooltip: "Press-02: Inspection completed 14 Feb" },
      { defaultBackgroundColor: "bg-muted", tooltip: "Mill-03: Due 20 Feb" },
      { defaultBackgroundColor: "bg-muted", tooltip: "Conveyor-04: Due 22 Feb" },
    ],
    defaultBackgroundColor: "bg-muted",
  },
  render: (args) => (
    <div className="w-[320px]">
      <Tracker {...args} />
    </div>
  ),
}

/**
 * Last 30 days availability for one machine.
 * Useful on asset or dashboard views.
 */
export const MonthlyAvailability: Story = {
  args: {
    data: monthlyAvailabilityData,
    hoverEffect: true,
  },
  render: (args) => (
    <div className="w-[400px]">
      <Tracker {...args} />
    </div>
  ),
}

/**
 * Multi-asset status: one segment per machine.
 * Quick view of fleet or line status.
 */
export const MultiAssetStatus: Story = {
  args: {
    data: [
      { color: "bg-success", tooltip: "Press-01: Running" },
      { color: "bg-success", tooltip: "Press-02: Running" },
      { color: "bg-warning", tooltip: "Mill-03: Warning – vibration" },
      { color: "bg-destructive", tooltip: "Conveyor-04: Down – WO-2852" },
      { color: "bg-success", tooltip: "Robot-05: Running" },
    ],
    hoverEffect: true,
  },
  render: (args) => (
    <div className="w-[280px]">
      <Tracker {...args} />
    </div>
  ),
}

/* -------------------------------------------------------------------------
 * AI-friendly wrapper: statusKey + tooltip only; colors from TRACKER_STATUS_CATALOG.
 * Use in chat or when the caller should not supply CSS classes.
 * ------------------------------------------------------------------------- */

/** 24h blocks with semantic keys (running, idle, maintenance) — no raw colors. */
const ai24hBlocks: TrackerBlockInput[] = Array.from({ length: 24 }, (_, i) => {
  const hour = `${i.toString().padStart(2, "0")}:00`
  if (i >= 2 && i < 6) return { statusKey: "idle", tooltip: `${hour} – Idle` }
  if (i >= 10 && i < 12) return { statusKey: "maintenance", tooltip: `${hour} – Maintenance` }
  return { statusKey: "running", tooltip: `${hour} – Running` }
})

/**
 * Same as MachineStatus48h but via TrackerWithCatalog: AI passes statusKey + tooltip;
 * colors come from default catalog (running → green, fault → red, etc.).
 */
export const WithCatalog24h: StoryObj<Meta<typeof TrackerWithCatalog>> = {
  render: () => (
    <div className="w-[600px]">
      <TrackerWithCatalog blocks={ai24hBlocks} hoverEffect />
    </div>
  ),
}

/**
 * Multi-asset with catalog: statusKey only, no CSS.
 */
export const WithCatalogMultiAsset: StoryObj<Meta<typeof TrackerWithCatalog>> = {
  render: () => (
    <div className="w-[280px]">
      <TrackerWithCatalog
        blocks={[
          { statusKey: "running", tooltip: "Press-01: Running" },
          { statusKey: "running", tooltip: "Press-02: Running" },
          { statusKey: "warning", tooltip: "Mill-03: Warning – vibration" },
          { statusKey: "fault", tooltip: "Conveyor-04: Down – WO-2852" },
          { statusKey: "running", tooltip: "Robot-05: Running" },
        ]}
        hoverEffect
      />
    </div>
  ),
}
