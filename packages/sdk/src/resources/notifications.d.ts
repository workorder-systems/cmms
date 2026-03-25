import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.js';
/** Row from v_my_notifications (current user, current tenant context). */
export type MyNotificationRow = Database['public']['Views']['v_my_notifications'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
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
/**
 * In-app notifications: list for the signed-in user, mark read, preferences.
 * Requires tenant context (setTenant + refreshed JWT) like other tenant APIs.
 *
 * Background delivery uses `rpc_process_due_notifications` (service role / cron only)—not exposed here.
 */
export declare function createNotificationsResource(supabase: SupabaseClient<Database>): {
    /**
     * List notifications from v_my_notifications (PostgREST filters).
     * Prefer this when the session already carries tenant_id after setTenant + refresh.
     */
    list(options?: ListMyNotificationsOptions): Promise<MyNotificationRow[]>;
    /**
     * Same underlying rows as list(), via rpc_list_my_notifications with explicit tenant id.
     */
    listForTenant(tenantId: string, limit?: number): Promise<MyNotificationRow[]>;
    markRead(params: MarkNotificationsReadParams): Promise<void>;
    upsertPreference(params: UpsertNotificationPreferenceParams): Promise<void>;
};
export type NotificationsResource = ReturnType<typeof createNotificationsResource>;
//# sourceMappingURL=notifications.d.ts.map