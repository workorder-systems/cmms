/**
 * @db/sdk – Type-safe domain SDK for the database public API.
 *
 * Exposes only public views (reads) and RPCs (writes). Use createDbClient()
 * to get a typed client; set tenant context before tenant-scoped operations.
 *
 * @packageDocumentation
 */

export { createDbClient } from './client.js';
export { SdkError, normalizeError } from './errors.js';
export type { Database } from './database.types.js';
export type { DbClient, DbClientOptions } from './types.js';
export type {
  TenantRow,
  CreateTenantParams,
  InviteUserParams,
  AssignRoleParams,
  TenantsResource,
} from './resources/tenants.js';
export type {
  WorkOrderRow,
  CreateWorkOrderParams,
  TransitionStatusParams,
  CompleteWorkOrderParams,
  LogTimeParams,
  AddAttachmentParams,
  WorkOrdersResource,
} from './resources/work-orders.js';
export type {
  AssetRow,
  CreateAssetParams,
  UpdateAssetParams,
  AssetsResource,
} from './resources/assets.js';
export type {
  LocationRow,
  CreateLocationParams,
  UpdateLocationParams,
  LocationsResource,
} from './resources/locations.js';
export type {
  DepartmentRow,
  CreateDepartmentParams,
  UpdateDepartmentParams,
  DepartmentsResource,
} from './resources/departments.js';
export type {
  AssetMeterRow,
  MeterReadingRow,
  CreateMeterParams,
  UpdateMeterParams,
  RecordMeterReadingParams,
  MetersResource,
} from './resources/meters.js';
