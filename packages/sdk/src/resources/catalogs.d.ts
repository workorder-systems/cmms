import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.js';
/** Row from v_status_catalogs view. */
export type StatusCatalogRow = Database['public']['Views']['v_status_catalogs'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
/** Row from v_priority_catalogs view. */
export type PriorityCatalogRow = Database['public']['Views']['v_priority_catalogs'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
/** Row from v_maintenance_type_catalogs view. */
export type MaintenanceTypeCatalogRow = Database['public']['Views']['v_maintenance_type_catalogs'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
/** Row from v_status_transitions view. */
export type StatusTransitionRow = Database['public']['Views']['v_status_transitions'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
/** Workflow graph JSON returned by rpc_get_workflow_graph. */
export type WorkflowGraph = Database['public']['Functions']['rpc_get_workflow_graph'] extends {
    Returns: infer R;
} ? R : unknown;
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
/**
 * Catalogs resource: statuses, priorities, maintenance types, and status transitions.
 * Uses v_status_catalogs, v_priority_catalogs, v_maintenance_type_catalogs, v_status_transitions and related RPCs.
 */
export declare function createCatalogsResource(supabase: SupabaseClient<Database>): {
    /** List status catalog entries for the current tenant (v_status_catalogs). */
    listStatuses(): Promise<StatusCatalogRow[]>;
    /** List priority catalog entries for the current tenant (v_priority_catalogs). */
    listPriorities(): Promise<PriorityCatalogRow[]>;
    /** List maintenance type catalog entries for the current tenant (v_maintenance_type_catalogs). */
    listMaintenanceTypes(): Promise<MaintenanceTypeCatalogRow[]>;
    /** List allowed status transitions for the current tenant (v_status_transitions). */
    listStatusTransitions(): Promise<StatusTransitionRow[]>;
    /** Create a status for an entity type. Requires tenant.admin. Returns status key (string). */
    createStatus(params: CreateStatusParams): Promise<string>;
    /** Create a status transition. Requires tenant.admin. Returns transition id (string). */
    createStatusTransition(params: CreateStatusTransitionParams): Promise<string>;
    /** Create a priority. Requires tenant.admin. Returns priority key (string). */
    createPriority(params: CreatePriorityParams): Promise<string>;
    /** Create a maintenance type. Requires tenant.admin. Returns maintenance type key (string). */
    createMaintenanceType(params: CreateMaintenanceTypeParams): Promise<string>;
    /** Get workflow graph for an entity type. Returns JSON graph of valid status transitions. */
    getWorkflowGraph(tenantId: string, entityType: string): Promise<WorkflowGraph>;
};
export type CatalogsResource = ReturnType<typeof createCatalogsResource>;
//# sourceMappingURL=catalogs.d.ts.map