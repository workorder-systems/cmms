import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.js';
import { normalizeError } from '../errors.js';
import { callRpc } from '../unwrap.js';

/** Cost row from v_work_order_costs. */
export type WorkOrderCostRow = Database['public']['Views']['v_work_order_costs'] extends { Row: infer R } ? R : Record<string, unknown>;

/** Cost roll-up row from v_asset_costs. */
export type AssetCostRow = Database['public']['Views']['v_asset_costs'] extends { Row: infer R } ? R : Record<string, unknown>;

/** Cost roll-up row from v_location_costs. */
export type LocationCostRow = Database['public']['Views']['v_location_costs'] extends { Row: infer R } ? R : Record<string, unknown>;

/** Cost roll-up row from v_department_costs. */
export type DepartmentCostRow = Database['public']['Views']['v_department_costs'] extends { Row: infer R } ? R : Record<string, unknown>;

/** Cost roll-up row from v_project_costs. */
export type ProjectCostRow = Database['public']['Views']['v_project_costs'] extends { Row: infer R } ? R : Record<string, unknown>;

/** Lifecycle alert row from v_asset_lifecycle_alerts. */
export type AssetLifecycleAlertRow = Database['public']['Views']['v_asset_lifecycle_alerts'] extends { Row: infer R } ? R : Record<string, unknown>;

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

const rpc = (supabase: SupabaseClient<Database>) =>
  (supabase as unknown as { rpc: (n: string, p?: object) => Promise<{ data: unknown; error: unknown }> }).rpc.bind(supabase);

export function createCostsResource(supabase: SupabaseClient<Database>) {
  return {
    /** Work order costs (labor, parts, vendor, total) for the current tenant. */
    async listWorkOrderCosts(): Promise<WorkOrderCostRow[]> {
      const { data, error } = await supabase.from('v_work_order_costs').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as WorkOrderCostRow[];
    },

    /** Cost roll-up by asset for the current tenant. */
    async listAssetCosts(): Promise<AssetCostRow[]> {
      const { data, error } = await supabase.from('v_asset_costs').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as AssetCostRow[];
    },

    /** Cost roll-up by location for the current tenant. */
    async listLocationCosts(): Promise<LocationCostRow[]> {
      const { data, error } = await supabase.from('v_location_costs').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as LocationCostRow[];
    },

    /** Cost roll-up by department for the current tenant. */
    async listDepartmentCosts(): Promise<DepartmentCostRow[]> {
      const { data, error } = await supabase.from('v_department_costs').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as DepartmentCostRow[];
    },

    /** Cost roll-up by project for the current tenant. */
    async listProjectCosts(): Promise<ProjectCostRow[]> {
      const { data, error } = await supabase.from('v_project_costs').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as ProjectCostRow[];
    },

    /** Asset lifecycle alerts (warranty, EOL, contract, planned replacement) for the current tenant. */
    async listLifecycleAlerts(): Promise<AssetLifecycleAlertRow[]> {
      const { data, error } = await supabase.from('v_asset_lifecycle_alerts').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as AssetLifecycleAlertRow[];
    },

    /** Cost roll-up by dimension with optional date filter on work order completed_at. */
    async costRollup(params: CostRollupParams): Promise<CostRollupRow[]> {
      const raw = await callRpc(rpc(supabase), 'rpc_cost_rollup', {
        p_tenant_id: params.tenantId,
        p_group_by: params.groupBy,
        p_from_date: params.fromDate ?? null,
        p_to_date: params.toDate ?? null,
      });
      return (raw ?? []) as CostRollupRow[];
    },

    /** Asset lifecycle alerts within the next N days. */
    async assetLifecycleAlerts(params: AssetLifecycleAlertsParams): Promise<AssetLifecycleAlertRow[]> {
      const raw = await callRpc(rpc(supabase), 'rpc_asset_lifecycle_alerts', {
        p_tenant_id: params.tenantId,
        p_days_ahead: params.daysAhead ?? 365,
      });
      return (raw ?? []) as AssetLifecycleAlertRow[];
    },

    /** Total cost of ownership for one asset (optional date filter on completed_at). */
    async assetTotalCostOfOwnership(params: AssetTcoParams): Promise<AssetTcoRow | null> {
      const raw = await callRpc(rpc(supabase), 'rpc_asset_total_cost_of_ownership', {
        p_tenant_id: params.tenantId,
        p_asset_id: params.assetId,
        p_from_date: params.fromDate ?? null,
        p_to_date: params.toDate ?? null,
      });
      const rows = (raw ?? []) as AssetTcoRow[];
      return rows[0] ?? null;
    },
  };
}

export type CostsResource = ReturnType<typeof createCostsResource>;
