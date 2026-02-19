import type { Meta, StoryObj } from "@storybook/react"
import { WorkOrderCard } from "./work-order-card"
import { Button } from "./button"

const meta = {
  title: "CMMS/WorkOrderCard",
  component: WorkOrderCard,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof WorkOrderCard>

export default meta
type Story = StoryObj<typeof meta>

const statusCatalog = [
  { key: "draft", name: "Draft", color: "#94a3b8" },
  { key: "in_progress", name: "In progress", color: "#3b82f6" },
  { key: "completed", name: "Completed", color: "#22c55e" },
]
const priorityCatalog = [
  { key: "low", name: "Low", color: "#22c55e" },
  { key: "high", name: "High", color: "#f97316" },
]

const today = new Date()
const overdue = new Date(today)
overdue.setDate(overdue.getDate() - 2)
const dueSoon = new Date(today)
dueSoon.setDate(dueSoon.getDate() + 2)

export const WithAllFields: Story = {
  args: {
    title: "Replace pump seal - P-101",
    statusKey: "in_progress",
    statusCatalog,
    priorityKey: "high",
    priorityCatalog,
    dueDate: dueSoon,
    assigneeDisplayName: "Jane Smith",
    assetLabel: "Pump P-101",
  },
}

export const Minimal: Story = {
  args: {
    title: "Inspect HVAC unit",
    statusKey: "draft",
    statusCatalog,
  },
}

export const WithLink: Story = {
  args: {
    title: "Replace pump seal - P-101",
    statusKey: "in_progress",
    statusCatalog,
    priorityKey: "high",
    priorityCatalog,
    dueDate: dueSoon,
    assigneeDisplayName: "Jane Smith",
    href: "#",
  },
}

export const WithActionsSlot: Story = {
  args: {
    title: "Replace pump seal - P-101",
    statusKey: "in_progress",
    statusCatalog,
    priorityKey: "high",
    priorityCatalog,
    dueDate: dueSoon,
    assigneeDisplayName: "Jane Smith",
    actions: <Button variant="ghost" size="icon-xs">⋮</Button>,
  },
}

export const Overdue: Story = {
  args: {
    title: "Urgent: Fix leaking valve",
    statusKey: "in_progress",
    statusCatalog,
    priorityKey: "high",
    priorityCatalog,
    dueDate: overdue,
    assigneeDisplayName: "John Doe",
  },
}

export const DueSoon: Story = {
  args: {
    title: "Monthly inspection - Building A",
    statusKey: "in_progress",
    statusCatalog,
    dueDate: dueSoon,
    assigneeDisplayName: "Jane Smith",
    locationLabel: "Building A",
  },
}
