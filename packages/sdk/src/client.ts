import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types.js';
import type { DbClient, DbClientOptions } from './types.js';
import { unwrapResult } from './unwrap.js';
import { createTenantsResource } from './resources/tenants.js';
import { createWorkOrdersResource } from './resources/work-orders.js';
import { createAssetsResource } from './resources/assets.js';
import { createLocationsResource } from './resources/locations.js';
import { createSpacesResource } from './resources/spaces.js';
import { createDepartmentsResource } from './resources/departments.js';
import { createMetersResource } from './resources/meters.js';
import { createPluginsResource } from './resources/plugins.js';
import { createAuthorizationResource } from './resources/authorization.js';
import { createCatalogsResource } from './resources/catalogs.js';
import { createPmResource } from './resources/pm.js';
import { createDashboardResource } from './resources/dashboard.js';
import { createAuditResource } from './resources/audit.js';
import { createTenantApiKeysResource } from './resources/tenant-api-keys.js';
import { createLaborResource } from './resources/labor.js';
import { createSchedulingResource } from './resources/scheduling.js';
import { createCostsResource } from './resources/costs.js';
import { createProjectsResource } from './resources/projects.js';
import { createPartsInventoryResource } from './resources/parts-inventory.js';
import { createSafetyComplianceResource } from './resources/safety-compliance.js';
import { createMobileFieldResource } from './resources/mobile-field.js';
import { createMapZonesResource } from './resources/map-zones.js';
import { createFieldOperationsResource } from './resources/field-operations.js';
import { createIntegrationsResource } from './resources/integrations.js';
import { createNotificationsResource } from './resources/notifications.js';
import { createSemanticSearchResource } from './resources/semantic-search.js';
import { createAgentResource } from './resources/agent.js';

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
  return buildDbClientFromSupabase(supabase);
}

/**
 * Create a DbClient from an existing Supabase client (e.g. one already authenticated
 * with a user session). Use this in server routes when you have set the session
 * via auth.setSession({ access_token, refresh_token }).
 */
export function createDbClientFromSupabase(supabase: SupabaseClient<Database>): DbClient {
  return buildDbClientFromSupabase(supabase);
}

// Internal: build DbClient from an existing supabase instance (used by createDbClient and createDbClientFromSupabase).
function buildDbClientFromSupabase(supabase: SupabaseClient<Database>): DbClient {
  const client: DbClient = {
    supabase: supabase as DbClient['supabase'],
    tenants: createTenantsResource(supabase),
    workOrders: createWorkOrdersResource(supabase),
    assets: createAssetsResource(supabase),
    locations: createLocationsResource(supabase),
    spaces: createSpacesResource(supabase),
    departments: createDepartmentsResource(supabase),
    meters: createMetersResource(supabase),
    plugins: createPluginsResource(supabase),
    authorization: createAuthorizationResource(supabase),
    catalogs: createCatalogsResource(supabase),
    pm: createPmResource(supabase),
    dashboard: createDashboardResource(supabase),
    audit: createAuditResource(supabase),
    tenantApiKeys: createTenantApiKeysResource(supabase),
    labor: createLaborResource(supabase),
    scheduling: createSchedulingResource(supabase),
    costs: createCostsResource(supabase),
    projects: createProjectsResource(supabase),
    partsInventory: createPartsInventoryResource(supabase),
    safetyCompliance: createSafetyComplianceResource(supabase),
    mobile: createMobileFieldResource(supabase),
    mapZones: createMapZonesResource(supabase),
    fieldOps: createFieldOperationsResource(supabase),
    integrations: createIntegrationsResource(supabase),
    notifications: createNotificationsResource(supabase),
    semanticSearch: createSemanticSearchResource(supabase),
    agent: createAgentResource(supabase),
    async setTenant(tenantId: string): Promise<void> {
      const { error } = await (supabase as unknown as Record<string, (n: string, p?: object) => Promise<{ data: unknown; error: unknown }>>).rpc(
        'rpc_set_tenant_context',
        { p_tenant_id: tenantId }
      );
      unwrapResult(null, error as import('@supabase/supabase-js').PostgrestError | null);
    },
    async refreshTenantSession(): Promise<string | null> {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        throw error;
      }
      const session = data.session;
      if (!session?.refresh_token) {
        return null;
      }
      const refreshed = await supabase.auth.refreshSession({
        refresh_token: session.refresh_token,
      });
      if (refreshed.error) {
        throw refreshed.error;
      }
      return refreshed.data.session?.access_token ?? null;
    },
    async setTenantAndRefresh(tenantId: string): Promise<string | null> {
      const { error } = await (supabase as unknown as Record<string, (n: string, p?: object) => Promise<{ data: unknown; error: unknown }>>).rpc(
        'rpc_set_tenant_context',
        { p_tenant_id: tenantId }
      );
      unwrapResult(null, error as import('@supabase/supabase-js').PostgrestError | null);
      return client.refreshTenantSession();
    },
    async clearTenant(): Promise<void> {
      const { error } = await (supabase as unknown as Record<string, (n: string, p?: object) => Promise<{ data: unknown; error: unknown }>>).rpc(
        'rpc_clear_tenant_context',
        {}
      );
      unwrapResult(null, error as import('@supabase/supabase-js').PostgrestError | null);
    },
  };
  return client;
}
