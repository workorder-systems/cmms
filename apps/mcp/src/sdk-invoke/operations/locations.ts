import { z } from 'zod';
import type { SdkOperationDef } from '../types.js';
import { ann } from '../annotations.js';
import { emptyArgs, uuid } from '../zod-common.js';

const locationType = z.enum(['region', 'site', 'building', 'floor', 'room', 'zone']);

const bulkLocRow = z
  .object({
    name: z.string().min(1),
    description: z.string().nullable().optional(),
    parent_location_id: z.string().uuid().nullable().optional(),
    location_type: locationType.nullable().optional(),
    code: z.string().nullable().optional(),
    address_line: z.string().nullable().optional(),
    external_id: z.string().nullable().optional(),
  })
  .passthrough();

export const locationsOperations: Record<string, SdkOperationDef> = {
  'locations.list': {
    description: 'List locations.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.locations.list();
    },
  },
  'locations.get_by_id': {
    description: 'Get one location by id.',
    annotations: ann.read,
    inputSchema: z.object({ id: uuid }),
    async invoke(client, args) {
      const { id } = z.object({ id: uuid }).parse(args);
      return client.locations.getById(id);
    },
  },
  'locations.create': {
    description: 'Create a location.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      name: z.string().min(1),
      description: z.string().nullable().optional(),
      parent_location_id: uuid.nullable().optional(),
      location_type: locationType.nullable().optional(),
      code: z.string().nullable().optional(),
      address_line: z.string().nullable().optional(),
      external_id: z.string().nullable().optional(),
      latitude: z.number().nullable().optional(),
      longitude: z.number().nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          name: z.string(),
          description: z.string().nullable().optional(),
          parent_location_id: uuid.nullable().optional(),
          location_type: locationType.nullable().optional(),
          code: z.string().nullable().optional(),
          address_line: z.string().nullable().optional(),
          external_id: z.string().nullable().optional(),
          latitude: z.number().nullable().optional(),
          longitude: z.number().nullable().optional(),
        })
        .parse(args);
      return client.locations.create({
        tenantId: p.tenant_id,
        name: p.name,
        description: p.description ?? null,
        parentLocationId: p.parent_location_id ?? null,
        locationType: p.location_type ?? null,
        code: p.code ?? null,
        addressLine: p.address_line ?? null,
        externalId: p.external_id ?? null,
        latitude: p.latitude ?? null,
        longitude: p.longitude ?? null,
      });
    },
  },
  'locations.update': {
    description: 'Update a location.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      location_id: uuid,
      name: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
      parent_location_id: uuid.nullable().optional(),
      location_type: locationType.nullable().optional(),
      code: z.string().nullable().optional(),
      address_line: z.string().nullable().optional(),
      external_id: z.string().nullable().optional(),
      latitude: z.number().nullable().optional(),
      longitude: z.number().nullable().optional(),
      clear_position: z.boolean().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          location_id: uuid,
          name: z.string().nullable().optional(),
          description: z.string().nullable().optional(),
          parent_location_id: uuid.nullable().optional(),
          location_type: locationType.nullable().optional(),
          code: z.string().nullable().optional(),
          address_line: z.string().nullable().optional(),
          external_id: z.string().nullable().optional(),
          latitude: z.number().nullable().optional(),
          longitude: z.number().nullable().optional(),
          clear_position: z.boolean().optional(),
        })
        .parse(args);
      await client.locations.update({
        tenantId: p.tenant_id,
        locationId: p.location_id,
        name: p.name ?? null,
        description: p.description ?? null,
        parentLocationId: p.parent_location_id ?? null,
        locationType: p.location_type ?? null,
        code: p.code ?? null,
        addressLine: p.address_line ?? null,
        externalId: p.external_id ?? null,
        latitude: p.latitude ?? null,
        longitude: p.longitude ?? null,
        clearPosition: p.clear_position,
      });
      return { ok: true };
    },
  },
  'locations.delete': {
    description: 'Delete a location.',
    annotations: ann.destructive,
    inputSchema: z.object({
      tenant_id: uuid,
      location_id: uuid,
    }),
    async invoke(client, args) {
      const p = z.object({ tenant_id: uuid, location_id: uuid }).parse(args);
      await client.locations.delete(p.tenant_id, p.location_id);
      return { ok: true };
    },
  },
  'locations.bulk_import': {
    description: 'Bulk import locations.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      rows: z.array(bulkLocRow),
    }),
    async invoke(client, args) {
      const p = z.object({ tenant_id: uuid, rows: z.array(bulkLocRow) }).parse(args);
      return client.locations.bulkImport({ tenantId: p.tenant_id, rows: p.rows });
    },
  },
};
