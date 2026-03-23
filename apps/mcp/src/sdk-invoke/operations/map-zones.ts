import { z } from 'zod';
import type { SdkOperationDef } from '../types.js';
import { ann } from '../annotations.js';
import { emptyArgs, uuid } from '../zod-common.js';

const geometry = z.record(z.unknown());

export const mapZonesOperations: Record<string, SdkOperationDef> = {
  'map_zones.list': {
    description: 'List map zones.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.mapZones.list();
    },
  },
  'map_zones.get_by_id': {
    description: 'Get one map zone by id.',
    annotations: ann.read,
    inputSchema: z.object({ id: uuid }),
    async invoke(client, args) {
      const { id } = z.object({ id: uuid }).parse(args);
      return client.mapZones.getById(id);
    },
  },
  'map_zones.create': {
    description: 'Create a map zone (GeoJSON geometry).',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      name: z.string().min(1),
      geometry,
      location_id: uuid.nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          name: z.string(),
          geometry,
          location_id: uuid.nullable().optional(),
        })
        .parse(args);
      return client.mapZones.create({
        tenantId: p.tenant_id,
        name: p.name,
        geometry: p.geometry,
        locationId: p.location_id ?? null,
      });
    },
  },
  'map_zones.update': {
    description: 'Update a map zone.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      zone_id: uuid,
      name: z.string().nullable().optional(),
      geometry: geometry.nullable().optional(),
      location_id: uuid.nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          zone_id: uuid,
          name: z.string().nullable().optional(),
          geometry: geometry.nullable().optional(),
          location_id: uuid.nullable().optional(),
        })
        .parse(args);
      await client.mapZones.update({
        tenantId: p.tenant_id,
        zoneId: p.zone_id,
        name: p.name ?? null,
        geometry: p.geometry ?? null,
        locationId: p.location_id ?? null,
      });
      return { ok: true };
    },
  },
  'map_zones.delete': {
    description: 'Delete a map zone.',
    annotations: ann.destructive,
    inputSchema: z.object({
      tenant_id: uuid,
      zone_id: uuid,
    }),
    async invoke(client, args) {
      const p = z.object({ tenant_id: uuid, zone_id: uuid }).parse(args);
      await client.mapZones.delete(p.tenant_id, p.zone_id);
      return { ok: true };
    },
  },
};
