import { normalizeError } from '../errors.js';
import { callRpc } from '../unwrap.js';
const rpc = (supabase) => supabase.rpc.bind(supabase);
/**
 * Scheduling resource: schedule blocks and views by technician, crew, asset, location;
 * RPCs to schedule, update, validate, and unschedule work orders.
 * Set tenant context (client.setTenant) before use.
 */
export function createSchedulingResource(supabase) {
    return {
        /** List schedule blocks for the current tenant (v_schedule_blocks). Optionally filter by date range client-side. */
        async listScheduleBlocks() {
            const { data, error } = await supabase.from('v_schedule_blocks').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** List schedule by technician (v_schedule_by_technician). Pass technicianId to filter, or omit for all. */
        async listScheduleByTechnician(technicianId) {
            let q = supabase.from('v_schedule_by_technician').select('*');
            if (technicianId != null)
                q = q.eq('technician_id', technicianId);
            const { data, error } = await q;
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** List schedule by crew (v_schedule_by_crew). Pass crewId to filter, or omit for all. */
        async listScheduleByCrew(crewId) {
            let q = supabase.from('v_schedule_by_crew').select('*');
            if (crewId != null)
                q = q.eq('crew_id', crewId);
            const { data, error } = await q;
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** List schedule by asset (v_schedule_by_asset). Pass assetId to filter, or omit for all. */
        async listScheduleByAsset(assetId) {
            let q = supabase.from('v_schedule_by_asset').select('*');
            if (assetId != null)
                q = q.eq('effective_asset_id', assetId);
            const { data, error } = await q;
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** List schedule by location (v_schedule_by_location). Pass locationId to filter, or omit for all. */
        async listScheduleByLocation(locationId) {
            let q = supabase.from('v_schedule_by_location').select('*');
            if (locationId != null)
                q = q.eq('effective_location_id', locationId);
            const { data, error } = await q;
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** Schedule a work order (create or replace block). Returns the new schedule block id. */
        async scheduleWorkOrder(params) {
            const raw = await callRpc(rpc(supabase), 'rpc_schedule_work_order', {
                p_work_order_id: params.workOrderId,
                p_technician_id: params.technicianId ?? null,
                p_crew_id: params.crewId ?? null,
                p_start_at: params.startAt,
                p_end_at: params.endAt,
                p_location_id: params.locationId ?? null,
                p_asset_id: params.assetId ?? null,
            });
            if (typeof raw !== 'string')
                throw new Error('Expected block id from rpc_schedule_work_order');
            return raw;
        },
        /** Update a schedule block (time, technician/crew, location/asset). Returns the schedule block id. */
        async updateScheduleBlock(params) {
            const raw = await callRpc(rpc(supabase), 'rpc_update_schedule_block', {
                p_schedule_block_id: params.scheduleBlockId,
                p_technician_id: params.technicianId ?? null,
                p_crew_id: params.crewId ?? null,
                p_start_at: params.startAt ?? null,
                p_end_at: params.endAt ?? null,
                p_location_id: params.locationId ?? null,
                p_asset_id: params.assetId ?? null,
            });
            if (typeof raw !== 'string')
                throw new Error('Expected block id from rpc_update_schedule_block');
            return raw;
        },
        /** Validate a candidate schedule slot. Returns list of issues (conflicts, SLA, priority). */
        async validateSchedule(params) {
            const raw = await callRpc(rpc(supabase), 'rpc_validate_schedule', {
                p_technician_id: params.technicianId ?? null,
                p_crew_id: params.crewId ?? null,
                p_start_at: params.startAt ?? null,
                p_end_at: params.endAt ?? null,
                p_work_order_id: params.workOrderId ?? null,
                p_exclude_block_id: params.excludeBlockId ?? null,
            });
            return Array.isArray(raw) ? raw : [];
        },
        /** Unschedule a work order (remove its schedule block). Pass scheduleBlockId or workOrderId. */
        async unscheduleWorkOrder(params) {
            await callRpc(rpc(supabase), 'rpc_unschedule_work_order', {
                p_schedule_block_id: params.scheduleBlockId ?? null,
                p_work_order_id: params.workOrderId ?? null,
            });
        },
    };
}
