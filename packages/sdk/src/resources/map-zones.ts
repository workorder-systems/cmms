import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.js';
import { normalizeError } from '../errors.js';
import { callRpc } from '../unwrap.js';

export type MapZoneRow = Database['public']['Views']['v_map_zones'] extends { Row: infer R }
  ? R
  : {
      id: string | null;
      tenant_id: string | null;
      name: string | null;
      geometry: Record<string, unknown> | null;
      location_id: string | null;
      created_at: string | null;
      updated_at: string | null;
    };

/** GeoJSON geometry (type + coordinates). */
export type MapZoneGeometry = Record<string, unknown>;

export interface CreateMapZoneParams {
  tenantId: string;
  name: string;
  geometry: MapZoneGeometry;
  locationId?: string | null;
}

export interface UpdateMapZoneParams {
  tenantId: string;
  zoneId: string;
  name?: string | null;
  geometry?: MapZoneGeometry | null;
  locationId?: string | null;
}

const rpc = (supabase: SupabaseClient<Database>) =>
  (supabase as unknown as { rpc: (n: string, p?: object) => Promise<{ data: unknown; error: unknown }> }).rpc.bind(supabase);

export function createMapZonesResource(supabase: SupabaseClient<Database>) {
  return {
    async list(): Promise<MapZoneRow[]> {
      const { data, error } = await supabase.from('v_map_zones').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as MapZoneRow[];
    },
    async getById(id: string): Promise<MapZoneRow | null> {
      const { data, error } = await supabase.from('v_map_zones').select('*').eq('id', id).maybeSingle();
      if (error) throw normalizeError(error);
      return data as MapZoneRow | null;
    },
    async create(params: CreateMapZoneParams): Promise<string> {
      return callRpc(rpc(supabase), 'rpc_create_map_zone', {
        p_tenant_id: params.tenantId,
        p_name: params.name,
        p_geometry: params.geometry,
        p_location_id: params.locationId ?? null,
      });
    },
    async update(params: UpdateMapZoneParams): Promise<void> {
      return callRpc(rpc(supabase), 'rpc_update_map_zone', {
        p_tenant_id: params.tenantId,
        p_zone_id: params.zoneId,
        p_name: params.name ?? null,
        p_geometry: params.geometry ?? null,
        p_location_id: params.locationId ?? null,
      });
    },
    async delete(tenantId: string, zoneId: string): Promise<void> {
      return callRpc(rpc(supabase), 'rpc_delete_map_zone', {
        p_tenant_id: tenantId,
        p_zone_id: zoneId,
      });
    },
  };
}

export type MapZonesResource = ReturnType<typeof createMapZonesResource>;
