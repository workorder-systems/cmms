import { z } from 'zod';

/** UUID string (Postgres tenant / entity ids). */
export const uuidSchema = z.string().uuid();

export const setActiveTenantInputSchema = z.object({
  tenant_id: uuidSchema.describe('Tenant UUID to scope subsequent CMMS operations (must be a member; OAuth clients need tenant grants).'),
});

export const workOrdersGetInputSchema = z.object({
  work_order_id: uuidSchema,
});

export const workOrdersCreateInputSchema = z.object({
  tenant_id: uuidSchema.describe('Tenant that will own the work order.'),
  title: z.string().min(1).describe('Work order title.'),
  description: z.string().nullable().optional().describe('Optional description.'),
  priority: z.string().optional().describe('Priority key (default medium).'),
  maintenance_type: z.string().nullable().optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  location_id: z.string().uuid().nullable().optional(),
  asset_id: z.string().uuid().nullable().optional(),
  due_date: z.string().nullable().optional().describe('ISO date or timestamp.'),
  pm_schedule_id: z.string().uuid().nullable().optional(),
  project_id: z.string().uuid().nullable().optional(),
});

export type SetActiveTenantInput = z.infer<typeof setActiveTenantInputSchema>;
export type WorkOrdersGetInput = z.infer<typeof workOrdersGetInputSchema>;
export type WorkOrdersCreateInput = z.infer<typeof workOrdersCreateInputSchema>;
