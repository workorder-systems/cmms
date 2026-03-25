import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.js';
/** Row from v_tenants view. */
export type TenantRow = Database['public']['Views']['v_tenants'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
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
/** Params for removing a member from a tenant. */
export interface RemoveMemberParams {
    tenantId: string;
    userId: string;
}
/**
 * Tenants resource: list tenants, create tenant, invite users, assign roles.
 * Set tenant context (client.setTenant) before other tenant-scoped operations.
 */
export declare function createTenantsResource(supabase: SupabaseClient<Database>): {
    /** List tenants the current user is a member of (v_tenants). */
    list(): Promise<TenantRow[]>;
    /** Get a single tenant by id. */
    getById(id: string): Promise<TenantRow | null>;
    /** Create a new tenant. Returns the new tenant UUID. */
    create(params: CreateTenantParams): Promise<string>;
    /** Invite a user to a tenant with a role. */
    inviteUser(params: InviteUserParams): Promise<void>;
    /** Assign a role to a user in a tenant. */
    assignRole(params: AssignRoleParams): Promise<void>;
    /** Remove a user from a tenant. Requires tenant.member.remove permission. Caller cannot remove themselves. */
    removeMember(params: RemoveMemberParams): Promise<void>;
};
export type TenantsResource = ReturnType<typeof createTenantsResource>;
//# sourceMappingURL=tenants.d.ts.map