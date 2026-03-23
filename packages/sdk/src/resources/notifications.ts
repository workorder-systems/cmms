import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.js';
import { normalizeError } from '../errors.js';
import { callRpc } from '../unwrap.js';

/** Row from v_my_notifications (current user, current tenant context). */
export type MyNotificationRow = Database['public']['Views']['v_my_notifications'] extends { Row: infer R }
  ? R
  : Record<string, unknown>;

export interface ListMyNotificationsOptions {
  /** Max rows (default 50). */
  limit?: number;
  /** When true, only rows where read_at is null. */
  unreadOnly?: boolean;
}

export interface MarkNotificationsReadParams {
  tenantId: string;
  notificationIds: string[];
}

export interface UpsertNotificationPreferenceParams {
  tenantId: string;
  eventKey: string;
  channelInApp: boolean;
}

const rpc = (supabase: SupabaseClient<Database>) =>
  (supabase as unknown as { rpc: (n: string, p?: object) => Promise<{ data: unknown; error: unknown }> }).rpc.bind(
    supabase
  );

/**
 * In-app notifications: list for the signed-in user, mark read, preferences.
 * Requires tenant context (setTenant + refreshed JWT) like other tenant APIs.
 *
 * Background delivery uses `rpc_process_due_notifications` (service role / cron only)—not exposed here.
 */
export function createNotificationsResource(supabase: SupabaseClient<Database>) {
  return {
    /**
     * List notifications from v_my_notifications (PostgREST filters).
     * Prefer this when the session already carries tenant_id after setTenant + refresh.
     */
    async list(options?: ListMyNotificationsOptions): Promise<MyNotificationRow[]> {
      const limit = options?.limit ?? 50;
      let q = supabase.from('v_my_notifications').select('*').order('created_at', { ascending: false }).limit(limit);
      if (options?.unreadOnly) {
        q = q.is('read_at', null);
      }
      const { data, error } = await q;
      if (error) throw normalizeError(error);
      return (data ?? []) as MyNotificationRow[];
    },

    /**
     * Same underlying rows as list(), via rpc_list_my_notifications with explicit tenant id.
     */
    async listForTenant(tenantId: string, limit?: number): Promise<MyNotificationRow[]> {
      const rows = await callRpc<unknown[]>(rpc(supabase), 'rpc_list_my_notifications', {
        p_tenant_id: tenantId,
        p_limit: limit ?? 50,
      });
      return rows as MyNotificationRow[];
    },

    async markRead(params: MarkNotificationsReadParams): Promise<void> {
      await callRpc(rpc(supabase), 'rpc_mark_notifications_read', {
        p_tenant_id: params.tenantId,
        p_notification_ids: params.notificationIds,
      });
    },

    async upsertPreference(params: UpsertNotificationPreferenceParams): Promise<void> {
      await callRpc(rpc(supabase), 'rpc_upsert_notification_preference', {
        p_tenant_id: params.tenantId,
        p_event_key: params.eventKey,
        p_channel_in_app: params.channelInApp,
      });
    },
  };
}

export type NotificationsResource = ReturnType<typeof createNotificationsResource>;
