import { z } from 'zod';
import type { SdkOperationDef } from '../types.js';
import { ann } from '../annotations.js';
import { uuid } from '../zod-common.js';

export const notificationsOperations: Record<string, SdkOperationDef> = {
  'notifications.list': {
    description: 'List in-app notifications for the current user.',
    annotations: ann.read,
    inputSchema: z.object({
      limit: z.number().int().positive().optional(),
      unread_only: z.boolean().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          limit: z.number().int().positive().optional(),
          unread_only: z.boolean().optional(),
        })
        .parse(args);
      return client.notifications.list({
        limit: p.limit,
        unreadOnly: p.unread_only,
      });
    },
  },
  'notifications.list_for_tenant': {
    description: 'List notifications with explicit tenant id.',
    annotations: ann.read,
    inputSchema: z.object({
      tenant_id: uuid,
      limit: z.number().int().positive().optional(),
    }),
    async invoke(client, args) {
      const p = z.object({ tenant_id: uuid, limit: z.number().int().positive().optional() }).parse(args);
      return client.notifications.listForTenant(p.tenant_id, p.limit);
    },
  },
  'notifications.mark_read': {
    description: 'Mark notifications as read.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      notification_ids: z.array(uuid),
    }),
    async invoke(client, args) {
      const p = z.object({ tenant_id: uuid, notification_ids: z.array(uuid) }).parse(args);
      await client.notifications.markRead({
        tenantId: p.tenant_id,
        notificationIds: p.notification_ids,
      });
      return { ok: true };
    },
  },
  'notifications.upsert_preference': {
    description: 'Upsert notification preference.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      event_key: z.string().min(1),
      channel_in_app: z.boolean(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          event_key: z.string(),
          channel_in_app: z.boolean(),
        })
        .parse(args);
      await client.notifications.upsertPreference({
        tenantId: p.tenant_id,
        eventKey: p.event_key,
        channelInApp: p.channel_in_app,
      });
      return { ok: true };
    },
  },
};
