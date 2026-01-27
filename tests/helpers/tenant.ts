import { SupabaseClient } from '@supabase/supabase-js';
import { makeTenant } from './faker';

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
    return data as string;
  }

  // If a tenant with this slug already exists for the current user (e.g. from a previous
  // test run), reuse it instead of failing. This keeps tests idempotent across runs without
  // requiring a full database reset.
  if (error.code === '23505' && error.message?.includes('tenants_slug_unique')) {
    const { data: existing, error: viewError } = await client
      .from('v_tenants')
      .select('id')
      .eq('slug', finalSlug)
      .single();

    if (!viewError && existing) {
      return existing.id as string;
    }
  }

  throw new Error(`Failed to create tenant: ${error.message}`);
}

/**
 * Create a tenant via direct insert (bypasses RLS using service role client).
 *
 * Use this only for test setup where you explicitly do NOT want to exercise the
 * `rpc_create_tenant` permission/auth flows (e.g., anonymous access tests).
 */
export async function createTestTenantDirect(
  serviceClient: SupabaseClient,
  name?: string,
  slug?: string
): Promise<string> {
  const generated = makeTenant();
  const finalName = name ?? generated.name;
  const finalSlug = slug ?? generated.slug;

  const { data, error } = await serviceClient
    .schema('app')
    .from('tenants')
    .insert({
      name: finalName,
      slug: finalSlug,
    })
    .select('id')
    .single();

  if (error) {
    // If the slug is already in use (e.g. from a previous test run), reuse the existing tenant.
    if (error.code === '23505' && error.message?.includes('tenants_slug_unique')) {
      const { data: existing, error: fetchError } = await serviceClient
        .schema('app')
        .from('tenants')
        .select('id')
        .eq('slug', finalSlug)
        .single();

      if (!fetchError && existing) {
        return existing.id;
      }
    }

    throw new Error(`Failed to create tenant (direct): ${error.message}`);
  }

  return data.id;
}

/**
 * Add a user to a tenant (bypasses RLS using service role client)
 * Creates a membership record
 */
export async function addUserToTenant(
  serviceClient: SupabaseClient,
  userId: string,
  tenantId: string
): Promise<void> {
  // Use service role client to access app schema directly
  const { error } = await serviceClient
    .schema('app')
    .from('tenant_memberships')
    .insert({
      user_id: userId,
      tenant_id: tenantId,
    });

  if (error) {
    // Ignore duplicate key errors (user already member)
    if (error.code === '23505') {
      return;
    }
    throw new Error(`Failed to add user to tenant: ${error.message}`);
  }
}

/**
 * Assign a role to a user in a tenant (bypasses RLS using service role client)
 */
export async function assignRoleToUser(
  serviceClient: SupabaseClient,
  userId: string,
  tenantId: string,
  roleKey: string
): Promise<void> {
  // First get the role ID (using cfg schema)
  const { data: role, error: roleError } = await serviceClient
    .schema('cfg')
    .from('tenant_roles')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('key', roleKey)
    .single();

  if (roleError || !role) {
    throw new Error(`Role ${roleKey} not found in tenant: ${roleError?.message}`);
  }

  // Ensure user is a member first
  await addUserToTenant(serviceClient, userId, tenantId);

  // Assign the role (using app schema)
  const { error } = await serviceClient
    .schema('app')
    .from('user_tenant_roles')
    .insert({
      user_id: userId,
      tenant_id: tenantId,
      tenant_role_id: role.id,
      assigned_by: userId, // Self-assigned for test purposes
    });

  if (error) {
    // Ignore duplicate key errors (role already assigned)
    if (error.code === '23505') {
      return;
    }
    throw new Error(`Failed to assign role: ${error.message}`);
  }
}

/**
 * Get tenant by slug (uses service client to bypass RLS)
 */
export async function getTenantBySlug(
  serviceClient: SupabaseClient,
  slug: string
): Promise<{ id: string; name: string; slug: string } | null> {
  // Use service role client to access app schema directly
  const { data, error } = await serviceClient
    .schema('app')
    .from('tenants')
    .select('id, name, slug')
    .eq('slug', slug)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to get tenant: ${error.message}`);
  }

  return data;
}

/**
 * Set tenant context for a client
 */
export async function setTenantContext(
  client: SupabaseClient,
  tenantId: string
): Promise<void> {
  const { error } = await client.rpc('rpc_set_tenant_context', {
    p_tenant_id: tenantId,
  });

  if (error) {
    throw new Error(`Failed to set tenant context: ${error.message}`);
  }
}
