import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.js';
/** Row from v_projects view. */
export type ProjectRow = Database['public']['Views']['v_projects'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
export interface CreateProjectParams {
    tenantId: string;
    name: string;
    code?: string | null;
    description?: string | null;
}
export interface UpdateProjectParams {
    tenantId: string;
    projectId: string;
    name?: string | null;
    code?: string | null;
    description?: string | null;
}
export declare function createProjectsResource(supabase: SupabaseClient<Database>): {
    /** List projects for the current tenant. */
    list(): Promise<ProjectRow[]>;
    /** Get a project by id. */
    getById(id: string): Promise<ProjectRow | null>;
    /** Create a project. Requires project.manage. Returns project id. */
    create(params: CreateProjectParams): Promise<string>;
    /** Update a project. Requires project.manage. */
    update(params: UpdateProjectParams): Promise<void>;
    /** Delete a project. Requires project.manage. */
    delete(tenantId: string, projectId: string): Promise<void>;
};
export type ProjectsResource = ReturnType<typeof createProjectsResource>;
//# sourceMappingURL=projects.d.ts.map