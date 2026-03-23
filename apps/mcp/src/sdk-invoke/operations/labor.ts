import { z } from 'zod';
import type { SdkOperationDef } from '../types.js';
import { ann } from '../annotations.js';
import { emptyArgs, uuid } from '../zod-common.js';

export const laborOperations: Record<string, SdkOperationDef> = {
  'labor.list_technicians': {
    description: 'List technicians.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.labor.listTechnicians();
    },
  },
  'labor.get_technician_by_id': {
    description: 'Get one technician by id.',
    annotations: ann.read,
    inputSchema: z.object({ id: uuid }),
    async invoke(client, args) {
      const { id } = z.object({ id: uuid }).parse(args);
      return client.labor.getTechnicianById(id);
    },
  },
  'labor.list_crews': {
    description: 'List crews.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.labor.listCrews();
    },
  },
  'labor.get_crew_by_id': {
    description: 'Get one crew by id.',
    annotations: ann.read,
    inputSchema: z.object({ id: uuid }),
    async invoke(client, args) {
      const { id } = z.object({ id: uuid }).parse(args);
      return client.labor.getCrewById(id);
    },
  },
  'labor.list_crew_members': {
    description: 'List crew members.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.labor.listCrewMembers();
    },
  },
  'labor.list_crew_members_by_crew_id': {
    description: 'List crew members for a crew.',
    annotations: ann.read,
    inputSchema: z.object({ crew_id: uuid }),
    async invoke(client, args) {
      const { crew_id } = z.object({ crew_id: uuid }).parse(args);
      return client.labor.listCrewMembersByCrewId(crew_id);
    },
  },
  'labor.list_skill_catalogs': {
    description: 'List skill catalog entries.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.labor.listSkillCatalogs();
    },
  },
  'labor.list_certification_catalogs': {
    description: 'List certification catalog entries.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.labor.listCertificationCatalogs();
    },
  },
  'labor.list_technician_skills': {
    description: 'List technician skills.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.labor.listTechnicianSkills();
    },
  },
  'labor.list_technician_certifications': {
    description: 'List technician certifications.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.labor.listTechnicianCertifications();
    },
  },
  'labor.list_availability_patterns': {
    description: 'List availability patterns.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.labor.listAvailabilityPatterns();
    },
  },
  'labor.list_availability_overrides': {
    description: 'List availability overrides.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.labor.listAvailabilityOverrides();
    },
  },
  'labor.list_shifts': {
    description: 'List shifts.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.labor.listShifts();
    },
  },
  'labor.list_shifts_by_technician_id': {
    description: 'List shifts for a technician.',
    annotations: ann.read,
    inputSchema: z.object({ technician_id: uuid }),
    async invoke(client, args) {
      const { technician_id } = z.object({ technician_id: uuid }).parse(args);
      return client.labor.listShiftsByTechnicianId(technician_id);
    },
  },
  'labor.list_shift_templates': {
    description: 'List shift templates.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.labor.listShiftTemplates();
    },
  },
  'labor.list_work_order_assignments': {
    description: 'List work order assignments.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.labor.listWorkOrderAssignments();
    },
  },
  'labor.list_work_order_assignments_by_work_order_id': {
    description: 'List assignments for a work order.',
    annotations: ann.read,
    inputSchema: z.object({ work_order_id: uuid }),
    async invoke(client, args) {
      const { work_order_id } = z.object({ work_order_id: uuid }).parse(args);
      return client.labor.listWorkOrderAssignmentsByWorkOrderId(work_order_id);
    },
  },
  'labor.list_work_order_labor_actuals': {
    description: 'List labor actuals per work order.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.labor.listWorkOrderLaborActuals();
    },
  },
  'labor.list_work_order_labor_actuals_by_work_order_id': {
    description: 'List labor actuals for one work order.',
    annotations: ann.read,
    inputSchema: z.object({ work_order_id: uuid }),
    async invoke(client, args) {
      const { work_order_id } = z.object({ work_order_id: uuid }).parse(args);
      return client.labor.listWorkOrderLaborActualsByWorkOrderId(work_order_id);
    },
  },
  'labor.list_technician_capacity': {
    description: 'List technician capacity view.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.labor.listTechnicianCapacity();
    },
  },
  'labor.create_crew': {
    description: 'Create a crew.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      name: z.string().min(1),
      description: z.string().nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          name: z.string(),
          description: z.string().nullable().optional(),
        })
        .parse(args);
      return client.labor.createCrew({
        tenantId: p.tenant_id,
        name: p.name,
        description: p.description ?? null,
      });
    },
  },
  'labor.update_crew': {
    description: 'Update a crew.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      crew_id: uuid,
      name: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
      lead_technician_id: uuid.nullable().optional(),
      clear_lead_technician: z.boolean().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          crew_id: uuid,
          name: z.string().nullable().optional(),
          description: z.string().nullable().optional(),
          lead_technician_id: uuid.nullable().optional(),
          clear_lead_technician: z.boolean().optional(),
        })
        .parse(args);
      await client.labor.updateCrew({
        tenantId: p.tenant_id,
        crewId: p.crew_id,
        name: p.name ?? null,
        description: p.description ?? null,
        leadTechnicianId: p.lead_technician_id ?? null,
        clearLeadTechnician: p.clear_lead_technician ?? false,
      });
      return { ok: true };
    },
  },
  'labor.delete_crew': {
    description: 'Delete a crew.',
    annotations: ann.destructive,
    inputSchema: z.object({
      tenant_id: uuid,
      crew_id: uuid,
    }),
    async invoke(client, args) {
      const p = z.object({ tenant_id: uuid, crew_id: uuid }).parse(args);
      await client.labor.deleteCrew(p.tenant_id, p.crew_id);
      return { ok: true };
    },
  },
  'labor.create_technician': {
    description: 'Create a technician for a tenant member.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      user_id: uuid,
      employee_number: z.string().nullable().optional(),
      default_crew_id: uuid.nullable().optional(),
      department_id: uuid.nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          user_id: uuid,
          employee_number: z.string().nullable().optional(),
          default_crew_id: uuid.nullable().optional(),
          department_id: uuid.nullable().optional(),
        })
        .parse(args);
      return client.labor.createTechnician({
        tenantId: p.tenant_id,
        userId: p.user_id,
        employeeNumber: p.employee_number ?? null,
        defaultCrewId: p.default_crew_id ?? null,
        departmentId: p.department_id ?? null,
      });
    },
  },
  'labor.update_technician': {
    description: 'Update a technician.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      technician_id: uuid,
      employee_number: z.string().nullable().optional(),
      default_crew_id: uuid.nullable().optional(),
      department_id: uuid.nullable().optional(),
      is_active: z.boolean().nullable().optional(),
      clear_default_crew: z.boolean().optional(),
      clear_department: z.boolean().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          technician_id: uuid,
          employee_number: z.string().nullable().optional(),
          default_crew_id: uuid.nullable().optional(),
          department_id: uuid.nullable().optional(),
          is_active: z.boolean().nullable().optional(),
          clear_default_crew: z.boolean().optional(),
          clear_department: z.boolean().optional(),
        })
        .parse(args);
      await client.labor.updateTechnician({
        tenantId: p.tenant_id,
        technicianId: p.technician_id,
        employeeNumber: p.employee_number ?? null,
        defaultCrewId: p.default_crew_id ?? null,
        departmentId: p.department_id ?? null,
        isActive: p.is_active ?? null,
        clearDefaultCrew: p.clear_default_crew ?? false,
        clearDepartment: p.clear_department ?? false,
      });
      return { ok: true };
    },
  },
  'labor.add_crew_member': {
    description: 'Add or reactivate a crew member.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      crew_id: uuid,
      technician_id: uuid,
      role: z.string().nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          crew_id: uuid,
          technician_id: uuid,
          role: z.string().nullable().optional(),
        })
        .parse(args);
      return client.labor.addCrewMember({
        tenantId: p.tenant_id,
        crewId: p.crew_id,
        technicianId: p.technician_id,
        role: p.role ?? null,
      });
    },
  },
  'labor.remove_crew_member': {
    description: 'Remove a crew member.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      crew_id: uuid,
      technician_id: uuid,
    }),
    async invoke(client, args) {
      const p = z.object({ tenant_id: uuid, crew_id: uuid, technician_id: uuid }).parse(args);
      await client.labor.removeCrewMember(p.tenant_id, p.crew_id, p.technician_id);
      return { ok: true };
    },
  },
  'labor.check_shift_conflicts': {
    description: 'Check for overlapping shifts.',
    annotations: ann.read,
    inputSchema: z.object({
      technician_id: uuid,
      start_at: z.string().min(1),
      end_at: z.string().min(1),
      exclude_shift_id: uuid.nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          technician_id: uuid,
          start_at: z.string(),
          end_at: z.string(),
          exclude_shift_id: uuid.nullable().optional(),
        })
        .parse(args);
      return client.labor.checkShiftConflicts({
        technicianId: p.technician_id,
        startAt: p.start_at,
        endAt: p.end_at,
        excludeShiftId: p.exclude_shift_id ?? null,
      });
    },
  },
  'labor.generate_shifts_from_templates': {
    description: 'Generate shifts from templates for a date range.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      start_date: z.string().min(1),
      end_date: z.string().min(1),
    }),
    async invoke(client, args) {
      const p = z.object({ tenant_id: uuid, start_date: z.string(), end_date: z.string() }).parse(args);
      return client.labor.generateShiftsFromTemplates({
        tenantId: p.tenant_id,
        startDate: p.start_date,
        endDate: p.end_date,
      });
    },
  },
};
