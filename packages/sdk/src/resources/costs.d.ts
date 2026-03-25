import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.js';
/** Cost row from v_work_order_costs. */
export type WorkOrderCostRow = Database['public']['Views']['v_work_order_costs'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
/** Cost roll-up row from v_asset_costs. */
export type AssetCostRow = Database['public']['Views']['v_asset_costs'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
/** Cost roll-up row from v_location_costs. */
export type LocationCostRow = Database['public']['Views']['v_location_costs'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
/** Cost roll-up row from v_department_costs. */
export type DepartmentCostRow = Database['public']['Views']['v_department_costs'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
/** Cost roll-up row from v_project_costs. */
export type ProjectCostRow = Database['public']['Views']['v_project_costs'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
/** Lifecycle alert row from v_asset_lifecycle_alerts. */
export type AssetLifecycleAlertRow = Database['public']['Views']['v_asset_lifecycle_alerts'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
/** One row from rpc_cost_rollup. */
export interface CostRollupRow {
    group_key: string | null;
    group_name: string | null;
    labor_cents: number;
    parts_cents: number;
    vendor_cents: number;
    total_cents: number;
    work_order_count: number;
}
/** Params for cost roll-up RPC. */
export interface CostRollupParams {
    tenantId: string;
    groupBy: 'asset' | 'location' | 'department' | 'project';
    fromDate?: string | null;
    toDate?: string | null;
}
/** One row from rpc_asset_total_cost_of_ownership. */
export interface AssetTcoRow {
    labor_cents: number;
    parts_cents: number;
    vendor_cents: number;
    total_cents: number;
    work_order_count: number;
}
/** Params for asset TCO RPC. */
export interface AssetTcoParams {
    tenantId: string;
    assetId: string;
    fromDate?: string | null;
    toDate?: string | null;
}
/** Params for lifecycle alerts RPC. */
export interface AssetLifecycleAlertsParams {
    tenantId: string;
    daysAhead?: number;
}
export declare function createCostsResource(supabase: SupabaseClient<Database>): {
    /** Work order costs (labor, parts, vendor, total) for the current tenant. */
    listWorkOrderCosts(): Promise<WorkOrderCostRow[]>;
    /** Cost roll-up by asset for the current tenant. */
    listAssetCosts(): Promise<AssetCostRow[]>;
    /** Cost roll-up by location for the current tenant. */
    listLocationCosts(): Promise<LocationCostRow[]>;
    /** Cost roll-up by department for the current tenant. */
    listDepartmentCosts(): Promise<DepartmentCostRow[]>;
    /** Cost roll-up by project for the current tenant. */
    listProjectCosts(): Promise<ProjectCostRow[]>;
    /** Asset lifecycle alerts (warranty, EOL, contract, planned replacement) for the current tenant. */
    listLifecycleAlerts(): Promise<AssetLifecycleAlertRow[]>;
    /** Cost roll-up by dimension with optional date filter on work order completed_at. */
    costRollup(params: CostRollupParams): Promise<CostRollupRow[]>;
    /** Asset lifecycle alerts within the next N days. */
    assetLifecycleAlerts(params: AssetLifecycleAlertsParams): Promise<AssetLifecycleAlertRow[]>;
    /** Total cost of ownership for one asset (optional date filter on completed_at). */
    assetTotalCostOfOwnership(params: AssetTcoParams): Promise<AssetTcoRow | null>;
};
export type CostsResource = ReturnType<typeof createCostsResource>;
//# sourceMappingURL=costs.d.ts.map