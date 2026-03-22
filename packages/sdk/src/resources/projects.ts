import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.js';
import { normalizeError } from '../errors.js';
import { callRpc } from '../unwrap.js';

/** Row from v_projects view. */
export type ProjectRow = Database['public']['Views']['v_projects'] extends { Row: infer R } ? R : Record<string, unknown>;

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

const rpc = (supabase: SupabaseClient<Database>) =>
  (supabase as unknown as { rpc: (n: string, p?: object) => Promise<{ data: unknown; error: unknown }> }).rpc.bind(
    supabase
  );

export function createProjectsResource(supabase: SupabaseClient<Database>) {
  return {
    /** List projects for the current tenant. */
    async list(): Promise<ProjectRow[]> {
      const { data, error } = await supabase.from('v_projects').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as ProjectRow[];
    },

    /** Get a project by id. */
    async getById(id: string): Promise<ProjectRow | null> {
      const { data, error } = await supabase.from('v_projects').select('*').eq('id', id).maybeSingle();
      if (error) throw normalizeError(error);
      return data as ProjectRow | null;
    },

    /** Create a project. Requires project.manage. Returns project id. */
    async create(params: CreateProjectParams): Promise<string> {
      return callRpc<string>(rpc(supabase), 'rpc_create_project', {
        p_tenant_id: params.tenantId,
        p_name: params.name,
        p_code: params.code ?? null,
        p_description: params.description ?? null,
      });
    },

    /** Update a project. Requires project.manage. */
    async update(params: UpdateProjectParams): Promise<void> {
      return callRpc<void>(rpc(supabase), 'rpc_update_project', {
        p_tenant_id: params.tenantId,
        p_project_id: params.projectId,
        p_name: params.name ?? null,
        p_code: params.code ?? null,
        p_description: params.description ?? null,
      });
    },

    /** Delete a project. Requires project.manage. */
    async delete(tenantId: string, projectId: string): Promise<void> {
      return callRpc<void>(rpc(supabase), 'rpc_delete_project', {
        p_tenant_id: tenantId,
        p_project_id: projectId,
      });
    },
  };
}

export type ProjectsResource = ReturnType<typeof createProjectsResource>;
