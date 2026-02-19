import type { Meta, StoryObj } from "@storybook/react"
import { CatalogPriorityBadge } from "./catalog-priority-badge"

const meta = {
  title: "CMMS/CatalogPriorityBadge",
  component: CatalogPriorityBadge,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof CatalogPriorityBadge>

export default meta
type Story = StoryObj<typeof meta>

const priorityCatalog = [
  { key: "low", name: "Low", color: "#22c55e" },
  { key: "medium", name: "Medium", color: "#eab308" },
  { key: "high", name: "High", color: "#f97316" },
  { key: "urgent", name: "Urgent", color: "#ef4444" },
]

export const WithCatalog: Story = {
  args: {
    priorityKey: "high",
    priorityCatalog,
  },
}

export const WithColor: Story = {
  args: {
    priorityKey: "urgent",
    priorityCatalog,
  },
}

export const WithoutCatalog: Story = {
  args: {
    priorityKey: "custom_priority",
  },
}

export const TextVariant: Story = {
  args: {
    priorityKey: "medium",
    priorityCatalog,
    variant: "text",
  },
}

export const NullKey: Story = {
  args: {
    priorityKey: null,
    priorityCatalog,
  },
}

export const KeyNotInCatalog: Story = {
  args: {
    priorityKey: "critical",
    priorityCatalog,
  },
}
