import type { SupabaseClient, SupabaseClientOptions } from '@supabase/supabase-js';
import type { Database } from './database.types.js';
import type { TenantsResource } from './resources/tenants.js';
import type { WorkOrdersResource } from './resources/work-orders.js';
import type { AssetsResource } from './resources/assets.js';
import type { LocationsResource } from './resources/locations.js';
import type { SpacesResource } from './resources/spaces.js';
import type { DepartmentsResource } from './resources/departments.js';
import type { MetersResource } from './resources/meters.js';
import type { PluginsResource } from './resources/plugins.js';
import type { AuthorizationResource } from './resources/authorization.js';
import type { CatalogsResource } from './resources/catalogs.js';
import type { PmResource } from './resources/pm.js';
import type { DashboardResource } from './resources/dashboard.js';
import type { AuditResource } from './resources/audit.js';
import type { TenantApiKeysResource } from './resources/tenant-api-keys.js';
import type { LaborResource } from './resources/labor.js';
import type { SchedulingResource } from './resources/scheduling.js';
import type { CostsResource } from './resources/costs.js';
import type { ProjectsResource } from './resources/projects.js';
import type { PartsInventoryResource } from './resources/parts-inventory.js';
import type { SafetyComplianceResource } from './resources/safety-compliance.js';
import type { MobileFieldResource } from './resources/mobile-field.js';
import type { MapZonesResource } from './resources/map-zones.js';
import type { FieldOperationsResource } from './resources/field-operations.js';

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
   * Then call auth.refreshSession() so the JWT is re-issued with the tenant_id claim.
   */
  setTenant(tenantId: string): Promise<void>;
  /** Clear tenant context. Useful when switching tenants or logging out. */
  clearTenant(): Promise<void>;
  /** Tenants: list, create, invite, assign role. */
  tenants: TenantsResource;
  /** Work orders: list, get, create, portal requests, SLA views/RPCs, transition, complete, log time, attachments. */
  workOrders: WorkOrdersResource;
  /** Assets: list, get, create, update, delete, bulk import, warranties, record downtime. */
  assets: AssetsResource;
  /** Locations: list, get, create, update, delete. */
  locations: LocationsResource;
  /** Spaces: room/space attributes (usage, capacity, status). List, get, create, update, delete. */
  spaces: SpacesResource;
  /** Departments: list, get, create, update, delete. */
  departments: DepartmentsResource;
  /** Meters: list, get readings, create, update, record reading, delete. */
  meters: MetersResource;
  /** Plugins: list catalog, list installations, install, update, uninstall. Requires tenant.admin for installations. */
  plugins: PluginsResource;
  /** Authorization: permissions, roles, scopes, and permission checks. */
  authorization: AuthorizationResource;
  /** Catalogs: statuses, priorities, maintenance types, and status transitions. */
  catalogs: CatalogsResource;
  /** Preventive maintenance: templates, schedules, due/overdue/upcoming PMs, history, and actions. */
  pm: PmResource;
  /** Dashboard: tenant metrics, summaries, and analytics refresh. */
  dashboard: DashboardResource;
  /** Audit: entity and permission changes, retention configuration. */
  audit: AuditResource;
  /** Tenant API keys: create, list, revoke. For IoT / machine access (e.g. ingest-meter-reading Edge Function). */
  tenantApiKeys: TenantApiKeysResource;
  /** Labor: technicians, crews (including create/update/delete and membership), skills, certifications, availability, shifts, assignments, labor actuals, capacity, and scheduling RPCs. */
  labor: LaborResource;
  /** Scheduling: schedule blocks, views by technician/crew/asset/location, schedule/update/validate/unschedule RPCs. */
  scheduling: SchedulingResource;
  /** Costs and lifecycle: work order costs, roll-ups by asset/location/department/project, lifecycle alerts, TCO. */
  costs: CostsResource;
  /** Projects: list, get, create, update, delete (v_projects + RPCs). For cost roll-up by project. */
  projects: ProjectsResource;
  /** Parts and inventory: catalog, suppliers, stock, reservations, usage, and purchasing (requisitions, POs, receipts). */
  partsInventory: PartsInventoryResource;
  /** Safety and compliance: inspection templates, schedules, runs, incidents, and corrective actions. Audit-ready for regulated industries. */
  safetyCompliance: SafetyComplianceResource;
  /** Mobile field: offline sync payload, start/stop work order, add note, register attachment, and lightweight mobile views. */
  mobile: MobileFieldResource;
  /** Map zones: saved drawn shapes (polygons, lines, etc.) on the locations map. */
  mapZones: MapZonesResource;
  /** Tools (read), checkouts/returns, shift handover logbook. */
  fieldOps: FieldOperationsResource;
};
