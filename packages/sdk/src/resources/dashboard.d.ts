import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.js';
/** Row from v_dashboard_metrics view (tenant-level metrics). */
export type DashboardMetricsRow = Database['public']['Views']['v_dashboard_metrics'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
/** Row from v_dashboard_mttr_metrics view. */
export type DashboardMttrMetricsRow = Database['public']['Views']['v_dashboard_mttr_metrics'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
/** Row from v_dashboard_open_work_orders view. */
export type DashboardOpenWorkOrdersRow = Database['public']['Views']['v_dashboard_open_work_orders'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
/** Row from v_dashboard_overdue_work_orders view. */
export type DashboardOverdueWorkOrdersRow = Database['public']['Views']['v_dashboard_overdue_work_orders'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
/** Row from v_dashboard_work_orders_by_status view. */
export type DashboardWorkOrdersByStatusRow = Database['public']['Views']['v_dashboard_work_orders_by_status'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
/** Row from v_dashboard_work_orders_by_maintenance_type view. */
export type DashboardWorkOrdersByMaintenanceTypeRow = Database['public']['Views']['v_dashboard_work_orders_by_maintenance_type'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
/** Row from v_work_orders_summary view. */
export type WorkOrdersSummaryRow = Database['public']['Views']['v_work_orders_summary'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
/** Row from v_assets_summary view. */
export type AssetsSummaryRow = Database['public']['Views']['v_assets_summary'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
/** Row from v_locations_summary view. */
export type LocationsSummaryRow = Database['public']['Views']['v_locations_summary'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
/** Row from v_tenants_overview view. */
export type TenantsOverviewRow = Database['public']['Views']['v_tenants_overview'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
/** Row from v_site_rollup view (per-site aggregates for portfolio). Not in generated types. */
export interface SiteRollupRow {
    site_id: string | null;
    tenant_id: string | null;
    site_name: string | null;
    location_type: string | null;
    site_code: string | null;
    building_count: number | null;
    floor_count: number | null;
    room_count: number | null;
    zone_count: number | null;
    asset_count: number | null;
    active_asset_count: number | null;
    work_order_count: number | null;
    active_work_order_count: number | null;
}
/**
 * Dashboard resource: metrics and summaries (read-only views).
 */
export declare function createDashboardResource(supabase: SupabaseClient<Database>): {
    /** Get dashboard metrics for the current tenant (v_dashboard_metrics). */
    getMetrics(): Promise<DashboardMetricsRow[]>;
    /** Get MTTR metrics for the current tenant (v_dashboard_mttr_metrics). */
    getMttrMetrics(): Promise<DashboardMttrMetricsRow[]>;
    /** List open work orders for dashboard views (v_dashboard_open_work_orders). Excludes draft at the query. */
    listOpenWorkOrders(): Promise<DashboardOpenWorkOrdersRow[]>;
    /** List overdue work orders for dashboard views (v_dashboard_overdue_work_orders). Excludes draft at the query. */
    listOverdueWorkOrders(): Promise<DashboardOverdueWorkOrdersRow[]>;
    /** Work orders grouped by status (v_dashboard_work_orders_by_status). */
    listWorkOrdersByStatus(): Promise<DashboardWorkOrdersByStatusRow[]>;
    /** Work orders grouped by maintenance type (v_dashboard_work_orders_by_maintenance_type). */
    listWorkOrdersByMaintenanceType(): Promise<DashboardWorkOrdersByMaintenanceTypeRow[]>;
    /** Work orders summary (v_work_orders_summary). */
    getWorkOrdersSummary(): Promise<WorkOrdersSummaryRow[]>;
    /** Assets summary (v_assets_summary). */
    getAssetsSummary(): Promise<AssetsSummaryRow[]>;
    /** Locations summary (v_locations_summary). */
    getLocationsSummary(): Promise<LocationsSummaryRow[]>;
    /** Tenants overview (v_tenants_overview). */
    getTenantsOverview(): Promise<TenantsOverviewRow[]>;
    /** Site rollup for portfolio / multi-site (v_site_rollup). Per-site building/floor/room/zone and asset/WO counts. */
    listSiteRollup(): Promise<SiteRollupRow[]>;
};
export type DashboardResource = ReturnType<typeof createDashboardResource>;
//# sourceMappingURL=dashboard.d.ts.map