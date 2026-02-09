/**
 * @workorder-systems/sdk – Type-safe domain SDK for the database public API.
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
  WorkOrderAttachmentRow,
  CreateWorkOrderParams,
  TransitionStatusParams,
  CompleteWorkOrderParams,
  LogTimeParams,
  UpdateAttachmentMetadataParams,
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
export type {
  PluginRow,
  PluginInstallationRow,
  InstallPluginParams,
  UpdatePluginInstallationParams,
  UninstallPluginParams,
  PluginsResource,
} from './resources/plugins.js';
export type {
  PermissionRow,
  RolePermissionRow,
  TenantRoleRow,
  UserTenantRoleRow,
  ProfileRow,
  AssignPermissionToRoleParams,
  GrantScopeParams,
  RevokeScopeParams,
  HasPermissionParams,
  GetUserPermissionsParams,
  AuthorizationResource,
} from './resources/authorization.js';
export type {
  StatusCatalogRow,
  PriorityCatalogRow,
  MaintenanceTypeCatalogRow,
  StatusTransitionRow,
  WorkflowGraph,
  CreateStatusParams,
  CreateStatusTransitionParams,
  CreatePriorityParams,
  CreateMaintenanceTypeParams,
  CatalogsResource,
} from './resources/catalogs.js';
export type {
  PmTemplateRow,
  PmTemplateChecklistItemRow,
  PmScheduleRow,
  DuePmRow,
  OverduePmRow,
  UpcomingPmRow,
  PmHistoryRow,
  CreatePmTemplateParams,
  UpdatePmTemplateParams,
  CreatePmScheduleParams,
  UpdatePmScheduleParams,
  DeletePmScheduleParams,
  CreatePmDependencyParams,
  GenerateDuePmsParams,
  TriggerManualPmParams,
  PmResource,
} from './resources/pm.js';
export type {
  DashboardMetricsRow,
  DashboardMttrMetricsRow,
  DashboardOpenWorkOrdersRow,
  DashboardOverdueWorkOrdersRow,
  DashboardWorkOrdersByStatusRow,
  DashboardWorkOrdersByMaintenanceTypeRow,
  WorkOrdersSummaryRow,
  AssetsSummaryRow,
  LocationsSummaryRow,
  TenantsOverviewRow,
  DashboardResource,
} from './resources/dashboard.js';
export type {
  AuditEntityChangeRow,
  AuditPermissionChangeRow,
  AuditRetentionConfigRow,
  AuditResource,
} from './resources/audit.js';
