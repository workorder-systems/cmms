import { normalizeError } from '../errors.js';
import { callRpc } from '../unwrap.js';
const rpc = (supabase) => supabase.rpc.bind(supabase);
export function createCostsResource(supabase) {
    return {
        /** Work order costs (labor, parts, vendor, total) for the current tenant. */
        async listWorkOrderCosts() {
            const { data, error } = await supabase.from('v_work_order_costs').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** Cost roll-up by asset for the current tenant. */
        async listAssetCosts() {
            const { data, error } = await supabase.from('v_asset_costs').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** Cost roll-up by location for the current tenant. */
        async listLocationCosts() {
            const { data, error } = await supabase.from('v_location_costs').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** Cost roll-up by department for the current tenant. */
        async listDepartmentCosts() {
            const { data, error } = await supabase.from('v_department_costs').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** Cost roll-up by project for the current tenant. */
        async listProjectCosts() {
            const { data, error } = await supabase.from('v_project_costs').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** Asset lifecycle alerts (warranty, EOL, contract, planned replacement) for the current tenant. */
        async listLifecycleAlerts() {
            const { data, error } = await supabase.from('v_asset_lifecycle_alerts').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** Cost roll-up by dimension with optional date filter on work order completed_at. */
        async costRollup(params) {
            const raw = await callRpc(rpc(supabase), 'rpc_cost_rollup', {
                p_tenant_id: params.tenantId,
                p_group_by: params.groupBy,
                p_from_date: params.fromDate ?? null,
                p_to_date: params.toDate ?? null,
            });
            return (raw ?? []);
        },
        /** Asset lifecycle alerts within the next N days. */
        async assetLifecycleAlerts(params) {
            const raw = await callRpc(rpc(supabase), 'rpc_asset_lifecycle_alerts', {
                p_tenant_id: params.tenantId,
                p_days_ahead: params.daysAhead ?? 365,
            });
            return (raw ?? []);
        },
        /** Total cost of ownership for one asset (optional date filter on completed_at). */
        async assetTotalCostOfOwnership(params) {
            const raw = await callRpc(rpc(supabase), 'rpc_asset_total_cost_of_ownership', {
                p_tenant_id: params.tenantId,
                p_asset_id: params.assetId,
                p_from_date: params.fromDate ?? null,
                p_to_date: params.toDate ?? null,
            });
            const rows = (raw ?? []);
            return rows[0] ?? null;
        },
    };
}
