import type { Meta, StoryObj } from "@storybook/react"
import { DueDateIndicator } from "./due-date-indicator"

const meta = {
  title: "CMMS/DueDateIndicator",
  component: DueDateIndicator,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof DueDateIndicator>

export default meta
type Story = StoryObj<typeof meta>

const today = new Date()
const yesterday = new Date(today)
yesterday.setDate(yesterday.getDate() - 1)
const inTwoDays = new Date(today)
inTwoDays.setDate(inTwoDays.getDate() + 2)
const inTwoWeeks = new Date(today)
inTwoWeeks.setDate(inTwoWeeks.getDate() + 14)

export const Overdue: Story = {
  args: {
    dueDate: yesterday,
  },
}

export const DueToday: Story = {
  args: {
    dueDate: today,
  },
}

export const DueInTwoDays: Story = {
  args: {
    dueDate: inTwoDays,
    dueSoonDays: 3,
  },
}

export const DueInTwoWeeks: Story = {
  args: {
    dueDate: inTwoWeeks,
  },
}

export const WithLabel: Story = {
  args: {
    dueDate: inTwoDays,
    label: "Due",
  },
}

export const NullDate: Story = {
  args: {
    dueDate: null,
  },
}

export const NullWithLabel: Story = {
  args: {
    dueDate: null,
    label: "Due",
  },
}

export const CustomFormat: Story = {
  args: {
    dueDate: inTwoDays,
    format: (d) => d.toISOString().slice(0, 10),
  },
}
