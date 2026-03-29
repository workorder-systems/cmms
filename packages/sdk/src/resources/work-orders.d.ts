import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.js';
/** Row from v_work_orders view. */
export type WorkOrderRow = Database['public']['Views']['v_work_orders'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
/** Row from v_work_order_attachments view (file_id, bucket_id, storage_path for signed URLs). */
export type WorkOrderAttachmentRow = Database['public']['Views']['v_work_order_attachments'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
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
    clientRequestId?: string | null;
}
export interface WorkOrderSummaryRow {
    id: string;
    title: string | null;
    status: string | null;
    priority: string | null;
    due_date: string | null;
    assigned_to: string | null;
    assigned_to_name: string | null;
    asset_id: string | null;
    location_id: string | null;
    project_id: string | null;
    created_at: string | null;
    updated_at: string | null;
    description?: string | null;
}
export interface WorkOrderSummaryListOptions {
    limit?: number;
    includeDraft?: boolean;
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
    errors: {
        index: number;
        message: string;
    }[];
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
} ? R : Record<string, unknown>;
/** Row from v_work_order_sla_status (response/resolution breach flags and due times). */
export type WorkOrderSlaStatusRow = Database['public']['Views']['v_work_order_sla_status'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
/** Row from v_work_order_comms (communication audit log). */
export type WorkOrderCommsRow = Database['public']['Views']['v_work_order_comms'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
/** Row from v_work_orders_sla_open (non-final WOs with SLA deadlines). */
export type WorkOrderSlaOpenRow = Database['public']['Views']['v_work_orders_sla_open'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
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
export type MaintenanceRequestRow = Database['public']['Views']['v_maintenance_requests'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
/** Row from v_my_maintenance_requests (portal). */
export type MyMaintenanceRequestRow = Database['public']['Views']['v_my_maintenance_requests'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
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
/**
 * Work orders resource: list, get, create, portal requests, SLA views/RPCs, transition status, complete, log time, attachments.
 * Set tenant context (client.setTenant) before tenant-scoped operations.
 */
export declare function createWorkOrdersResource(supabase: SupabaseClient<Database>): {
    /** List work orders for the current tenant (v_work_orders). Excludes draft by default to reduce noise; use listIncludingDraft() if needed. */
    list(): Promise<WorkOrderRow[]>;
    /** List work orders including draft (v_work_orders). Use when the caller needs draft work orders. */
    listIncludingDraft(): Promise<WorkOrderRow[]>;
    /** Token-efficient list for selection and disambiguation. */
    listSummary(options?: WorkOrderSummaryListOptions): Promise<WorkOrderSummaryRow[]>;
    /** Get a single work order by id. */
    getById(id: string): Promise<WorkOrderRow | null>;
    /** Token-efficient fetch of a single work order by id. */
    getSummary(id: string): Promise<WorkOrderSummaryRow | null>;
    /** Create a work order. Returns the new work order UUID. */
    create(params: CreateWorkOrderParams): Promise<string>;
    /** Bulk import work orders. Status/priority set on insert (no transition). Returns created ids and per-row errors. */
    bulkImport(params: BulkImportParams): Promise<BulkImportResult>;
    /** Transition work order to a new status. */
    transitionStatus(params: TransitionStatusParams): Promise<void>;
    /** Complete a work order (transition to completed). */
    complete(params: CompleteWorkOrderParams): Promise<void>;
    /** Log time on a work order. Optional GPS (latitude, longitude, accuracyMetres) for mobile. Returns the time entry UUID. */
    logTime(params: LogTimeParams): Promise<string>;
    /** Update label and/or kind for a work order attachment. Attachments are created by uploading to Storage bucket "attachments"; use listAttachments to get ids. */
    updateAttachmentMetadata(params: UpdateAttachmentMetadataParams): Promise<void>;
    /** List attachments for a work order (v_work_order_attachments). Use bucket_id and storage_path with supabase.storage.from(bucket_id).createSignedUrl(storage_path) for download. */
    listAttachments(workOrderId: string): Promise<WorkOrderAttachmentRow[]>;
    /** Portal: submit a request (same as end-user CMMS request form). Returns new work order UUID. */
    createRequest(params: CreateWorkOrderRequestParams): Promise<string>;
    /** Portal: list work orders the current user submitted (`v_my_work_order_requests`). Requires `workorder.request.view.own`. */
    listMyRequests(): Promise<MyWorkOrderRequestRow[]>;
    /** Maintenance requests for the tenant (`v_maintenance_requests`). */
    listMaintenanceRequests(): Promise<MaintenanceRequestRow[]>;
    /** Portal: maintenance requests created by the current user (`v_my_maintenance_requests`). */
    listMyMaintenanceRequests(): Promise<MyMaintenanceRequestRow[]>;
    /** Create a maintenance request row only (draft or submitted). Returns request id. */
    createMaintenanceRequest(params: CreateMaintenanceRequestParams): Promise<string>;
    /** Convert a submitted maintenance request to a work order (`rpc_convert_maintenance_request_to_work_order`). Requires `workorder.edit`. */
    convertMaintenanceRequestToWorkOrder(tenantId: string, requestId: string): Promise<string>;
    /** SLA dashboard: all work orders in the tenant with breach flags (`v_work_order_sla_status`). */
    listSlaStatus(): Promise<WorkOrderSlaStatusRow[]>;
    /** Coordinator queue: non-final work orders that have SLA due times (`v_work_orders_sla_open`). */
    listSlaOpenQueue(): Promise<WorkOrderSlaOpenRow[]>;
    /** Communication events for a work order (`v_work_order_comms`). */
    listComms(workOrderId: string): Promise<WorkOrderCommsRow[]>;
    /** Append a communication event (`rpc_add_work_order_comms_event`). */
    addCommsEvent(params: AddWorkOrderCommsEventParams): Promise<string>;
    /** SLA status for a single work order, or null if not visible. */
    getSlaStatus(workOrderId: string): Promise<WorkOrderSlaStatusRow | null>;
    /** First response / acknowledgment for SLA. */
    acknowledge(params: AcknowledgeWorkOrderParams): Promise<void>;
    /** Admin: create or update SLA rule for priority (+ optional maintenance type). Returns rule UUID. */
    upsertSlaRule(params: UpsertWorkOrderSlaRuleParams): Promise<string>;
};
export type WorkOrdersResource = ReturnType<typeof createWorkOrdersResource>;
//# sourceMappingURL=work-orders.d.ts.map