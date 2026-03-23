import type { SdkOperationDef } from '../types.js';
import { ann } from '../annotations.js';
import { emptyArgs } from '../zod-common.js';

export const dashboardOperations: Record<string, SdkOperationDef> = {
  'dashboard.get_metrics': {
    description: 'Dashboard metrics for the tenant.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.dashboard.getMetrics();
    },
  },
  'dashboard.get_mttr_metrics': {
    description: 'MTTR metrics.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.dashboard.getMttrMetrics();
    },
  },
  'dashboard.list_open_work_orders': {
    description: 'Open work orders for dashboard.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.dashboard.listOpenWorkOrders();
    },
  },
  'dashboard.list_overdue_work_orders': {
    description: 'Overdue work orders for dashboard.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.dashboard.listOverdueWorkOrders();
    },
  },
  'dashboard.list_work_orders_by_status': {
    description: 'Work orders grouped by status.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.dashboard.listWorkOrdersByStatus();
    },
  },
  'dashboard.list_work_orders_by_maintenance_type': {
    description: 'Work orders grouped by maintenance type.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.dashboard.listWorkOrdersByMaintenanceType();
    },
  },
  'dashboard.get_work_orders_summary': {
    description: 'Work orders summary.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.dashboard.getWorkOrdersSummary();
    },
  },
  'dashboard.get_assets_summary': {
    description: 'Assets summary.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.dashboard.getAssetsSummary();
    },
  },
  'dashboard.get_locations_summary': {
    description: 'Locations summary.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.dashboard.getLocationsSummary();
    },
  },
  'dashboard.get_tenants_overview': {
    description: 'Tenants overview.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.dashboard.getTenantsOverview();
    },
  },
  'dashboard.list_site_rollup': {
    description: 'Site rollup (portfolio / multi-site).',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.dashboard.listSiteRollup();
    },
  },
};
