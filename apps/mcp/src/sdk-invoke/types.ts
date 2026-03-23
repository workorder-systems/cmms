import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import type { ZodType } from 'zod';
import type { DbClient } from '@workorder-systems/sdk';

/**
 * One callable SDK surface on DbClient (resources + tenant_context), excluding raw supabase.
 */
export type SdkOperationDef = {
  description: string;
  annotations: ToolAnnotations;
  /** Validates only the `args` object passed to sdk_invoke (not operation_id). */
  inputSchema: ZodType;
  invoke: (client: DbClient, args: unknown) => Promise<unknown>;
};
