import { z } from 'zod';
import type { SdkOperationDef } from '../types.js';
import { ann } from '../annotations.js';
import { emptyArgs, uuid } from '../zod-common.js';

const assetBulkRow = z
  .object({
    name: z.string().min(1),
    description: z.string().nullable().optional(),
    asset_number: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    location_id: z.string().uuid().nullable().optional(),
    department_id: z.string().uuid().nullable().optional(),
  })
  .passthrough();

export const assetsOperations: Record<string, SdkOperationDef> = {
  'assets.list': {
    description: 'List assets for the tenant.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.assets.list();
    },
  },
  'assets.get_by_id': {
    description: 'Get one asset by id.',
    annotations: ann.read,
    inputSchema: z.object({ id: uuid }),
    async invoke(client, args) {
      const { id } = z.object({ id: uuid }).parse(args);
      return client.assets.getById(id);
    },
  },
  'assets.list_warranties': {
    description: 'List asset warranties; optional asset_id filter.',
    annotations: ann.read,
    inputSchema: z.object({ asset_id: uuid.optional() }),
    async invoke(client, args) {
      const { asset_id } = z.object({ asset_id: uuid.optional() }).parse(args);
      return client.assets.listWarranties(asset_id);
    },
  },
  'assets.upsert_warranty': {
    description: 'Create or update an asset warranty row.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      asset_id: uuid,
      warranty_id: uuid.nullable().optional(),
      warranty_type: z.string().nullable().optional(),
      starts_on: z.string().nullable().optional(),
      expires_on: z.string().nullable().optional(),
      coverage_summary: z.string().nullable().optional(),
      external_reference: z.string().nullable().optional(),
      supplier_id: uuid.nullable().optional(),
      is_active: z.boolean().nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          asset_id: uuid,
          warranty_id: uuid.nullable().optional(),
          warranty_type: z.string().nullable().optional(),
          starts_on: z.string().nullable().optional(),
          expires_on: z.string().nullable().optional(),
          coverage_summary: z.string().nullable().optional(),
          external_reference: z.string().nullable().optional(),
          supplier_id: uuid.nullable().optional(),
          is_active: z.boolean().nullable().optional(),
        })
        .parse(args);
      return client.assets.upsertWarranty({
        tenantId: p.tenant_id,
        assetId: p.asset_id,
        warrantyId: p.warranty_id ?? null,
        warrantyType: p.warranty_type ?? null,
        startsOn: p.starts_on ?? null,
        expiresOn: p.expires_on ?? null,
        coverageSummary: p.coverage_summary ?? null,
        externalReference: p.external_reference ?? null,
        supplierId: p.supplier_id ?? null,
        isActive: p.is_active ?? null,
      });
    },
  },
  'assets.create': {
    description: 'Create an asset.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      name: z.string().min(1),
      description: z.string().nullable().optional(),
      asset_number: z.string().nullable().optional(),
      barcode: z.string().nullable().optional(),
      location_id: uuid.nullable().optional(),
      department_id: uuid.nullable().optional(),
      status: z.string().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          name: z.string(),
          description: z.string().nullable().optional(),
          asset_number: z.string().nullable().optional(),
          barcode: z.string().nullable().optional(),
          location_id: uuid.nullable().optional(),
          department_id: uuid.nullable().optional(),
          status: z.string().optional(),
        })
        .parse(args);
      return client.assets.create({
        tenantId: p.tenant_id,
        name: p.name,
        description: p.description ?? null,
        assetNumber: p.asset_number ?? null,
        barcode: p.barcode ?? null,
        locationId: p.location_id ?? null,
        departmentId: p.department_id ?? null,
        status: p.status,
      });
    },
  },
  'assets.update': {
    description: 'Update an asset.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      asset_id: uuid,
      name: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
      asset_number: z.string().nullable().optional(),
      barcode: z.string().nullable().optional(),
      location_id: uuid.nullable().optional(),
      department_id: uuid.nullable().optional(),
      status: z.string().nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          asset_id: uuid,
          name: z.string().nullable().optional(),
          description: z.string().nullable().optional(),
          asset_number: z.string().nullable().optional(),
          barcode: z.string().nullable().optional(),
          location_id: uuid.nullable().optional(),
          department_id: uuid.nullable().optional(),
          status: z.string().nullable().optional(),
        })
        .parse(args);
      await client.assets.update({
        tenantId: p.tenant_id,
        assetId: p.asset_id,
        name: p.name ?? null,
        description: p.description ?? null,
        assetNumber: p.asset_number ?? null,
        barcode: p.barcode !== undefined ? p.barcode : undefined,
        locationId: p.location_id ?? null,
        departmentId: p.department_id ?? null,
        status: p.status ?? null,
      });
      return { ok: true };
    },
  },
  'assets.resolve_by_scan_code': {
    description: 'Resolve barcode or asset number to asset id.',
    annotations: ann.read,
    inputSchema: z.object({
      tenant_id: uuid,
      code: z.string().min(1),
    }),
    async invoke(client, args) {
      const p = z.object({ tenant_id: uuid, code: z.string() }).parse(args);
      return client.assets.resolveByScanCode(p.tenant_id, p.code);
    },
  },
  'assets.delete': {
    description: 'Delete an asset.',
    annotations: ann.destructive,
    inputSchema: z.object({
      tenant_id: uuid,
      asset_id: uuid,
    }),
    async invoke(client, args) {
      const p = z.object({ tenant_id: uuid, asset_id: uuid }).parse(args);
      await client.assets.delete(p.tenant_id, p.asset_id);
      return { ok: true };
    },
  },
  'assets.bulk_import': {
    description: 'Bulk import assets.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      rows: z.array(assetBulkRow),
    }),
    async invoke(client, args) {
      const p = z.object({ tenant_id: uuid, rows: z.array(assetBulkRow) }).parse(args);
      return client.assets.bulkImport({ tenantId: p.tenant_id, rows: p.rows });
    },
  },
  'assets.record_downtime': {
    description: 'Record an asset downtime event.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      asset_id: uuid,
      reason_key: z.string().min(1),
      started_at: z.string().nullable().optional(),
      ended_at: z.string().nullable().optional(),
      linked_work_order_id: uuid.nullable().optional(),
      notes: z.string().nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          asset_id: uuid,
          reason_key: z.string(),
          started_at: z.string().nullable().optional(),
          ended_at: z.string().nullable().optional(),
          linked_work_order_id: uuid.nullable().optional(),
          notes: z.string().nullable().optional(),
        })
        .parse(args);
      return client.assets.recordDowntime({
        tenantId: p.tenant_id,
        assetId: p.asset_id,
        reasonKey: p.reason_key,
        startedAt: p.started_at ?? null,
        endedAt: p.ended_at ?? null,
        linkedWorkOrderId: p.linked_work_order_id ?? null,
        notes: p.notes ?? null,
      });
    },
  },
};
