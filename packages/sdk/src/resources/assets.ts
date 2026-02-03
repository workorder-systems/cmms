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
  };
}

export type AssetsResource = ReturnType<typeof createAssetsResource>;
