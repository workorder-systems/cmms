import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.js';
import { normalizeError } from '../errors.js';
import { callRpc } from '../unwrap.js';

export type DepartmentRow = Database['public']['Views']['v_departments'] extends { Row: infer R } ? R : Record<string, unknown>;

export interface CreateDepartmentParams {
  tenantId: string;
  name: string;
  description?: string | null;
  code?: string | null;
}

export interface UpdateDepartmentParams {
  tenantId: string;
  departmentId: string;
  name?: string | null;
  description?: string | null;
  code?: string | null;
}

/** Single row for bulk import (name required; others optional). */
export interface BulkImportDepartmentRow {
  name: string;
  description?: string | null;
  code?: string | null;
}

/** Result of bulk import: created department ids and per-row errors. */
export interface BulkImportDepartmentResult {
  created_ids: string[];
  errors: { index: number; message: string }[];
}

/** Params for bulk importing departments. */
export interface BulkImportDepartmentsParams {
  tenantId: string;
  rows: BulkImportDepartmentRow[];
}

const rpc = (supabase: SupabaseClient<Database>) =>
  (supabase as unknown as { rpc: (n: string, p?: object) => Promise<{ data: unknown; error: unknown }> }).rpc.bind(supabase);

export function createDepartmentsResource(supabase: SupabaseClient<Database>) {
  return {
    async list(): Promise<DepartmentRow[]> {
      const { data, error } = await supabase.from('v_departments').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as DepartmentRow[];
    },
    async getById(id: string): Promise<DepartmentRow | null> {
      const { data, error } = await supabase.from('v_departments').select('*').eq('id', id).maybeSingle();
      if (error) throw normalizeError(error);
      return data as DepartmentRow | null;
    },
    async create(params: CreateDepartmentParams): Promise<string> {
      return callRpc(rpc(supabase), 'rpc_create_department', {
        p_tenant_id: params.tenantId,
        p_name: params.name,
        p_description: params.description ?? null,
        p_code: params.code ?? null,
      });
    },
    async update(params: UpdateDepartmentParams): Promise<void> {
      return callRpc(rpc(supabase), 'rpc_update_department', {
        p_tenant_id: params.tenantId,
        p_department_id: params.departmentId,
        p_name: params.name ?? null,
        p_description: params.description ?? null,
        p_code: params.code ?? null,
      });
    },
    async delete(tenantId: string, departmentId: string): Promise<void> {
      return callRpc(rpc(supabase), 'rpc_delete_department', { p_tenant_id: tenantId, p_department_id: departmentId });
    },

    /** Bulk import departments. Returns created ids and per-row errors. */
    async bulkImport(params: BulkImportDepartmentsParams): Promise<BulkImportDepartmentResult> {
      const raw = await callRpc(rpc(supabase), 'rpc_bulk_import_departments', {
        p_tenant_id: params.tenantId,
        p_rows: params.rows,
      });
      const data = raw as { created_ids: string[]; errors: { index: number; message: string }[] };
      return {
        created_ids: data.created_ids ?? [],
        errors: data.errors ?? [],
      };
    },
  };
}

export type DepartmentsResource = ReturnType<typeof createDepartmentsResource>;
