import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.js';
import { normalizeError } from '../errors.js';
import { callRpc } from '../unwrap.js';

export type AssetRow = Database['public']['Views']['v_assets'] extends { Row: infer R } ? R : Record<string, unknown>;

export interface CreateAssetParams {
  tenantId: string;
  name: string;
  description?: string | null;
  assetNumber?: string | null;
  locationId?: string | null;
  departmentId?: string | null;
  status?: string;
}

export interface UpdateAssetParams {
  tenantId: string;
  assetId: string;
  name?: string | null;
  description?: string | null;
  assetNumber?: string | null;
  locationId?: string | null;
  departmentId?: string | null;
  status?: string | null;
}

/** Single row for bulk import (name required; others optional). */
export interface BulkImportAssetRow {
  name: string;
  description?: string | null;
  asset_number?: string | null;
  status?: string | null;
  location_id?: string | null;
  department_id?: string | null;
}

/** Result of bulk import: created asset ids and per-row errors. */
export interface BulkImportAssetResult {
  created_ids: string[];
  errors: { index: number; message: string }[];
}

/** Params for bulk importing assets. */
export interface BulkImportAssetsParams {
  tenantId: string;
  rows: BulkImportAssetRow[];
}

/** Record an asset downtime event (availability / AI-friendly timeline). Requires `downtime.record`. Use a `reason_key` from the tenant downtime catalog (defaults include `breakdown`, `planned_maintenance`, `no_demand`, `other`). */
export interface RecordAssetDowntimeParams {
  tenantId: string;
  assetId: string;
  reasonKey: string;
  startedAt?: string | null;
  endedAt?: string | null;
  linkedWorkOrderId?: string | null;
  notes?: string | null;
}

const rpc = (supabase: SupabaseClient<Database>) =>
  (supabase as unknown as { rpc: (n: string, p?: object) => Promise<{ data: unknown; error: unknown }> }).rpc.bind(supabase);

export function createAssetsResource(supabase: SupabaseClient<Database>) {
  return {
    async list(): Promise<AssetRow[]> {
      const { data, error } = await supabase.from('v_assets').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as AssetRow[];
    },
    async getById(id: string): Promise<AssetRow | null> {
      const { data, error } = await supabase.from('v_assets').select('*').eq('id', id).maybeSingle();
      if (error) throw normalizeError(error);
      return data as AssetRow | null;
    },
    async create(params: CreateAssetParams): Promise<string> {
      return callRpc(rpc(supabase), 'rpc_create_asset', {
        p_tenant_id: params.tenantId,
        p_name: params.name,
        p_description: params.description ?? null,
        p_asset_number: params.assetNumber ?? null,
        p_location_id: params.locationId ?? null,
        p_department_id: params.departmentId ?? null,
        p_status: params.status ?? 'active',
      });
    },
    async update(params: UpdateAssetParams): Promise<void> {
      return callRpc(rpc(supabase), 'rpc_update_asset', {
        p_tenant_id: params.tenantId,
        p_asset_id: params.assetId,
        p_name: params.name ?? null,
        p_description: params.description ?? null,
        p_asset_number: params.assetNumber ?? null,
        p_location_id: params.locationId ?? null,
        p_department_id: params.departmentId ?? null,
        p_status: params.status ?? null,
      });
    },
    async delete(tenantId: string, assetId: string): Promise<void> {
      return callRpc(rpc(supabase), 'rpc_delete_asset', { p_tenant_id: tenantId, p_asset_id: assetId });
    },

    /** Bulk import assets. Returns created ids and per-row errors. */
    async bulkImport(params: BulkImportAssetsParams): Promise<BulkImportAssetResult> {
      const raw = await callRpc(rpc(supabase), 'rpc_bulk_import_assets', {
        p_tenant_id: params.tenantId,
        p_rows: params.rows,
      });
      const data = raw as { created_ids: string[]; errors: { index: number; message: string }[] };
      return {
        created_ids: data.created_ids ?? [],
        errors: data.errors ?? [],
      };
    },

    /** Insert a downtime event row. Returns the event UUID. */
    async recordDowntime(params: RecordAssetDowntimeParams): Promise<string> {
      return callRpc(rpc(supabase), 'rpc_record_asset_downtime', {
        p_tenant_id: params.tenantId,
        p_asset_id: params.assetId,
        p_reason_key: params.reasonKey,
        p_started_at: params.startedAt ?? null,
        p_ended_at: params.endedAt ?? null,
        p_linked_work_order_id: params.linkedWorkOrderId ?? null,
        p_notes: params.notes ?? null,
      });
    },
  };
}

export type AssetsResource = ReturnType<typeof createAssetsResource>;
