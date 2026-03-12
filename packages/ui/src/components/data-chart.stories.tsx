import type { Meta, StoryObj } from "@storybook/react"
import { DataChart } from "./data-chart"

const meta = {
  title: "Data/DataChart",
  component: DataChart,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof DataChart>

export default meta
type Story = StoryObj<typeof meta>

const workOrdersByStatus = [
  { status: "Draft", count: 12 },
  { status: "In progress", count: 8 },
  { status: "Completed", count: 24 },
  { status: "Overdue", count: 3 },
]

const monthlyCount = [
  { month: "Jan", work_orders: 18 },
  { month: "Feb", work_orders: 22 },
  { month: "Mar", work_orders: 15 },
  { month: "Apr", work_orders: 28 },
  { month: "May", work_orders: 31 },
]

const priorityBreakdown = [
  { name: "High", value: 14 },
  { name: "Medium", value: 22 },
  { name: "Low", value: 9 },
]

/**
 * **DataChart** – Prop-driven chart for AI/assistant use.
 * Pass `type`, `data`, `categoryKey`, and `valueKeys`; no Recharts wiring needed.
 */
export const BarChartExample: Story = {
  args: {
    type: "bar",
    data: workOrdersByStatus,
    categoryKey: "status",
    valueKeys: ["count"],
    valueLabels: { count: "Work orders" },
    title: "Work orders by status",
    height: 260,
  },
}

export const LineChartExample: Story = {
  args: {
    type: "line",
    data: monthlyCount,
    categoryKey: "month",
    valueKeys: ["work_orders"],
    valueLabels: { work_orders: "Work orders" },
    title: "Work orders this year",
    height: 260,
  },
}

export const AreaChartExample: Story = {
  args: {
    type: "area",
    data: monthlyCount,
    categoryKey: "month",
    valueKeys: ["work_orders"],
    valueLabels: { work_orders: "Work orders" },
    title: "Trend",
    height: 260,
  },
}

export const PieChartExample: Story = {
  args: {
    type: "pie",
    data: priorityBreakdown,
    categoryKey: "name",
    valueKeys: ["value"],
    valueLabels: { value: "Count" },
    title: "By priority",
    height: 260,
  },
}

export const MultiSeriesBar: Story = {
  args: {
    type: "bar",
    data: [
      { month: "Jan", created: 10, completed: 8 },
      { month: "Feb", created: 14, completed: 12 },
      { month: "Mar", created: 9, completed: 11 },
      { month: "Apr", created: 16, completed: 14 },
    ],
    categoryKey: "month",
    valueKeys: ["created", "completed"],
    valueLabels: { created: "Created", completed: "Completed" },
    title: "Created vs completed",
    height: 260,
  },
}
