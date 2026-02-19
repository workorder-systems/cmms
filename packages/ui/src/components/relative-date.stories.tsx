import type { Meta, StoryObj } from "@storybook/react"
import { RelativeDate } from "./relative-date"

const meta = {
  title: "CMMS/RelativeDate",
  component: RelativeDate,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof RelativeDate>

export default meta
type Story = StoryObj<typeof meta>

const now = new Date()
const oneDayAgo = new Date(now)
oneDayAgo.setDate(oneDayAgo.getDate() - 1)
const oneWeekAgo = new Date(now)
oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
const inThreeDays = new Date(now)
inThreeDays.setDate(inThreeDays.getDate() + 3)

export const PastOneDay: Story = {
  args: {
    date: oneDayAgo,
  },
}

export const PastOneWeek: Story = {
  args: {
    date: oneWeekAgo,
  },
}

export const Future: Story = {
  args: {
    date: inThreeDays,
  },
}

export const Today: Story = {
  args: {
    date: now,
  },
}

export const WithTooltip: Story = {
  args: {
    date: oneDayAgo,
    options: { tooltip: true },
  },
}

export const WithoutTooltip: Story = {
  args: {
    date: oneDayAgo,
    options: { tooltip: false },
  },
}

export const WithTime: Story = {
  args: {
    date: now,
    options: { includeTime: true, tooltip: true },
  },
}

export const DateString: Story = {
  args: {
    date: oneDayAgo.toISOString(),
  },
}
