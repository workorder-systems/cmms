import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types.js';
import type { DbClient, DbClientOptions } from './types.js';
import { unwrapResult } from './unwrap.js';
import { createTenantsResource } from './resources/tenants.js';
import { createWorkOrdersResource } from './resources/work-orders.js';
import { createAssetsResource } from './resources/assets.js';
import { createLocationsResource } from './resources/locations.js';
import { createDepartmentsResource } from './resources/departments.js';
import { createMetersResource } from './resources/meters.js';
import { createPluginsResource } from './resources/plugins.js';
import { createAuthorizationResource } from './resources/authorization.js';
import { createCatalogsResource } from './resources/catalogs.js';
import { createPmResource } from './resources/pm.js';
import { createDashboardResource } from './resources/dashboard.js';
import { createAuditResource } from './resources/audit.js';
import { createSimilarPastFixesResource } from './resources/similar-past-fixes.js';
import { createTenantApiKeysResource } from './resources/tenant-api-keys.js';

/**
 * Create a typed database client. Use this in browser, Node, or edge runtimes.
 *
 * For edge runtimes (Cloudflare Workers, Vercel Edge), pass a custom `fetch` and
 * optionally disable or customize session persistence:
 *
 * @example
 * ```ts
 * const client = createDbClient(url, anonKey, {
 *   global: { fetch: fetch },
 *   auth: { persistSession: false, storage: customStorage }
 * });
 * ```
 *
 * @param url - Supabase project URL (e.g. https://xxx.supabase.co)
 * @param anonKey - Supabase anon/public key
 * @param options - Optional. Custom fetch, auth storage, db schema, etc.
 * @returns DbClient with typed supabase client and domain resources
 */
export function createDbClient(
  url: string,
  anonKey: string,
  options?: DbClientOptions
): DbClient {
  const supabase = createClient<Database>(url, anonKey, {
    ...options,
    db: { schema: 'public', ...options?.db },
  });

  const client: DbClient = {
    supabase: supabase as DbClient['supabase'],
    tenants: createTenantsResource(supabase),
    workOrders: createWorkOrdersResource(supabase),
    assets: createAssetsResource(supabase),
    locations: createLocationsResource(supabase),
    departments: createDepartmentsResource(supabase),
    meters: createMetersResource(supabase),
    plugins: createPluginsResource(supabase),
    authorization: createAuthorizationResource(supabase),
    catalogs: createCatalogsResource(supabase),
    pm: createPmResource(supabase),
    dashboard: createDashboardResource(supabase),
    audit: createAuditResource(supabase),
    similarPastFixes: createSimilarPastFixesResource(supabase),
    tenantApiKeys: createTenantApiKeysResource(supabase),
    async setTenant(tenantId: string): Promise<void> {
      const { error } = await (supabase as unknown as Record<string, (n: string, p?: object) => Promise<{ data: unknown; error: unknown }>>).rpc(
        'rpc_set_tenant_context',
        { p_tenant_id: tenantId }
      );
      unwrapResult(null, error as import('@supabase/supabase-js').PostgrestError | null);
    },
    async clearTenant(): Promise<void> {
      const { error } = await (supabase as unknown as Record<string, (n: string, p?: object) => Promise<{ data: unknown; error: unknown }>>).rpc(
        'rpc_clear_tenant_context',
        {}
      );
      unwrapResult(null, error as import('@supabase/supabase-js').PostgrestError | null);
    },
  };

  // Attach domain resources (tenants, workOrders) in resource modules
  return client;
}
