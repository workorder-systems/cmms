import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.js';
import { normalizeError } from '../errors.js';
import { callRpc } from '../unwrap.js';

/** Row from v_tenants view. */
export type TenantRow = Database['public']['Views']['v_tenants'] extends { Row: infer R } ? R : Record<string, unknown>;

/** Params for creating a tenant. */
export interface CreateTenantParams {
  name: string;
  slug: string;
}

/** Params for inviting a user to a tenant. */
export interface InviteUserParams {
  tenantId: string;
  inviteeEmail: string;
  roleKey: string;
}

/** Params for assigning a role to a user. */
export interface AssignRoleParams {
  tenantId: string;
  userId: string;
  roleKey: string;
}

const rpc = (supabase: SupabaseClient<Database>) =>
  (supabase as unknown as { rpc: (n: string, p?: object) => Promise<{ data: unknown; error: unknown }> }).rpc.bind(supabase);

/**
 * Tenants resource: list tenants, create tenant, invite users, assign roles.
 * Set tenant context (client.setTenant) before other tenant-scoped operations.
 */
export function createTenantsResource(supabase: SupabaseClient<Database>) {
  return {
    /** List tenants the current user is a member of (v_tenants). */
    async list(): Promise<TenantRow[]> {
      const { data, error } = await supabase.from('v_tenants').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as TenantRow[];
    },

    /** Get a single tenant by id. */
    async getById(id: string): Promise<TenantRow | null> {
      const { data, error } = await supabase.from('v_tenants').select('*').eq('id', id).maybeSingle();
      if (error) throw normalizeError(error);
      return data as TenantRow | null;
    },

    /** Create a new tenant. Returns the new tenant UUID. */
    async create(params: CreateTenantParams): Promise<string> {
      return callRpc(rpc(supabase), 'rpc_create_tenant', {
        p_name: params.name,
        p_slug: params.slug,
      });
    },

    /** Invite a user to a tenant with a role. */
    async inviteUser(params: InviteUserParams): Promise<void> {
      return callRpc(rpc(supabase), 'rpc_invite_user_to_tenant', {
        p_tenant_id: params.tenantId,
        p_invitee_email: params.inviteeEmail,
        p_role_key: params.roleKey,
      });
    },

    /** Assign a role to a user in a tenant. */
    async assignRole(params: AssignRoleParams): Promise<void> {
      return callRpc(rpc(supabase), 'rpc_assign_role_to_user', {
        p_tenant_id: params.tenantId,
        p_user_id: params.userId,
        p_role_key: params.roleKey,
      });
    },
  };
}

export type TenantsResource = ReturnType<typeof createTenantsResource>;
