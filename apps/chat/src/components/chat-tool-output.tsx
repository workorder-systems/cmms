"use client"

import * as React from "react"
import { DataGrid } from "@workspace/ui/components/data-grid/data-grid"
import { useDataGrid } from "@workspace/ui/hooks/use-data-grid"
import { DataChart } from "@workspace/ui/components/data-chart"
import { WorkOrderCard } from "@workspace/ui/components/work-order-card"
import type { ToolPart } from "@workspace/ui/components/prompt-kit"

/** Minimal column def for read-only grid; matches useDataGrid column shape. */
type SimpleColumnDef = {
  id: string
  accessorKey: string
  header: string
  meta?: { label: string; cell: { variant: string } }
}

const LIST_GRID_TOOLS = new Set([
  "list_work_orders",
  "list_assets",
  "list_locations",
  "get_dashboard_open_work_orders",
  "get_dashboard_overdue_work_orders",
])

/** Default catalogs so WorkOrderCard can render status/priority badges without an extra API call. */
const DEFAULT_STATUS_CATALOG = [
  { key: "draft", name: "Draft", color: "#94a3b8" },
  { key: "in_progress", name: "In progress", color: "#3b82f6" },
  { key: "completed", name: "Completed", color: "#22c55e" },
]
const DEFAULT_PRIORITY_CATALOG = [
  { key: "low", name: "Low", color: "#22c55e" },
  { key: "medium", name: "Medium", color: "#eab308" },
  { key: "high", name: "High", color: "#f97316" },
  { key: "critical", name: "Critical", color: "#ef4444" },
]

function humanize(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function getDataArray(output: Record<string, unknown> | unknown[] | undefined): Record<string, unknown>[] | null {
  if (output == null) return null
  if (Array.isArray(output)) return output as Record<string, unknown>[]
  const o = output as Record<string, unknown>
  const value = o.value
  if (Array.isArray(value)) return value as Record<string, unknown>[]
  if (o.data != null && Array.isArray(o.data)) return o.data as Record<string, unknown>[]
  return null
}

/** Preferred column order: important fields first, id/tenant_id last. */
const COLUMN_ORDER: string[] = [
  "title",
  "description",
  "name",
  "status",
  "priority",
  "due_date",
  "created_at",
  "updated_at",
  "asset_id",
  "location_id",
  "work_order_id",
  "tenant_id",
  "id",
]

function sortKeys(keys: string[]): string[] {
  const orderSet = new Set(COLUMN_ORDER)
  const ordered: string[] = []
  const rest: string[] = []
  for (const k of COLUMN_ORDER) {
    if (keys.includes(k)) ordered.push(k)
  }
  for (const k of keys) {
    if (!orderSet.has(k)) rest.push(k)
  }
  return [...ordered, ...rest]
}

function buildColumnsFromData(data: Record<string, unknown>[]): SimpleColumnDef[] {
  const first = data[0]
  if (!first || typeof first !== "object") return []
  const rawKeys = Object.keys(first).filter((k) => k !== "id" || first[k] != null)
  if (rawKeys.length === 0) return []
  const keys = sortKeys(rawKeys)
  return keys.map((key) => ({
    id: key,
    accessorKey: key,
    header: humanize(key),
    meta: {
      label: humanize(key),
      cell: { variant: "short-text" as const },
    },
  }))
}

function getRowId(row: Record<string, unknown>): string {
  const id = row.id ?? row.work_order_id
  if (id != null) return String(id)
  return `${row.title ?? row.name ?? ""}-${JSON.stringify(row).slice(0, 20)}`
}

/** Renders a WorkOrderCard from get_work_order tool output (single row; no error). */
function ToolOutputWorkOrderCard({ row }: { row: Record<string, unknown> }) {
  const title = (row.title as string) ?? (row.work_order_title as string) ?? "Work order"
  const statusKey = (row.status as string) ?? null
  const priorityKey = (row.priority as string) ?? null
  const dueDateRaw = row.due_date
  const dueDate =
    dueDateRaw == null ? null : typeof dueDateRaw === "string" ? dueDateRaw : dueDateRaw instanceof Date ? dueDateRaw : null
  const assigneeDisplayName = (row.assigned_to_name as string) ?? null
  return (
    <div className="w-full max-w-md">
      <WorkOrderCard
        title={title}
        statusKey={statusKey}
        statusCatalog={DEFAULT_STATUS_CATALOG}
        priorityKey={priorityKey}
        priorityCatalog={DEFAULT_PRIORITY_CATALOG}
        dueDate={dueDate}
        assigneeDisplayName={assigneeDisplayName}
      />
    </div>
  )
}

/** Renders a read-only DataGrid for array tool output. */
function ToolOutputGrid({ data }: { data: Record<string, unknown>[] }) {
  const columns = React.useMemo(() => buildColumnsFromData(data), [data])
  const { table, ...dataGridProps } = useDataGrid({
    data,
    columns,
    readOnly: true,
    getRowId: (row) => getRowId(row as Record<string, unknown>),
    enableSearch: true,
  })
  if (columns.length === 0) return null
  return (
    <div className="w-full overflow-hidden rounded-md border">
      <DataGrid table={table} {...dataGridProps} height={320} />
    </div>
  )
}

/** Single chart config from tool output. */
type ChartConfig = {
  _chartType?: "bar" | "line" | "area" | "pie"
  data?: Record<string, string | number>[]
  categoryKey?: string
  valueKeys?: string[]
  valueLabels?: Record<string, string>
  title?: string
}

/** Renders DataChart when output has chart shape (_chartType, data, categoryKey, valueKeys). */
function ToolOutputChart({ config }: { config: ChartConfig }) {
  const chartType = config._chartType
  const data = config.data
  const categoryKey = config.categoryKey
  const valueKeys = config.valueKeys
  const valueLabels = config.valueLabels
  const title = config.title
  if (!chartType || !Array.isArray(data) || !categoryKey || !valueKeys?.length) return null
  return (
    <DataChart
      type={chartType}
      data={data}
      categoryKey={categoryKey}
      valueKeys={valueKeys}
      valueLabels={valueLabels}
      title={title}
      height={260}
      className="w-full"
    />
  )
}

/** Renders one or more charts from output.charts or a single chart from output. */
function ToolOutputCharts({ output }: { output: Record<string, unknown> }) {
  const charts = output.charts as ChartConfig[] | undefined
  if (Array.isArray(charts) && charts.length > 0) {
    return (
      <div className="flex flex-col gap-4">
        {charts.map((config, i) => (
          <ToolOutputChart key={i} config={config} />
        ))}
      </div>
    )
  }
  return <ToolOutputChart config={output as ChartConfig} />
}

/**
 * Renders tool output as WorkOrderCard (get_work_order), DataGrid (list_*), or DataChart (chart shape).
 * Returns null to fall back to default friendly output.
 */
export function renderChatToolOutput(toolPart: ToolPart): React.ReactNode | null {
  if (toolPart.state !== "output-available" || !toolPart.output) return null
  const output = toolPart.output as Record<string, unknown>

  // Single work order card: get_work_order with valid row (no error)
  const toolName = (toolPart.type ?? "").toLowerCase()
  if (toolName === "get_work_order" && output.error == null && (output.id != null || output.title != null)) {
    return <ToolOutputWorkOrderCard row={output} />
  }

  // Chart: explicit _display: "chart" or _chartType / charts array
  if (output._display === "chart" || output._chartType != null || (Array.isArray(output.charts) && output.charts.length > 0)) {
    return <ToolOutputCharts output={output} />
  }

  // Grid: list tools with array data
  if (LIST_GRID_TOOLS.has(toolName)) {
    const data = getDataArray(output)
    if (data && data.length > 0) {
      return <ToolOutputGrid data={data} />
    }
  }

  return null
}
