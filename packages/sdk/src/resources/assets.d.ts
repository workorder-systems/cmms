import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.js';
export type AssetRow = Database['public']['Views']['v_assets'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
/** Row from v_asset_warranties (multi-row warranty history per asset). */
export type AssetWarrantyRow = Database['public']['Views']['v_asset_warranties'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
export interface CreateAssetParams {
    tenantId: string;
    name: string;
    description?: string | null;
    assetNumber?: string | null;
    /** Optional scannable id (unique per tenant when set). */
    barcode?: string | null;
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
    /** Set to empty string to clear barcode; omit or null to leave unchanged. */
    barcode?: string | null;
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
    errors: {
        index: number;
        message: string;
    }[];
}
/** Params for bulk importing assets. */
export interface BulkImportAssetsParams {
    tenantId: string;
    rows: BulkImportAssetRow[];
}
/** Create or update a warranty row; syncs `assets.warranty_expires_at` when active. Requires `asset.warranty.manage`. */
export interface UpsertAssetWarrantyParams {
    tenantId: string;
    assetId: string;
    warrantyId?: string | null;
    warrantyType?: string | null;
    startsOn?: string | null;
    expiresOn?: string | null;
    coverageSummary?: string | null;
    externalReference?: string | null;
    supplierId?: string | null;
    isActive?: boolean | null;
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
export interface AssetSummaryRow {
    id: string;
    name: string | null;
    asset_number: string | null;
    barcode: string | null;
    status: string | null;
    location_id: string | null;
    updated_at: string | null;
}
export declare function createAssetsResource(supabase: SupabaseClient<Database>): {
    list(): Promise<AssetRow[]>;
    /** Token-efficient asset summaries for selectors and agent disambiguation. */
    listSummary(limit?: number): Promise<AssetSummaryRow[]>;
    getById(id: string): Promise<AssetRow | null>;
    /** Warranty rows for the tenant; pass `assetId` to filter one asset. */
    listWarranties(assetId?: string): Promise<AssetWarrantyRow[]>;
    /** Insert or update `app.asset_warranties`; returns warranty UUID. */
    upsertWarranty(params: UpsertAssetWarrantyParams): Promise<string>;
    create(params: CreateAssetParams): Promise<string>;
    update(params: UpdateAssetParams): Promise<void>;
    /**
     * Resolve a scanned code to an asset id (barcode column, then asset_number). Requires `asset.view`.
     * Returns null if not found.
     */
    resolveByScanCode(tenantId: string, code: string): Promise<string | null>;
    delete(tenantId: string, assetId: string): Promise<void>;
    /** Bulk import assets. Returns created ids and per-row errors. */
    bulkImport(params: BulkImportAssetsParams): Promise<BulkImportAssetResult>;
    /** Insert a downtime event row. Returns the event UUID. */
    recordDowntime(params: RecordAssetDowntimeParams): Promise<string>;
};
export type AssetsResource = ReturnType<typeof createAssetsResource>;
//# sourceMappingURL=assets.d.ts.map