import type { Meta, StoryObj } from "@storybook/react"
import {
  EntityAuditTimeline,
  type EntityAuditItem,
} from "./entity-audit-timeline"

const meta = {
  title: "CMMS/EntityAuditTimeline",
  component: EntityAuditTimeline,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof EntityAuditTimeline>

export default meta
type Story = StoryObj<typeof meta>

const statusCatalog = [
  { key: "draft", name: "Draft" },
  { key: "in_progress", name: "In progress" },
  { key: "completed", name: "Completed" },
]
const priorityCatalog = [
  { key: "low", name: "Low" },
  { key: "medium", name: "Medium" },
  { key: "high", name: "High" },
]

const mockItems: EntityAuditItem[] = [
  {
    id: 1,
    operation: "insert",
    created_at: "2024-02-15T10:00:00Z",
    table_name: "work_orders",
    record_id: "wo-001",
    user_id: "u1",
    user_display_name: "Jane Smith",
  },
  {
    id: 2,
    operation: "update",
    created_at: "2024-02-16T14:30:00Z",
    table_name: "work_orders",
    record_id: "wo-001",
    user_id: "u2",
    user_display_name: "John Doe",
    changed_fields: ["status", "priority"],
    old_data: { status: "draft", priority: "low" },
    new_data: { status: "in_progress", priority: "high" },
  },
  {
    id: 3,
    operation: "update",
    created_at: "2024-02-17T09:15:00Z",
    table_name: "work_orders",
    record_id: "wo-001",
    user_display_name: "Jane Smith",
    changed_fields: ["assigned_to_id", "due_date"],
    old_data: { assigned_to_id: null, due_date: "2024-02-20T00:00:00Z" },
    new_data: { assigned_to_id: "u1", due_date: "2024-02-25T00:00:00Z" },
  },
  {
    id: 4,
    operation: "delete",
    created_at: "2024-02-18T16:00:00Z",
    table_name: "attachments",
    record_id: "att-99",
    user_display_name: "John Doe",
  },
]

export const WithAuditItems: Story = {
  args: {
    items: mockItems,
    statusCatalog,
    priorityCatalog,
  },
}

export const SingleItem: Story = {
  args: {
    items: [mockItems[0]!],
  },
}

export const WithCustomFormatDate: Story = {
  args: {
    items: mockItems,
    formatDate: (d) =>
      d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
  },
}

export const Empty: Story = {
  args: {
    items: [],
  },
}

export const EmptyWithCustomMessage: Story = {
  args: {
    items: [],
    emptyMessage: "No changes recorded for this entity yet.",
  },
}

/** When the API provides old_data/new_data (e.g. from v_audit_entity_changes), the timeline shows per-field old → new. Status and priority use catalog labels when statusCatalog/priorityCatalog are passed. */
export const WithOldAndNewValues: Story = {
  args: {
    items: [
      {
        id: 1,
        operation: "update",
        created_at: "2024-02-16T14:30:00Z",
        table_name: "work_orders",
        record_id: "wo-001",
        user_display_name: "John Doe",
        changed_fields: ["status", "priority", "assigned_to_id"],
        old_data: { status: "draft", priority: "low", assigned_to_id: null },
        new_data: { status: "in_progress", priority: "high", assigned_to_id: "u1" },
      },
    ],
    statusCatalog,
    priorityCatalog,
  },
}
