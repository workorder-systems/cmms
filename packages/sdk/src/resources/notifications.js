import { normalizeError } from '../errors.js';
import { callRpc } from '../unwrap.js';
const rpc = (supabase) => supabase.rpc.bind(supabase);
/**
 * In-app notifications: list for the signed-in user, mark read, preferences.
 * Requires tenant context (setTenant + refreshed JWT) like other tenant APIs.
 *
 * Background delivery uses `rpc_process_due_notifications` (service role / cron only)—not exposed here.
 */
export function createNotificationsResource(supabase) {
    return {
        /**
         * List notifications from v_my_notifications (PostgREST filters).
         * Prefer this when the session already carries tenant_id after setTenant + refresh.
         */
        async list(options) {
            const limit = options?.limit ?? 50;
            let q = supabase.from('v_my_notifications').select('*').order('created_at', { ascending: false }).limit(limit);
            if (options?.unreadOnly) {
                q = q.is('read_at', null);
            }
            const { data, error } = await q;
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /**
         * Same underlying rows as list(), via rpc_list_my_notifications with explicit tenant id.
         */
        async listForTenant(tenantId, limit) {
            const rows = await callRpc(rpc(supabase), 'rpc_list_my_notifications', {
                p_tenant_id: tenantId,
                p_limit: limit ?? 50,
            });
            return rows;
        },
        async markRead(params) {
            await callRpc(rpc(supabase), 'rpc_mark_notifications_read', {
                p_tenant_id: params.tenantId,
                p_notification_ids: params.notificationIds,
            });
        },
        async upsertPreference(params) {
            await callRpc(rpc(supabase), 'rpc_upsert_notification_preference', {
                p_tenant_id: params.tenantId,
                p_event_key: params.eventKey,
                p_channel_in_app: params.channelInApp,
            });
        },
    };
}
