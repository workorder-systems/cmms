import { z } from 'zod';
import type { SdkOperationDef } from '../types.js';
import { ann } from '../annotations.js';
import { emptyArgs, uuid } from '../zod-common.js';

export const metersOperations: Record<string, SdkOperationDef> = {
  'meters.list': {
    description: 'List asset meters.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.meters.list();
    },
  },
  'meters.get_readings': {
    description: 'List meter readings.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.meters.getReadings();
    },
  },
  'meters.create': {
    description: 'Create a meter.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      asset_id: uuid,
      meter_type: z.string().min(1),
      name: z.string().min(1),
      unit: z.string().min(1),
      current_reading: z.number().optional(),
      reading_direction: z.string().optional(),
      decimal_places: z.number().optional(),
      description: z.string().nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          asset_id: uuid,
          meter_type: z.string(),
          name: z.string(),
          unit: z.string(),
          current_reading: z.number().optional(),
          reading_direction: z.string().optional(),
          decimal_places: z.number().optional(),
          description: z.string().nullable().optional(),
        })
        .parse(args);
      return client.meters.create({
        tenantId: p.tenant_id,
        assetId: p.asset_id,
        meterType: p.meter_type,
        name: p.name,
        unit: p.unit,
        currentReading: p.current_reading,
        readingDirection: p.reading_direction,
        decimalPlaces: p.decimal_places,
        description: p.description ?? null,
      });
    },
  },
  'meters.update': {
    description: 'Update a meter.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      meter_id: uuid,
      name: z.string().nullable().optional(),
      unit: z.string().nullable().optional(),
      reading_direction: z.string().nullable().optional(),
      decimal_places: z.number().nullable().optional(),
      description: z.string().nullable().optional(),
      is_active: z.boolean().nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          meter_id: uuid,
          name: z.string().nullable().optional(),
          unit: z.string().nullable().optional(),
          reading_direction: z.string().nullable().optional(),
          decimal_places: z.number().nullable().optional(),
          description: z.string().nullable().optional(),
          is_active: z.boolean().nullable().optional(),
        })
        .parse(args);
      await client.meters.update({
        tenantId: p.tenant_id,
        meterId: p.meter_id,
        name: p.name ?? null,
        unit: p.unit ?? null,
        readingDirection: p.reading_direction ?? null,
        decimalPlaces: p.decimal_places ?? null,
        description: p.description ?? null,
        isActive: p.is_active ?? null,
      });
      return { ok: true };
    },
  },
  'meters.record_reading': {
    description: 'Record a meter reading.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      meter_id: uuid,
      reading_value: z.number(),
      reading_date: z.string().nullable().optional(),
      reading_type: z.string().optional(),
      notes: z.string().nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          meter_id: uuid,
          reading_value: z.number(),
          reading_date: z.string().nullable().optional(),
          reading_type: z.string().optional(),
          notes: z.string().nullable().optional(),
        })
        .parse(args);
      return client.meters.recordReading({
        tenantId: p.tenant_id,
        meterId: p.meter_id,
        readingValue: p.reading_value,
        readingDate: p.reading_date ?? null,
        readingType: p.reading_type,
        notes: p.notes ?? null,
      });
    },
  },
  'meters.delete': {
    description: 'Delete a meter.',
    annotations: ann.destructive,
    inputSchema: z.object({
      tenant_id: uuid,
      meter_id: uuid,
    }),
    async invoke(client, args) {
      const p = z.object({ tenant_id: uuid, meter_id: uuid }).parse(args);
      await client.meters.delete(p.tenant_id, p.meter_id);
      return { ok: true };
    },
  },
};
