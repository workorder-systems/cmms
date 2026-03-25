import { normalizeError } from '../errors.js';
/**
 * Dashboard resource: metrics and summaries (read-only views).
 */
export function createDashboardResource(supabase) {
    return {
        /** Get dashboard metrics for the current tenant (v_dashboard_metrics). */
        async getMetrics() {
            const { data, error } = await supabase.from('v_dashboard_metrics').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** Get MTTR metrics for the current tenant (v_dashboard_mttr_metrics). */
        async getMttrMetrics() {
            const { data, error } = await supabase.from('v_dashboard_mttr_metrics').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** List open work orders for dashboard views (v_dashboard_open_work_orders). Excludes draft at the query. */
        async listOpenWorkOrders() {
            const { data, error } = await supabase
                .from('v_dashboard_open_work_orders')
                .select('*')
                .neq('status', 'draft');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** List overdue work orders for dashboard views (v_dashboard_overdue_work_orders). Excludes draft at the query. */
        async listOverdueWorkOrders() {
            const { data, error } = await supabase
                .from('v_dashboard_overdue_work_orders')
                .select('*')
                .neq('status', 'draft');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** Work orders grouped by status (v_dashboard_work_orders_by_status). */
        async listWorkOrdersByStatus() {
            const { data, error } = await supabase.from('v_dashboard_work_orders_by_status').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** Work orders grouped by maintenance type (v_dashboard_work_orders_by_maintenance_type). */
        async listWorkOrdersByMaintenanceType() {
            const { data, error } = await supabase.from('v_dashboard_work_orders_by_maintenance_type').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** Work orders summary (v_work_orders_summary). */
        async getWorkOrdersSummary() {
            const { data, error } = await supabase.from('v_work_orders_summary').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** Assets summary (v_assets_summary). */
        async getAssetsSummary() {
            const { data, error } = await supabase.from('v_assets_summary').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** Locations summary (v_locations_summary). */
        async getLocationsSummary() {
            const { data, error } = await supabase.from('v_locations_summary').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** Tenants overview (v_tenants_overview). */
        async getTenantsOverview() {
            const { data, error } = await supabase.from('v_tenants_overview').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** Site rollup for portfolio / multi-site (v_site_rollup). Per-site building/floor/room/zone and asset/WO counts. */
        async listSiteRollup() {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- v_site_rollup not in generated Database types
            const { data, error } = await supabase.from('v_site_rollup').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
    };
}
