import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.js';
import { normalizeError } from '../errors.js';
import { callRpc } from '../unwrap.js';

/** Metadata for a tenant API key (no secret). Returned by list. */
export interface TenantApiKeyRow {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
}

/** Result of creating an API key. The raw `key` is only returned once. */
export interface CreateTenantApiKeyResult {
  id: string;
  key: string;
  keyPrefix: string;
  name: string;
  createdAt: string;
}

const rpc = (supabase: SupabaseClient<Database>) =>
  (supabase as unknown as { rpc: (n: string, p?: object) => Promise<{ data: unknown; error: unknown }> }).rpc.bind(supabase);

export function createTenantApiKeysResource(supabase: SupabaseClient<Database>) {
  return {
    /**
     * Create a new tenant-scoped API key. The raw key is returned once and cannot be retrieved later.
     * Requires tenant.admin. Rate limited to 10/minute per user per tenant.
     */
    async create(tenantId: string, name: string): Promise<CreateTenantApiKeyResult> {
      const raw = await callRpc(rpc(supabase), 'rpc_create_tenant_api_key', {
        p_tenant_id: tenantId,
        p_name: name,
      });
      return raw as CreateTenantApiKeyResult;
    },

    /**
     * List API keys for the tenant (metadata only; no secrets).
     * Requires tenant.admin.
     */
    async list(tenantId: string): Promise<TenantApiKeyRow[]> {
      const { data, error } = await supabase.rpc('rpc_list_tenant_api_keys', {
        p_tenant_id: tenantId,
      });
      if (error) throw normalizeError(error);
      return (data ?? []) as TenantApiKeyRow[];
    },

    /**
     * Revoke (delete) a tenant API key. Requires tenant.admin.
     */
    async revoke(tenantId: string, keyId: string): Promise<void> {
      return callRpc(rpc(supabase), 'rpc_revoke_tenant_api_key', {
        p_tenant_id: tenantId,
        p_key_id: keyId,
      });
    },
  };
}

export type TenantApiKeysResource = ReturnType<typeof createTenantApiKeysResource>;
