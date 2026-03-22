import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.js';
import { normalizeError } from '../errors.js';
import { callRpc } from '../unwrap.js';

export type ToolRow = Database['public']['Views']['v_tools'] extends { Row: infer R } ? R : Record<string, unknown>;
export type ToolCheckoutRow = Database['public']['Views']['v_tool_checkouts'] extends { Row: infer R }
  ? R
  : Record<string, unknown>;
export type ShiftHandoverRow = Database['public']['Views']['v_shift_handovers'] extends { Row: infer R }
  ? R
  : Record<string, unknown>;

/** Create a tool catalog row. Requires `tool.manage`. Status must match `^[a-z0-9_]+$` (default `available`). */
export interface CreateToolParams {
  tenantId: string;
  name: string;
  assetTag?: string | null;
  serialNumber?: string | null;
  status?: string | null;
}

/** Update a tool. Omit fields to leave unchanged. Requires `tool.manage`. */
export interface UpdateToolParams {
  tenantId: string;
  toolId: string;
  name?: string | null;
  assetTag?: string | null;
  serialNumber?: string | null;
  status?: string | null;
}

export interface CheckoutToolParams {
  tenantId: string;
  toolId: string;
  checkedOutToUserId: string;
  workOrderId?: string | null;
  dueAt?: string | null;
  notes?: string | null;
}

export interface ReturnToolParams {
  tenantId: string;
  checkoutId: string;
}

export interface CreateShiftHandoverParams {
  tenantId: string;
  locationId: string;
  toUserId: string;
  shiftStartedAt: string;
  shiftEndedAt: string;
  summary?: string | null;
}

export interface SubmitShiftHandoverParams {
  tenantId: string;
  handoverId: string;
}

export interface AcknowledgeShiftHandoverParams {
  tenantId: string;
  handoverId: string;
}

export interface AddShiftHandoverItemParams {
  tenantId: string;
  handoverId: string;
  body: string;
  priority?: string | null;
  workOrderId?: string | null;
}

const rpc = (supabase: SupabaseClient<Database>) =>
  (supabase as unknown as { rpc: (n: string, p?: object) => Promise<{ data: unknown; error: unknown }> }).rpc.bind(supabase);

/**
 * Field operations: tool catalog (CRUD via RPC + list view), checkouts/returns, shift handover logbook.
 */
export function createFieldOperationsResource(supabase: SupabaseClient<Database>) {
  return {
    /** Requires `tool.manage`. Returns new tool UUID. */
    async createTool(params: CreateToolParams): Promise<string> {
      return callRpc(rpc(supabase), 'rpc_create_tool', {
        p_tenant_id: params.tenantId,
        p_name: params.name,
        p_asset_tag: params.assetTag ?? null,
        p_serial_number: params.serialNumber ?? null,
        p_status: params.status ?? null,
      });
    },

    /** Requires `tool.manage`. Cannot set non-`available` status while the tool has an open checkout. */
    async updateTool(params: UpdateToolParams): Promise<void> {
      await callRpc(rpc(supabase), 'rpc_update_tool', {
        p_tenant_id: params.tenantId,
        p_tool_id: params.toolId,
        p_name: params.name ?? null,
        p_asset_tag: params.assetTag ?? null,
        p_serial_number: params.serialNumber ?? null,
        p_status: params.status ?? null,
      });
    },

    async listTools(): Promise<ToolRow[]> {
      const { data, error } = await supabase.from('v_tools').select('*').order('name');
      if (error) throw normalizeError(error);
      return (data ?? []) as ToolRow[];
    },

    async listToolCheckouts(): Promise<ToolCheckoutRow[]> {
      const { data, error } = await supabase.from('v_tool_checkouts').select('*').order('checked_out_at', {
        ascending: false,
      });
      if (error) throw normalizeError(error);
      return (data ?? []) as ToolCheckoutRow[];
    },

    async listShiftHandovers(): Promise<ShiftHandoverRow[]> {
      const { data, error } = await supabase.from('v_shift_handovers').select('*').order('created_at', {
        ascending: false,
      });
      if (error) throw normalizeError(error);
      return (data ?? []) as ShiftHandoverRow[];
    },

    async checkoutTool(params: CheckoutToolParams): Promise<string> {
      return callRpc(rpc(supabase), 'rpc_checkout_tool', {
        p_tenant_id: params.tenantId,
        p_tool_id: params.toolId,
        p_checked_out_to_user_id: params.checkedOutToUserId,
        p_work_order_id: params.workOrderId ?? null,
        p_due_at: params.dueAt ?? null,
        p_notes: params.notes ?? null,
      });
    },

    async returnTool(params: ReturnToolParams): Promise<void> {
      await callRpc(rpc(supabase), 'rpc_return_tool', {
        p_tenant_id: params.tenantId,
        p_checkout_id: params.checkoutId,
      });
    },

    async createShiftHandover(params: CreateShiftHandoverParams): Promise<string> {
      return callRpc(rpc(supabase), 'rpc_create_shift_handover', {
        p_tenant_id: params.tenantId,
        p_location_id: params.locationId,
        p_to_user_id: params.toUserId,
        p_shift_started_at: params.shiftStartedAt,
        p_shift_ended_at: params.shiftEndedAt,
        p_summary: params.summary ?? null,
      });
    },

    async submitShiftHandover(params: SubmitShiftHandoverParams): Promise<void> {
      await callRpc(rpc(supabase), 'rpc_submit_shift_handover', {
        p_tenant_id: params.tenantId,
        p_handover_id: params.handoverId,
      });
    },

    async acknowledgeShiftHandover(params: AcknowledgeShiftHandoverParams): Promise<void> {
      await callRpc(rpc(supabase), 'rpc_acknowledge_shift_handover', {
        p_tenant_id: params.tenantId,
        p_handover_id: params.handoverId,
      });
    },

    async addShiftHandoverItem(params: AddShiftHandoverItemParams): Promise<string> {
      return callRpc(rpc(supabase), 'rpc_add_shift_handover_item', {
        p_tenant_id: params.tenantId,
        p_handover_id: params.handoverId,
        p_body: params.body,
        p_priority: params.priority ?? null,
        p_work_order_id: params.workOrderId ?? null,
      });
    },
  };
}

export type FieldOperationsResource = ReturnType<typeof createFieldOperationsResource>;
