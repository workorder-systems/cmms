import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.js';
import { normalizeError } from '../errors.js';
import { callRpc } from '../unwrap.js';

export type LocationRow = Database['public']['Views']['v_locations'] extends { Row: infer R } ? R : Record<string, unknown>;

export interface CreateLocationParams {
  tenantId: string;
  name: string;
  description?: string | null;
  parentLocationId?: string | null;
}

export interface UpdateLocationParams {
  tenantId: string;
  locationId: string;
  name?: string | null;
  description?: string | null;
  parentLocationId?: string | null;
}

/** Single row for bulk import (name required; others optional). */
export interface BulkImportLocationRow {
  name: string;
  description?: string | null;
  parent_location_id?: string | null;
}

/** Result of bulk import: created location ids and per-row errors. */
export interface BulkImportLocationResult {
  created_ids: string[];
  errors: { index: number; message: string }[];
}

/** Params for bulk importing locations. */
export interface BulkImportLocationsParams {
  tenantId: string;
  rows: BulkImportLocationRow[];
}

const rpc = (supabase: SupabaseClient<Database>) =>
  (supabase as unknown as { rpc: (n: string, p?: object) => Promise<{ data: unknown; error: unknown }> }).rpc.bind(supabase);

export function createLocationsResource(supabase: SupabaseClient<Database>) {
  return {
    async list(): Promise<LocationRow[]> {
      const { data, error } = await supabase.from('v_locations').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as LocationRow[];
    },
    async getById(id: string): Promise<LocationRow | null> {
      const { data, error } = await supabase.from('v_locations').select('*').eq('id', id).maybeSingle();
      if (error) throw normalizeError(error);
      return data as LocationRow | null;
    },
    async create(params: CreateLocationParams): Promise<string> {
      return callRpc(rpc(supabase), 'rpc_create_location', {
        p_tenant_id: params.tenantId,
        p_name: params.name,
        p_description: params.description ?? null,
        p_parent_location_id: params.parentLocationId ?? null,
      });
    },
    async update(params: UpdateLocationParams): Promise<void> {
      return callRpc(rpc(supabase), 'rpc_update_location', {
        p_tenant_id: params.tenantId,
        p_location_id: params.locationId,
        p_name: params.name ?? null,
        p_description: params.description ?? null,
        p_parent_location_id: params.parentLocationId ?? null,
      });
    },
    async delete(tenantId: string, locationId: string): Promise<void> {
      return callRpc(rpc(supabase), 'rpc_delete_location', { p_tenant_id: tenantId, p_location_id: locationId });
    },

    /** Bulk import locations. Returns created ids and per-row errors. */
    async bulkImport(params: BulkImportLocationsParams): Promise<BulkImportLocationResult> {
      const raw = await callRpc(rpc(supabase), 'rpc_bulk_import_locations', {
        p_tenant_id: params.tenantId,
        p_rows: params.rows,
      });
      const data = raw as { created_ids: string[]; errors: { index: number; message: string }[] };
      return {
        created_ids: data.created_ids ?? [],
        errors: data.errors ?? [],
      };
    },
  };
}

export type LocationsResource = ReturnType<typeof createLocationsResource>;
