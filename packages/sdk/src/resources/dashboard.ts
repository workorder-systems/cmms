import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.js';
import { normalizeError } from '../errors.js';

/** Row from v_dashboard_metrics view (tenant-level metrics). */
export type DashboardMetricsRow = Database['public']['Views']['v_dashboard_metrics'] extends { Row: infer R }
  ? R
  : Record<string, unknown>;

/** Row from v_dashboard_mttr_metrics view. */
export type DashboardMttrMetricsRow = Database['public']['Views']['v_dashboard_mttr_metrics'] extends { Row: infer R }
  ? R
  : Record<string, unknown>;

/** Row from v_dashboard_open_work_orders view. */
export type DashboardOpenWorkOrdersRow =
  Database['public']['Views']['v_dashboard_open_work_orders'] extends { Row: infer R }
    ? R
    : Record<string, unknown>;

/** Row from v_dashboard_overdue_work_orders view. */
export type DashboardOverdueWorkOrdersRow =
  Database['public']['Views']['v_dashboard_overdue_work_orders'] extends { Row: infer R }
    ? R
    : Record<string, unknown>;

/** Row from v_dashboard_work_orders_by_status view. */
export type DashboardWorkOrdersByStatusRow =
  Database['public']['Views']['v_dashboard_work_orders_by_status'] extends { Row: infer R }
    ? R
    : Record<string, unknown>;

/** Row from v_dashboard_work_orders_by_maintenance_type view. */
export type DashboardWorkOrdersByMaintenanceTypeRow =
  Database['public']['Views']['v_dashboard_work_orders_by_maintenance_type'] extends { Row: infer R }
    ? R
    : Record<string, unknown>;

/** Row from v_work_orders_summary view. */
export type WorkOrdersSummaryRow = Database['public']['Views']['v_work_orders_summary'] extends { Row: infer R }
  ? R
  : Record<string, unknown>;

/** Row from v_assets_summary view. */
export type AssetsSummaryRow = Database['public']['Views']['v_assets_summary'] extends { Row: infer R }
  ? R
  : Record<string, unknown>;

/** Row from v_locations_summary view. */
export type LocationsSummaryRow = Database['public']['Views']['v_locations_summary'] extends { Row: infer R }
  ? R
  : Record<string, unknown>;

/** Row from v_tenants_overview view. */
export type TenantsOverviewRow = Database['public']['Views']['v_tenants_overview'] extends { Row: infer R }
  ? R
  : Record<string, unknown>;

/**
 * Dashboard resource: metrics and summaries (read-only views).
 */
export function createDashboardResource(supabase: SupabaseClient<Database>) {
  return {
    /** Get dashboard metrics for the current tenant (v_dashboard_metrics). */
    async getMetrics(): Promise<DashboardMetricsRow[]> {
      const { data, error } = await supabase.from('v_dashboard_metrics').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as DashboardMetricsRow[];
    },

    /** Get MTTR metrics for the current tenant (v_dashboard_mttr_metrics). */
    async getMttrMetrics(): Promise<DashboardMttrMetricsRow[]> {
      const { data, error } = await supabase.from('v_dashboard_mttr_metrics').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as DashboardMttrMetricsRow[];
    },

    /** List open work orders for dashboard views (v_dashboard_open_work_orders). Excludes draft at the query. */
    async listOpenWorkOrders(): Promise<DashboardOpenWorkOrdersRow[]> {
      const { data, error } = await supabase
        .from('v_dashboard_open_work_orders')
        .select('*')
        .neq('status', 'draft');
      if (error) throw normalizeError(error);
      return (data ?? []) as DashboardOpenWorkOrdersRow[];
    },

    /** List overdue work orders for dashboard views (v_dashboard_overdue_work_orders). Excludes draft at the query. */
    async listOverdueWorkOrders(): Promise<DashboardOverdueWorkOrdersRow[]> {
      const { data, error } = await supabase
        .from('v_dashboard_overdue_work_orders')
        .select('*')
        .neq('status', 'draft');
      if (error) throw normalizeError(error);
      return (data ?? []) as DashboardOverdueWorkOrdersRow[];
    },

    /** Work orders grouped by status (v_dashboard_work_orders_by_status). */
    async listWorkOrdersByStatus(): Promise<DashboardWorkOrdersByStatusRow[]> {
      const { data, error } = await supabase.from('v_dashboard_work_orders_by_status').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as DashboardWorkOrdersByStatusRow[];
    },

    /** Work orders grouped by maintenance type (v_dashboard_work_orders_by_maintenance_type). */
    async listWorkOrdersByMaintenanceType(): Promise<DashboardWorkOrdersByMaintenanceTypeRow[]> {
      const { data, error } = await supabase.from('v_dashboard_work_orders_by_maintenance_type').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as DashboardWorkOrdersByMaintenanceTypeRow[];
    },

    /** Work orders summary (v_work_orders_summary). */
    async getWorkOrdersSummary(): Promise<WorkOrdersSummaryRow[]> {
      const { data, error } = await supabase.from('v_work_orders_summary').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as WorkOrdersSummaryRow[];
    },

    /** Assets summary (v_assets_summary). */
    async getAssetsSummary(): Promise<AssetsSummaryRow[]> {
      const { data, error } = await supabase.from('v_assets_summary').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as AssetsSummaryRow[];
    },

    /** Locations summary (v_locations_summary). */
    async getLocationsSummary(): Promise<LocationsSummaryRow[]> {
      const { data, error } = await supabase.from('v_locations_summary').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as LocationsSummaryRow[];
    },

    /** Tenants overview (v_tenants_overview). */
    async getTenantsOverview(): Promise<TenantsOverviewRow[]> {
      const { data, error } = await supabase.from('v_tenants_overview').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as TenantsOverviewRow[];
    },
  };
}

export type DashboardResource = ReturnType<typeof createDashboardResource>;

