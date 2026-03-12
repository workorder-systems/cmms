import type { Meta, StoryObj } from "@storybook/react"
import { EntityHeader } from "./entity-header"
import { CatalogStatusBadge } from "./catalog-status-badge"
import { CatalogPriorityBadge } from "./catalog-priority-badge"
import { DueDateIndicator } from "./due-date-indicator"
import { AssigneeChip } from "./assignee-chip"
import { Button } from "./button"

const meta = {
  title: "CMMS/EntityHeader",
  component: EntityHeader,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof EntityHeader>

export default meta
type Story = StoryObj<typeof meta>

const statusCatalog = [
  { key: "in_progress", name: "In progress", color: "#3b82f6" },
  { key: "completed", name: "Completed", color: "#22c55e" },
]
const priorityCatalog = [
  { key: "high", name: "High", color: "#f97316" },
]

export const TitleOnly: Story = {
  args: {
    title: "WO-2024-001: Replace pump seal",
  },
}

export const TitleAndActions: Story = {
  args: {
    title: "WO-2024-001: Replace pump seal",
    actions: (
      <>
        <Button variant="outline" size="sm">
          Edit
        </Button>
        <Button size="sm">Complete</Button>
      </>
    ),
  },
}

export const TitleAndMeta: Story = {
  args: {
    title: "WO-2024-001: Replace pump seal",
    meta: (
      <>
        <CatalogStatusBadge statusKey="in_progress" statusCatalog={statusCatalog} />
        <CatalogPriorityBadge priorityKey="high" priorityCatalog={priorityCatalog} />
        <DueDateIndicator
          dueDate={new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)}
          label="Due"
        />
        <AssigneeChip displayName="Jane Smith" />
      </>
    ),
  },
}

export const Full: Story = {
  args: {
    breadcrumb: (
      <nav className="text-muted-foreground text-sm">
        <a href="#" className="hover:text-foreground">
          Work orders
        </a>
        <span className="mx-2">/</span>
        <span className="text-foreground">WO-2024-001</span>
      </nav>
    ),
    title: "Replace pump seal",
    meta: (
      <>
        <CatalogStatusBadge statusKey="in_progress" statusCatalog={statusCatalog} />
        <CatalogPriorityBadge priorityKey="high" priorityCatalog={priorityCatalog} />
        <DueDateIndicator
          dueDate={new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)}
          label="Due"
        />
        <AssigneeChip displayName="Jane Smith" />
      </>
    ),
    actions: (
      <>
        <Button variant="outline" size="sm">
          Edit
        </Button>
        <Button size="sm">Complete</Button>
      </>
    ),
  },
}

export const CustomTitleNode: Story = {
  args: {
    title: (
      <h1 className="text-2xl font-semibold tracking-tight">
        <span className="text-muted-foreground">WO-2024-001</span>
        {" · "}
        Replace pump seal
      </h1>
    ),
    meta: (
      <>
        <CatalogStatusBadge statusKey="completed" statusCatalog={statusCatalog} />
      </>
    ),
  },
}
