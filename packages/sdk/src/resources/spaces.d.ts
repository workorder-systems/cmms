import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.js';
export type SpaceRow = Database['public']['Views']['v_spaces'] extends {
    Row: infer R;
} ? R : {
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
export declare function createSpacesResource(supabase: SupabaseClient<Database>): {
    list(): Promise<SpaceRow[]>;
    getById(id: string): Promise<SpaceRow | null>;
    getByLocationId(locationId: string): Promise<SpaceRow | null>;
    create(params: CreateSpaceParams): Promise<string>;
    update(params: UpdateSpaceParams): Promise<void>;
    delete(tenantId: string, spaceId: string): Promise<void>;
};
export type SpacesResource = ReturnType<typeof createSpacesResource>;
//# sourceMappingURL=spaces.d.ts.map