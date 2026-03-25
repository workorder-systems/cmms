import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.js';
export type DepartmentRow = Database['public']['Views']['v_departments'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
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
    errors: {
        index: number;
        message: string;
    }[];
}
/** Params for bulk importing departments. */
export interface BulkImportDepartmentsParams {
    tenantId: string;
    rows: BulkImportDepartmentRow[];
}
export declare function createDepartmentsResource(supabase: SupabaseClient<Database>): {
    list(): Promise<DepartmentRow[]>;
    getById(id: string): Promise<DepartmentRow | null>;
    create(params: CreateDepartmentParams): Promise<string>;
    update(params: UpdateDepartmentParams): Promise<void>;
    delete(tenantId: string, departmentId: string): Promise<void>;
    /** Bulk import departments. Returns created ids and per-row errors. */
    bulkImport(params: BulkImportDepartmentsParams): Promise<BulkImportDepartmentResult>;
};
export type DepartmentsResource = ReturnType<typeof createDepartmentsResource>;
//# sourceMappingURL=departments.d.ts.map