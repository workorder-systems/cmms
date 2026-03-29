import { z } from 'zod';

/** UUID string (Postgres tenant / entity ids). */
export const uuidSchema = z.string().uuid();

/** Common limit param for list-style tools. */
export const listLimitSchema = z
  .number()
  .int()
  .min(1)
  .max(200)
  .optional()
  .describe('Max rows to return (default varies per tool).');

export const setActiveTenantInputSchema = z.object({
  tenant_id: uuidSchema.describe('Tenant UUID to scope subsequent CMMS operations (must be a member; OAuth clients need tenant grants).'),
});

/** Resolve active tenant for the caller; no args. */
export const resolveActiveTenantInputSchema = z.object({});

export const workOrdersGetInputSchema = z.object({
  work_order_id: uuidSchema,
});

export const workOrdersListSummaryInputSchema = z.object({
  limit: listLimitSchema,
});

export const workOrdersGetSummaryInputSchema = workOrdersGetInputSchema;

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
  client_request_id: z
    .string()
    .min(1)
    .max(256)
    .nullable()
    .optional()
    .describe('Optional idempotency key for retry-safe automation. Reuse the same value when retrying the same create request.'),
});

export const assetsListSummaryInputSchema = z.object({
  limit: listLimitSchema,
});

export const partsListSummaryInputSchema = z.object({
  limit: listLimitSchema,
});

export const pmSchedulesListSummaryInputSchema = z.object({
  limit: listLimitSchema,
});

export type SetActiveTenantInput = z.infer<typeof setActiveTenantInputSchema>;
export type ResolveActiveTenantInput = z.infer<typeof resolveActiveTenantInputSchema>;
export type WorkOrdersGetInput = z.infer<typeof workOrdersGetInputSchema>;
export type WorkOrdersListSummaryInput = z.infer<typeof workOrdersListSummaryInputSchema>;
export type WorkOrdersGetSummaryInput = z.infer<typeof workOrdersGetSummaryInputSchema>;
export type WorkOrdersCreateInput = z.infer<typeof workOrdersCreateInputSchema>;
export type AssetsListSummaryInput = z.infer<typeof assetsListSummaryInputSchema>;
export type PartsListSummaryInput = z.infer<typeof partsListSummaryInputSchema>;
export type PmSchedulesListSummaryInput = z.infer<typeof pmSchedulesListSummaryInputSchema>;

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

export const sdkOperationSchemaInputSchema = z.object({
  operation_id: z.string().min(1).describe('Operation id from sdk_catalog_compact or sdk_catalog.'),
});

export type SdkOperationSchemaInput = z.infer<typeof sdkOperationSchemaInputSchema>;

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
