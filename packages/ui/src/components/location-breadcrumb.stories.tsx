import type { Meta, StoryObj } from "@storybook/react"
import { LocationBreadcrumb } from "./location-breadcrumb"

const meta = {
  title: "CMMS/LocationBreadcrumb",
  component: LocationBreadcrumb,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof LocationBreadcrumb>

export default meta
type Story = StoryObj<typeof meta>

export const TwoLevels: Story = {
  args: {
    items: [
      { id: "1", label: "Main site" },
      { id: "2", label: "Building A" },
    ],
  },
}

export const ThreeLevels: Story = {
  args: {
    items: [
      { id: "1", label: "Main site" },
      { id: "2", label: "Building A" },
      { id: "3", label: "Floor 2" },
    ],
  },
}

export const FourLevels: Story = {
  args: {
    items: [
      { id: "1", label: "Main site" },
      { id: "2", label: "Building A" },
      { id: "3", label: "Floor 2" },
      { id: "4", label: "Pump P-101" },
    ],
  },
}

export const CustomSeparator: Story = {
  args: {
    items: [
      { id: "1", label: "Site" },
      { id: "2", label: "Building" },
      { id: "3", label: "Asset" },
    ],
    separator: <span className="text-muted-foreground px-1">/</span>,
  },
}

export const WithLinks: Story = {
  args: {
    items: [
      { id: "1", label: "Main site" },
      { id: "2", label: "Building A" },
      { id: "3", label: "Pump P-101" },
    ],
    renderItem: (item, isLast) =>
      isLast ? (
        <span className="text-foreground font-medium">{item.label}</span>
      ) : (
        <a href="#" className="hover:text-foreground hover:underline">
          {item.label}
        </a>
      ),
  },
}
