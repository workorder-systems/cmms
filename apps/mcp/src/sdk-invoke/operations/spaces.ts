import { z } from 'zod';
import type { SdkOperationDef } from '../types.js';
import { ann } from '../annotations.js';
import { emptyArgs, uuid } from '../zod-common.js';

const spaceStatus = z.enum(['available', 'occupied', 'maintenance', 'reserved', 'offline']);

export const spacesOperations: Record<string, SdkOperationDef> = {
  'spaces.list': {
    description: 'List spaces.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.spaces.list();
    },
  },
  'spaces.get_by_id': {
    description: 'Get one space by id.',
    annotations: ann.read,
    inputSchema: z.object({ id: uuid }),
    async invoke(client, args) {
      const { id } = z.object({ id: uuid }).parse(args);
      return client.spaces.getById(id);
    },
  },
  'spaces.get_by_location_id': {
    description: 'Get space by location id.',
    annotations: ann.read,
    inputSchema: z.object({ location_id: uuid }),
    async invoke(client, args) {
      const { location_id } = z.object({ location_id: uuid }).parse(args);
      return client.spaces.getByLocationId(location_id);
    },
  },
  'spaces.create': {
    description: 'Create a space.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      location_id: uuid,
      usage_type: z.string().nullable().optional(),
      capacity: z.number().nullable().optional(),
      status: spaceStatus.nullable().optional(),
      area_sqft: z.number().nullable().optional(),
      attributes: z.record(z.unknown()).nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          location_id: uuid,
          usage_type: z.string().nullable().optional(),
          capacity: z.number().nullable().optional(),
          status: spaceStatus.nullable().optional(),
          area_sqft: z.number().nullable().optional(),
          attributes: z.record(z.unknown()).nullable().optional(),
        })
        .parse(args);
      return client.spaces.create({
        tenantId: p.tenant_id,
        locationId: p.location_id,
        usageType: p.usage_type ?? null,
        capacity: p.capacity ?? null,
        status: p.status ?? null,
        areaSqft: p.area_sqft ?? null,
        attributes: p.attributes ?? null,
      });
    },
  },
  'spaces.update': {
    description: 'Update a space.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      space_id: uuid,
      usage_type: z.string().nullable().optional(),
      capacity: z.number().nullable().optional(),
      status: spaceStatus.nullable().optional(),
      area_sqft: z.number().nullable().optional(),
      attributes: z.record(z.unknown()).nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          space_id: uuid,
          usage_type: z.string().nullable().optional(),
          capacity: z.number().nullable().optional(),
          status: spaceStatus.nullable().optional(),
          area_sqft: z.number().nullable().optional(),
          attributes: z.record(z.unknown()).nullable().optional(),
        })
        .parse(args);
      await client.spaces.update({
        tenantId: p.tenant_id,
        spaceId: p.space_id,
        usageType: p.usage_type ?? null,
        capacity: p.capacity ?? null,
        status: p.status ?? null,
        areaSqft: p.area_sqft ?? null,
        attributes: p.attributes ?? null,
      });
      return { ok: true };
    },
  },
  'spaces.delete': {
    description: 'Delete a space.',
    annotations: ann.destructive,
    inputSchema: z.object({
      tenant_id: uuid,
      space_id: uuid,
    }),
    async invoke(client, args) {
      const p = z.object({ tenant_id: uuid, space_id: uuid }).parse(args);
      await client.spaces.delete(p.tenant_id, p.space_id);
      return { ok: true };
    },
  },
};
