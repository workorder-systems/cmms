"use client"

import * as React from "react"
import { DataGrid } from "@workspace/ui/components/data-grid/data-grid"
import { useDataGrid } from "@workspace/ui/hooks/use-data-grid"
import { DataChart } from "@workspace/ui/components/data-chart"
import { WorkOrderCard } from "@workspace/ui/components/work-order-card"
import { AssetCard } from "@workspace/ui/components/asset-card"
import { Item, ItemContent, ItemTitle, ItemDescription } from "@workspace/ui/components/item"
import type { ToolPart } from "@workspace/ui/components/prompt-kit"

/** Minimal column def for read-only grid; matches useDataGrid column shape. */
type SimpleColumnDef = {
  id: string
  accessorKey: string
  header: string
  meta?: { label: string; cell: { variant: string } }
}

/** Tools that return list/array data — render as DataGrid (CSV or JSON array). */
const LIST_GRID_TOOLS = new Set([
  "list_work_orders",
  "list_assets",
  "list_locations",
  "get_dashboard_open_work_orders",
  "get_dashboard_overdue_work_orders",
  "search_similar_work_orders",
  "list_status_catalogs",
  "list_priority_catalogs",
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

/** Parse CSV string to array of objects (header row = keys). Handles quoted fields. */
function parseCSV(csv: string): Record<string, unknown>[] {
  const lines = csv.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const header = lines[0]
  if (!header) return []
  const keys = parseCSVLine(header)
  const out: Record<string, unknown>[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]!)
    const row: Record<string, unknown> = {}
    keys.forEach((k, j) => {
      row[k] = values[j] ?? ""
    })
    out.push(row)
  }
  return out
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let i = 0
  while (i < line.length) {
    if (line[i] === '"') {
      let cell = ""
      i++
      while (i < line.length) {
        if (line[i] === '"') {
          i++
          if (line[i] === '"') {
            cell += '"'
            i++
          } else break
        } else {
          cell += line[i]
          i++
        }
      }
      result.push(cell)
      if (line[i] === ",") i++
    } else {
      let cell = ""
      while (i < line.length && line[i] !== ",") {
        cell += line[i]
        i++
      }
      result.push(cell.trim())
      if (line[i] === ",") i++
    }
  }
  return result
}

/** Return true if string looks like CSV (header with commas). */
function looksLikeCSV(s: string): boolean {
  const first = s.indexOf("\n")
  const line = first > 0 ? s.slice(0, first) : s
  return line.includes(",") && !line.trimStart().startsWith("{") && !line.trimStart().startsWith("[")
}

/** Normalize output to a string when it's wrapped as { value: string } (e.g. from normalizeToolResult for CSV). */
function unwrapStringOutput(output: unknown): string | null {
  if (typeof output === "string") return output
  if (output != null && typeof output === "object" && !Array.isArray(output)) {
    const o = output as Record<string, unknown>
    if (typeof o.value === "string") return o.value
  }
  return null
}

function getDataArray(output: Record<string, unknown> | unknown[] | string | undefined): Record<string, unknown>[] | null {
  if (output == null) return null
  // Client often wraps CSV/string in { value: string }; unwrap so we see the raw string
  const str = unwrapStringOutput(output)
  if (str !== null) {
    if (looksLikeCSV(str)) return parseCSV(str)
    try {
      const parsed = JSON.parse(str) as unknown
      if (Array.isArray(parsed)) return parsed as Record<string, unknown>[]
      if (parsed && typeof parsed === "object" && "results" in (parsed as object))
        return (parsed as { results: unknown[] }).results as Record<string, unknown>[]
    } catch {
      // ignore
    }
    return null
  }
  if (typeof output === "string") return null
  if (Array.isArray(output)) return output as Record<string, unknown>[]
  const o = output as Record<string, unknown>
  const value = o.value
  if (Array.isArray(value)) return value as Record<string, unknown>[]
  if (o.data != null && Array.isArray(o.data)) return o.data as Record<string, unknown>[]
  if (o.results != null && Array.isArray(o.results)) return o.results as Record<string, unknown>[]
  return null
}

/** Preferred column order for work orders: title, description, status, cause, resolution first; ids last. */
const COLUMN_ORDER: string[] = [
  "title",
  "description",
  "status",
  "cause",
  "resolution",
  "similarityScore",
  "name",
  "priority",
  "due_date",
  "completedAt",
  "created_at",
  "updated_at",
  "asset_id",
  "location_id",
  "assetId",
  "locationId",
  "work_order_id",
  "workOrderId",
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
  const id = row.id ?? row.work_order_id ?? row.workOrderId
  if (id != null) return String(id)
  return `${row.title ?? row.name ?? ""}-${JSON.stringify(row).slice(0, 20)}`
}

/** Renders a WorkOrderCard from a work order row (shared by get_work_order output and create_work_order success). */
function workOrderRowToCardProps(row: Record<string, unknown>) {
  const title = (row.title as string) ?? (row.work_order_title as string) ?? "Work order"
  const statusKey = (row.status as string) ?? null
  const priorityKey = (row.priority as string) ?? null
  const dueDateRaw = row.due_date
  const dueDate =
    dueDateRaw == null ? null : typeof dueDateRaw === "string" ? dueDateRaw : dueDateRaw instanceof Date ? dueDateRaw : null
  const assigneeDisplayName = (row.assigned_to_name as string) ?? null
  return {
    title,
    statusKey,
    priorityKey,
    dueDate,
    assigneeDisplayName,
  }
}

/** Renders a WorkOrderCard from get_work_order tool output (single row; no error). */
function ToolOutputWorkOrderCard({ row }: { row: Record<string, unknown> }) {
  const props = workOrderRowToCardProps(row)
  return (
    <div className="w-full max-w-md">
      <WorkOrderCard
        {...props}
        statusCatalog={DEFAULT_STATUS_CATALOG}
        priorityCatalog={DEFAULT_PRIORITY_CATALOG}
      />
    </div>
  )
}

/** Renders a WorkOrderCard for a newly created work order (e.g. after execute create_work_order). */
export function CreatedWorkOrderCard({ workOrder }: { workOrder: Record<string, unknown> }) {
  const props = workOrderRowToCardProps(workOrder)
  return (
    <div className="mt-2 w-full max-w-md">
      <WorkOrderCard
        {...props}
        statusCatalog={DEFAULT_STATUS_CATALOG}
        priorityCatalog={DEFAULT_PRIORITY_CATALOG}
      />
    </div>
  )
}

/** Renders an AssetCard from get_asset tool output (single row; no error). */
function ToolOutputAssetCard({ row }: { row: Record<string, unknown> }) {
  const name = (row.name as string) ?? "Asset"
  const assetNumber = (row.asset_number as string) ?? (row.assetNumber as string) ?? null
  const statusKey = (row.status as string) ?? null
  const locationLabel = (row.location_name as string) ?? (row.locationName as string) ?? null
  const description = (row.description as string) ?? null
  return (
    <div className="w-full max-w-md">
      <AssetCard
        name={name}
        assetNumber={assetNumber}
        statusKey={statusKey}
        statusCatalog={[]}
        locationLabel={locationLabel}
        children={description ? <span className="text-muted-foreground text-sm">{description}</span> : undefined}
      />
    </div>
  )
}

/** Renders a compact location card from get_location tool output. */
function ToolOutputLocationCard({ row }: { row: Record<string, unknown> }) {
  const name = (row.name as string) ?? "Location"
  const description = (row.description as string) ?? null
  return (
    <div className="w-full max-w-md">
      <Item variant="outline" size="default">
        <ItemContent>
          <ItemTitle>{name}</ItemTitle>
          {description ? <ItemDescription>{description}</ItemDescription> : null}
        </ItemContent>
      </Item>
    </div>
  )
}

/** Renders a short success line for mutation tools (create/update/complete) when output is { ok: true, data }. */
function ToolOutputMutationSuccess({
  toolName,
  data,
}: {
  toolName: string
  data: Record<string, unknown>
}) {
  const workOrderId = data.workOrderId as string | undefined
  const assetId = data.assetId as string | undefined
  const id = workOrderId ?? assetId
  const label =
    toolName === "create_work_order"
      ? "Work order created"
      : toolName === "create_asset"
        ? "Asset created"
        : toolName === "update_asset"
          ? "Asset updated"
          : toolName === "transition_work_order_status"
            ? "Status updated"
            : toolName === "complete_work_order"
              ? "Work order completed"
              : "Done"
  return (
    <div className="text-muted-foreground rounded-md border bg-muted/30 px-3 py-2 text-sm">
      {label}
      {id ? ` · ${id}` : ""}
    </div>
  )
}

/** Renders a read-only DataGrid for array tool output. */
function ToolOutputGrid({ data }: { data: Record<string, unknown>[] }) {
  const columns = React.useMemo(
    () => buildColumnsFromData(data) as Parameters<typeof useDataGrid<Record<string, unknown>>>[0]["columns"],
    [data]
  )
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
 * List tools may return CSV string; we parse to array for the grid.
 * Returns null to fall back to default friendly output.
 */
export function renderChatToolOutput(toolPart: ToolPart): React.ReactNode | null {
  if (toolPart.state !== "output-available" || toolPart.output === undefined) return null
  const raw = toolPart.output as unknown
  const toolName = (toolPart.type ?? "").toLowerCase()

  // Helper: parse raw to single object (string → JSON, or object as-is)
  const parseSingleObject = (): Record<string, unknown> | null => {
    if (typeof raw === "string") {
      try {
        if (!raw.trimStart().startsWith("{")) return null
        return JSON.parse(raw) as Record<string, unknown>
      } catch {
        return null
      }
    }
    if (raw !== null && typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, unknown>
    return null
  }

  // Single work order card: get_work_order with valid row (no error)
  if (toolName === "get_work_order") {
    const output = parseSingleObject()
    if (output && output.error == null && (output.id != null || output.title != null)) {
      return <ToolOutputWorkOrderCard row={output} />
    }
  }

  // Single asset card: get_asset with valid row (no error)
  if (toolName === "get_asset") {
    const output = parseSingleObject()
    if (output && output.error == null && (output.id != null || output.name != null)) {
      return <ToolOutputAssetCard row={output} />
    }
  }

  // Single location card: get_location with valid row (no error)
  if (toolName === "get_location") {
    const output = parseSingleObject()
    if (output && output.error == null && (output.id != null || output.name != null)) {
      return <ToolOutputLocationCard row={output} />
    }
  }

  // Mutation success: create/update/complete tools when output is { ok: true, data }
  const MUTATION_TOOLS = new Set([
    "create_work_order",
    "transition_work_order_status",
    "complete_work_order",
    "create_asset",
    "update_asset",
  ])
  if (MUTATION_TOOLS.has(toolName)) {
    const output = parseSingleObject()
    if (output && output.ok === true && output.data != null && typeof output.data === "object") {
      return (
        <ToolOutputMutationSuccess toolName={toolName} data={output.data as Record<string, unknown>} />
      )
    }
  }

  // Chart: explicit _display: "chart" or _chartType / charts array
  if (raw !== null && typeof raw === "object" && !Array.isArray(raw)) {
    const output = raw as Record<string, unknown>
    if (output._display === "chart" || output._chartType != null || (Array.isArray(output.charts) && output.charts.length > 0)) {
      return <ToolOutputCharts output={output} />
    }
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>
      if (parsed._display === "chart" || parsed._chartType != null || (Array.isArray(parsed.charts) && parsed.charts.length > 0)) {
        return <ToolOutputCharts output={parsed} />
      }
    } catch {
      // not JSON chart
    }
  }

  // Grid: list tools — output can be CSV string or JSON array/object
  if (LIST_GRID_TOOLS.has(toolName)) {
    const data = getDataArray(raw as Record<string, unknown> | unknown[] | string)
    if (data && data.length > 0) {
      return <ToolOutputGrid data={data} />
    }
  }

  return null
}
