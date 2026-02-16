import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { IconPicker } from "./icon-picker"

const meta = {
  title: "Forms/IconPicker",
  component: IconPicker,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof IconPicker>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Icon picker with searchable grid of Lucide icons.
 * Used for selecting icons in catalog forms (status, maintenance type).
 */
export const Default: Story = {
  render: () => {
    const [icon, setIcon] = useState<string | null>("clipboard-check")
    return (
      <div className="w-[200px]">
        <IconPicker value={icon} onChange={setIcon} />
        <p className="mt-2 text-sm text-muted-foreground">
          Selected: {icon ?? "none"}
        </p>
      </div>
    )
  },
}

export const NoSelection: Story = {
  render: () => {
    const [icon, setIcon] = useState<string | null>(null)
    return (
      <div className="w-[200px]">
        <IconPicker value={icon} onChange={setIcon} />
      </div>
    )
  },
}

export const CustomIcons: Story = {
  render: () => {
    const [icon, setIcon] = useState<string | null>("check")
    return (
      <div className="w-[200px]">
        <IconPicker
          value={icon}
          onChange={setIcon}
          icons={[
            { key: "check", label: "Check" },
            { key: "x", label: "Cross" },
            { key: "play", label: "Play" },
            { key: "pause", label: "Pause" },
          ]}
        />
      </div>
    )
  },
}

export const Disabled: Story = {
  render: () => (
    <div className="w-[200px]">
      <IconPicker value="wrench" disabled />
    </div>
  ),
}
