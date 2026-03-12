import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.js';
import { normalizeError } from '../errors.js';
import { callRpc } from '../unwrap.js';

export type SpaceRow = Database['public']['Views']['v_spaces'] extends { Row: infer R }
  ? R
  : {
      id: string;
      tenant_id: string;
      location_id: string;
      location_name: string | null;
      location_type: string | null;
      usage_type: string | null;
      capacity: number | null;
      status: string;
      area_sqft: number | null;
      attributes: Record<string, unknown> | null;
      created_at: string | null;
      updated_at: string | null;
    };

export type SpaceStatus = 'available' | 'occupied' | 'maintenance' | 'reserved' | 'offline';

export interface CreateSpaceParams {
  tenantId: string;
  locationId: string;
  usageType?: string | null;
  capacity?: number | null;
  status?: SpaceStatus | null;
  areaSqft?: number | null;
  attributes?: Record<string, unknown> | null;
}

export interface UpdateSpaceParams {
  tenantId: string;
  spaceId: string;
  usageType?: string | null;
  capacity?: number | null;
  status?: SpaceStatus | null;
  areaSqft?: number | null;
  attributes?: Record<string, unknown> | null;
}

const rpc = (supabase: SupabaseClient<Database>) =>
  (supabase as unknown as { rpc: (n: string, p?: object) => Promise<{ data: unknown; error: unknown }> }).rpc.bind(
    supabase
  );

export function createSpacesResource(supabase: SupabaseClient<Database>) {
  return {
    async list(): Promise<SpaceRow[]> {
      const { data, error } = await supabase.from('v_spaces').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as SpaceRow[];
    },
    async getById(id: string): Promise<SpaceRow | null> {
      const { data, error } = await supabase.from('v_spaces').select('*').eq('id', id).maybeSingle();
      if (error) throw normalizeError(error);
      return data as SpaceRow | null;
    },
    async getByLocationId(locationId: string): Promise<SpaceRow | null> {
      const { data, error } = await supabase.from('v_spaces').select('*').eq('location_id', locationId).maybeSingle();
      if (error) throw normalizeError(error);
      return data as SpaceRow | null;
    },
    async create(params: CreateSpaceParams): Promise<string> {
      return callRpc(rpc(supabase), 'rpc_create_space', {
        p_tenant_id: params.tenantId,
        p_location_id: params.locationId,
        p_usage_type: params.usageType ?? null,
        p_capacity: params.capacity ?? null,
        p_status: params.status ?? 'available',
        p_area_sqft: params.areaSqft ?? null,
        p_attributes: params.attributes ?? null,
      });
    },
    async update(params: UpdateSpaceParams): Promise<void> {
      return callRpc(rpc(supabase), 'rpc_update_space', {
        p_tenant_id: params.tenantId,
        p_space_id: params.spaceId,
        p_usage_type: params.usageType ?? null,
        p_capacity: params.capacity ?? null,
        p_status: params.status ?? null,
        p_area_sqft: params.areaSqft ?? null,
        p_attributes: params.attributes ?? null,
      });
    },
    async delete(tenantId: string, spaceId: string): Promise<void> {
      return callRpc(rpc(supabase), 'rpc_delete_space', { p_tenant_id: tenantId, p_space_id: spaceId });
    },
  };
}

export type SpacesResource = ReturnType<typeof createSpacesResource>;
