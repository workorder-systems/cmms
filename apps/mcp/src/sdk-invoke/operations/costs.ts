import { z } from 'zod';
import type { SdkOperationDef } from '../types.js';
import { ann } from '../annotations.js';
import { emptyArgs, uuid } from '../zod-common.js';

const groupBy = z.enum(['asset', 'location', 'department', 'project']);

export const costsOperations: Record<string, SdkOperationDef> = {
  'costs.list_work_order_costs': {
    description: 'List work order costs.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.costs.listWorkOrderCosts();
    },
  },
  'costs.list_asset_costs': {
    description: 'List asset cost roll-ups.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.costs.listAssetCosts();
    },
  },
  'costs.list_location_costs': {
    description: 'List location cost roll-ups.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.costs.listLocationCosts();
    },
  },
  'costs.list_department_costs': {
    description: 'List department cost roll-ups.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.costs.listDepartmentCosts();
    },
  },
  'costs.list_project_costs': {
    description: 'List project cost roll-ups.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.costs.listProjectCosts();
    },
  },
  'costs.list_lifecycle_alerts': {
    description: 'List asset lifecycle alerts.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.costs.listLifecycleAlerts();
    },
  },
  'costs.cost_rollup': {
    description: 'RPC cost roll-up by dimension.',
    annotations: ann.read,
    inputSchema: z.object({
      tenant_id: uuid,
      group_by: groupBy,
      from_date: z.string().nullable().optional(),
      to_date: z.string().nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          group_by: groupBy,
          from_date: z.string().nullable().optional(),
          to_date: z.string().nullable().optional(),
        })
        .parse(args);
      return client.costs.costRollup({
        tenantId: p.tenant_id,
        groupBy: p.group_by,
        fromDate: p.from_date ?? null,
        toDate: p.to_date ?? null,
      });
    },
  },
  'costs.asset_lifecycle_alerts': {
    description: 'Lifecycle alerts within the next N days.',
    annotations: ann.read,
    inputSchema: z.object({
      tenant_id: uuid,
      days_ahead: z.number().int().positive().optional(),
    }),
    async invoke(client, args) {
      const p = z.object({ tenant_id: uuid, days_ahead: z.number().int().positive().optional() }).parse(args);
      return client.costs.assetLifecycleAlerts({ tenantId: p.tenant_id, daysAhead: p.days_ahead });
    },
  },
  'costs.asset_total_cost_of_ownership': {
    description: 'Total cost of ownership for one asset.',
    annotations: ann.read,
    inputSchema: z.object({
      tenant_id: uuid,
      asset_id: uuid,
      from_date: z.string().nullable().optional(),
      to_date: z.string().nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          asset_id: uuid,
          from_date: z.string().nullable().optional(),
          to_date: z.string().nullable().optional(),
        })
        .parse(args);
      return client.costs.assetTotalCostOfOwnership({
        tenantId: p.tenant_id,
        assetId: p.asset_id,
        fromDate: p.from_date ?? null,
        toDate: p.to_date ?? null,
      });
    },
  },
};
