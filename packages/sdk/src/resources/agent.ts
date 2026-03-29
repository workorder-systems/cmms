import type { SupabaseClient, Session } from '@supabase/supabase-js';
import type { Database } from '../database.types.js';
import { normalizeError } from '../errors.js';
import type {
  AssetsResource,
  AssetSummaryRow,
} from './assets.js';
import type {
  PartsInventoryResource,
  PartSummaryRow,
} from './parts-inventory.js';
import type { PmResource, PmScheduleSummaryRow } from './pm.js';
import type {
  WorkOrdersResource,
  WorkOrderSummaryRow,
} from './work-orders.js';
import type { SemanticSearchResource } from './semantic-search.js';
import type { TenantsResource } from './tenants.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string | undefined | null): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

function decodeJwtPayload(accessToken: string): Record<string, unknown> | null {
  try {
    const parts = accessToken.split('.');
    const payloadPart = parts[1];
    if (parts.length < 2 || payloadPart == null) {
      return null;
    }
    const b64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '=');
    const json = Buffer.from(padded, 'base64').toString('utf8');
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function tenantIdFromSession(session: { access_token?: string; user?: { user_metadata?: unknown } } | null | undefined): string | undefined {
  const accessToken = session?.access_token;
  if (accessToken) {
    const payload = decodeJwtPayload(accessToken);
    const claimTenant = payload?.tenant_id;
    if (typeof claimTenant === 'string' && isUuid(claimTenant)) {
      return claimTenant;
    }
  }

  const meta = session?.user?.user_metadata as { current_tenant_id?: unknown } | undefined;
  const metaTenant = meta?.current_tenant_id;
  if (typeof metaTenant === 'string' && isUuid(metaTenant)) {
    return metaTenant;
  }

  return undefined;
}

export interface ResolveTenantCandidate {
  tenant_id: string;
  name: string | null;
  slug: string | null;
}

export interface AgentResolveTenantResult {
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

export interface AgentEnsureTenantResult {
  tenant_id: string;
  tenant_id_in_jwt: string | null;
  refreshed: boolean;
  session: Session | null;
  next_actions: string[];
}

export interface AgentSearchEntitiesParams {
  query: string;
  entityTypes?: string[] | null;
  limit?: number;
}

export type AgentSearchEntitiesResult = Awaited<
  ReturnType<SemanticSearchResource['searchEntityCandidatesV2']>
>;

export interface AgentCreateWorkOrderSafeParams {
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

export interface AgentCreateWorkOrderSafeResult {
  work_order_id: string;
  client_request_id: string | null;
}

export interface WorkflowBundleRecommendation {
  bundle_id:
    | 'tenant_bootstrap'
    | 'work_order_intake'
    | 'work_order_lookup'
    | 'maintenance_lookup';
  purpose: string;
  recommended_methods: string[];
  when_to_use: string;
  when_not_to_use: string;
}

export interface AgentHelpersResource {
  resolveTenant(): Promise<AgentResolveTenantResult>;
  ensureTenant(options: EnsureTenantOptions): Promise<AgentEnsureTenantResult>;
  setTenantAndRefresh(tenantId: string): Promise<AgentEnsureTenantResult>;
  searchEntities(options: AgentSearchEntitiesParams): Promise<AgentSearchEntitiesResult>;
  createWorkOrderSafe(
    options: AgentCreateWorkOrderSafeParams
  ): Promise<AgentCreateWorkOrderSafeResult>;
  recommendWorkflowBundle(
    bundleId?: WorkflowBundleRecommendation['bundle_id']
  ): WorkflowBundleRecommendation | WorkflowBundleRecommendation[];
  listWorkOrdersSummary(limit?: number): Promise<WorkOrderSummaryRow[]>;
  getWorkOrderSummary(workOrderId: string): Promise<WorkOrderSummaryRow | null>;
  listAssetsSummary(limit?: number): Promise<AssetSummaryRow[]>;
  listPartsSummary(limit?: number): Promise<PartSummaryRow[]>;
  listPmSchedulesSummary(limit?: number): Promise<PmScheduleSummaryRow[]>;
}

async function runSelect<T>(
  query: Promise<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  const { data, error } = await query;
  if (error) {
    throw normalizeError(error);
  }
  return data ?? [];
}

async function getCurrentSessionTenant(
  client: SupabaseClient<Database>
): Promise<string | undefined> {
  const { data, error } = await client.auth.getSession();
  if (error) {
    throw normalizeError(error);
  }
  return tenantIdFromSession(data.session ?? undefined);
}

async function refreshSessionIfPossible(
  supabase: SupabaseClient<Database>
): Promise<{ refreshed: boolean; session: Session | null }> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw normalizeError(error);
  }

  const session = data.session;
  if (!session?.refresh_token) {
    return { refreshed: false, session: session ?? null };
  }

  const { data: refreshedData, error: refreshError } =
    await supabase.auth.refreshSession({
      refresh_token: session.refresh_token,
    });
  if (refreshError) {
    throw normalizeError(refreshError);
  }

  return {
    refreshed: Boolean(refreshedData.session),
    session: refreshedData.session ?? null,
  };
}

export type AgentResourceDeps = {
  supabase: SupabaseClient<Database>;
  tenants: TenantsResource;
  assets: AssetsResource;
  partsInventory: PartsInventoryResource;
  pm: PmResource;
  workOrders: WorkOrdersResource;
  semanticSearch: SemanticSearchResource;
  setTenant: (tenantId: string) => Promise<void>;
  setTenantAndRefresh: (tenantId: string) => Promise<Session | null>;
};

export function createAgentHelpers(
  deps: AgentResourceDeps
): AgentHelpersResource {
  const workflowBundles: WorkflowBundleRecommendation[] = [
    {
      bundle_id: 'tenant_bootstrap',
      purpose: 'Resolve tenant context before tenant-scoped reads or writes.',
      recommended_methods: [
        'agent.resolveTenant',
        'agent.ensureTenant',
        'tenants.list',
      ],
      when_to_use:
        'At session start, after reconnect, or when tenant-scoped reads return empty results unexpectedly.',
      when_not_to_use:
        'When tenant_id is already present in the JWT and tenant-scoped reads are working.',
    },
    {
      bundle_id: 'work_order_intake',
      purpose: 'Resolve entities and create a work order safely with retry protection.',
      recommended_methods: [
        'agent.resolveTenant',
        'agent.ensureTenant',
        'agent.searchEntities',
        'agent.createWorkOrderSafe',
      ],
      when_to_use:
        'When creating work from natural language intent and disambiguating asset/location choices first.',
      when_not_to_use:
        'When canonical ids are already known and direct workOrders.create is sufficient.',
    },
    {
      bundle_id: 'work_order_lookup',
      purpose: 'Browse and inspect work orders with summary-first reads.',
      recommended_methods: [
        'agent.listWorkOrdersSummary',
        'agent.getWorkOrderSummary',
        'workOrders.getById',
      ],
      when_to_use:
        'When selecting or disambiguating a work order before loading the full row.',
      when_not_to_use:
        'When the exact work order id is already known and full detail is required immediately.',
    },
    {
      bundle_id: 'maintenance_lookup',
      purpose: 'Browse assets, parts, and PM schedules with token-efficient summaries.',
      recommended_methods: [
        'agent.listAssetsSummary',
        'agent.listPartsSummary',
        'agent.listPmSchedulesSummary',
      ],
      when_to_use:
        'When agents or UIs need lightweight selectors for maintenance-related entities.',
      when_not_to_use:
        'When reporting summaries or full detail rows are the better fit.',
    },
  ];

  return {
    async resolveTenant(): Promise<AgentResolveTenantResult> {
      const tenantId = await getCurrentSessionTenant(deps.supabase);
      if (tenantId) {
        return {
          resolved: true,
          tenant_id: tenantId,
          needs_set_tenant: false,
          needs_user_input: false,
          candidates: [],
          next_actions: ['Proceed with tenant-scoped SDK calls.'],
        };
      }

      const tenants = await deps.tenants.list();
      const candidates: ResolveTenantCandidate[] = (tenants ?? [])
        .filter((tenant) => typeof tenant.id === 'string' && tenant.id.length > 0)
        .map((tenant) => ({
          tenant_id: tenant.id,
          name: tenant.name ?? null,
          slug: tenant.slug ?? null,
        }));

      if (candidates.length === 1) {
        return {
          resolved: true,
          tenant_id: candidates[0]!.tenant_id,
          needs_set_tenant: true,
          needs_user_input: false,
          candidates,
          next_actions: ['Call ensureTenant({ tenantId, refreshSession: true }) before tenant-scoped reads.'],
        };
      }

      return {
        resolved: false,
        tenant_id: null,
        needs_set_tenant: false,
        needs_user_input: candidates.length > 1,
        candidates,
        next_actions:
          candidates.length > 1
            ? ['Ask the user which tenant to use, then call ensureTenant({ tenantId, refreshSession: true }).']
            : ['No tenant memberships were found for the signed-in user.'],
      };
    },

    async ensureTenant(
      options: EnsureTenantOptions
    ): Promise<AgentEnsureTenantResult> {
      await deps.setTenant(options.tenantId);

      const refreshedResult =
        options.refreshSession === false
          ? { refreshed: false, session: null }
          : await refreshSessionIfPossible(deps.supabase);

      const tenantInJwt = await getCurrentSessionTenant(deps.supabase);
      return {
        tenant_id: options.tenantId,
        tenant_id_in_jwt: tenantInJwt ?? null,
        refreshed: refreshedResult.refreshed,
        session: refreshedResult.session,
        next_actions:
          tenantInJwt === options.tenantId
            ? ['Proceed with tenant-scoped SDK calls.']
            : ['Refresh the Supabase session again if tenant-scoped views still appear empty.'],
      };
    },

    async setTenantAndRefresh(
      tenantId: string
    ): Promise<AgentEnsureTenantResult> {
      const session = await deps.setTenantAndRefresh(tenantId);
      const tenantInJwt = await getCurrentSessionTenant(deps.supabase);
      return {
        tenant_id: tenantId,
        tenant_id_in_jwt: tenantInJwt ?? null,
        refreshed: Boolean(session),
        session,
        next_actions:
          tenantInJwt === tenantId
            ? ['Proceed with tenant-scoped SDK calls.']
            : ['Refresh the Supabase session again if tenant-scoped views still appear empty.'],
      };
    },

    async searchEntities(options: AgentSearchEntitiesParams) {
      return deps.semanticSearch.searchEntityCandidatesV2({
        query: options.query,
        entityTypes: options.entityTypes ?? null,
        limit: options.limit,
      });
    },

    async createWorkOrderSafe(options: AgentCreateWorkOrderSafeParams) {
      const workOrderId = await deps.workOrders.create({
        tenantId: options.tenantId,
        title: options.title,
        description: options.description ?? null,
        priority: options.priority,
        maintenanceType: options.maintenanceType ?? null,
        assignedTo: options.assignedTo ?? null,
        locationId: options.locationId ?? null,
        assetId: options.assetId ?? null,
        dueDate: options.dueDate ?? null,
        pmScheduleId: options.pmScheduleId ?? null,
        projectId: options.projectId ?? null,
        clientRequestId: options.clientRequestId ?? null,
      });

      return {
        work_order_id: workOrderId,
        client_request_id: options.clientRequestId ?? null,
      };
    },
    recommendWorkflowBundle(bundleId) {
      if (!bundleId) {
        return workflowBundles;
      }
      return (
        workflowBundles.find((bundle) => bundle.bundle_id === bundleId) ??
        workflowBundles
      );
    },

    listWorkOrdersSummary(limit = 50) {
      return deps.workOrders.listSummary({ limit });
    },

    getWorkOrderSummary(workOrderId: string) {
      return deps.workOrders.getSummary(workOrderId);
    },

    listAssetsSummary(limit = 50) {
      return deps.assets.listSummary(limit);
    },

    listPartsSummary(limit = 50) {
      return deps.partsInventory.listSummary(limit);
    },

    listPmSchedulesSummary(limit = 50) {
      return deps.pm.listSchedulesSummary({ limit });
    },
  };
}

export type AgentTenantCandidate = ResolveTenantCandidate;
export type ResolveTenantOptions = EnsureTenantOptions;
export type ResolveTenantSummary = AgentResolveTenantResult;
export type AgentEnsureTenantOptions = EnsureTenantOptions;
export type AgentSearchEntitiesOptions = AgentSearchEntitiesParams;
export type AgentCreateWorkOrderSafeOptions = AgentCreateWorkOrderSafeParams;
export type AgentWorkOrderSummaryRow = WorkOrderSummaryRow;
export type AgentAssetSummaryRow = AssetSummaryRow;
export type AgentPartSummaryRow = PartSummaryRow;
export type AgentPmScheduleSummaryRow = PmScheduleSummaryRow;
