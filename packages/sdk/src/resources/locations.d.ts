import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.js';
export type LocationRow = Database['public']['Views']['v_locations'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
export type LocationType = 'region' | 'site' | 'building' | 'floor' | 'room' | 'zone';
export interface CreateLocationParams {
    tenantId: string;
    name: string;
    description?: string | null;
    parentLocationId?: string | null;
    /** Default 'site' if omitted. */
    locationType?: LocationType | null;
    code?: string | null;
    addressLine?: string | null;
    externalId?: string | null;
    /** WGS84 latitude; must be set together with longitude. */
    latitude?: number | null;
    /** WGS84 longitude; must be set together with latitude. */
    longitude?: number | null;
}
export interface UpdateLocationParams {
    tenantId: string;
    locationId: string;
    name?: string | null;
    description?: string | null;
    parentLocationId?: string | null;
    locationType?: LocationType | null;
    code?: string | null;
    addressLine?: string | null;
    externalId?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    /** When true, clears latitude and longitude (removes position from map). */
    clearPosition?: boolean;
}
/** Single row for bulk import (name required; others optional). */
export interface BulkImportLocationRow {
    name: string;
    description?: string | null;
    parent_location_id?: string | null;
    location_type?: LocationType | null;
    code?: string | null;
    address_line?: string | null;
    external_id?: string | null;
}
/** Result of bulk import: created location ids and per-row errors. */
export interface BulkImportLocationResult {
    created_ids: string[];
    errors: {
        index: number;
        message: string;
    }[];
}
/** Params for bulk importing locations. */
export interface BulkImportLocationsParams {
    tenantId: string;
    rows: BulkImportLocationRow[];
}
export declare function createLocationsResource(supabase: SupabaseClient<Database>): {
    list(): Promise<LocationRow[]>;
    getById(id: string): Promise<LocationRow | null>;
    create(params: CreateLocationParams): Promise<string>;
    update(params: UpdateLocationParams): Promise<void>;
    delete(tenantId: string, locationId: string): Promise<void>;
    /** Bulk import locations. Returns created ids and per-row errors. */
    bulkImport(params: BulkImportLocationsParams): Promise<BulkImportLocationResult>;
};
export type LocationsResource = ReturnType<typeof createLocationsResource>;
//# sourceMappingURL=locations.d.ts.map