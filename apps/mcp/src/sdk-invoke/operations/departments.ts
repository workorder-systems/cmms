import { z } from 'zod';
import type { SdkOperationDef } from '../types.js';
import { ann } from '../annotations.js';
import { emptyArgs, uuid } from '../zod-common.js';

const deptBulkRow = z
  .object({
    name: z.string().min(1),
    description: z.string().nullable().optional(),
    code: z.string().nullable().optional(),
  })
  .passthrough();

export const departmentsOperations: Record<string, SdkOperationDef> = {
  'departments.list': {
    description: 'List departments.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.departments.list();
    },
  },
  'departments.get_by_id': {
    description: 'Get one department by id.',
    annotations: ann.read,
    inputSchema: z.object({ id: uuid }),
    async invoke(client, args) {
      const { id } = z.object({ id: uuid }).parse(args);
      return client.departments.getById(id);
    },
  },
  'departments.create': {
    description: 'Create a department.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      name: z.string().min(1),
      description: z.string().nullable().optional(),
      code: z.string().nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          name: z.string(),
          description: z.string().nullable().optional(),
          code: z.string().nullable().optional(),
        })
        .parse(args);
      return client.departments.create({
        tenantId: p.tenant_id,
        name: p.name,
        description: p.description ?? null,
        code: p.code ?? null,
      });
    },
  },
  'departments.update': {
    description: 'Update a department.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      department_id: uuid,
      name: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
      code: z.string().nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          department_id: uuid,
          name: z.string().nullable().optional(),
          description: z.string().nullable().optional(),
          code: z.string().nullable().optional(),
        })
        .parse(args);
      await client.departments.update({
        tenantId: p.tenant_id,
        departmentId: p.department_id,
        name: p.name ?? null,
        description: p.description ?? null,
        code: p.code ?? null,
      });
      return { ok: true };
    },
  },
  'departments.delete': {
    description: 'Delete a department.',
    annotations: ann.destructive,
    inputSchema: z.object({
      tenant_id: uuid,
      department_id: uuid,
    }),
    async invoke(client, args) {
      const p = z.object({ tenant_id: uuid, department_id: uuid }).parse(args);
      await client.departments.delete(p.tenant_id, p.department_id);
      return { ok: true };
    },
  },
  'departments.bulk_import': {
    description: 'Bulk import departments.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      rows: z.array(deptBulkRow),
    }),
    async invoke(client, args) {
      const p = z.object({ tenant_id: uuid, rows: z.array(deptBulkRow) }).parse(args);
      return client.departments.bulkImport({ tenantId: p.tenant_id, rows: p.rows });
    },
  },
};
