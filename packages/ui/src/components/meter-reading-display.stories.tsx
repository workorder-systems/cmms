import type { Meta, StoryObj } from "@storybook/react"
import { MeterReadingDisplay } from "./meter-reading-display"

const meta = {
  title: "CMMS/MeterReadingDisplay",
  component: MeterReadingDisplay,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof MeterReadingDisplay>

export default meta
type Story = StoryObj<typeof meta>

export const ValueOnly: Story = {
  args: {
    value: 1234,
  },
}

export const ValueAndUnit: Story = {
  args: {
    value: 1234.5,
    unit: "h",
  },
}

export const WithLabel: Story = {
  args: {
    value: "1,234",
    unit: "h",
    label: "Runtime",
  },
}

export const TrendUp: Story = {
  args: {
    value: 1250,
    unit: "h",
    label: "Runtime",
    trend: "up",
  },
}

export const TrendDown: Story = {
  args: {
    value: 1200,
    unit: "h",
    label: "Runtime",
    trend: "down",
  },
}

export const WithTrendLabel: Story = {
  args: {
    value: 1234,
    unit: "h",
    trend: "up",
    trendLabel: "↑ from last reading",
  },
}

export const WithDecimalPlaces: Story = {
  args: {
    value: 1234.5678,
    unit: "°C",
    decimalPlaces: 2,
  },
}

export const StringValue: Story = {
  args: {
    value: "1,234.5",
    unit: "h",
    label: "Runtime",
  },
}
