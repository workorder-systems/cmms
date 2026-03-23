import { z } from 'zod';
import type { SdkOperationDef } from '../types.js';
import { ann } from '../annotations.js';
import { emptyArgs, uuid } from '../zod-common.js';

export const schedulingOperations: Record<string, SdkOperationDef> = {
  'scheduling.list_schedule_blocks': {
    description: 'List schedule blocks for the tenant.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.scheduling.listScheduleBlocks();
    },
  },
  'scheduling.list_schedule_by_technician': {
    description: 'List schedule by technician; optional technician_id filter.',
    annotations: ann.read,
    inputSchema: z.object({ technician_id: uuid.optional() }),
    async invoke(client, args) {
      const { technician_id } = z.object({ technician_id: uuid.optional() }).parse(args);
      return client.scheduling.listScheduleByTechnician(technician_id);
    },
  },
  'scheduling.list_schedule_by_crew': {
    description: 'List schedule by crew; optional crew_id filter.',
    annotations: ann.read,
    inputSchema: z.object({ crew_id: uuid.optional() }),
    async invoke(client, args) {
      const { crew_id } = z.object({ crew_id: uuid.optional() }).parse(args);
      return client.scheduling.listScheduleByCrew(crew_id);
    },
  },
  'scheduling.list_schedule_by_asset': {
    description: 'List schedule by asset; optional asset_id filter.',
    annotations: ann.read,
    inputSchema: z.object({ asset_id: uuid.optional() }),
    async invoke(client, args) {
      const { asset_id } = z.object({ asset_id: uuid.optional() }).parse(args);
      return client.scheduling.listScheduleByAsset(asset_id);
    },
  },
  'scheduling.list_schedule_by_location': {
    description: 'List schedule by location; optional location_id filter.',
    annotations: ann.read,
    inputSchema: z.object({ location_id: uuid.optional() }),
    async invoke(client, args) {
      const { location_id } = z.object({ location_id: uuid.optional() }).parse(args);
      return client.scheduling.listScheduleByLocation(location_id);
    },
  },
  'scheduling.schedule_work_order': {
    description: 'Schedule a work order (create or replace block).',
    annotations: ann.write,
    inputSchema: z.object({
      work_order_id: uuid,
      technician_id: uuid.nullable().optional(),
      crew_id: uuid.nullable().optional(),
      start_at: z.string().min(1),
      end_at: z.string().min(1),
      location_id: uuid.nullable().optional(),
      asset_id: uuid.nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          work_order_id: uuid,
          technician_id: uuid.nullable().optional(),
          crew_id: uuid.nullable().optional(),
          start_at: z.string(),
          end_at: z.string(),
          location_id: uuid.nullable().optional(),
          asset_id: uuid.nullable().optional(),
        })
        .parse(args);
      return client.scheduling.scheduleWorkOrder({
        workOrderId: p.work_order_id,
        technicianId: p.technician_id ?? null,
        crewId: p.crew_id ?? null,
        startAt: p.start_at,
        endAt: p.end_at,
        locationId: p.location_id ?? null,
        assetId: p.asset_id ?? null,
      });
    },
  },
  'scheduling.update_schedule_block': {
    description: 'Update a schedule block.',
    annotations: ann.write,
    inputSchema: z.object({
      schedule_block_id: uuid,
      technician_id: uuid.nullable().optional(),
      crew_id: uuid.nullable().optional(),
      start_at: z.string().nullable().optional(),
      end_at: z.string().nullable().optional(),
      location_id: uuid.nullable().optional(),
      asset_id: uuid.nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          schedule_block_id: uuid,
          technician_id: uuid.nullable().optional(),
          crew_id: uuid.nullable().optional(),
          start_at: z.string().nullable().optional(),
          end_at: z.string().nullable().optional(),
          location_id: uuid.nullable().optional(),
          asset_id: uuid.nullable().optional(),
        })
        .parse(args);
      return client.scheduling.updateScheduleBlock({
        scheduleBlockId: p.schedule_block_id,
        technicianId: p.technician_id ?? null,
        crewId: p.crew_id ?? null,
        startAt: p.start_at ?? null,
        endAt: p.end_at ?? null,
        locationId: p.location_id ?? null,
        assetId: p.asset_id ?? null,
      });
    },
  },
  'scheduling.validate_schedule': {
    description: 'Validate a candidate schedule slot.',
    annotations: ann.read,
    inputSchema: z.object({
      technician_id: uuid.nullable().optional(),
      crew_id: uuid.nullable().optional(),
      start_at: z.string().nullable().optional(),
      end_at: z.string().nullable().optional(),
      work_order_id: uuid.nullable().optional(),
      exclude_block_id: uuid.nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          technician_id: uuid.nullable().optional(),
          crew_id: uuid.nullable().optional(),
          start_at: z.string().nullable().optional(),
          end_at: z.string().nullable().optional(),
          work_order_id: uuid.nullable().optional(),
          exclude_block_id: uuid.nullable().optional(),
        })
        .parse(args);
      return client.scheduling.validateSchedule({
        technicianId: p.technician_id ?? null,
        crewId: p.crew_id ?? null,
        startAt: p.start_at ?? null,
        endAt: p.end_at ?? null,
        workOrderId: p.work_order_id ?? null,
        excludeBlockId: p.exclude_block_id ?? null,
      });
    },
  },
  'scheduling.unschedule_work_order': {
    description: 'Remove schedule block for a work order.',
    annotations: ann.write,
    inputSchema: z.object({
      schedule_block_id: uuid.optional(),
      work_order_id: uuid.optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          schedule_block_id: uuid.optional(),
          work_order_id: uuid.optional(),
        })
        .parse(args);
      await client.scheduling.unscheduleWorkOrder({
        scheduleBlockId: p.schedule_block_id,
        workOrderId: p.work_order_id,
      });
      return { ok: true };
    },
  },
};
