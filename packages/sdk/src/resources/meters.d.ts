import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.js';
export type AssetMeterRow = Database['public']['Views']['v_asset_meters'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
export type MeterReadingRow = Database['public']['Views']['v_meter_readings'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
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
export declare function createMetersResource(supabase: SupabaseClient<Database>): {
    list(): Promise<AssetMeterRow[]>;
    getReadings(): Promise<MeterReadingRow[]>;
    create(params: CreateMeterParams): Promise<string>;
    update(params: UpdateMeterParams): Promise<void>;
    recordReading(params: RecordMeterReadingParams): Promise<string>;
    delete(tenantId: string, meterId: string): Promise<void>;
};
export type MetersResource = ReturnType<typeof createMetersResource>;
//# sourceMappingURL=meters.d.ts.map