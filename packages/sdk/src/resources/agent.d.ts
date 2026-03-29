import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.js';
import type { DbClient } from '../types.js';
export interface WorkOrderSummaryRow {
    id: string;
    title: string | null;
    status: string | null;
    priority: string | null;
    due_date: string | null;
    assigned_to: string | null;
    assigned_to_name: string | null;
    asset_id: string | null;
    location_id: string | null;
    project_id: string | null;
    created_at: string | null;
    updated_at: string | null;
}
export interface AssetSummaryRow {
    id: string;
    name: string | null;
    asset_number: string | null;
    barcode: string | null;
    status: string | null;
    location_id: string | null;
    updated_at: string | null;
}
export interface PartSummaryRow {
    id: string;
    name: string | null;
    part_number: string;
    barcode: string | null;
    preferred_supplier_id: string | null;
    updated_at: string;
}
export interface PmScheduleSummaryRow {
    id: string;
    title: string | null;
    asset_id: string | null;
    asset_name: string | null;
    next_due_date: string | null;
    is_active: boolean | null;
    is_overdue: boolean | null;
    updated_at: string | null;
}
export interface ResolveTenantCandidate {
    tenant_id: string;
    name: string | null;
    slug: string | null;
}
export interface ResolveTenantResult {
    resolved: boolean;
    tenant_id: string | null;
    needs_set_tenant: boolean;
    needs_user_input: boolean;
    candidates: ResolveTenantCandidate[];
    next_actions: string[];
}
export interface EnsureTenantOptions {
    tenantId: string;
    refreshSession?: boolean;
}
export interface EnsureTenantResult {
    tenant_id: string;
    tenant_id_in_jwt: string | null;
    refreshed: boolean;
    next_actions: string[];
}
export interface SearchEntitiesOptions {
    query: string;
    entityTypes?: string[] | null;
    limit?: number;
}
export interface CreateWorkOrderSafeOptions {
    tenantId: string;
    title: string;
    description?: string | null;
    priority?: string;
    maintenanceType?: string | null;
    assignedTo?: string | null;
    locationId?: string | null;
    assetId?: string | null;
    dueDate?: string | null;
    pmScheduleId?: string | null;
    projectId?: string | null;
    clientRequestId?: string | null;
}
type SelectClient = SupabaseClient<Database> | DbClient['supabase'];
export interface AgentHelpersResource {
    resolveTenant(): Promise<ResolveTenantResult>;
    ensureTenant(options: EnsureTenantOptions): Promise<EnsureTenantResult>;
    searchEntities(options: SearchEntitiesOptions): Promise<Awaited<ReturnType<DbClient['semanticSearch']['searchEntityCandidatesV2']>>>;
    createWorkOrderSafe(options: CreateWorkOrderSafeOptions): Promise<{
        work_order_id: string;
    }>;
}
export declare function createAgentHelpers(client: DbClient): AgentHelpersResource;
export declare function listWorkOrdersSummary(supabase: SelectClient, limit?: number): Promise<WorkOrderSummaryRow[]>;
export declare function getWorkOrderSummary(supabase: SelectClient, workOrderId: string): Promise<(WorkOrderSummaryRow & {
    description?: string | null;
}) | null>;
export declare function listAssetsSummary(supabase: SelectClient, limit?: number): Promise<AssetSummaryRow[]>;
export declare function listPartsSummary(supabase: SelectClient, limit?: number): Promise<PartSummaryRow[]>;
export declare function listPmSchedulesSummary(supabase: SelectClient, limit?: number): Promise<PmScheduleSummaryRow[]>;
