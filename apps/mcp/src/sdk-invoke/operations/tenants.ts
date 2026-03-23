import { z } from 'zod';
import type { SdkOperationDef } from '../types.js';
import { ann } from '../annotations.js';
import { emptyArgs, uuid } from '../zod-common.js';

export const tenantsOperations: Record<string, SdkOperationDef> = {
  'tenants.list': {
    description: 'List tenants the current user belongs to (v_tenants).',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.tenants.list();
    },
  },
  'tenants.get_by_id': {
    description: 'Get one tenant by id.',
    annotations: ann.read,
    inputSchema: z.object({ id: uuid }),
    async invoke(client, args) {
      const { id } = z.object({ id: uuid }).parse(args);
      return client.tenants.getById(id);
    },
  },
  'tenants.create': {
    description: 'Create a tenant (rpc_create_tenant).',
    annotations: ann.write,
    inputSchema: z.object({
      name: z.string().min(1),
      slug: z.string().min(1),
    }),
    async invoke(client, args) {
      const p = z.object({ name: z.string(), slug: z.string() }).parse(args);
      return client.tenants.create({ name: p.name, slug: p.slug });
    },
  },
  'tenants.invite_user': {
    description: 'Invite a user to a tenant with a role.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      invitee_email: z.string().email(),
      role_key: z.string().min(1),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          invitee_email: z.string().email(),
          role_key: z.string(),
        })
        .parse(args);
      await client.tenants.inviteUser({
        tenantId: p.tenant_id,
        inviteeEmail: p.invitee_email,
        roleKey: p.role_key,
      });
      return { ok: true };
    },
  },
  'tenants.assign_role': {
    description: 'Assign a role to a user in a tenant.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      user_id: uuid,
      role_key: z.string().min(1),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          user_id: uuid,
          role_key: z.string(),
        })
        .parse(args);
      await client.tenants.assignRole({
        tenantId: p.tenant_id,
        userId: p.user_id,
        roleKey: p.role_key,
      });
      return { ok: true };
    },
  },
  'tenants.remove_member': {
    description: 'Remove a user from a tenant.',
    annotations: ann.destructive,
    inputSchema: z.object({
      tenant_id: uuid,
      user_id: uuid,
    }),
    async invoke(client, args) {
      const p = z.object({ tenant_id: uuid, user_id: uuid }).parse(args);
      await client.tenants.removeMember({ tenantId: p.tenant_id, userId: p.user_id });
      return { ok: true };
    },
  },
};
