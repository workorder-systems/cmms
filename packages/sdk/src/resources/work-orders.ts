import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.js';
import { normalizeError } from '../errors.js';
import { callRpc } from '../unwrap.js';

/** Row from v_work_orders view. */
export type WorkOrderRow = Database['public']['Views']['v_work_orders'] extends { Row: infer R } ? R : Record<string, unknown>;

/** Row from v_work_order_attachments view (file_id, bucket_id, storage_path for signed URLs). */
export type WorkOrderAttachmentRow = Database['public']['Views']['v_work_order_attachments'] extends { Row: infer R } ? R : Record<string, unknown>;

/** Params for creating a work order. */
export interface CreateWorkOrderParams {
  tenantId: string;
  title: string;
  description?: string | null;
  priority?: string;
  maintenanceType?: string | null;
  assignedTo?: string | null;
  locationId?: string | null;
  assetId?: string | null;
  dueDate?: string | null;
  pmScheduleId?: string | null;
}

/** Params for transitioning work order status. */
export interface TransitionStatusParams {
  tenantId: string;
  workOrderId: string;
  toStatusKey: string;
}

/** Params for completing a work order. */
export interface CompleteWorkOrderParams {
  tenantId: string;
  workOrderId: string;
}

/** Params for logging time on a work order. */
export interface LogTimeParams {
  tenantId: string;
  workOrderId: string;
  minutes: number;
  entryDate?: string | null;
  userId?: string | null;
  description?: string | null;
}

/** Params for updating work order attachment metadata (label/kind). Create attachments via Storage upload to bucket "attachments"; see docs/attachments-client-flow.md. */
export interface UpdateAttachmentMetadataParams {
  attachmentId: string;
  label?: string | null;
  kind?: string | null;
}

const rpc = (supabase: SupabaseClient<Database>) =>
  (supabase as unknown as { rpc: (n: string, p?: object) => Promise<{ data: unknown; error: unknown }> }).rpc.bind(supabase);

/**
 * Work orders resource: list, get, create, transition status, complete, log time, add attachment.
 * Set tenant context (client.setTenant) before tenant-scoped operations.
 */
export function createWorkOrdersResource(supabase: SupabaseClient<Database>) {
  return {
    /** List work orders for the current tenant (v_work_orders). */
    async list(): Promise<WorkOrderRow[]> {
      const { data, error } = await supabase.from('v_work_orders').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as WorkOrderRow[];
    },

    /** Get a single work order by id. */
    async getById(id: string): Promise<WorkOrderRow | null> {
      const { data, error } = await supabase.from('v_work_orders').select('*').eq('id', id).maybeSingle();
      if (error) throw normalizeError(error);
      return data as WorkOrderRow | null;
    },

    /** Create a work order. Returns the new work order UUID. */
    async create(params: CreateWorkOrderParams): Promise<string> {
      return callRpc(rpc(supabase), 'rpc_create_work_order', {
        p_tenant_id: params.tenantId,
        p_title: params.title,
        p_description: params.description ?? null,
        p_priority: params.priority ?? 'medium',
        p_maintenance_type: params.maintenanceType ?? null,
        p_assigned_to: params.assignedTo ?? null,
        p_location_id: params.locationId ?? null,
        p_asset_id: params.assetId ?? null,
        p_due_date: params.dueDate ?? null,
        p_pm_schedule_id: params.pmScheduleId ?? null,
      });
    },

    /** Transition work order to a new status. */
    async transitionStatus(params: TransitionStatusParams): Promise<void> {
      return callRpc(rpc(supabase), 'rpc_transition_work_order_status', {
        p_tenant_id: params.tenantId,
        p_work_order_id: params.workOrderId,
        p_to_status_key: params.toStatusKey,
      });
    },

    /** Complete a work order (transition to completed). */
    async complete(params: CompleteWorkOrderParams): Promise<void> {
      return callRpc(rpc(supabase), 'rpc_complete_work_order', {
        p_tenant_id: params.tenantId,
        p_work_order_id: params.workOrderId,
      });
    },

    /** Log time on a work order. Returns the time entry UUID. */
    async logTime(params: LogTimeParams): Promise<string> {
      return callRpc(rpc(supabase), 'rpc_log_work_order_time', {
        p_tenant_id: params.tenantId,
        p_work_order_id: params.workOrderId,
        p_minutes: params.minutes,
        p_entry_date: params.entryDate ?? null,
        p_user_id: params.userId ?? null,
        p_description: params.description ?? null,
      });
    },

    /** Update label and/or kind for a work order attachment. Attachments are created by uploading to Storage bucket "attachments"; use listAttachments to get ids. */
    async updateAttachmentMetadata(params: UpdateAttachmentMetadataParams): Promise<void> {
      return callRpc(rpc(supabase), 'rpc_update_work_order_attachment_metadata', {
        p_attachment_id: params.attachmentId,
        p_label: params.label ?? null,
        p_kind: params.kind ?? null,
      });
    },

    /** List attachments for a work order (v_work_order_attachments). Use bucket_id and storage_path with supabase.storage.from(bucket_id).createSignedUrl(storage_path) for download. */
    async listAttachments(workOrderId: string): Promise<WorkOrderAttachmentRow[]> {
      const { data, error } = await supabase
        .from('v_work_order_attachments')
        .select('*')
        .eq('work_order_id', workOrderId);
      if (error) throw normalizeError(error);
      return (data ?? []) as WorkOrderAttachmentRow[];
    },
  };
}

export type WorkOrdersResource = ReturnType<typeof createWorkOrdersResource>;
