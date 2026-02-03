import type { SupabaseClient, SupabaseClientOptions } from '@supabase/supabase-js';
import type { Database } from './database.types.js';
import type { TenantsResource } from './resources/tenants.js';
import type { WorkOrdersResource } from './resources/work-orders.js';
import type { AssetsResource } from './resources/assets.js';
import type { LocationsResource } from './resources/locations.js';
import type { DepartmentsResource } from './resources/departments.js';
import type { MetersResource } from './resources/meters.js';

/**
 * Options for creating the SDK client. Pass runtime-specific fetch and
 * auth storage for browser, Node, or edge (e.g. Cloudflare Workers).
 */
export interface DbClientOptions extends Omit<SupabaseClientOptions<Database>, 'auth' | 'db'> {
  auth?: SupabaseClientOptions<Database>['auth'] & {
    /** Custom storage for session persistence (e.g. localStorage in browser, memory in edge). */
    storage?: SupabaseClientOptions<Database>['auth'] extends { storage?: infer S } ? S : unknown;
  };
  /** Default schema is public. Override only if needed. */
  db?: { schema?: 'public' };
}

/**
 * The underlying Supabase client is typed with Database so .from() and .rpc()
 * are fully typed. Domain resources (tenants, workOrders, etc.) are attached
 * to DbClient and delegate to this client.
 */
export type DbClient = {
  /** Raw Supabase client for advanced use. All public views and RPCs are typed. */
  supabase: SupabaseClient<Database>;
  /**
   * Set tenant context. Call before querying tenant-scoped views or RPCs.
   * Then refresh the session so the JWT carries the tenant_id claim (e.g. getSession() then setSession()).
   */
  setTenant(tenantId: string): Promise<void>;
  /** Clear tenant context. Useful when switching tenants or logging out. */
  clearTenant(): Promise<void>;
  /** Tenants: list, create, invite, assign role. */
  tenants: TenantsResource;
  /** Work orders: list, get, create, transition status, complete, log time, add attachment. */
  workOrders: WorkOrdersResource;
  /** Assets: list, get, create, update, delete. */
  assets: AssetsResource;
  /** Locations: list, get, create, update, delete. */
  locations: LocationsResource;
  /** Departments: list, get, create, update, delete. */
  departments: DepartmentsResource;
  /** Meters: list, get readings, create, update, record reading, delete. */
  meters: MetersResource;
};
