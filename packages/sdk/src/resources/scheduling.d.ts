import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.js';
/** Row from v_schedule_blocks (and v_schedule_by_* views; same shape). */
export interface ScheduleBlockRow {
    id: string;
    tenant_id: string;
    work_order_id: string;
    start_at: string;
    end_at: string;
    technician_id: string | null;
    crew_id: string | null;
    location_id: string | null;
    asset_id: string | null;
    work_order_title: string;
    work_order_status: string;
    work_order_priority: string;
    work_order_due_date: string | null;
    effective_location_id: string | null;
    effective_asset_id: string | null;
    created_at: string;
    updated_at: string;
}
/** Params for scheduleWorkOrder (rpc_schedule_work_order). */
export interface ScheduleWorkOrderParams {
    workOrderId: string;
    technicianId?: string | null;
    crewId?: string | null;
    startAt: string;
    endAt: string;
    locationId?: string | null;
    assetId?: string | null;
}
/** Params for updateScheduleBlock (rpc_update_schedule_block). */
export interface UpdateScheduleBlockParams {
    scheduleBlockId: string;
    technicianId?: string | null;
    crewId?: string | null;
    startAt?: string | null;
    endAt?: string | null;
    locationId?: string | null;
    assetId?: string | null;
}
/** Params for validateSchedule (rpc_validate_schedule). */
export interface ValidateScheduleParams {
    technicianId?: string | null;
    crewId?: string | null;
    startAt?: string | null;
    endAt?: string | null;
    workOrderId?: string | null;
    excludeBlockId?: string | null;
}
/** Single validation issue returned by validateSchedule. */
export interface ValidateScheduleIssueRow {
    check_type: string;
    severity: string;
    message: string;
}
/**
 * Scheduling resource: schedule blocks and views by technician, crew, asset, location;
 * RPCs to schedule, update, validate, and unschedule work orders.
 * Set tenant context (client.setTenant) before use.
 */
export declare function createSchedulingResource(supabase: SupabaseClient<Database>): {
    /** List schedule blocks for the current tenant (v_schedule_blocks). Optionally filter by date range client-side. */
    listScheduleBlocks(): Promise<ScheduleBlockRow[]>;
    /** List schedule by technician (v_schedule_by_technician). Pass technicianId to filter, or omit for all. */
    listScheduleByTechnician(technicianId?: string): Promise<ScheduleBlockRow[]>;
    /** List schedule by crew (v_schedule_by_crew). Pass crewId to filter, or omit for all. */
    listScheduleByCrew(crewId?: string): Promise<ScheduleBlockRow[]>;
    /** List schedule by asset (v_schedule_by_asset). Pass assetId to filter, or omit for all. */
    listScheduleByAsset(assetId?: string): Promise<ScheduleBlockRow[]>;
    /** List schedule by location (v_schedule_by_location). Pass locationId to filter, or omit for all. */
    listScheduleByLocation(locationId?: string): Promise<ScheduleBlockRow[]>;
    /** Schedule a work order (create or replace block). Returns the new schedule block id. */
    scheduleWorkOrder(params: ScheduleWorkOrderParams): Promise<string>;
    /** Update a schedule block (time, technician/crew, location/asset). Returns the schedule block id. */
    updateScheduleBlock(params: UpdateScheduleBlockParams): Promise<string>;
    /** Validate a candidate schedule slot. Returns list of issues (conflicts, SLA, priority). */
    validateSchedule(params: ValidateScheduleParams): Promise<ValidateScheduleIssueRow[]>;
    /** Unschedule a work order (remove its schedule block). Pass scheduleBlockId or workOrderId. */
    unscheduleWorkOrder(params: {
        scheduleBlockId?: string;
        workOrderId?: string;
    }): Promise<void>;
};
export type SchedulingResource = ReturnType<typeof createSchedulingResource>;
//# sourceMappingURL=scheduling.d.ts.map