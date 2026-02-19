import type { Meta, StoryObj } from "@storybook/react"
import { AssetCard } from "./asset-card"
import { AssetTracker } from "./asset-tracker"
import { Button } from "./button"
import { LocationBreadcrumb } from "./location-breadcrumb"

const meta = {
  title: "CMMS/AssetCard",
  component: AssetCard,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof AssetCard>

export default meta
type Story = StoryObj<typeof meta>

const statusCatalog = [
  { key: "operational", name: "Operational", color: "#22c55e" },
  { key: "maintenance", name: "Under maintenance", color: "#eab308" },
  { key: "down", name: "Down", color: "#ef4444" },
]

export const Full: Story = {
  args: {
    name: "Pump P-101",
    assetNumber: "AST-001",
    statusKey: "operational",
    statusCatalog,
    locationLabel: "Building A · Floor 2",
    meterSummary: "Last: 1,234 h",
  },
}

export const Minimal: Story = {
  args: {
    name: "HVAC Unit 3",
    statusKey: "operational",
    statusCatalog,
  },
}

export const WithLocationAndMeter: Story = {
  args: {
    name: "Pump P-101",
    assetNumber: "AST-001",
    statusKey: "operational",
    statusCatalog,
    locationLabel: "Building A",
    meterSummary: "Runtime: 1,234 h",
  },
}

export const WithLink: Story = {
  args: {
    name: "Pump P-101",
    assetNumber: "AST-001",
    statusKey: "operational",
    statusCatalog,
    locationLabel: "Building A",
    href: "#",
  },
}

export const WithLocationBreadcrumb: Story = {
  args: {
    name: "Pump P-101",
    statusKey: "operational",
    statusCatalog,
    locationBreadcrumb: (
      <LocationBreadcrumb
        items={[
          { id: "1", label: "Main site" },
          { id: "2", label: "Building A" },
          { id: "3", label: "Pump P-101" },
        ]}
      />
    ),
  },
}

export const WithActions: Story = {
  args: {
    name: "Pump P-101",
    statusKey: "maintenance",
    statusCatalog,
    locationLabel: "Building A",
    actions: <Button variant="ghost" size="icon-xs">⋮</Button>,
  },
}

export const WithImage: Story = {
  args: {
    name: "Pump P-101",
    assetNumber: "AST-001",
    statusKey: "operational",
    statusCatalog,
    locationLabel: "Building A · Floor 2",
    meterSummary: "Last: 1,234 h",
    imageUrl:
      "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=100&h=100&fit=crop",
    href: "#",
  },
}

export const WithImageNoLink: Story = {
  args: {
    name: "Compressor C-02",
    assetNumber: "AST-003",
    statusKey: "operational",
    statusCatalog,
    meterSummary: "Runtime: 3,100 h",
    imageUrl:
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=100&h=100&fit=crop",
  },
}

export const WithTracker: Story = {
  args: {
    name: "Pump P-101",
    assetNumber: "AST-001",
    statusKey: "operational",
    statusCatalog,
    locationLabel: "Building A · Floor 2",
    children: (
      <AssetTracker
        location="Building A · Floor 2"
        lastSeen="2 min ago"
        entries={[
          { label: "Runtime", value: "1,234 h" },
          { label: "Last service", value: "Jan 15" },
        ]}
      />
    ),
  },
}
