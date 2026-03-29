import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.js';
import type { TenantsResource } from './tenants.js';
import type { AssetsResource } from './assets.js';
import type { PartsInventoryResource } from './parts-inventory.js';
import type { PmResource } from './pm.js';
import type { WorkOrdersResource } from './work-orders.js';
import type { SemanticSearchResource } from './semantic-search.js';
export type AgentTenantCandidate = {
    tenant_id: string;
    name: string | null;
    slug: string | null;
};
export type ResolveTenantResult = {
    resolved: boolean;
    tenant_id: string | null;
    needs_set_tenant: boolean;
    needs_user_input: boolean;
    candidates: AgentTenantCandidate[];
    next_actions: string[];
};
export type EnsureTenantOptions = {
    tenantId: string;
    refreshSession?: boolean;
};
export type EnsureTenantResult = {
    tenant_id: string;
    refreshed: boolean;
};
export type AgentSearchEntitiesParams = {
    query: string;
    entityTypes?: string[] | null;
    limit?: number;
};
export type AgentSearchEntityRow = Awaited<ReturnType<SemanticSearchResource['searchEntityCandidatesV2']>>[number];
export type CreateWorkOrderSafeParams = {
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
};
export type CreateWorkOrderSafeResult = {
    work_order_id: string;
    client_request_id: string | null;
};
export type RecommendedWorkflowBundleId = 'tenant_bootstrap' | 'work_order_intake' | 'work_order_lookup' | 'maintenance_lookup';
export type RecommendedWorkflowBundle = {
    bundle_id: RecommendedWorkflowBundleId;
    purpose: string;
    recommended_methods: string[];
    when_to_use: string;
    when_not_to_use: string;
};
export type AgentHelpers = {
    resolveTenant(): Promise<ResolveTenantResult>;
    setTenantAndRefresh(tenantId: string): Promise<EnsureTenantResult>;
    ensureTenant(options: EnsureTenantOptions): Promise<EnsureTenantResult>;
    searchEntities(params: AgentSearchEntitiesParams): Promise<AgentSearchEntityRow[]>;
    createWorkOrderSafe(params: CreateWorkOrderSafeParams): Promise<CreateWorkOrderSafeResult>;
    recommendWorkflowBundle(bundleId?: RecommendedWorkflowBundleId): RecommendedWorkflowBundle | RecommendedWorkflowBundle[];
};
export type AgentResourceDeps = {
    supabase: SupabaseClient<Database>;
    tenants: TenantsResource;
    assets: AssetsResource;
    partsInventory: PartsInventoryResource;
    pm: PmResource;
    workOrders: WorkOrdersResource;
    semanticSearch: SemanticSearchResource;
};
export declare function createAgentHelpers(deps: AgentResourceDeps): AgentHelpers;
