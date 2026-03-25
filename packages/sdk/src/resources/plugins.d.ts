import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.js';
/** Row from v_plugins view (catalog of available plugins). */
export type PluginRow = Database['public']['Views']['v_plugins'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
/** Row from v_plugin_installations view (tenant's installed plugins; requires tenant.admin). */
export type PluginInstallationRow = Database['public']['Views']['v_plugin_installations'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
/** Params for installing a plugin for a tenant. */
export interface InstallPluginParams {
    tenantId: string;
    pluginKey: string;
    secretRef?: string | null;
    config?: Record<string, unknown> | null;
}
/** Params for updating a plugin installation. */
export interface UpdatePluginInstallationParams {
    tenantId: string;
    installationId: string;
    status?: string | null;
    secretRef?: string | null;
    config?: Record<string, unknown> | null;
}
/** Params for uninstalling a plugin. */
export interface UninstallPluginParams {
    tenantId: string;
    installationId: string;
}
/** Row from v_plugin_webhook_subscriptions (tenant admin; set tenant context). */
export type PluginWebhookSubscriptionRow = Database['public']['Views']['v_plugin_webhook_subscriptions'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
/** Row from v_plugin_delivery_queue_recent (tenant admin; set tenant context). */
export type PluginDeliveryQueueRecentRow = Database['public']['Views']['v_plugin_delivery_queue_recent'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
/** Params for upserting a webhook subscription allowlist row. */
export interface UpsertPluginWebhookSubscriptionParams {
    tenantId: string;
    installationId: string;
    tableSchema: string;
    tableName: string;
    operations: string[];
    changedFieldsAllowlist?: string[] | null;
    includePayload?: boolean;
}
/** Params for deleting a webhook subscription. */
export interface DeletePluginWebhookSubscriptionParams {
    tenantId: string;
    subscriptionId: string;
}
/**
 * Plugins resource: list available plugins, list tenant installations, install, update, uninstall.
 * v_plugins is tenant-agnostic (catalog). v_plugin_installations is tenant-scoped; set tenant context and require tenant.admin.
 */
export declare function createPluginsResource(supabase: SupabaseClient<Database>): {
    /** List available plugins (v_plugins). No tenant context required. */
    list(): Promise<PluginRow[]>;
    /** Get a single plugin by id. */
    getById(id: string): Promise<PluginRow | null>;
    /** List plugin installations for the current tenant (v_plugin_installations). Requires setTenant and tenant.admin. */
    listInstallations(): Promise<PluginInstallationRow[]>;
    /** Install a plugin for a tenant. Returns the installation UUID. Requires tenant.admin. */
    install(params: InstallPluginParams): Promise<string>;
    /** Update a plugin installation (status, secret_ref, config). Requires tenant.admin. */
    updateInstallation(params: UpdatePluginInstallationParams): Promise<void>;
    /** Uninstall a plugin for a tenant. Requires tenant.admin. */
    uninstall(params: UninstallPluginParams): Promise<void>;
    /** List webhook subscription allowlists for the current tenant (v_plugin_webhook_subscriptions). Requires tenant.admin. */
    listWebhookSubscriptions(): Promise<PluginWebhookSubscriptionRow[]>;
    /** Recent outbound webhook delivery metadata for the current tenant (no payload body). Requires tenant.admin. */
    listRecentDeliveries(): Promise<PluginDeliveryQueueRecentRow[]>;
    /** Create or update a webhook subscription allowlist for an installation. Requires tenant.admin. */
    upsertWebhookSubscription(params: UpsertPluginWebhookSubscriptionParams): Promise<string>;
    /** Delete a webhook subscription. Requires tenant.admin. */
    deleteWebhookSubscription(params: DeletePluginWebhookSubscriptionParams): Promise<void>;
    /**
     * Run the pg_net delivery processor (pending/sending collection and dispatch).
     * Requires service_role JWT; not available to normal app users.
     */
    processDeliveries(batchSize?: number): Promise<number>;
};
export type PluginsResource = ReturnType<typeof createPluginsResource>;
//# sourceMappingURL=plugins.d.ts.map