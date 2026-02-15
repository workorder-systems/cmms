import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { ColorPicker } from "./color-picker"

const meta = {
  title: "Forms/ColorPicker",
  component: ColorPicker,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ColorPicker>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Color picker with popover, hex input, and preset swatches.
 * Used for selecting colors in catalog forms (status, priority, etc.).
 */
export const Default: Story = {
  render: () => {
    const [color, setColor] = useState("#3b82f6")
    return (
      <div className="w-[200px]">
        <ColorPicker value={color} onChange={setColor} />
        <p className="mt-2 text-sm text-muted-foreground">Selected: {color}</p>
      </div>
    )
  },
}

export const WithCustomPresets: Story = {
  render: () => {
    const [color, setColor] = useState("#22c55e")
    return (
      <div className="w-[200px]">
        <ColorPicker
          value={color}
          onChange={setColor}
          presets={["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#6b7280"]}
        />
      </div>
    )
  },
}

export const WithoutHexInput: Story = {
  render: () => {
    const [color, setColor] = useState("#ec4899")
    return (
      <div className="w-[200px]">
        <ColorPicker value={color} onChange={setColor} showHexInput={false} />
      </div>
    )
  },
}

export const Disabled: Story = {
  render: () => (
    <div className="w-[200px]">
      <ColorPicker value="#fbbf24" disabled />
    </div>
  ),
}
