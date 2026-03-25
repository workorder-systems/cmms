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

/** Generic SDK invoke: operation_id from sdk_catalog; args validated per operation. */
export const sdkInvokeInputSchema = z.object({
  operation_id: z
    .string()
    .min(1)
    .describe('Operation id from sdk_catalog (e.g. work_orders.list, tenant_context.set).'),
  args: z
    .record(z.unknown())
    .optional()
    .default({})
    .describe('Arguments object; use {} for parameterless operations.'),
});

export type SdkInvokeInput = z.infer<typeof sdkInvokeInputSchema>;

const detailLevelSchema = z
  .enum(['summary', 'standard', 'full'])
  .optional()
  .describe(
    'summary (default): ids, titles, scores, and references. standard: adds a short description preview. full: full text fields including cause and resolution.'
  );

export const cmmsSimilarPastTextInputSchema = z.object({
  query_text: z.string().min(1).describe('Natural-language search query.'),
  limit: z.number().int().min(1).max(50).optional(),
  exclude_work_order_id: uuidSchema.optional(),
  min_similarity: z.number().min(0).max(1).optional(),
  detail_level: detailLevelSchema,
});

export type CmmsSimilarPastTextInput = z.infer<typeof cmmsSimilarPastTextInputSchema>;

const semanticSearchDomainSchema = z.enum(['work_orders', 'assets', 'parts']);

/** Text-in similarity via Edge embed-search (multi-domain). */
export const semanticSearchTextInputSchema = z
  .object({
    domain: semanticSearchDomainSchema.describe('Entity collection to search (work_orders, assets, parts).'),
    query_text: z.string().min(1).describe('Natural-language search query.'),
    limit: z.number().int().min(1).max(50).optional(),
    exclude_work_order_id: uuidSchema
      .optional()
      .describe('Only valid when domain is work_orders; excludes one WO from hits.'),
    min_similarity: z.number().min(0).max(1).optional(),
    detail_level: detailLevelSchema,
  })
  .superRefine((val, c) => {
    if (val.domain !== 'work_orders' && val.exclude_work_order_id) {
      c.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'exclude_work_order_id is only valid when domain is work_orders',
        path: ['exclude_work_order_id'],
      });
    }
  });

export type SemanticSearchTextInput = z.infer<typeof semanticSearchTextInputSchema>;

export const entitySearchInputSchema = z.object({
  query: z.string().min(1).describe('Free-text to match aliases or entity names (assets, parts, locations).'),
  entity_types: z.array(z.string().min(1)).optional().describe('Optional filter e.g. asset, part, location'),
  limit: z.number().int().min(1).max(50).optional(),
});

export type EntitySearchInput = z.infer<typeof entitySearchInputSchema>;
