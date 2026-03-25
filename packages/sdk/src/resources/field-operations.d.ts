import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.js';
export type ToolRow = Database['public']['Views']['v_tools'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
export type ToolCheckoutRow = Database['public']['Views']['v_tool_checkouts'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
export type ShiftHandoverRow = Database['public']['Views']['v_shift_handovers'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
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
/**
 * Field operations: tool catalog (CRUD via RPC + list view), checkouts/returns, shift handover logbook.
 */
export declare function createFieldOperationsResource(supabase: SupabaseClient<Database>): {
    /** Requires `tool.manage`. Returns new tool UUID. */
    createTool(params: CreateToolParams): Promise<string>;
    /** Requires `tool.manage`. Cannot set non-`available` status while the tool has an open checkout. */
    updateTool(params: UpdateToolParams): Promise<void>;
    listTools(): Promise<ToolRow[]>;
    listToolCheckouts(): Promise<ToolCheckoutRow[]>;
    listShiftHandovers(): Promise<ShiftHandoverRow[]>;
    checkoutTool(params: CheckoutToolParams): Promise<string>;
    returnTool(params: ReturnToolParams): Promise<void>;
    createShiftHandover(params: CreateShiftHandoverParams): Promise<string>;
    submitShiftHandover(params: SubmitShiftHandoverParams): Promise<void>;
    acknowledgeShiftHandover(params: AcknowledgeShiftHandoverParams): Promise<void>;
    addShiftHandoverItem(params: AddShiftHandoverItemParams): Promise<string>;
};
export type FieldOperationsResource = ReturnType<typeof createFieldOperationsResource>;
//# sourceMappingURL=field-operations.d.ts.map