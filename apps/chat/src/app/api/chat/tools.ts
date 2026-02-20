import { tool } from "ai"
import type { DbClient } from "@workorder-systems/sdk"
import { z } from "zod"

/** Prefix for tool results that require user confirmation before executing. */
export const PENDING_CONFIRM_PREFIX = "__PENDING_CONFIRM:"

/** Serialize a pending action for the client. Client will show confirm UI and call POST /api/chat/execute. */
function pendingConfirm(action: string, params: Record<string, unknown>): string {
  return PENDING_CONFIRM_PREFIX + JSON.stringify({ action, params })
}

/** Escape a CSV field (wrap in quotes if contains comma, newline, or quote). */
function csvEscape(val: unknown): string {
  const s = val == null ? "" : String(val)
  if (/[,"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

/** Build CSV string from array of objects. Columns from first object keys; optional column filter. */
function toCSV(rows: Record<string, unknown>[], columns?: string[]): string {
  if (rows.length === 0) return ""
  const keys = columns ?? Object.keys(rows[0] as object)
  const header = keys.map(csvEscape).join(",")
  const body = rows
    .map((row) => keys.map((k) => csvEscape((row as Record<string, unknown>)[k])).join(","))
    .join("\n")
  return `${header}\n${body}`
}

/** Minimal columns for list tools (token-efficient; no audit/metadata). */
const WORK_ORDER_LIST_COLUMNS = ["id", "title", "description", "status", "priority", "due_date", "cause", "resolution", "assigned_to_name"]
const ASSET_LIST_COLUMNS = ["id", "name", "description", "status"]
const LOCATION_LIST_COLUMNS = ["id", "name", "description"]

const LIST_LIMIT = 25
const DASHBOARD_LIMIT = 20
const SEARCH_SIMILAR_LIMIT = 10

/**
 * Create chat tools that run on behalf of the user via the given DbClient.
 * Read-only tools execute immediately; create/update/delete tools return a pending-confirm payload.
 */
export function createChatTools(db: DbClient): Record<string, ReturnType<typeof tool>> {
  return {
    // ---------- Read-only: execute immediately ----------
    list_work_orders: tool({
      description: "List work orders for the current tenant. Use to show open, overdue, or all work orders.",
      parameters: z.object({}),
      execute: async () => {
        const rows = await db.workOrders.list()
        const slice = (rows as Record<string, unknown>[]).slice(0, LIST_LIMIT)
        const cols = WORK_ORDER_LIST_COLUMNS.filter((c) => slice[0] && c in (slice[0] as object))
        return toCSV(slice, cols.length ? cols : undefined)
      },
    }),

    get_work_order: tool({
      description: "Get a single work order by ID.",
      parameters: z.object({ workOrderId: z.string().describe("Work order UUID") }),
      execute: async ({ workOrderId }) => {
        const row = await db.workOrders.getById(workOrderId)
        return JSON.stringify(row ?? { error: "Not found" })
      },
    }),

    list_assets: tool({
      description: "List assets for the current tenant.",
      parameters: z.object({}),
      execute: async () => {
        const rows = await db.assets.list()
        const slice = (rows as Record<string, unknown>[]).slice(0, LIST_LIMIT)
        const cols = ASSET_LIST_COLUMNS.filter((c) => slice[0] && c in (slice[0] as object))
        return toCSV(slice, cols.length ? cols : undefined)
      },
    }),

    get_asset: tool({
      description: "Get a single asset by ID.",
      parameters: z.object({ assetId: z.string().describe("Asset UUID") }),
      execute: async ({ assetId }) => {
        const row = await db.assets.getById(assetId)
        return JSON.stringify(row ?? { error: "Not found" })
      },
    }),

    list_locations: tool({
      description: "List locations for the current tenant.",
      parameters: z.object({}),
      execute: async () => {
        const rows = await db.locations.list()
        const slice = (rows as Record<string, unknown>[]).slice(0, LIST_LIMIT)
        const cols = LOCATION_LIST_COLUMNS.filter((c) => slice[0] && c in (slice[0] as object))
        return toCSV(slice, cols.length ? cols : undefined)
      },
    }),

    get_location: tool({
      description: "Get a single location by ID.",
      parameters: z.object({ locationId: z.string().describe("Location UUID") }),
      execute: async ({ locationId }) => {
        const row = await db.locations.getById(locationId)
        return JSON.stringify(row ?? { error: "Not found" })
      },
    }),

    get_dashboard_open_work_orders: tool({
      description: "Get open work orders for the dashboard (current tenant).",
      parameters: z.object({}),
      execute: async () => {
        const rows = await db.dashboard.listOpenWorkOrders()
        const slice = (rows as Record<string, unknown>[]).slice(0, DASHBOARD_LIMIT)
        const cols = WORK_ORDER_LIST_COLUMNS.filter((c) => slice[0] && c in (slice[0] as object))
        return toCSV(slice, cols.length ? cols : undefined)
      },
    }),

    get_dashboard_overdue_work_orders: tool({
      description: "Get overdue work orders for the dashboard (current tenant).",
      parameters: z.object({}),
      execute: async () => {
        const rows = await db.dashboard.listOverdueWorkOrders()
        const slice = (rows as Record<string, unknown>[]).slice(0, DASHBOARD_LIMIT)
        const cols = WORK_ORDER_LIST_COLUMNS.filter((c) => slice[0] && c in (slice[0] as object))
        return toCSV(slice, cols.length ? cols : undefined)
      },
    }),

    search_similar_work_orders: tool({
      description:
        "Semantic search over completed work orders. Use when the user asks for similar past fixes, 'have we done something like this before', 'find work orders about X', or describes a problem in natural language. Returns completed work orders ranked by similarity.",
      parameters: z.object({
        query: z.string().describe("Free-text description of the issue or what to search for (e.g. 'pump leaking', 'motor overheating')"),
        limit: z.number().min(1).max(20).optional().describe("Max results (default 10)"),
      }),
      execute: async ({ query, limit }) => {
        try {
          const results = await db.similarPastFixes.search({
            queryText: query.trim(),
            limit: Math.min(limit ?? SEARCH_SIMILAR_LIMIT, SEARCH_SIMILAR_LIMIT),
          })
          if (results.length === 0) return "workOrderId,title,description,status,similarityScore\n"
          const rows = results.map((r) => ({
            workOrderId: r.workOrderId,
            title: r.title,
            description: r.description ?? "",
            status: r.status,
            similarityScore: r.similarityScore,
            cause: r.cause ?? "",
            resolution: r.resolution ?? "",
          }))
          return toCSV(rows as unknown as Record<string, unknown>[])
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          return `error: ${message}`
        }
      },
    }),

    get_dashboard_metrics: tool({
      description:
        "Get dashboard metrics as chart data: work orders by status (bar chart) and priority (pie). Use when the user asks for a report, summary, or chart.",
      parameters: z.object({}),
      execute: async () => {
        const rows = await db.workOrders.list()
        const byStatus: Record<string, number> = {}
        const byPriority: Record<string, number> = {}
        for (const row of rows) {
          const r = row as { status?: string; priority?: string }
          const s = r.status ?? "unknown"
          const p = r.priority ?? "unknown"
          byStatus[s] = (byStatus[s] ?? 0) + 1
          byPriority[p] = (byPriority[p] ?? 0) + 1
        }
        const statusData = Object.entries(byStatus).map(([status, count]) => ({ status, count }))
        const priorityData = Object.entries(byPriority).map(([name, value]) => ({ name, value }))
        return JSON.stringify({
          _display: "chart",
          charts: [
            {
              _chartType: "bar",
              data: statusData,
              categoryKey: "status",
              valueKeys: ["count"],
              valueLabels: { count: "Work orders" },
              title: "Work orders by status",
            },
            {
              _chartType: "pie",
              data: priorityData,
              categoryKey: "name",
              valueKeys: ["value"],
              valueLabels: { value: "Count" },
              title: "Work orders by priority",
            },
          ],
        })
      },
    }),

    list_status_catalogs: tool({
      description: "List status catalog entries (for work orders, assets, etc.) for the current tenant.",
      parameters: z.object({}),
      execute: async () => {
        const rows = await db.catalogs.listStatuses()
        return JSON.stringify(rows)
      },
    }),

    list_priority_catalogs: tool({
      description: "List priority catalog entries for the current tenant.",
      parameters: z.object({}),
      execute: async () => {
        const rows = await db.catalogs.listPriorities()
        return JSON.stringify(rows)
      },
    }),

    // ---------- Write: return pending confirm (client will call /api/chat/execute) ----------
    create_work_order: tool({
      description:
        "Create a new work order. Only title is required; description, priority, assetId, and locationId are optional. Use when the user asks to create or report a work order. Extract a short title from their message (e.g. 'Fix HVAC airco'). When the user mentions equipment (HVAC, pump, etc.) or a location, use list_assets or list_locations first to find a matching id, then pass that as assetId or locationId so the work order is linked. Do not ask for optional fields—proceed with the information given or from prior tool results. Requires user confirmation.",
      parameters: z.object({
        title: z.string().min(1).describe("Short title (required); derive from the user's request, e.g. 'Fix HVAC airco'"),
        description: z.string().optional().describe("Optional longer description; use user's context if they gave details"),
        priority: z.string().optional().describe("Optional: high, medium, low, critical"),
        assetId: z.string().optional().describe("Optional asset UUID; only if user specified an asset"),
        locationId: z.string().optional().describe("Optional location UUID; only if user specified a location"),
      }),
      execute: async (params) => {
        return pendingConfirm("create_work_order", params)
      },
    }),

    transition_work_order_status: tool({
      description:
        "Transition a work order to a new status (e.g. start, complete). Requires user confirmation.",
      parameters: z.object({
        workOrderId: z.string().describe("Work order UUID"),
        toStatusKey: z.string().describe("Target status key from status catalog"),
      }),
      execute: async (params) => {
        return pendingConfirm("transition_work_order_status", params)
      },
    }),

    complete_work_order: tool({
      description: "Complete a work order with optional cause and resolution. Requires user confirmation.",
      parameters: z.object({
        workOrderId: z.string().describe("Work order UUID"),
        cause: z.string().optional().describe("Root cause"),
        resolution: z.string().optional().describe("Resolution notes"),
      }),
      execute: async (params) => {
        return pendingConfirm("complete_work_order", params)
      },
    }),

    create_asset: tool({
      description: "Create a new asset. Requires user confirmation.",
      parameters: z.object({
        name: z.string().describe("Asset name"),
        description: z.string().optional(),
        assetNumber: z.string().optional(),
        locationId: z.string().optional(),
        status: z.string().optional().describe("e.g. active"),
      }),
      execute: async (params) => {
        return pendingConfirm("create_asset", params)
      },
    }),

    update_asset: tool({
      description: "Update an existing asset. Requires user confirmation.",
      parameters: z.object({
        assetId: z.string().describe("Asset UUID"),
        name: z.string().optional(),
        description: z.string().optional(),
        locationId: z.string().optional(),
        status: z.string().optional(),
      }),
      execute: async (params) => {
        return pendingConfirm("update_asset", params)
      },
    }),
  }
}

/** Actions that can be executed by POST /api/chat/execute after user confirmation. */
export type ExecuteAction =
  | "create_work_order"
  | "transition_work_order_status"
  | "complete_work_order"
  | "create_asset"
  | "update_asset"

/** Execute a confirmed action. Call from the execute route. */
export async function executeAction(
  db: DbClient,
  action: ExecuteAction,
  params: Record<string, unknown>,
  tenantId: string
): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
  await db.setTenant(tenantId)
  try {
    switch (action) {
      case "create_work_order": {
        const id = await db.workOrders.create({
          tenantId,
          title: String(params.title ?? ""),
          description: params.description != null ? String(params.description) : null,
          priority: params.priority != null ? String(params.priority) : undefined,
          assetId: params.assetId != null ? String(params.assetId) : null,
          locationId: params.locationId != null ? String(params.locationId) : null,
        })
        const workOrder = await db.workOrders.getById(id)
        return { ok: true, data: { workOrderId: id, workOrder: workOrder ?? null } }
      }
      case "transition_work_order_status": {
        await db.workOrders.transitionStatus({
          tenantId,
          workOrderId: String(params.workOrderId),
          toStatusKey: String(params.toStatusKey),
        })
        return { ok: true, data: {} }
      }
      case "complete_work_order": {
        await db.workOrders.complete({
          tenantId,
          workOrderId: String(params.workOrderId),
          cause: params.cause != null ? String(params.cause) : null,
          resolution: params.resolution != null ? String(params.resolution) : null,
        })
        return { ok: true, data: {} }
      }
      case "create_asset": {
        const id = await db.assets.create({
          tenantId,
          name: String(params.name ?? ""),
          description: params.description != null ? String(params.description) : null,
          assetNumber: params.assetNumber != null ? String(params.assetNumber) : null,
          locationId: params.locationId != null ? String(params.locationId) : null,
          status: params.status != null ? String(params.status) : undefined,
        })
        return { ok: true, data: { assetId: id } }
      }
      case "update_asset": {
        await db.assets.update({
          tenantId,
          assetId: String(params.assetId),
          name: params.name != null ? String(params.name) : undefined,
          description: params.description != null ? String(params.description) : undefined,
          locationId: params.locationId != null ? String(params.locationId) : undefined,
          status: params.status != null ? String(params.status) : undefined,
        })
        return { ok: true, data: {} }
      }
      default:
        return { ok: false, error: `Unknown action: ${action}` }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: message }
  }
}
