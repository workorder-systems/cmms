/**
 * @workorder-systems/sdk – Type-safe domain SDK for the database public API.
 *
 * Exposes only public views (reads) and RPCs (writes). Use createDbClient()
 * to get a typed client; set tenant context before tenant-scoped operations.
 *
 * @packageDocumentation
 */

export { createDbClient, createDbClientFromSupabase } from './client.js';
export { SdkError, normalizeError } from './errors.js';
export type { Database } from './database.types.js';
export type { DbClient, DbClientOptions } from './types.js';
export type {
  TenantRow,
  CreateTenantParams,
  InviteUserParams,
  AssignRoleParams,
  RemoveMemberParams,
  TenantsResource,
} from './resources/tenants.js';
export type {
  WorkOrderRow,
  WorkOrderAttachmentRow,
  MyWorkOrderRequestRow,
  WorkOrderSlaStatusRow,
  CreateWorkOrderParams,
  CreateWorkOrderRequestParams,
  AcknowledgeWorkOrderParams,
  UpsertWorkOrderSlaRuleParams,
  TransitionStatusParams,
  CompleteWorkOrderParams,
  LogTimeParams,
  UpdateAttachmentMetadataParams,
  WorkOrdersResource,
} from './resources/work-orders.js';
export type {
  WorkOrderCostRow,
  AssetCostRow,
  LocationCostRow,
  DepartmentCostRow,
  ProjectCostRow,
  AssetLifecycleAlertRow,
  CostRollupRow,
  CostRollupParams,
  AssetTcoRow,
  AssetTcoParams,
  AssetLifecycleAlertsParams,
  CostsResource,
} from './resources/costs.js';
export type { ProjectRow, ProjectsResource } from './resources/projects.js';
export type {
  AssetRow,
  AssetWarrantyRow,
  CreateAssetParams,
  UpdateAssetParams,
  UpsertAssetWarrantyParams,
  RecordAssetDowntimeParams,
  AssetsResource,
} from './resources/assets.js';
export type {
  LocationRow,
  LocationType,
  CreateLocationParams,
  UpdateLocationParams,
  BulkImportLocationRow,
  BulkImportLocationResult,
  BulkImportLocationsParams,
  LocationsResource,
} from './resources/locations.js';
export type {
  MapZoneRow,
  MapZoneGeometry,
  CreateMapZoneParams,
  UpdateMapZoneParams,
  MapZonesResource,
} from './resources/map-zones.js';
export type {
  ToolRow,
  ToolCheckoutRow,
  ShiftHandoverRow,
  CreateToolParams,
  UpdateToolParams,
  CheckoutToolParams,
  ReturnToolParams,
  CreateShiftHandoverParams,
  SubmitShiftHandoverParams,
  AcknowledgeShiftHandoverParams,
  AddShiftHandoverItemParams,
  FieldOperationsResource,
} from './resources/field-operations.js';
export type {
  SpaceRow,
  SpaceStatus,
  CreateSpaceParams,
  UpdateSpaceParams,
  SpacesResource,
} from './resources/spaces.js';
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
  PluginWebhookSubscriptionRow,
  PluginDeliveryQueueRecentRow,
  InstallPluginParams,
  UpdatePluginInstallationParams,
  UninstallPluginParams,
  UpsertPluginWebhookSubscriptionParams,
  DeletePluginWebhookSubscriptionParams,
  PluginsResource,
} from './resources/plugins.js';
export type {
  PermissionRow,
  RolePermissionRow,
  TenantRoleRow,
  UserTenantRoleRow,
  ProfileRow,
  AssignPermissionToRoleParams,
  RevokePermissionFromRoleParams,
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
  SiteRollupRow,
  DashboardResource,
} from './resources/dashboard.js';
export type {
  AuditEntityChangeRow,
  AuditPermissionChangeRow,
  AuditRetentionConfigRow,
  AuditResource,
} from './resources/audit.js';
export type {
  TenantApiKeyRow,
  CreateTenantApiKeyResult,
  TenantApiKeysResource,
} from './resources/tenant-api-keys.js';
export type {
  TechnicianRow,
  CrewRow,
  CrewMemberRow,
  SkillCatalogRow,
  CertificationCatalogRow,
  TechnicianSkillRow,
  TechnicianCertificationRow,
  AvailabilityPatternRow,
  AvailabilityOverrideRow,
  ShiftRow,
  ShiftTemplateRow,
  WorkOrderAssignmentRow,
  WorkOrderLaborActualsRow,
  TechnicianCapacityRow,
  ShiftConflictRow,
  CheckShiftConflictsParams,
  GenerateShiftsFromTemplatesParams,
  GeneratedShiftRow,
  LaborResource,
} from './resources/labor.js';
export type {
  ScheduleBlockRow,
  ScheduleWorkOrderParams,
  UpdateScheduleBlockParams,
  ValidateScheduleParams,
  ValidateScheduleIssueRow,
  SchedulingResource,
} from './resources/scheduling.js';
export type {
  PartWithStockRow,
  StockByLocationRow,
  PartRow,
  SupplierRow,
  InventoryLocationRow,
  StockLevelRow,
  PartReservationRow,
  PartUsageRow,
  OpenRequisitionRow,
  OpenPurchaseOrderRow,
  PurchaseOrderReceiptStatusRow,
  ReservePartsParams,
  IssuePartsToWorkOrderParams,
  ReceivePurchaseOrderLine,
  ReceivePurchaseOrderParams,
  CreatePurchaseOrderLine,
  CreatePurchaseOrderParams,
  CreatePartParams,
  UpdatePartParams,
  CreateSupplierParams,
  UpdateSupplierParams,
  PartsInventoryResource,
} from './resources/parts-inventory.js';
export type {
  InspectionTemplateRow,
  InspectionTemplateItemRow,
  InspectionScheduleRow,
  InspectionRunRow,
  InspectionRunItemRow,
  IncidentRow,
  IncidentActionRow,
  ComplianceInspectionHistoryRow,
  ComplianceIncidentReportRow,
  InspectionChecklistItemInput,
  CreateInspectionTemplateParams,
  UpdateInspectionTemplateParams,
  CreateInspectionScheduleParams,
  UpdateInspectionScheduleParams,
  CreateInspectionRunParams,
  UpdateInspectionRunParams,
  InspectionRunItemResultInput,
  CompleteInspectionRunParams,
  CreateIncidentParams,
  UpdateIncidentParams,
  CloseIncidentParams,
  CreateIncidentActionParams,
  UpdateIncidentActionParams,
  CompleteIncidentActionParams,
  ComplianceInspectionHistoryParams,
  ComplianceIncidentReportParams,
  SafetyComplianceResource,
} from './resources/safety-compliance.js';
export type {
  MobileWorkOrderRow,
  MobileAssetRow,
  MobileLocationRow,
  MobileTimeEntryRow,
  MobileAttachmentRow,
  MobileCheckInRow,
  MobileNoteRow,
  MobileSyncPayload,
  MobileSyncParams,
  StartWorkOrderParams,
  StopWorkOrderParams,
  AddWorkOrderNoteParams,
  RegisterEntityAttachmentParams,
  MobileFieldResource,
} from './resources/mobile-field.js';
