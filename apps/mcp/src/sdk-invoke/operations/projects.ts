import { z } from 'zod';
import type { SdkOperationDef } from '../types.js';
import { ann } from '../annotations.js';
import { emptyArgs, uuid } from '../zod-common.js';

export const projectsOperations: Record<string, SdkOperationDef> = {
  'projects.list': {
    description: 'List projects for the tenant.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.projects.list();
    },
  },
  'projects.get_by_id': {
    description: 'Get one project by id.',
    annotations: ann.read,
    inputSchema: z.object({ id: uuid }),
    async invoke(client, args) {
      const { id } = z.object({ id: uuid }).parse(args);
      return client.projects.getById(id);
    },
  },
  'projects.create': {
    description: 'Create a project.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      name: z.string().min(1),
      code: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          name: z.string(),
          code: z.string().nullable().optional(),
          description: z.string().nullable().optional(),
        })
        .parse(args);
      return client.projects.create({
        tenantId: p.tenant_id,
        name: p.name,
        code: p.code ?? null,
        description: p.description ?? null,
      });
    },
  },
  'projects.update': {
    description: 'Update a project.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      project_id: uuid,
      name: z.string().nullable().optional(),
      code: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          project_id: uuid,
          name: z.string().nullable().optional(),
          code: z.string().nullable().optional(),
          description: z.string().nullable().optional(),
        })
        .parse(args);
      await client.projects.update({
        tenantId: p.tenant_id,
        projectId: p.project_id,
        name: p.name ?? null,
        code: p.code ?? null,
        description: p.description ?? null,
      });
      return { ok: true };
    },
  },
  'projects.delete': {
    description: 'Delete a project.',
    annotations: ann.destructive,
    inputSchema: z.object({
      tenant_id: uuid,
      project_id: uuid,
    }),
    async invoke(client, args) {
      const p = z.object({ tenant_id: uuid, project_id: uuid }).parse(args);
      await client.projects.delete(p.tenant_id, p.project_id);
      return { ok: true };
    },
  },
};
