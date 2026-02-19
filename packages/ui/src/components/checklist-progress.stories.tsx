import type { Meta, StoryObj } from "@storybook/react"
import { ChecklistProgress } from "./checklist-progress"

const meta = {
  title: "CMMS/ChecklistProgress",
  component: ChecklistProgress,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ChecklistProgress>

export default meta
type Story = StoryObj<typeof meta>

export const WithBar: Story = {
  args: {
    completed: 3,
    total: 5,
    label: "tasks",
    showBar: true,
  },
}

export const WithoutBar: Story = {
  args: {
    completed: 3,
    total: 5,
    label: "tasks",
  },
}

export const NoLabel: Story = {
  args: {
    completed: 2,
    total: 4,
    showBar: true,
  },
}

export const AllComplete: Story = {
  args: {
    completed: 5,
    total: 5,
    label: "steps",
    showBar: true,
  },
}

export const ZeroTotal: Story = {
  args: {
    completed: 0,
    total: 0,
    label: "tasks",
  },
}

export const ZeroComplete: Story = {
  args: {
    completed: 0,
    total: 4,
    label: "tasks",
    showBar: true,
  },
}
