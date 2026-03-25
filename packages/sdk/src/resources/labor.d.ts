import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.js';
/** Row from v_technicians view. */
export interface TechnicianRow {
    id: string;
    tenant_id: string;
    user_id: string;
    employee_number: string | null;
    default_crew_id: string | null;
    department_id: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}
/** Row from v_crews view. */
export interface CrewRow {
    id: string;
    tenant_id: string;
    name: string;
    description: string | null;
    lead_technician_id: string | null;
    created_at: string;
    updated_at: string;
}
/** Row from v_crew_members view. */
export interface CrewMemberRow {
    id: number;
    tenant_id: string;
    crew_id: string;
    technician_id: string;
    role: string | null;
    joined_at: string;
    left_at: string | null;
    created_at: string;
    updated_at: string;
}
/** Row from v_skill_catalogs view. */
export interface SkillCatalogRow {
    id: string;
    tenant_id: string;
    name: string;
    code: string | null;
    category: string | null;
    display_order: number;
    created_at: string;
    updated_at: string;
}
/** Row from v_certification_catalogs view. */
export interface CertificationCatalogRow {
    id: string;
    tenant_id: string;
    name: string;
    code: string | null;
    expiry_required: boolean;
    validity_days: number | null;
    display_order: number;
    created_at: string;
    updated_at: string;
}
/** Row from v_technician_skills view. */
export interface TechnicianSkillRow {
    id: number;
    tenant_id: string;
    technician_id: string;
    skill_id: string;
    proficiency: string | null;
    created_at: string;
}
/** Row from v_technician_certifications view. */
export interface TechnicianCertificationRow {
    id: number;
    tenant_id: string;
    technician_id: string;
    certification_id: string;
    issued_at: string;
    expires_at: string | null;
    issued_by: string | null;
    created_at: string;
    updated_at: string;
}
/** Row from v_availability_patterns view. */
export interface AvailabilityPatternRow {
    id: number;
    tenant_id: string;
    technician_id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    timezone: string | null;
    created_at: string;
    updated_at: string;
}
/** Row from v_availability_overrides view. */
export interface AvailabilityOverrideRow {
    id: number;
    tenant_id: string;
    technician_id: string;
    override_date: string;
    is_available: boolean;
    start_time: string | null;
    end_time: string | null;
    reason: string | null;
    created_at: string;
    updated_at: string;
}
/** Row from v_shifts view. */
export interface ShiftRow {
    id: string;
    tenant_id: string;
    technician_id: string | null;
    crew_id: string | null;
    start_at: string;
    end_at: string;
    shift_type: string;
    label: string | null;
    created_at: string;
    updated_at: string;
}
/** Row from v_shift_templates view. */
export interface ShiftTemplateRow {
    id: string;
    tenant_id: string;
    crew_id: string | null;
    technician_id: string | null;
    day_of_week: number;
    start_time: string;
    end_time: string;
    shift_type: string;
    label: string | null;
    created_at: string;
    updated_at: string;
}
/** Row from v_work_order_assignments view. */
export interface WorkOrderAssignmentRow {
    id: number;
    tenant_id: string;
    work_order_id: string;
    technician_id: string;
    assigned_at: string;
    created_at: string;
}
/** Row from v_work_order_labor_actuals view. */
export interface WorkOrderLaborActualsRow {
    tenant_id: string;
    work_order_id: string;
    technician_id: string | null;
    user_id: string | null;
    entry_count: number;
    total_minutes: number | null;
    total_labor_cost_cents: number | null;
    first_entry_date: string | null;
    last_entry_date: string | null;
}
/** Row from v_technician_capacity view. */
export interface TechnicianCapacityRow {
    tenant_id: string;
    technician_id: string;
    shift_date: string;
    shift_count: number;
    scheduled_minutes: number | null;
}
/** Overlapping shift returned by checkShiftConflicts. */
export interface ShiftConflictRow {
    id: string;
    start_at: string;
    end_at: string;
    shift_type: string;
    label: string | null;
}
/** Params for rpc_check_shift_conflicts. */
export interface CheckShiftConflictsParams {
    technicianId: string;
    startAt: string;
    endAt: string;
    excludeShiftId?: string | null;
}
/** Params for rpc_generate_shifts_from_templates. */
export interface GenerateShiftsFromTemplatesParams {
    tenantId: string;
    startDate: string;
    endDate: string;
}
/** Generated shift row returned by generateShiftsFromTemplates. */
export interface GeneratedShiftRow {
    id: string;
    technician_id: string | null;
    crew_id: string | null;
    start_at: string;
    end_at: string;
    shift_type: string;
    label: string | null;
}
/** Params for rpc_create_crew. */
export interface CreateCrewParams {
    tenantId: string;
    name: string;
    description?: string | null;
}
/** Params for rpc_update_crew. */
export interface UpdateCrewParams {
    tenantId: string;
    crewId: string;
    name?: string | null;
    description?: string | null;
    leadTechnicianId?: string | null;
    clearLeadTechnician?: boolean;
}
/** Params for rpc_create_technician. */
export interface CreateTechnicianParams {
    tenantId: string;
    userId: string;
    employeeNumber?: string | null;
    defaultCrewId?: string | null;
    departmentId?: string | null;
}
/** Params for rpc_update_technician. */
export interface UpdateTechnicianParams {
    tenantId: string;
    technicianId: string;
    employeeNumber?: string | null;
    defaultCrewId?: string | null;
    departmentId?: string | null;
    isActive?: boolean | null;
    clearDefaultCrew?: boolean;
    clearDepartment?: boolean;
}
/** Params for rpc_add_crew_member. */
export interface AddCrewMemberParams {
    tenantId: string;
    crewId: string;
    technicianId: string;
    role?: string | null;
}
/**
 * Labor resource: technicians, crews, skills, certifications, availability,
 * shifts, assignments, labor actuals, capacity, and scheduling RPCs.
 * Set tenant context (client.setTenant) before tenant-scoped operations.
 */
export declare function createLaborResource(supabase: SupabaseClient<Database>): {
    /** List technicians for the current tenant (v_technicians). */
    listTechnicians(): Promise<TechnicianRow[]>;
    /** Get a single technician by id. */
    getTechnicianById(id: string): Promise<TechnicianRow | null>;
    /** List crews for the current tenant (v_crews). */
    listCrews(): Promise<CrewRow[]>;
    /** Get a single crew by id. */
    getCrewById(id: string): Promise<CrewRow | null>;
    /** List crew members for the current tenant (v_crew_members). */
    listCrewMembers(): Promise<CrewMemberRow[]>;
    /** List crew members for a specific crew. */
    listCrewMembersByCrewId(crewId: string): Promise<CrewMemberRow[]>;
    /** List skill catalog entries for the current tenant (v_skill_catalogs). */
    listSkillCatalogs(): Promise<SkillCatalogRow[]>;
    /** List certification catalog entries for the current tenant (v_certification_catalogs). */
    listCertificationCatalogs(): Promise<CertificationCatalogRow[]>;
    /** List technician skills for the current tenant (v_technician_skills). */
    listTechnicianSkills(): Promise<TechnicianSkillRow[]>;
    /** List technician certifications for the current tenant (v_technician_certifications). */
    listTechnicianCertifications(): Promise<TechnicianCertificationRow[]>;
    /** List availability patterns for the current tenant (v_availability_patterns). */
    listAvailabilityPatterns(): Promise<AvailabilityPatternRow[]>;
    /** List availability overrides for the current tenant (v_availability_overrides). */
    listAvailabilityOverrides(): Promise<AvailabilityOverrideRow[]>;
    /** List shifts for the current tenant (v_shifts). */
    listShifts(): Promise<ShiftRow[]>;
    /** List shifts for a technician. */
    listShiftsByTechnicianId(technicianId: string): Promise<ShiftRow[]>;
    /** List shift templates for the current tenant (v_shift_templates). */
    listShiftTemplates(): Promise<ShiftTemplateRow[]>;
    /** List work order assignments for the current tenant (v_work_order_assignments). */
    listWorkOrderAssignments(): Promise<WorkOrderAssignmentRow[]>;
    /** List work order assignments for a work order. */
    listWorkOrderAssignmentsByWorkOrderId(workOrderId: string): Promise<WorkOrderAssignmentRow[]>;
    /** List labor actuals per work order for the current tenant (v_work_order_labor_actuals). */
    listWorkOrderLaborActuals(): Promise<WorkOrderLaborActualsRow[]>;
    /** List labor actuals for a single work order. */
    listWorkOrderLaborActualsByWorkOrderId(workOrderId: string): Promise<WorkOrderLaborActualsRow[]>;
    /** List technician capacity (scheduled minutes per technician per day) for the current tenant (v_technician_capacity). */
    listTechnicianCapacity(): Promise<TechnicianCapacityRow[]>;
    /** Create a crew. Requires labor.crew.manage. Returns crew id. */
    createCrew(params: CreateCrewParams): Promise<string>;
    /** Update a crew. Requires labor.crew.manage. */
    updateCrew(params: UpdateCrewParams): Promise<void>;
    /** Delete a crew. Requires labor.crew.manage. */
    deleteCrew(tenantId: string, crewId: string): Promise<void>;
    /**
     * Create a technician for a tenant member. Requires labor.technician.manage.
     * Returns technician id.
     */
    createTechnician(params: CreateTechnicianParams): Promise<string>;
    /** Update a technician. Requires labor.technician.manage. */
    updateTechnician(params: UpdateTechnicianParams): Promise<void>;
    /** Add or reactivate a crew member. Requires labor.crew.manage. Returns crew_members row id. */
    addCrewMember(params: AddCrewMemberParams): Promise<number>;
    /** End active crew membership (sets left_at). Requires labor.crew.manage. */
    removeCrewMember(tenantId: string, crewId: string, technicianId: string): Promise<void>;
    /** Check for overlapping shifts for a technician. Returns conflicting shifts. Use excludeShiftId when updating a shift. */
    checkShiftConflicts(params: CheckShiftConflictsParams): Promise<ShiftConflictRow[]>;
    /** Generate shifts from shift templates for a date range. Returns the created shifts. */
    generateShiftsFromTemplates(params: GenerateShiftsFromTemplatesParams): Promise<GeneratedShiftRow[]>;
};
export type LaborResource = ReturnType<typeof createLaborResource>;
//# sourceMappingURL=labor.d.ts.map