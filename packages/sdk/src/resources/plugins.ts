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
  };
}

export type PluginsResource = ReturnType<typeof createPluginsResource>;
