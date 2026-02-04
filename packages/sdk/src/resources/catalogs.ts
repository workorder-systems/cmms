import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.js';
import { normalizeError } from '../errors.js';
import { callRpc } from '../unwrap.js';

/** Row from v_status_catalogs view. */
export type StatusCatalogRow = Database['public']['Views']['v_status_catalogs'] extends { Row: infer R }
  ? R
  : Record<string, unknown>;

/** Row from v_priority_catalogs view. */
export type PriorityCatalogRow = Database['public']['Views']['v_priority_catalogs'] extends { Row: infer R }
  ? R
  : Record<string, unknown>;

/** Row from v_maintenance_type_catalogs view. */
export type MaintenanceTypeCatalogRow =
  Database['public']['Views']['v_maintenance_type_catalogs'] extends { Row: infer R }
    ? R
    : Record<string, unknown>;

/** Row from v_status_transitions view. */
export type StatusTransitionRow = Database['public']['Views']['v_status_transitions'] extends { Row: infer R }
  ? R
  : Record<string, unknown>;

/** Workflow graph JSON returned by rpc_get_workflow_graph. */
export type WorkflowGraph = Database['public']['Functions']['rpc_get_workflow_graph'] extends {
  Returns: infer R;
}
  ? R
  : unknown;

/** Params for creating a status. */
export interface CreateStatusParams {
  tenantId: string;
  entityType: string;
  key: string;
  name: string;
  category: string;
  color?: string | null;
  displayOrder: number;
  icon?: string | null;
}

/** Params for creating a status transition. */
export interface CreateStatusTransitionParams {
  tenantId: string;
  entityType: string;
  fromStatusKey: string;
  toStatusKey: string;
  requiredPermission?: string | null;
  guardCondition?: Record<string, unknown> | null;
}

/** Params for creating a priority. */
export interface CreatePriorityParams {
  tenantId: string;
  entityType: string;
  key: string;
  name: string;
  weight: number;
  displayOrder: number;
  color?: string | null;
}

/** Params for creating a maintenance type. */
export interface CreateMaintenanceTypeParams {
  tenantId: string;
  key: string;
  name: string;
  category: string;
  description?: string | null;
  displayOrder?: number | null;
  color?: string | null;
  icon?: string | null;
}

const rpc = (supabase: SupabaseClient<Database>) =>
  (supabase as unknown as { rpc: (n: string, p?: object) => Promise<{ data: unknown; error: unknown }> }).rpc.bind(
    supabase
  );

/**
 * Catalogs resource: statuses, priorities, maintenance types, and status transitions.
 * Uses v_status_catalogs, v_priority_catalogs, v_maintenance_type_catalogs, v_status_transitions and related RPCs.
 */
export function createCatalogsResource(supabase: SupabaseClient<Database>) {
  return {
    /** List status catalog entries for the current tenant (v_status_catalogs). */
    async listStatuses(): Promise<StatusCatalogRow[]> {
      const { data, error } = await supabase.from('v_status_catalogs').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as StatusCatalogRow[];
    },

    /** List priority catalog entries for the current tenant (v_priority_catalogs). */
    async listPriorities(): Promise<PriorityCatalogRow[]> {
      const { data, error } = await supabase.from('v_priority_catalogs').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as PriorityCatalogRow[];
    },

    /** List maintenance type catalog entries for the current tenant (v_maintenance_type_catalogs). */
    async listMaintenanceTypes(): Promise<MaintenanceTypeCatalogRow[]> {
      const { data, error } = await supabase.from('v_maintenance_type_catalogs').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as MaintenanceTypeCatalogRow[];
    },

    /** List allowed status transitions for the current tenant (v_status_transitions). */
    async listStatusTransitions(): Promise<StatusTransitionRow[]> {
      const { data, error } = await supabase.from('v_status_transitions').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as StatusTransitionRow[];
    },

    /** Create a status for an entity type. Requires tenant.admin. Returns status key (string). */
    async createStatus(params: CreateStatusParams): Promise<string> {
      return callRpc<string>(rpc(supabase), 'rpc_create_status', {
        p_tenant_id: params.tenantId,
        p_entity_type: params.entityType,
        p_key: params.key,
        p_name: params.name,
        p_category: params.category,
        p_color: params.color ?? null,
        p_display_order: params.displayOrder,
        p_icon: params.icon ?? null,
      });
    },

    /** Create a status transition. Requires tenant.admin. Returns transition id (string). */
    async createStatusTransition(params: CreateStatusTransitionParams): Promise<string> {
      return callRpc<string>(rpc(supabase), 'rpc_create_status_transition', {
        p_tenant_id: params.tenantId,
        p_entity_type: params.entityType,
        p_from_status_key: params.fromStatusKey,
        p_to_status_key: params.toStatusKey,
        p_required_permission: params.requiredPermission ?? null,
        p_guard_condition: params.guardCondition ?? null,
      });
    },

    /** Create a priority. Requires tenant.admin. Returns priority key (string). */
    async createPriority(params: CreatePriorityParams): Promise<string> {
      return callRpc<string>(rpc(supabase), 'rpc_create_priority', {
        p_tenant_id: params.tenantId,
        p_entity_type: params.entityType,
        p_key: params.key,
        p_name: params.name,
        p_weight: params.weight,
        p_display_order: params.displayOrder,
        p_color: params.color ?? null,
      });
    },

    /** Create a maintenance type. Requires tenant.admin. Returns maintenance type key (string). */
    async createMaintenanceType(params: CreateMaintenanceTypeParams): Promise<string> {
      return callRpc<string>(rpc(supabase), 'rpc_create_maintenance_type', {
        p_tenant_id: params.tenantId,
        p_key: params.key,
        p_name: params.name,
        p_category: params.category,
        p_description: params.description ?? null,
        p_display_order: params.displayOrder ?? null,
        p_color: params.color ?? null,
        p_icon: params.icon ?? null,
      });
    },

    /** Get workflow graph for an entity type. Returns JSON graph of valid status transitions. */
    async getWorkflowGraph(tenantId: string, entityType: string): Promise<WorkflowGraph> {
      return callRpc<WorkflowGraph>(rpc(supabase), 'rpc_get_workflow_graph', {
        p_tenant_id: tenantId,
        p_entity_type: entityType,
      });
    },
  };
}

export type CatalogsResource = ReturnType<typeof createCatalogsResource>;

