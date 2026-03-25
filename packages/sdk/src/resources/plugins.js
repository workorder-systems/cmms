import { normalizeError } from '../errors.js';
import { callRpc } from '../unwrap.js';
const rpc = (supabase) => supabase.rpc.bind(supabase);
/**
 * Plugins resource: list available plugins, list tenant installations, install, update, uninstall.
 * v_plugins is tenant-agnostic (catalog). v_plugin_installations is tenant-scoped; set tenant context and require tenant.admin.
 */
export function createPluginsResource(supabase) {
    return {
        /** List available plugins (v_plugins). No tenant context required. */
        async list() {
            const { data, error } = await supabase.from('v_plugins').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** Get a single plugin by id. */
        async getById(id) {
            const { data, error } = await supabase.from('v_plugins').select('*').eq('id', id).maybeSingle();
            if (error)
                throw normalizeError(error);
            return data;
        },
        /** List plugin installations for the current tenant (v_plugin_installations). Requires setTenant and tenant.admin. */
        async listInstallations() {
            const { data, error } = await supabase.from('v_plugin_installations').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** Install a plugin for a tenant. Returns the installation UUID. Requires tenant.admin. */
        async install(params) {
            return callRpc(rpc(supabase), 'rpc_install_plugin', {
                p_tenant_id: params.tenantId,
                p_plugin_key: params.pluginKey,
                p_secret_ref: params.secretRef ?? null,
                p_config: params.config ?? null,
            });
        },
        /** Update a plugin installation (status, secret_ref, config). Requires tenant.admin. */
        async updateInstallation(params) {
            return callRpc(rpc(supabase), 'rpc_update_plugin_installation', {
                p_tenant_id: params.tenantId,
                p_installation_id: params.installationId,
                p_status: params.status ?? null,
                p_secret_ref: params.secretRef ?? null,
                p_config: params.config ?? null,
            });
        },
        /** Uninstall a plugin for a tenant. Requires tenant.admin. */
        async uninstall(params) {
            return callRpc(rpc(supabase), 'rpc_uninstall_plugin', {
                p_tenant_id: params.tenantId,
                p_installation_id: params.installationId,
            });
        },
        /** List webhook subscription allowlists for the current tenant (v_plugin_webhook_subscriptions). Requires tenant.admin. */
        async listWebhookSubscriptions() {
            const { data, error } = await supabase.from('v_plugin_webhook_subscriptions').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** Recent outbound webhook delivery metadata for the current tenant (no payload body). Requires tenant.admin. */
        async listRecentDeliveries() {
            const { data, error } = await supabase.from('v_plugin_delivery_queue_recent').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** Create or update a webhook subscription allowlist for an installation. Requires tenant.admin. */
        async upsertWebhookSubscription(params) {
            return callRpc(rpc(supabase), 'rpc_upsert_plugin_webhook_subscription', {
                p_tenant_id: params.tenantId,
                p_installation_id: params.installationId,
                p_table_schema: params.tableSchema,
                p_table_name: params.tableName,
                p_operations: params.operations,
                p_changed_fields_allowlist: params.changedFieldsAllowlist ?? null,
                p_include_payload: params.includePayload ?? false,
            });
        },
        /** Delete a webhook subscription. Requires tenant.admin. */
        async deleteWebhookSubscription(params) {
            return callRpc(rpc(supabase), 'rpc_delete_plugin_webhook_subscription', {
                p_tenant_id: params.tenantId,
                p_subscription_id: params.subscriptionId,
            });
        },
        /**
         * Run the pg_net delivery processor (pending/sending collection and dispatch).
         * Requires service_role JWT; not available to normal app users.
         */
        async processDeliveries(batchSize) {
            return callRpc(rpc(supabase), 'rpc_process_plugin_deliveries', {
                p_batch_size: batchSize ?? null,
            });
        },
    };
}
