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
  projectId?: string | null;
  /** Optional idempotency key for retry-safe automation. Reusing the same key returns the original work order id. */
  clientRequestId?: string | null;
}

/** Single row for bulk import (title required; others optional, use catalog keys). */
export interface BulkImportRow {
  title: string;
  description?: string | null;
  cause?: string | null;
  resolution?: string | null;
  status?: string | null;
  priority?: string | null;
  due_date?: string | null;
}

/** Result of bulk import: created work order ids and per-row errors. */
export interface BulkImportResult {
  created_ids: string[];
  errors: { index: number; message: string }[];
}

/** Params for bulk importing work orders (single RPC, status set on insert). */
export interface BulkImportParams {
  tenantId: string;
  rows: BulkImportRow[];
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
  cause?: string | null;
  resolution?: string | null;
}

/** Params for logging time on a work order. Optional GPS for mobile field workflows. */
export interface LogTimeParams {
  tenantId: string;
  workOrderId: string;
  minutes: number;
  entryDate?: string | null;
  userId?: string | null;
  description?: string | null;
  /** Optional GPS when entry was logged (e.g. from device). */
  latitude?: number | null;
  longitude?: number | null;
  accuracyMetres?: number | null;
}

/** Params for updating work order attachment metadata (label/kind). Create attachments via Storage upload to bucket "attachments"; see docs/attachments-client-flow.md. */
export interface UpdateAttachmentMetadataParams {
  attachmentId: string;
  label?: string | null;
  kind?: string | null;
}

/** Row from v_my_work_order_requests (portal: work orders submitted by the current user). */
export type MyWorkOrderRequestRow = Database['public']['Views']['v_my_work_order_requests'] extends {
  Row: infer R;
}
  ? R
  : Record<string, unknown>;

/** Row from v_work_order_sla_status (response/resolution breach flags and due times). */
export type WorkOrderSlaStatusRow = Database['public']['Views']['v_work_order_sla_status'] extends {
  Row: infer R;
}
  ? R
  : Record<string, unknown>;

/** Row from v_work_order_comms (communication audit log). */
export type WorkOrderCommsRow = Database['public']['Views']['v_work_order_comms'] extends { Row: infer R }
  ? R
  : Record<string, unknown>;

/** Row from v_work_orders_sla_open (non-final WOs with SLA deadlines). */
export type WorkOrderSlaOpenRow = Database['public']['Views']['v_work_orders_sla_open'] extends { Row: infer R }
  ? R
  : Record<string, unknown>;

/** Log a communication event on a work order. Requester, assignee, or `workorder.edit`. */
export interface AddWorkOrderCommsEventParams {
  tenantId: string;
  workOrderId: string;
  body: string;
  channel?: string | null;
  metadata?: Record<string, unknown> | null;
}

/** Portal: create a work order as the signed-in user (`requested_by` = caller). Requires `workorder.request.create` and location/asset ABAC where applicable. */
export interface CreateWorkOrderRequestParams {
  tenantId: string;
  title: string;
  description?: string | null;
  priority?: string;
  maintenanceType?: string | null;
  locationId?: string | null;
  assetId?: string | null;
  dueDate?: string | null;
}

/** Row from v_maintenance_requests. */
export type MaintenanceRequestRow = Database['public']['Views']['v_maintenance_requests'] extends { Row: infer R }
  ? R
  : Record<string, unknown>;

/** Row from v_my_maintenance_requests (portal). */
export type MyMaintenanceRequestRow = Database['public']['Views']['v_my_maintenance_requests'] extends {
  Row: infer R;
}
  ? R
  : Record<string, unknown>;

/** Create a maintenance request without auto-converting to a work order (`rpc_create_maintenance_request`). */
export interface CreateMaintenanceRequestParams {
  tenantId: string;
  title: string;
  description?: string | null;
  priority?: string;
  maintenanceType?: string | null;
  locationId?: string | null;
  assetId?: string | null;
  dueDate?: string | null;
  /** `draft` skips portal ABAC until submit/convert flows; `submitted` enforces ABAC. */
  status?: 'draft' | 'submitted';
}

/** Satisfy response SLA tracking by setting `acknowledged_at`. Requires `workorder.acknowledge`. */
export interface AcknowledgeWorkOrderParams {
  tenantId: string;
  workOrderId: string;
}

/** Create or update an SLA rule for priority (and optional maintenance type). Requires `tenant.sla.manage`. Intervals are Postgres `interval` text, e.g. `1 hour`, `2 days`. */
export interface UpsertWorkOrderSlaRuleParams {
  tenantId: string;
  priorityKey: string;
  /** When set, this rule applies only for this maintenance type; otherwise it is the generic rule for the priority. */
  maintenanceTypeKey?: string | null;
  /** Required when `ruleId` is null (create). */
  responseInterval?: string | null;
  /** Required when `ruleId` is null (create). */
  resolutionInterval?: string | null;
  isActive?: boolean | null;
  /** When set, updates this rule id instead of inserting. */
  ruleId?: string | null;
}

const rpc = (supabase: SupabaseClient<Database>) =>
  (supabase as unknown as { rpc: (n: string, p?: object) => Promise<{ data: unknown; error: unknown }> }).rpc.bind(supabase);

/**
 * Work orders resource: list, get, create, portal requests, SLA views/RPCs, transition status, complete, log time, attachments.
 * Set tenant context (client.setTenant) before tenant-scoped operations.
 */
export function createWorkOrdersResource(supabase: SupabaseClient<Database>) {
  return {
    /** List work orders for the current tenant (v_work_orders). Excludes draft by default to reduce noise; use listIncludingDraft() if needed. */
    async list(): Promise<WorkOrderRow[]> {
      const { data, error } = await supabase.from('v_work_orders').select('*').neq('status', 'draft');
      if (error) throw normalizeError(error);
      return (data ?? []) as WorkOrderRow[];
    },

    /** List work orders including draft (v_work_orders). Use when the caller needs draft work orders. */
    async listIncludingDraft(): Promise<WorkOrderRow[]> {
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

    /** Create a work order. Returns the new work order UUID. Optional clientRequestId makes retries idempotent. */
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
        p_project_id: params.projectId ?? null,
        p_client_request_id: params.clientRequestId ?? null,
      });
    },

    /** Bulk import work orders. Status/priority set on insert (no transition). Returns created ids and per-row errors. */
    async bulkImport(params: BulkImportParams): Promise<BulkImportResult> {
      const raw = await callRpc(rpc(supabase), 'rpc_bulk_import_work_orders', {
        p_tenant_id: params.tenantId,
        p_rows: params.rows,
      });
      const data = raw as { created_ids: string[]; errors: { index: number; message: string }[] };
      return {
        created_ids: data.created_ids ?? [],
        errors: data.errors ?? [],
      };
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
        p_cause: params.cause ?? null,
        p_resolution: params.resolution ?? null,
      });
    },

    /** Log time on a work order. Optional GPS (latitude, longitude, accuracyMetres) for mobile. Returns the time entry UUID. */
    async logTime(params: LogTimeParams): Promise<string> {
      return callRpc(rpc(supabase), 'rpc_log_work_order_time', {
        p_tenant_id: params.tenantId,
        p_work_order_id: params.workOrderId,
        p_minutes: params.minutes,
        p_entry_date: params.entryDate ?? null,
        p_user_id: params.userId ?? null,
        p_description: params.description ?? null,
        p_latitude: params.latitude ?? null,
        p_longitude: params.longitude ?? null,
        p_accuracy_metres: params.accuracyMetres ?? null,
      });
    },

    /** Update label and/or kind for a work order attachment. Attachments are created by uploading to Storage bucket "attachments"; use listAttachments to get ids. */
    async updateAttachmentMetadata(params: UpdateAttachmentMetadataParams): Promise<void> {
      return callRpc(rpc(supabase), 'rpc_update_entity_attachment_metadata', {
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

    /** Portal: submit a request (same as end-user CMMS request form). Returns new work order UUID. */
    async createRequest(params: CreateWorkOrderRequestParams): Promise<string> {
      return callRpc(rpc(supabase), 'rpc_create_work_order_request', {
        p_tenant_id: params.tenantId,
        p_title: params.title,
        p_description: params.description ?? null,
        p_priority: params.priority ?? 'medium',
        p_maintenance_type: params.maintenanceType ?? null,
        p_location_id: params.locationId ?? null,
        p_asset_id: params.assetId ?? null,
        p_due_date: params.dueDate ?? null,
      });
    },

    /** Portal: list work orders the current user submitted (`v_my_work_order_requests`). Requires `workorder.request.view.own`. */
    async listMyRequests(): Promise<MyWorkOrderRequestRow[]> {
      const { data, error } = await supabase.from('v_my_work_order_requests').select('*').order('created_at', {
        ascending: false,
      });
      if (error) throw normalizeError(error);
      return (data ?? []) as MyWorkOrderRequestRow[];
    },

    /** Maintenance requests for the tenant (`v_maintenance_requests`). */
    async listMaintenanceRequests(): Promise<MaintenanceRequestRow[]> {
      const { data, error } = await supabase.from('v_maintenance_requests').select('*').order('created_at', {
        ascending: false,
      });
      if (error) throw normalizeError(error);
      return (data ?? []) as MaintenanceRequestRow[];
    },

    /** Portal: maintenance requests created by the current user (`v_my_maintenance_requests`). */
    async listMyMaintenanceRequests(): Promise<MyMaintenanceRequestRow[]> {
      const { data, error } = await supabase.from('v_my_maintenance_requests').select('*').order('created_at', {
        ascending: false,
      });
      if (error) throw normalizeError(error);
      return (data ?? []) as MyMaintenanceRequestRow[];
    },

    /** Create a maintenance request row only (draft or submitted). Returns request id. */
    async createMaintenanceRequest(params: CreateMaintenanceRequestParams): Promise<string> {
      return callRpc<string>(rpc(supabase), 'rpc_create_maintenance_request', {
        p_tenant_id: params.tenantId,
        p_title: params.title,
        p_description: params.description ?? null,
        p_priority: params.priority ?? 'medium',
        p_maintenance_type: params.maintenanceType ?? null,
        p_location_id: params.locationId ?? null,
        p_asset_id: params.assetId ?? null,
        p_due_date: params.dueDate ?? null,
        p_status: params.status ?? 'submitted',
      });
    },

    /** Convert a submitted maintenance request to a work order (`rpc_convert_maintenance_request_to_work_order`). Requires `workorder.edit`. */
    async convertMaintenanceRequestToWorkOrder(tenantId: string, requestId: string): Promise<string> {
      return callRpc<string>(rpc(supabase), 'rpc_convert_maintenance_request_to_work_order', {
        p_tenant_id: tenantId,
        p_request_id: requestId,
      });
    },

    /** SLA dashboard: all work orders in the tenant with breach flags (`v_work_order_sla_status`). */
    async listSlaStatus(): Promise<WorkOrderSlaStatusRow[]> {
      const { data, error } = await supabase.from('v_work_order_sla_status').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as WorkOrderSlaStatusRow[];
    },

    /** Coordinator queue: non-final work orders that have SLA due times (`v_work_orders_sla_open`). */
    async listSlaOpenQueue(): Promise<WorkOrderSlaOpenRow[]> {
      const { data, error } = await supabase.from('v_work_orders_sla_open').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as WorkOrderSlaOpenRow[];
    },

    /** Communication events for a work order (`v_work_order_comms`). */
    async listComms(workOrderId: string): Promise<WorkOrderCommsRow[]> {
      const { data, error } = await supabase
        .from('v_work_order_comms')
        .select('*')
        .eq('work_order_id', workOrderId)
        .order('created_at', { ascending: true });
      if (error) throw normalizeError(error);
      return (data ?? []) as WorkOrderCommsRow[];
    },

    /** Append a communication event (`rpc_add_work_order_comms_event`). */
    async addCommsEvent(params: AddWorkOrderCommsEventParams): Promise<string> {
      return callRpc<string>(rpc(supabase), 'rpc_add_work_order_comms_event', {
        p_tenant_id: params.tenantId,
        p_work_order_id: params.workOrderId,
        p_body: params.body,
        p_channel: params.channel ?? null,
        p_metadata: params.metadata ?? null,
      });
    },

    /** SLA status for a single work order, or null if not visible. */
    async getSlaStatus(workOrderId: string): Promise<WorkOrderSlaStatusRow | null> {
      const { data, error } = await supabase
        .from('v_work_order_sla_status')
        .select('*')
        .eq('work_order_id', workOrderId)
        .maybeSingle();
      if (error) throw normalizeError(error);
      return data as WorkOrderSlaStatusRow | null;
    },

    /** First response / acknowledgment for SLA. */
    async acknowledge(params: AcknowledgeWorkOrderParams): Promise<void> {
      await callRpc(rpc(supabase), 'rpc_acknowledge_work_order', {
        p_tenant_id: params.tenantId,
        p_work_order_id: params.workOrderId,
      });
    },

    /** Admin: create or update SLA rule for priority (+ optional maintenance type). Returns rule UUID. */
    async upsertSlaRule(params: UpsertWorkOrderSlaRuleParams): Promise<string> {
      return callRpc(rpc(supabase), 'rpc_upsert_work_order_sla_rule', {
        p_tenant_id: params.tenantId,
        p_priority_key: params.priorityKey,
        p_maintenance_type_key: params.maintenanceTypeKey ?? null,
        p_response_interval: params.responseInterval ?? null,
        p_resolution_interval: params.resolutionInterval ?? null,
        p_is_active: params.isActive ?? null,
        p_rule_id: params.ruleId ?? null,
      });
    },
  };
}

export type WorkOrdersResource = ReturnType<typeof createWorkOrdersResource>;
