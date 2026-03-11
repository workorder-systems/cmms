import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.js';
import { normalizeError } from '../errors.js';

/** Row from v_projects view. */
export type ProjectRow = Database['public']['Views']['v_projects'] extends { Row: infer R } ? R : Record<string, unknown>;

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
  };
}

export type ProjectsResource = ReturnType<typeof createProjectsResource>;
