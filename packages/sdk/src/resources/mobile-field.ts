import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.js';
import { normalizeError } from '../errors.js';
import { callRpc } from '../unwrap.js';

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

/** Params for registering an existing file as a work order attachment (e.g. after resumable upload). */
export interface RegisterWorkOrderAttachmentParams {
  tenantId: string;
  workOrderId: string;
  fileId: string;
  label?: string | null;
  kind?: string | null;
}

const rpc = (supabase: SupabaseClient<Database>) =>
  (supabase as unknown as { rpc: (n: string, p?: object) => Promise<{ data: unknown; error: unknown }> }).rpc.bind(supabase);

/**
 * Mobile field resource: offline sync payload, start/stop job, add note, register attachment,
 * and lightweight list methods for v_mobile_* views. Set tenant context before use.
 */
export function createMobileFieldResource(supabase: SupabaseClient<Database>) {
  return {
    /**
     * Fetch a single JSON payload for mobile offline sync. Returns work_orders, assets, locations,
     * time_entries, attachments, check_ins, and notes. Use updatedAfter for incremental sync.
     */
    async sync(params: MobileSyncParams): Promise<MobileSyncPayload> {
      const raw = await callRpc(rpc(supabase), 'rpc_mobile_sync', {
        p_tenant_id: params.tenantId,
        p_updated_after: params.updatedAfter ?? null,
        p_limit: params.limit ?? 500,
        p_technician_id: params.technicianId ?? null,
      });
      return raw as MobileSyncPayload;
    },

    /** Start a work order: transition to in_progress and create a check-in. Returns check-in id. */
    async startWorkOrder(params: StartWorkOrderParams): Promise<string> {
      return callRpc(rpc(supabase), 'rpc_start_work_order', {
        p_tenant_id: params.tenantId,
        p_work_order_id: params.workOrderId,
        p_latitude: params.latitude ?? null,
        p_longitude: params.longitude ?? null,
        p_accuracy_metres: params.accuracyMetres ?? null,
      });
    },

    /** Stop work: optionally log time, add note, and/or complete the work order with cause/resolution and GPS. */
    async stopWorkOrder(params: StopWorkOrderParams): Promise<void> {
      return callRpc(rpc(supabase), 'rpc_stop_work_order', {
        p_tenant_id: params.tenantId,
        p_work_order_id: params.workOrderId,
        p_complete: params.complete ?? true,
        p_minutes: params.minutes ?? null,
        p_note: params.note ?? null,
        p_latitude: params.latitude ?? null,
        p_longitude: params.longitude ?? null,
        p_accuracy_metres: params.accuracyMetres ?? null,
        p_cause: params.cause ?? null,
        p_resolution: params.resolution ?? null,
      });
    },

    /** Add a note to a work order. Returns note id. */
    async addNote(params: AddWorkOrderNoteParams): Promise<string> {
      return callRpc(rpc(supabase), 'rpc_add_work_order_note', {
        p_tenant_id: params.tenantId,
        p_work_order_id: params.workOrderId,
        p_body: params.body,
        p_latitude: params.latitude ?? null,
        p_longitude: params.longitude ?? null,
      });
    },

    /** Register an existing file (e.g. uploaded to Storage first) as a work order attachment. Returns attachment id. */
    async registerWorkOrderAttachment(params: RegisterWorkOrderAttachmentParams): Promise<string> {
      return callRpc(rpc(supabase), 'rpc_register_work_order_attachment', {
        p_tenant_id: params.tenantId,
        p_work_order_id: params.workOrderId,
        p_file_id: params.fileId,
        p_label: params.label ?? null,
        p_kind: params.kind ?? null,
      });
    },

    /** List minimal work orders for mobile (v_mobile_work_orders). Use updated_at for incremental sync. */
    async listMobileWorkOrders(): Promise<MobileWorkOrderRow[]> {
      const { data, error } = await (supabase as unknown as { from: (t: string) => { select: (c: string) => Promise<{ data: unknown; error: unknown }> } }).from('v_mobile_work_orders').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as MobileWorkOrderRow[];
    },

    /** List minimal assets for mobile (v_mobile_assets). */
    async listMobileAssets(): Promise<MobileAssetRow[]> {
      const { data, error } = await (supabase as unknown as { from: (t: string) => { select: (c: string) => Promise<{ data: unknown; error: unknown }> } }).from('v_mobile_assets').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as MobileAssetRow[];
    },

    /** List minimal locations for mobile (v_mobile_locations). */
    async listMobileLocations(): Promise<MobileLocationRow[]> {
      const { data, error } = await (supabase as unknown as { from: (t: string) => { select: (c: string) => Promise<{ data: unknown; error: unknown }> } }).from('v_mobile_locations').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as MobileLocationRow[];
    },

    /** List minimal time entries for mobile (v_mobile_work_order_time_entries). */
    async listMobileTimeEntries(): Promise<MobileTimeEntryRow[]> {
      const { data, error } = await (supabase as unknown as { from: (t: string) => { select: (c: string) => Promise<{ data: unknown; error: unknown }> } }).from('v_mobile_work_order_time_entries').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as MobileTimeEntryRow[];
    },

    /** List minimal work order attachments for mobile (v_mobile_work_order_attachments). */
    async listMobileAttachments(): Promise<MobileAttachmentRow[]> {
      const { data, error } = await (supabase as unknown as { from: (t: string) => { select: (c: string) => Promise<{ data: unknown; error: unknown }> } }).from('v_mobile_work_order_attachments').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as MobileAttachmentRow[];
    },

    /** List check-ins for mobile (v_mobile_work_order_check_ins). */
    async listMobileCheckIns(): Promise<MobileCheckInRow[]> {
      const { data, error } = await (supabase as unknown as { from: (t: string) => { select: (c: string) => Promise<{ data: unknown; error: unknown }> } }).from('v_mobile_work_order_check_ins').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as MobileCheckInRow[];
    },

    /** List work order notes for mobile (v_mobile_work_order_notes). */
    async listMobileNotes(): Promise<MobileNoteRow[]> {
      const { data, error } = await (supabase as unknown as { from: (t: string) => { select: (c: string) => Promise<{ data: unknown; error: unknown }> } }).from('v_mobile_work_order_notes').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as MobileNoteRow[];
    },
  };
}

export type MobileFieldResource = ReturnType<typeof createMobileFieldResource>;
