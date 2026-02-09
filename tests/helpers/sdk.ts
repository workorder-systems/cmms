import { createDbClient } from '@workorder-systems/sdk';
import { getSupabaseConfig } from './supabase.js';
import { createTestUser } from './auth.js';
import { makeTenant, shortSlug } from './faker.js';
import { setTenantContext } from './tenant.js';

/**
 * Create an SDK client for tests. Uses same config as createTestClient (getSupabaseConfig)
 * with test-friendly auth options (no auto-refresh, no session persistence).
 */
export function createTestSdkClient(): ReturnType<typeof createDbClient> {
  const { url, anonKey } = getSupabaseConfig();
  return createDbClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Create an authenticated user, a tenant (short slug), set tenant context, and return
 * { tenantId, name }. Use in tests that need "authenticated user with one tenant and context set".
 */
export async function withAuthenticatedTenant(
  sdk: ReturnType<typeof createDbClient>
): Promise<{ tenantId: string; name: string }> {
  await createTestUser(sdk.supabase);
  const { name } = makeTenant();
  const tenantId = await sdk.tenants.create({ name, slug: shortSlug() });
  await setTenantContext(sdk.supabase, tenantId);
  return { tenantId, name };
}
