import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.js';
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
export declare function createTenantApiKeysResource(supabase: SupabaseClient<Database>): {
    /**
     * Create a new tenant-scoped API key. The raw key is returned once and cannot be retrieved later.
     * Requires tenant.admin. Rate limited to 10/minute per user per tenant.
     */
    create(tenantId: string, name: string): Promise<CreateTenantApiKeyResult>;
    /**
     * List API keys for the tenant (metadata only; no secrets).
     * Requires tenant.admin.
     */
    list(tenantId: string): Promise<TenantApiKeyRow[]>;
    /**
     * Revoke (delete) a tenant API key. Requires tenant.admin.
     */
    revoke(tenantId: string, keyId: string): Promise<void>;
};
export type TenantApiKeysResource = ReturnType<typeof createTenantApiKeysResource>;
//# sourceMappingURL=tenant-api-keys.d.ts.map