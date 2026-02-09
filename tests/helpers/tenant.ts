import { SupabaseClient } from '@supabase/supabase-js';
import { makeTenant } from './faker';
import { TEST_PASSWORD } from './auth';
import { formatPostgrestError } from './errors.js';

/**
 * Create a test tenant using the RPC function.
 * If name/slug are not provided, a realistic facilities company is generated.
 */
export async function createTestTenant(
  client: SupabaseClient,
  name?: string,
  slug?: string
): Promise<string> {
  const generated = makeTenant();
  const finalName = name ?? generated.name;
  const finalSlug = slug ?? generated.slug;

  const { data, error } = await client.rpc('rpc_create_tenant', {
    p_name: finalName,
    p_slug: finalSlug,
  });

  if (!error) {
    const tenantId = data as string;
    
    // rpc_create_tenant now automatically sets tenant context (user metadata + session variable)
    // However, for PostgREST view queries, we need to refresh the JWT to include tenant_id in claims
    // This call is idempotent - it just refreshes the JWT since context is already set
    await setTenantContext(client, tenantId);
    
    return tenantId;
  }

  // If a tenant with this slug already exists for the current user (e.g. from a previous
  // test run), reuse it instead of failing. This keeps tests idempotent across runs without
  // requiring a full database reset.
  if (error.code === '23505' && error.message?.includes('tenants_slug_unique')) {
    // v_tenants shows all tenants the user is a member of (no tenant context required)
    // Query to find the existing tenant by slug
    const { data: existing, error: viewError } = await client
      .from('v_tenants')
      .select('id')
      .eq('slug', finalSlug)
      .single();

    if (!viewError && existing) {
      const tenantId = existing.id as string;
      // Set tenant context so views work immediately
      await setTenantContext(client, tenantId);
      return tenantId;
    }
  }

  throw new Error(formatPostgrestError('Failed to create tenant', error));
}

/**
 * Add a user to a tenant by assigning the member role.
 * Requires tenant.admin permission on the caller.
 */
export async function addUserToTenant(
  adminClient: SupabaseClient,
  userId: string,
  tenantId: string
): Promise<void> {
  await assignRoleToUser(adminClient, userId, tenantId, 'member');
}

/**
 * Assign a role to a user in a tenant using the public RPC.
 */
export async function assignRoleToUser(
  adminClient: SupabaseClient,
  userId: string,
  tenantId: string,
  roleKey: string
): Promise<void> {
  const { error } = await adminClient.rpc('rpc_assign_role_to_user', {
    p_tenant_id: tenantId,
    p_user_id: userId,
    p_role_key: roleKey,
  });

  if (error) {
    throw new Error(formatPostgrestError('Failed to assign role', error));
  }
}

/**
 * Get tenant by slug (uses public view scoped to current user).
 */
export async function getTenantBySlug(
  client: SupabaseClient,
  slug: string
): Promise<{ id: string; name: string; slug: string } | null> {
  const { data, error } = await client
    .from('v_tenants')
    .select('id, name, slug')
    .eq('slug', slug)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(formatPostgrestError('Failed to get tenant', error));
  }

  return data;
}

/**
 * Set tenant context for a client
 * Updates user metadata and forces a new token by signing out/in to trigger JWT hook
 * This ensures the custom_access_token_hook runs and adds tenant_id to JWT claims
 */
export async function setTenantContext(
  client: SupabaseClient,
  tenantId: string
): Promise<void> {
  // Get current user email before signing out
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData?.user?.email) {
    throw new Error(
      userError ? formatPostgrestError('Failed to get current user', userError) : 'No user email'
    );
  }
  const userEmail = userData.user.email;

  // Set tenant context (updates user metadata)
  const { error } = await client.rpc('rpc_set_tenant_context', {
    p_tenant_id: tenantId,
  });

  if (error) {
    throw new Error(formatPostgrestError('Failed to set tenant context', error));
  }

  // Sign out to invalidate current token (ignore errors - session might already be invalid)
  await client.auth.signOut().catch(() => {
    // Ignore sign out errors - session might already be invalid
  });

  // Sign back in to force a new token (this triggers custom_access_token_hook)
  // All test users use TEST_PASSWORD (from faker.makeUser())
  const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
    email: userEmail,
    password: TEST_PASSWORD,
  });

  if (signInError) {
    throw new Error(
      formatPostgrestError('Failed to sign in after setting tenant context', signInError) +
        '. Make sure test user was created with TEST_PASSWORD.'
    );
  }

  // Verify session was created with new token
  if (!signInData?.session) {
    throw new Error('Failed to get session after sign in - no session returned');
  }
}

/**
 * Clear tenant context from user metadata and refresh JWT
 * Useful for testing scenarios where tenant context should not be set
 */
export async function clearTenantContext(
  client: SupabaseClient
): Promise<void> {
  // Get current user email before signing out
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData?.user?.email) {
    throw new Error(
      userError ? formatPostgrestError('Failed to get current user', userError) : 'No user email'
    );
  }
  const userEmail = userData.user.email;

  // Clear tenant context (updates user metadata)
  const { error } = await client.rpc('rpc_clear_tenant_context');

  if (error) {
    throw new Error(formatPostgrestError('Failed to clear tenant context', error));
  }

  // Sign out to invalidate current token (ignore errors - session might already be invalid)
  await client.auth.signOut().catch(() => {
    // Ignore sign out errors - session might already be invalid
  });

  // Sign back in to force a new token (this triggers custom_access_token_hook)
  // All test users use TEST_PASSWORD (from faker.makeUser())
  const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
    email: userEmail,
    password: TEST_PASSWORD,
  });

  if (signInError) {
    throw new Error(
      formatPostgrestError('Failed to sign in after clearing tenant context', signInError) +
        '. Make sure test user was created with TEST_PASSWORD.'
    );
  }

  // Verify session was created with new token
  if (!signInData?.session) {
    throw new Error('Failed to get session after sign in - no session returned');
  }
}
