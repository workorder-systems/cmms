import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.js';
import { normalizeError } from '../errors.js';
import { callRpc } from '../unwrap.js';

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

const rpc = (supabase: SupabaseClient<Database>) =>
  (supabase as unknown as { rpc: (n: string, p?: object) => Promise<{ data: unknown; error: unknown }> }).rpc.bind(
    supabase
  );

/**
 * Labor resource: technicians, crews, skills, certifications, availability,
 * shifts, assignments, labor actuals, capacity, and scheduling RPCs.
 * Set tenant context (client.setTenant) before tenant-scoped operations.
 */
export function createLaborResource(supabase: SupabaseClient<Database>) {
  return {
    /** List technicians for the current tenant (v_technicians). */
    async listTechnicians(): Promise<TechnicianRow[]> {
      const { data, error } = await supabase.from('v_technicians').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as TechnicianRow[];
    },

    /** Get a single technician by id. */
    async getTechnicianById(id: string): Promise<TechnicianRow | null> {
      const { data, error } = await supabase.from('v_technicians').select('*').eq('id', id).maybeSingle();
      if (error) throw normalizeError(error);
      return data as TechnicianRow | null;
    },

    /** List crews for the current tenant (v_crews). */
    async listCrews(): Promise<CrewRow[]> {
      const { data, error } = await supabase.from('v_crews').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as CrewRow[];
    },

    /** Get a single crew by id. */
    async getCrewById(id: string): Promise<CrewRow | null> {
      const { data, error } = await supabase.from('v_crews').select('*').eq('id', id).maybeSingle();
      if (error) throw normalizeError(error);
      return data as CrewRow | null;
    },

    /** List crew members for the current tenant (v_crew_members). */
    async listCrewMembers(): Promise<CrewMemberRow[]> {
      const { data, error } = await supabase.from('v_crew_members').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as CrewMemberRow[];
    },

    /** List crew members for a specific crew. */
    async listCrewMembersByCrewId(crewId: string): Promise<CrewMemberRow[]> {
      const { data, error } = await supabase.from('v_crew_members').select('*').eq('crew_id', crewId);
      if (error) throw normalizeError(error);
      return (data ?? []) as CrewMemberRow[];
    },

    /** List skill catalog entries for the current tenant (v_skill_catalogs). */
    async listSkillCatalogs(): Promise<SkillCatalogRow[]> {
      const { data, error } = await supabase.from('v_skill_catalogs').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as SkillCatalogRow[];
    },

    /** List certification catalog entries for the current tenant (v_certification_catalogs). */
    async listCertificationCatalogs(): Promise<CertificationCatalogRow[]> {
      const { data, error } = await supabase.from('v_certification_catalogs').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as CertificationCatalogRow[];
    },

    /** List technician skills for the current tenant (v_technician_skills). */
    async listTechnicianSkills(): Promise<TechnicianSkillRow[]> {
      const { data, error } = await supabase.from('v_technician_skills').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as TechnicianSkillRow[];
    },

    /** List technician certifications for the current tenant (v_technician_certifications). */
    async listTechnicianCertifications(): Promise<TechnicianCertificationRow[]> {
      const { data, error } = await supabase.from('v_technician_certifications').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as TechnicianCertificationRow[];
    },

    /** List availability patterns for the current tenant (v_availability_patterns). */
    async listAvailabilityPatterns(): Promise<AvailabilityPatternRow[]> {
      const { data, error } = await supabase.from('v_availability_patterns').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as AvailabilityPatternRow[];
    },

    /** List availability overrides for the current tenant (v_availability_overrides). */
    async listAvailabilityOverrides(): Promise<AvailabilityOverrideRow[]> {
      const { data, error } = await supabase.from('v_availability_overrides').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as AvailabilityOverrideRow[];
    },

    /** List shifts for the current tenant (v_shifts). */
    async listShifts(): Promise<ShiftRow[]> {
      const { data, error } = await supabase.from('v_shifts').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as ShiftRow[];
    },

    /** List shifts for a technician. */
    async listShiftsByTechnicianId(technicianId: string): Promise<ShiftRow[]> {
      const { data, error } = await supabase.from('v_shifts').select('*').eq('technician_id', technicianId);
      if (error) throw normalizeError(error);
      return (data ?? []) as ShiftRow[];
    },

    /** List shift templates for the current tenant (v_shift_templates). */
    async listShiftTemplates(): Promise<ShiftTemplateRow[]> {
      const { data, error } = await supabase.from('v_shift_templates').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as ShiftTemplateRow[];
    },

    /** List work order assignments for the current tenant (v_work_order_assignments). */
    async listWorkOrderAssignments(): Promise<WorkOrderAssignmentRow[]> {
      const { data, error } = await supabase.from('v_work_order_assignments').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as WorkOrderAssignmentRow[];
    },

    /** List work order assignments for a work order. */
    async listWorkOrderAssignmentsByWorkOrderId(workOrderId: string): Promise<WorkOrderAssignmentRow[]> {
      const { data, error } = await supabase
        .from('v_work_order_assignments')
        .select('*')
        .eq('work_order_id', workOrderId);
      if (error) throw normalizeError(error);
      return (data ?? []) as WorkOrderAssignmentRow[];
    },

    /** List labor actuals per work order for the current tenant (v_work_order_labor_actuals). */
    async listWorkOrderLaborActuals(): Promise<WorkOrderLaborActualsRow[]> {
      const { data, error } = await supabase.from('v_work_order_labor_actuals').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as WorkOrderLaborActualsRow[];
    },

    /** List labor actuals for a single work order. */
    async listWorkOrderLaborActualsByWorkOrderId(workOrderId: string): Promise<WorkOrderLaborActualsRow[]> {
      const { data, error } = await supabase
        .from('v_work_order_labor_actuals')
        .select('*')
        .eq('work_order_id', workOrderId);
      if (error) throw normalizeError(error);
      return (data ?? []) as WorkOrderLaborActualsRow[];
    },

    /** List technician capacity (scheduled minutes per technician per day) for the current tenant (v_technician_capacity). */
    async listTechnicianCapacity(): Promise<TechnicianCapacityRow[]> {
      const { data, error } = await supabase.from('v_technician_capacity').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as TechnicianCapacityRow[];
    },

    /** Check for overlapping shifts for a technician. Returns conflicting shifts. Use excludeShiftId when updating a shift. */
    async checkShiftConflicts(params: CheckShiftConflictsParams): Promise<ShiftConflictRow[]> {
      const raw = await callRpc(rpc(supabase), 'rpc_check_shift_conflicts', {
        p_technician_id: params.technicianId,
        p_start_at: params.startAt,
        p_end_at: params.endAt,
        p_exclude_shift_id: params.excludeShiftId ?? null,
      });
      return Array.isArray(raw) ? (raw as ShiftConflictRow[]) : [];
    },

    /** Generate shifts from shift templates for a date range. Returns the created shifts. */
    async generateShiftsFromTemplates(params: GenerateShiftsFromTemplatesParams): Promise<GeneratedShiftRow[]> {
      const raw = await callRpc(rpc(supabase), 'rpc_generate_shifts_from_templates', {
        p_tenant_id: params.tenantId,
        p_start_date: params.startDate,
        p_end_date: params.endDate,
      });
      return Array.isArray(raw) ? (raw as GeneratedShiftRow[]) : [];
    },
  };
}

export type LaborResource = ReturnType<typeof createLaborResource>;
