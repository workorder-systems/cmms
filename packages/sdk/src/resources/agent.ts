import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.js';
import { normalizeError } from '../errors.js';
import type { DbClient } from '../types.js';

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

async function runSelect<T>(
  query: Promise<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  const { data, error } = await query;
  if (error) {
    throw normalizeError(error);
  }
  return data ?? [];
}

async function getCurrentSessionTenant(client: SelectClient): Promise<string | undefined> {
  const { data, error } = await client.auth.getSession();
  if (error) {
    throw normalizeError(error);
  }
  return tenantIdFromSession(data.session ?? undefined);
}

export interface AgentHelpers {
  resolveTenant(): Promise<ResolveTenantResult>;
  ensureTenant(options: EnsureTenantOptions): Promise<EnsureTenantResult>;
  searchEntities(options: SearchEntitiesOptions): Promise<Awaited<ReturnType<DbClient['semanticSearch']['searchEntityCandidatesV2']>>>;
  createWorkOrderSafe(options: CreateWorkOrderSafeOptions): Promise<{ work_order_id: string }>;
}

export function createAgentHelpers(client: DbClient): AgentHelpers {
  return {
    async resolveTenant(): Promise<ResolveTenantResult> {
      const tenantId = await getCurrentSessionTenant(client.supabase);
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

      const tenants = await client.tenants.list();
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

    async ensureTenant(options: EnsureTenantOptions): Promise<EnsureTenantResult> {
      await client.setTenant(options.tenantId);

      let refreshed = false;
      if (options.refreshSession !== false) {
        const { data, error } = await client.supabase.auth.getSession();
        if (error) {
          throw normalizeError(error);
        }
        if (data.session) {
          const { data: refreshedData, error: refreshError } = await client.supabase.auth.refreshSession({
            refresh_token: data.session.refresh_token,
          });
          if (refreshError) {
            throw normalizeError(refreshError);
          }
          refreshed = Boolean(refreshedData.session);
        }
      }

      const tenantInJwt = await getCurrentSessionTenant(client.supabase);
      return {
        tenant_id: options.tenantId,
        tenant_id_in_jwt: tenantInJwt ?? null,
        refreshed,
        next_actions:
          tenantInJwt === options.tenantId
            ? ['Proceed with tenant-scoped SDK calls.']
            : ['Refresh the Supabase session again if tenant-scoped views still appear empty.'],
      };
    },

    async searchEntities(options: SearchEntitiesOptions) {
      return client.semanticSearch.searchEntityCandidatesV2({
        query: options.query,
        entityTypes: options.entityTypes ?? null,
        limit: options.limit,
      });
    },

    async createWorkOrderSafe(options: CreateWorkOrderSafeOptions) {
      const workOrderId = await client.workOrders.create({
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

      return { work_order_id: workOrderId };
    },
  };
}

export async function listWorkOrdersSummary(
  supabase: SelectClient,
  limit = 50
): Promise<WorkOrderSummaryRow[]> {
  return runSelect<WorkOrderSummaryRow>(
    supabase
      .from('v_work_orders')
      .select(
        [
          'id',
          'title',
          'status',
          'priority',
          'due_date',
          'assigned_to',
          'assigned_to_name',
          'asset_id',
          'location_id',
          'project_id',
          'created_at',
          'updated_at',
        ].join(',')
      )
      .neq('status', 'draft')
      .order('updated_at', { ascending: false })
      .limit(limit)
  );
}

export async function getWorkOrderSummary(
  supabase: SelectClient,
  workOrderId: string
): Promise<(WorkOrderSummaryRow & { description?: string | null }) | null> {
  const { data, error } = await supabase
    .from('v_work_orders')
    .select(
      [
        'id',
        'title',
        'status',
        'priority',
        'due_date',
        'assigned_to',
        'assigned_to_name',
        'asset_id',
        'location_id',
        'project_id',
        'description',
        'created_at',
        'updated_at',
      ].join(',')
    )
    .eq('id', workOrderId)
    .maybeSingle();

  if (error) {
    throw normalizeError(error);
  }
  return data ?? null;
}

export async function listAssetsSummary(
  supabase: SelectClient,
  limit = 50
): Promise<AssetSummaryRow[]> {
  return runSelect<AssetSummaryRow>(
    supabase
      .from('v_assets')
      .select('id,name,asset_number,barcode,status,location_id,updated_at')
      .order('updated_at', { ascending: false })
      .limit(limit)
  );
}

export async function listPartsSummary(
  supabase: SelectClient,
  limit = 50
): Promise<PartSummaryRow[]> {
  const rows = await runSelect<PartSummaryRow>(
    supabase
      .from('v_parts')
      .select('id,name,part_number,barcode,preferred_supplier_id,updated_at')
      .order('updated_at', { ascending: false })
      .limit(limit)
  );
  return rows;
}

export async function listPmSchedulesSummary(
  supabase: SelectClient,
  limit = 50
): Promise<PmScheduleSummaryRow[]> {
  return runSelect<PmScheduleSummaryRow>(
    supabase
      .from('v_pm_schedules')
      .select('id,title,asset_id,asset_name,next_due_date,is_active,is_overdue,updated_at')
      .order('updated_at', { ascending: false })
      .limit(limit)
  );
}
