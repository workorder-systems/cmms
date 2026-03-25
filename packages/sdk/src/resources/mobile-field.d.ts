import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.js';
/** Minimal work order row for mobile sync (v_mobile_work_orders). */
export interface MobileWorkOrderRow {
    id: string;
    tenant_id: string;
    title: string;
    status: string;
    priority: string;
    assigned_to: string | null;
    location_id: string | null;
    asset_id: string | null;
    due_date: string | null;
    completed_at: string | null;
    updated_at: string;
}
/** Minimal asset row for mobile sync (v_mobile_assets). */
export interface MobileAssetRow {
    id: string;
    tenant_id: string;
    name: string;
    asset_number: string | null;
    location_id: string | null;
    status: string;
    updated_at: string;
}
/** Minimal location row for mobile sync (v_mobile_locations). */
export interface MobileLocationRow {
    id: string;
    tenant_id: string;
    name: string;
    parent_location_id: string | null;
    updated_at: string;
}
/** Minimal time entry row for mobile sync (v_mobile_work_order_time_entries). */
export interface MobileTimeEntryRow {
    id: string;
    tenant_id: string;
    work_order_id: string;
    user_id: string;
    entry_date: string;
    minutes: number;
    description: string | null;
    logged_at: string;
    created_at: string;
    updated_at: string;
    latitude: number | null;
    longitude: number | null;
}
/** Minimal attachment row for mobile sync (v_mobile_work_order_attachments). */
export interface MobileAttachmentRow {
    id: string;
    tenant_id: string;
    work_order_id: string;
    file_id: string;
    label: string | null;
    kind: string | null;
    created_at: string;
    updated_at: string;
}
/** Check-in row for mobile sync (v_mobile_work_order_check_ins). */
export interface MobileCheckInRow {
    id: string;
    tenant_id: string;
    work_order_id: string;
    user_id: string;
    checked_in_at: string;
    latitude: number | null;
    longitude: number | null;
    created_at: string;
}
/** Work order note row for mobile sync (v_mobile_work_order_notes). */
export interface MobileNoteRow {
    id: string;
    tenant_id: string;
    work_order_id: string;
    body: string;
    created_by: string;
    created_at: string;
}
/** Payload returned by rpc_mobile_sync. */
export interface MobileSyncPayload {
    work_orders: MobileWorkOrderRow[];
    assets: MobileAssetRow[];
    locations: MobileLocationRow[];
    time_entries: MobileTimeEntryRow[];
    attachments: MobileAttachmentRow[];
    check_ins: MobileCheckInRow[];
    notes: MobileNoteRow[];
}
/** Params for incremental mobile sync. */
export interface MobileSyncParams {
    tenantId: string;
    /** ISO timestamp; only rows updated/created after this are returned. Omit for full sync. */
    updatedAfter?: string | null;
    /** Max rows per entity type (default 500, max 2000). */
    limit?: number;
    /** When set, work_orders are filtered to those assigned to this technician (assigned_to or work_order_assignments). */
    technicianId?: string | null;
}
/** Params for starting a work order (transition to in_progress + optional check-in with GPS). */
export interface StartWorkOrderParams {
    tenantId: string;
    workOrderId: string;
    latitude?: number | null;
    longitude?: number | null;
    accuracyMetres?: number | null;
}
/** Params for stopping work (optional time log, note, complete, and GPS). */
export interface StopWorkOrderParams {
    tenantId: string;
    workOrderId: string;
    complete?: boolean;
    minutes?: number | null;
    note?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    accuracyMetres?: number | null;
    cause?: string | null;
    resolution?: string | null;
}
/** Params for adding a work order note. */
export interface AddWorkOrderNoteParams {
    tenantId: string;
    workOrderId: string;
    body: string;
    latitude?: number | null;
    longitude?: number | null;
}
/** Params for registering an existing file against any supported entity_type (e.g. after resumable upload). */
export interface RegisterEntityAttachmentParams {
    tenantId: string;
    /** Storage path segment, e.g. work_order, asset, part, purchase_order. */
    entityType: string;
    entityId: string;
    fileId: string;
    label?: string | null;
    kind?: string | null;
}
/**
 * Mobile field resource: offline sync payload, start/stop job, add note, register attachment,
 * and lightweight list methods for v_mobile_* views. Set tenant context before use.
 */
export declare function createMobileFieldResource(supabase: SupabaseClient<Database>): {
    /**
     * Fetch a single JSON payload for mobile offline sync. Returns work_orders, assets, locations,
     * time_entries, attachments, check_ins, and notes. Use updatedAfter for incremental sync.
     */
    sync(params: MobileSyncParams): Promise<MobileSyncPayload>;
    /** Start a work order: transition to in_progress and create a check-in. Returns check-in id. */
    startWorkOrder(params: StartWorkOrderParams): Promise<string>;
    /** Stop work: optionally log time, add note, and/or complete the work order with cause/resolution and GPS. */
    stopWorkOrder(params: StopWorkOrderParams): Promise<void>;
    /** Add a note to a work order. Returns note id. */
    addNote(params: AddWorkOrderNoteParams): Promise<string>;
    /** Register an existing file (e.g. uploaded to Storage first) as an attachment on any supported entity. Returns attachment id. */
    registerEntityAttachment(params: RegisterEntityAttachmentParams): Promise<string>;
    /** List minimal work orders for mobile (v_mobile_work_orders). Use updated_at for incremental sync. */
    listMobileWorkOrders(): Promise<MobileWorkOrderRow[]>;
    /** List minimal assets for mobile (v_mobile_assets). */
    listMobileAssets(): Promise<MobileAssetRow[]>;
    /** List minimal locations for mobile (v_mobile_locations). */
    listMobileLocations(): Promise<MobileLocationRow[]>;
    /** List minimal time entries for mobile (v_mobile_work_order_time_entries). */
    listMobileTimeEntries(): Promise<MobileTimeEntryRow[]>;
    /** List minimal work order attachments for mobile (v_mobile_work_order_attachments). */
    listMobileAttachments(): Promise<MobileAttachmentRow[]>;
    /** List check-ins for mobile (v_mobile_work_order_check_ins). */
    listMobileCheckIns(): Promise<MobileCheckInRow[]>;
    /** List work order notes for mobile (v_mobile_work_order_notes). */
    listMobileNotes(): Promise<MobileNoteRow[]>;
};
export type MobileFieldResource = ReturnType<typeof createMobileFieldResource>;
//# sourceMappingURL=mobile-field.d.ts.map