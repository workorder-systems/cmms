import type { SdkOperationDef } from './types.js';
import { tenantContextOperations } from './operations/tenant-context.js';
import { tenantsOperations } from './operations/tenants.js';
import { workOrdersOperations } from './operations/work-orders.js';
import { assetsOperations } from './operations/assets.js';
import { locationsOperations } from './operations/locations.js';
import { spacesOperations } from './operations/spaces.js';
import { departmentsOperations } from './operations/departments.js';
import { metersOperations } from './operations/meters.js';
import { mapZonesOperations } from './operations/map-zones.js';
import { projectsOperations } from './operations/projects.js';
import { pluginsOperations } from './operations/plugins.js';
import { authorizationOperations } from './operations/authorization.js';
import { catalogsOperations } from './operations/catalogs.js';
import { pmOperations } from './operations/pm.js';
import { dashboardOperations } from './operations/dashboard.js';
import { auditOperations } from './operations/audit.js';
import { tenantApiKeysOperations } from './operations/tenant-api-keys.js';
import { laborOperations } from './operations/labor.js';
import { schedulingOperations } from './operations/scheduling.js';
import { costsOperations } from './operations/costs.js';
import { integrationsOperations } from './operations/integrations.js';
import { notificationsOperations } from './operations/notifications.js';
import { fieldOperationsOperations } from './operations/field-operations.js';
import { mobileFieldOperations } from './operations/mobile-field.js';
import { partsInventoryOperations } from './operations/parts-inventory.js';
import { safetyComplianceOperations } from './operations/safety-compliance.js';

/**
 * Full SDK invoke registry (DbClient resources + tenant_context). Keys are operation_id strings.
 */
export const SDK_OPERATION_REGISTRY: Record<string, SdkOperationDef> = {
  ...tenantContextOperations,
  ...tenantsOperations,
  ...workOrdersOperations,
  ...assetsOperations,
  ...locationsOperations,
  ...spacesOperations,
  ...departmentsOperations,
  ...metersOperations,
  ...mapZonesOperations,
  ...projectsOperations,
  ...pluginsOperations,
  ...authorizationOperations,
  ...catalogsOperations,
  ...pmOperations,
  ...dashboardOperations,
  ...auditOperations,
  ...tenantApiKeysOperations,
  ...laborOperations,
  ...schedulingOperations,
  ...costsOperations,
  ...integrationsOperations,
  ...notificationsOperations,
  ...fieldOperationsOperations,
  ...mobileFieldOperations,
  ...partsInventoryOperations,
  ...safetyComplianceOperations,
};

export const SDK_OPERATION_IDS = Object.keys(SDK_OPERATION_REGISTRY).sort();
