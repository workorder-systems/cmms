import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.js';
export type MapZoneRow = Database['public']['Views']['v_map_zones'] extends {
    Row: infer R;
} ? R : {
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
export declare function createMapZonesResource(supabase: SupabaseClient<Database>): {
    list(): Promise<MapZoneRow[]>;
    getById(id: string): Promise<MapZoneRow | null>;
    create(params: CreateMapZoneParams): Promise<string>;
    update(params: UpdateMapZoneParams): Promise<void>;
    delete(tenantId: string, zoneId: string): Promise<void>;
};
export type MapZonesResource = ReturnType<typeof createMapZonesResource>;
//# sourceMappingURL=map-zones.d.ts.map