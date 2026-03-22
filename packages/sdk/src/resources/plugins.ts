import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.js';
import { normalizeError } from '../errors.js';
import { callRpc } from '../unwrap.js';

/** Row from v_plugins view (catalog of available plugins). */
export type PluginRow = Database['public']['Views']['v_plugins'] extends { Row: infer R } ? R : Record<string, unknown>;

/** Row from v_plugin_installations view (tenant's installed plugins; requires tenant.admin). */
export type PluginInstallationRow =
  Database['public']['Views']['v_plugin_installations'] extends { Row: infer R } ? R : Record<string, unknown>;

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
export type PluginWebhookSubscriptionRow =
  Database['public']['Views']['v_plugin_webhook_subscriptions'] extends { Row: infer R } ? R : Record<string, unknown>;

/** Row from v_plugin_delivery_queue_recent (tenant admin; set tenant context). */
export type PluginDeliveryQueueRecentRow =
  Database['public']['Views']['v_plugin_delivery_queue_recent'] extends { Row: infer R } ? R : Record<string, unknown>;

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

const rpc = (supabase: SupabaseClient<Database>) =>
  (supabase as unknown as { rpc: (n: string, p?: object) => Promise<{ data: unknown; error: unknown }> }).rpc.bind(
    supabase
  );

/**
 * Plugins resource: list available plugins, list tenant installations, install, update, uninstall.
 * v_plugins is tenant-agnostic (catalog). v_plugin_installations is tenant-scoped; set tenant context and require tenant.admin.
 */
export function createPluginsResource(supabase: SupabaseClient<Database>) {
  return {
    /** List available plugins (v_plugins). No tenant context required. */
    async list(): Promise<PluginRow[]> {
      const { data, error } = await supabase.from('v_plugins').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as PluginRow[];
    },

    /** Get a single plugin by id. */
    async getById(id: string): Promise<PluginRow | null> {
      const { data, error } = await supabase.from('v_plugins').select('*').eq('id', id).maybeSingle();
      if (error) throw normalizeError(error);
      return data as PluginRow | null;
    },

    /** List plugin installations for the current tenant (v_plugin_installations). Requires setTenant and tenant.admin. */
    async listInstallations(): Promise<PluginInstallationRow[]> {
      const { data, error } = await supabase.from('v_plugin_installations').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as PluginInstallationRow[];
    },

    /** Install a plugin for a tenant. Returns the installation UUID. Requires tenant.admin. */
    async install(params: InstallPluginParams): Promise<string> {
      return callRpc(rpc(supabase), 'rpc_install_plugin', {
        p_tenant_id: params.tenantId,
        p_plugin_key: params.pluginKey,
        p_secret_ref: params.secretRef ?? null,
        p_config: params.config ?? null,
      });
    },

    /** Update a plugin installation (status, secret_ref, config). Requires tenant.admin. */
    async updateInstallation(params: UpdatePluginInstallationParams): Promise<void> {
      return callRpc(rpc(supabase), 'rpc_update_plugin_installation', {
        p_tenant_id: params.tenantId,
        p_installation_id: params.installationId,
        p_status: params.status ?? null,
        p_secret_ref: params.secretRef ?? null,
        p_config: params.config ?? null,
      });
    },

    /** Uninstall a plugin for a tenant. Requires tenant.admin. */
    async uninstall(params: UninstallPluginParams): Promise<void> {
      return callRpc(rpc(supabase), 'rpc_uninstall_plugin', {
        p_tenant_id: params.tenantId,
        p_installation_id: params.installationId,
      });
    },

    /** List webhook subscription allowlists for the current tenant (v_plugin_webhook_subscriptions). Requires tenant.admin. */
    async listWebhookSubscriptions(): Promise<PluginWebhookSubscriptionRow[]> {
      const { data, error } = await supabase.from('v_plugin_webhook_subscriptions').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as PluginWebhookSubscriptionRow[];
    },

    /** Recent outbound webhook delivery metadata for the current tenant (no payload body). Requires tenant.admin. */
    async listRecentDeliveries(): Promise<PluginDeliveryQueueRecentRow[]> {
      const { data, error } = await supabase.from('v_plugin_delivery_queue_recent').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as PluginDeliveryQueueRecentRow[];
    },

    /** Create or update a webhook subscription allowlist for an installation. Requires tenant.admin. */
    async upsertWebhookSubscription(params: UpsertPluginWebhookSubscriptionParams): Promise<string> {
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
    async deleteWebhookSubscription(params: DeletePluginWebhookSubscriptionParams): Promise<void> {
      return callRpc(rpc(supabase), 'rpc_delete_plugin_webhook_subscription', {
        p_tenant_id: params.tenantId,
        p_subscription_id: params.subscriptionId,
      });
    },

    /**
     * Run the pg_net delivery processor (pending/sending collection and dispatch).
     * Requires service_role JWT; not available to normal app users.
     */
    async processDeliveries(batchSize?: number): Promise<number> {
      return callRpc(rpc(supabase), 'rpc_process_plugin_deliveries', {
        p_batch_size: batchSize ?? null,
      });
    },
  };
}

export type PluginsResource = ReturnType<typeof createPluginsResource>;
