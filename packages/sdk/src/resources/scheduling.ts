import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.js';
import { normalizeError } from '../errors.js';
import { callRpc } from '../unwrap.js';

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

const rpc = (supabase: SupabaseClient<Database>) =>
  (supabase as unknown as { rpc: (n: string, p?: object) => Promise<{ data: unknown; error: unknown }> }).rpc.bind(
    supabase
  );

/**
 * Scheduling resource: schedule blocks and views by technician, crew, asset, location;
 * RPCs to schedule, update, validate, and unschedule work orders.
 * Set tenant context (client.setTenant) before use.
 */
export function createSchedulingResource(supabase: SupabaseClient<Database>) {
  return {
    /** List schedule blocks for the current tenant (v_schedule_blocks). Optionally filter by date range client-side. */
    async listScheduleBlocks(): Promise<ScheduleBlockRow[]> {
      const { data, error } = await supabase.from('v_schedule_blocks').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as ScheduleBlockRow[];
    },

    /** List schedule by technician (v_schedule_by_technician). Pass technicianId to filter, or omit for all. */
    async listScheduleByTechnician(technicianId?: string): Promise<ScheduleBlockRow[]> {
      let q = supabase.from('v_schedule_by_technician').select('*');
      if (technicianId != null) q = q.eq('technician_id', technicianId);
      const { data, error } = await q;
      if (error) throw normalizeError(error);
      return (data ?? []) as ScheduleBlockRow[];
    },

    /** List schedule by crew (v_schedule_by_crew). Pass crewId to filter, or omit for all. */
    async listScheduleByCrew(crewId?: string): Promise<ScheduleBlockRow[]> {
      let q = supabase.from('v_schedule_by_crew').select('*');
      if (crewId != null) q = q.eq('crew_id', crewId);
      const { data, error } = await q;
      if (error) throw normalizeError(error);
      return (data ?? []) as ScheduleBlockRow[];
    },

    /** List schedule by asset (v_schedule_by_asset). Pass assetId to filter, or omit for all. */
    async listScheduleByAsset(assetId?: string): Promise<ScheduleBlockRow[]> {
      let q = supabase.from('v_schedule_by_asset').select('*');
      if (assetId != null) q = q.eq('effective_asset_id', assetId);
      const { data, error } = await q;
      if (error) throw normalizeError(error);
      return (data ?? []) as ScheduleBlockRow[];
    },

    /** List schedule by location (v_schedule_by_location). Pass locationId to filter, or omit for all. */
    async listScheduleByLocation(locationId?: string): Promise<ScheduleBlockRow[]> {
      let q = supabase.from('v_schedule_by_location').select('*');
      if (locationId != null) q = q.eq('effective_location_id', locationId);
      const { data, error } = await q;
      if (error) throw normalizeError(error);
      return (data ?? []) as ScheduleBlockRow[];
    },

    /** Schedule a work order (create or replace block). Returns the new schedule block id. */
    async scheduleWorkOrder(params: ScheduleWorkOrderParams): Promise<string> {
      const raw = await callRpc(rpc(supabase), 'rpc_schedule_work_order', {
        p_work_order_id: params.workOrderId,
        p_technician_id: params.technicianId ?? null,
        p_crew_id: params.crewId ?? null,
        p_start_at: params.startAt,
        p_end_at: params.endAt,
        p_location_id: params.locationId ?? null,
        p_asset_id: params.assetId ?? null,
      });
      if (typeof raw !== 'string') throw new Error('Expected block id from rpc_schedule_work_order');
      return raw;
    },

    /** Update a schedule block (time, technician/crew, location/asset). Returns the schedule block id. */
    async updateScheduleBlock(params: UpdateScheduleBlockParams): Promise<string> {
      const raw = await callRpc(rpc(supabase), 'rpc_update_schedule_block', {
        p_schedule_block_id: params.scheduleBlockId,
        p_technician_id: params.technicianId ?? null,
        p_crew_id: params.crewId ?? null,
        p_start_at: params.startAt ?? null,
        p_end_at: params.endAt ?? null,
        p_location_id: params.locationId ?? null,
        p_asset_id: params.assetId ?? null,
      });
      if (typeof raw !== 'string') throw new Error('Expected block id from rpc_update_schedule_block');
      return raw;
    },

    /** Validate a candidate schedule slot. Returns list of issues (conflicts, SLA, priority). */
    async validateSchedule(params: ValidateScheduleParams): Promise<ValidateScheduleIssueRow[]> {
      const raw = await callRpc(rpc(supabase), 'rpc_validate_schedule', {
        p_technician_id: params.technicianId ?? null,
        p_crew_id: params.crewId ?? null,
        p_start_at: params.startAt ?? null,
        p_end_at: params.endAt ?? null,
        p_work_order_id: params.workOrderId ?? null,
        p_exclude_block_id: params.excludeBlockId ?? null,
      });
      return Array.isArray(raw) ? (raw as ValidateScheduleIssueRow[]) : [];
    },

    /** Unschedule a work order (remove its schedule block). Pass scheduleBlockId or workOrderId. */
    async unscheduleWorkOrder(params: { scheduleBlockId?: string; workOrderId?: string }): Promise<void> {
      await callRpc(rpc(supabase), 'rpc_unschedule_work_order', {
        p_schedule_block_id: params.scheduleBlockId ?? null,
        p_work_order_id: params.workOrderId ?? null,
      });
    },
  };
}

export type SchedulingResource = ReturnType<typeof createSchedulingResource>;
