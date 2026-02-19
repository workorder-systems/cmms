import type { Meta, StoryObj } from "@storybook/react"
import { AssigneeChip } from "./assignee-chip"

const meta = {
  title: "CMMS/AssigneeChip",
  component: AssigneeChip,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof AssigneeChip>

export default meta
type Story = StoryObj<typeof meta>

export const WithNameAndImage: Story = {
  args: {
    displayName: "Jane Smith",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jane",
  },
}

export const WithNameOnly: Story = {
  args: {
    displayName: "John Doe",
  },
}

export const Unassigned: Story = {
  args: {},
}

export const UnassignedExplicit: Story = {
  args: {
    displayName: null,
    avatarUrl: null,
  },
}

export const SizeSm: Story = {
  args: {
    displayName: "Alex Johnson",
    size: "sm",
  },
}

export const LongName: Story = {
  args: {
    displayName: "Christopher Alexander Montgomery III",
  },
}
