import { normalizeError } from '../errors.js';
import { callRpc } from '../unwrap.js';
const rpc = (supabase) => supabase.rpc.bind(supabase);
/**
 * Labor resource: technicians, crews, skills, certifications, availability,
 * shifts, assignments, labor actuals, capacity, and scheduling RPCs.
 * Set tenant context (client.setTenant) before tenant-scoped operations.
 */
export function createLaborResource(supabase) {
    return {
        /** List technicians for the current tenant (v_technicians). */
        async listTechnicians() {
            const { data, error } = await supabase.from('v_technicians').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** Get a single technician by id. */
        async getTechnicianById(id) {
            const { data, error } = await supabase.from('v_technicians').select('*').eq('id', id).maybeSingle();
            if (error)
                throw normalizeError(error);
            return data;
        },
        /** List crews for the current tenant (v_crews). */
        async listCrews() {
            const { data, error } = await supabase.from('v_crews').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** Get a single crew by id. */
        async getCrewById(id) {
            const { data, error } = await supabase.from('v_crews').select('*').eq('id', id).maybeSingle();
            if (error)
                throw normalizeError(error);
            return data;
        },
        /** List crew members for the current tenant (v_crew_members). */
        async listCrewMembers() {
            const { data, error } = await supabase.from('v_crew_members').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** List crew members for a specific crew. */
        async listCrewMembersByCrewId(crewId) {
            const { data, error } = await supabase.from('v_crew_members').select('*').eq('crew_id', crewId);
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** List skill catalog entries for the current tenant (v_skill_catalogs). */
        async listSkillCatalogs() {
            const { data, error } = await supabase.from('v_skill_catalogs').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** List certification catalog entries for the current tenant (v_certification_catalogs). */
        async listCertificationCatalogs() {
            const { data, error } = await supabase.from('v_certification_catalogs').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** List technician skills for the current tenant (v_technician_skills). */
        async listTechnicianSkills() {
            const { data, error } = await supabase.from('v_technician_skills').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** List technician certifications for the current tenant (v_technician_certifications). */
        async listTechnicianCertifications() {
            const { data, error } = await supabase.from('v_technician_certifications').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** List availability patterns for the current tenant (v_availability_patterns). */
        async listAvailabilityPatterns() {
            const { data, error } = await supabase.from('v_availability_patterns').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** List availability overrides for the current tenant (v_availability_overrides). */
        async listAvailabilityOverrides() {
            const { data, error } = await supabase.from('v_availability_overrides').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** List shifts for the current tenant (v_shifts). */
        async listShifts() {
            const { data, error } = await supabase.from('v_shifts').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** List shifts for a technician. */
        async listShiftsByTechnicianId(technicianId) {
            const { data, error } = await supabase.from('v_shifts').select('*').eq('technician_id', technicianId);
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** List shift templates for the current tenant (v_shift_templates). */
        async listShiftTemplates() {
            const { data, error } = await supabase.from('v_shift_templates').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** List work order assignments for the current tenant (v_work_order_assignments). */
        async listWorkOrderAssignments() {
            const { data, error } = await supabase.from('v_work_order_assignments').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** List work order assignments for a work order. */
        async listWorkOrderAssignmentsByWorkOrderId(workOrderId) {
            const { data, error } = await supabase
                .from('v_work_order_assignments')
                .select('*')
                .eq('work_order_id', workOrderId);
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** List labor actuals per work order for the current tenant (v_work_order_labor_actuals). */
        async listWorkOrderLaborActuals() {
            const { data, error } = await supabase.from('v_work_order_labor_actuals').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** List labor actuals for a single work order. */
        async listWorkOrderLaborActualsByWorkOrderId(workOrderId) {
            const { data, error } = await supabase
                .from('v_work_order_labor_actuals')
                .select('*')
                .eq('work_order_id', workOrderId);
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** List technician capacity (scheduled minutes per technician per day) for the current tenant (v_technician_capacity). */
        async listTechnicianCapacity() {
            const { data, error } = await supabase.from('v_technician_capacity').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** Create a crew. Requires labor.crew.manage. Returns crew id. */
        async createCrew(params) {
            return callRpc(rpc(supabase), 'rpc_create_crew', {
                p_tenant_id: params.tenantId,
                p_name: params.name,
                p_description: params.description ?? null,
            });
        },
        /** Update a crew. Requires labor.crew.manage. */
        async updateCrew(params) {
            return callRpc(rpc(supabase), 'rpc_update_crew', {
                p_tenant_id: params.tenantId,
                p_crew_id: params.crewId,
                p_name: params.name ?? null,
                p_description: params.description ?? null,
                p_lead_technician_id: params.leadTechnicianId ?? null,
                p_clear_lead_technician: params.clearLeadTechnician ?? false,
            });
        },
        /** Delete a crew. Requires labor.crew.manage. */
        async deleteCrew(tenantId, crewId) {
            return callRpc(rpc(supabase), 'rpc_delete_crew', {
                p_tenant_id: tenantId,
                p_crew_id: crewId,
            });
        },
        /**
         * Create a technician for a tenant member. Requires labor.technician.manage.
         * Returns technician id.
         */
        async createTechnician(params) {
            return callRpc(rpc(supabase), 'rpc_create_technician', {
                p_tenant_id: params.tenantId,
                p_user_id: params.userId,
                p_employee_number: params.employeeNumber ?? null,
                p_default_crew_id: params.defaultCrewId ?? null,
                p_department_id: params.departmentId ?? null,
            });
        },
        /** Update a technician. Requires labor.technician.manage. */
        async updateTechnician(params) {
            return callRpc(rpc(supabase), 'rpc_update_technician', {
                p_tenant_id: params.tenantId,
                p_technician_id: params.technicianId,
                p_employee_number: params.employeeNumber ?? null,
                p_default_crew_id: params.defaultCrewId ?? null,
                p_department_id: params.departmentId ?? null,
                p_is_active: params.isActive ?? null,
                p_clear_default_crew: params.clearDefaultCrew ?? false,
                p_clear_department: params.clearDepartment ?? false,
            });
        },
        /** Add or reactivate a crew member. Requires labor.crew.manage. Returns crew_members row id. */
        async addCrewMember(params) {
            return callRpc(rpc(supabase), 'rpc_add_crew_member', {
                p_tenant_id: params.tenantId,
                p_crew_id: params.crewId,
                p_technician_id: params.technicianId,
                p_role: params.role ?? null,
            });
        },
        /** End active crew membership (sets left_at). Requires labor.crew.manage. */
        async removeCrewMember(tenantId, crewId, technicianId) {
            return callRpc(rpc(supabase), 'rpc_remove_crew_member', {
                p_tenant_id: tenantId,
                p_crew_id: crewId,
                p_technician_id: technicianId,
            });
        },
        /** Check for overlapping shifts for a technician. Returns conflicting shifts. Use excludeShiftId when updating a shift. */
        async checkShiftConflicts(params) {
            const raw = await callRpc(rpc(supabase), 'rpc_check_shift_conflicts', {
                p_technician_id: params.technicianId,
                p_start_at: params.startAt,
                p_end_at: params.endAt,
                p_exclude_shift_id: params.excludeShiftId ?? null,
            });
            return Array.isArray(raw) ? raw : [];
        },
        /** Generate shifts from shift templates for a date range. Returns the created shifts. */
        async generateShiftsFromTemplates(params) {
            const raw = await callRpc(rpc(supabase), 'rpc_generate_shifts_from_templates', {
                p_tenant_id: params.tenantId,
                p_start_date: params.startDate,
                p_end_date: params.endDate,
            });
            return Array.isArray(raw) ? raw : [];
        },
    };
}
