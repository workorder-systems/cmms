import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.js';
import { normalizeError } from '../errors.js';
import { callRpc } from '../unwrap.js';

export type AssetMeterRow = Database['public']['Views']['v_asset_meters'] extends { Row: infer R }
  ? R
  : Record<string, unknown>;
export type MeterReadingRow = Database['public']['Views']['v_meter_readings'] extends { Row: infer R }
  ? R
  : Record<string, unknown>;

export interface CreateMeterParams {
  tenantId: string;
  assetId: string;
  meterType: string;
  name: string;
  unit: string;
  currentReading?: number;
  readingDirection?: string;
  decimalPlaces?: number;
  description?: string | null;
}

export interface UpdateMeterParams {
  tenantId: string;
  meterId: string;
  name?: string | null;
  unit?: string | null;
  readingDirection?: string | null;
  decimalPlaces?: number | null;
  description?: string | null;
  isActive?: boolean | null;
}

export interface RecordMeterReadingParams {
  tenantId: string;
  meterId: string;
  readingValue: number;
  readingDate?: string | null;
  readingType?: string;
  notes?: string | null;
}

const rpc = (supabase: SupabaseClient<Database>) =>
  (supabase as unknown as { rpc: (n: string, p?: object) => Promise<{ data: unknown; error: unknown }> }).rpc.bind(supabase);

export function createMetersResource(supabase: SupabaseClient<Database>) {
  return {
    async list(): Promise<AssetMeterRow[]> {
      const { data, error } = await supabase.from('v_asset_meters').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as AssetMeterRow[];
    },
    async getReadings(): Promise<MeterReadingRow[]> {
      const { data, error } = await supabase.from('v_meter_readings').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as MeterReadingRow[];
    },
    async create(params: CreateMeterParams): Promise<string> {
      return callRpc(rpc(supabase), 'rpc_create_meter', {
        p_tenant_id: params.tenantId,
        p_asset_id: params.assetId,
        p_meter_type: params.meterType,
        p_name: params.name,
        p_unit: params.unit,
        p_current_reading: params.currentReading ?? 0,
        p_reading_direction: params.readingDirection ?? 'increasing',
        p_decimal_places: params.decimalPlaces ?? 0,
        p_description: params.description ?? null,
      });
    },
    async update(params: UpdateMeterParams): Promise<void> {
      return callRpc(rpc(supabase), 'rpc_update_meter', {
        p_tenant_id: params.tenantId,
        p_meter_id: params.meterId,
        p_name: params.name ?? null,
        p_unit: params.unit ?? null,
        p_reading_direction: params.readingDirection ?? null,
        p_decimal_places: params.decimalPlaces ?? null,
        p_description: params.description ?? null,
        p_is_active: params.isActive ?? null,
      });
    },
    async recordReading(params: RecordMeterReadingParams): Promise<string> {
      return callRpc(rpc(supabase), 'rpc_record_meter_reading', {
        p_tenant_id: params.tenantId,
        p_meter_id: params.meterId,
        p_reading_value: params.readingValue,
        p_reading_date: params.readingDate ?? null,
        p_reading_type: params.readingType ?? 'manual',
        p_notes: params.notes ?? null,
      });
    },
    async delete(tenantId: string, meterId: string): Promise<void> {
      return callRpc(rpc(supabase), 'rpc_delete_meter', { p_tenant_id: tenantId, p_meter_id: meterId });
    },
  };
}

export type MetersResource = ReturnType<typeof createMetersResource>;
