import type { Meta, StoryObj } from "@storybook/react"
import { CatalogStatusBadge } from "./catalog-status-badge"

const meta = {
  title: "CMMS/CatalogStatusBadge",
  component: CatalogStatusBadge,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof CatalogStatusBadge>

export default meta
type Story = StoryObj<typeof meta>

const statusCatalog = [
  { key: "draft", name: "Draft", color: "#94a3b8" },
  { key: "in_progress", name: "In progress", color: "#3b82f6" },
  { key: "completed", name: "Completed", color: "#22c55e" },
  { key: "cancelled", name: "Cancelled", color: "#64748b" },
]

export const WithCatalog: Story = {
  args: {
    statusKey: "in_progress",
    statusCatalog,
  },
}

export const WithColor: Story = {
  args: {
    statusKey: "completed",
    statusCatalog,
  },
}

export const WithoutCatalog: Story = {
  args: {
    statusKey: "custom_status",
  },
}

export const TextVariant: Story = {
  args: {
    statusKey: "in_progress",
    statusCatalog,
    variant: "text",
  },
}

export const NullKey: Story = {
  args: {
    statusKey: null,
    statusCatalog,
  },
}

export const EmptyKey: Story = {
  args: {
    statusKey: "",
    statusCatalog,
  },
}

export const KeyNotInCatalog: Story = {
  args: {
    statusKey: "unknown",
    statusCatalog,
  },
}
