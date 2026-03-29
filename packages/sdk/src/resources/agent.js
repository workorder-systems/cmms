import { normalizeError } from '../errors.js';

async function refreshSessionIfPossible(supabase) {
    const { data, error } = await supabase.auth.getSession();
    if (error)
        throw normalizeError(error);
    const session = data.session;
    if (!session) {
        return { refreshed: false };
    }
    const { data: refreshed, error: refreshError } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
    });
    if (refreshError)
        throw normalizeError(refreshError);
    return {
        refreshed: true,
        accessToken: refreshed.session?.access_token ?? null,
        refreshToken: refreshed.session?.refresh_token ?? null,
    };
}
export function createAgentResource(client) {
    return {
        async resolveTenant() {
            const tenants = await client.tenants.list();
            const session = await client.supabase.auth.getSession();
            const currentTenantId = session.data.session?.user?.user_metadata?.current_tenant_id ?? null;
            const candidates = (tenants ?? []).map((tenant) => ({
                tenantId: tenant.id,
                name: tenant.name,
                slug: tenant.slug,
                isCurrent: currentTenantId === tenant.id,
            }));
            if (candidates.length === 0) {
                return {
                    ok: false,
                    tenantId: null,
                    needsUserInput: false,
                    candidates,
                    nextActions: ['Authenticate as a tenant member before using tenant-scoped resources.'],
                };
            }
            if (currentTenantId && candidates.some((tenant) => tenant.tenantId === currentTenantId)) {
                return {
                    ok: true,
                    tenantId: currentTenantId,
                    needsUserInput: false,
                    candidates,
                    nextActions: ['Use tenant-scoped summary or detail methods directly.'],
                };
            }
            if (candidates.length === 1) {
                return {
                    ok: true,
                    tenantId: candidates[0].tenantId,
                    needsUserInput: false,
                    candidates,
                    nextActions: ['Call ensureTenant with this tenant id before tenant-scoped operations.'],
                };
            }
            return {
                ok: true,
                tenantId: null,
                needsUserInput: true,
                candidates,
                nextActions: ['Ask the user to choose a tenant, then call ensureTenant with the chosen tenant id.'],
            };
        },
        async ensureTenant(params) {
            await client.setTenant(params.tenantId);
            if (params.refreshSession === false) {
                return {
                    ok: true,
                    tenantId: params.tenantId,
                    refreshed: false,
                    nextActions: ['Refresh the Supabase session before tenant-scoped reads if your runtime depends on JWT tenant_id claims.'],
                };
            }
            const refreshed = await refreshSessionIfPossible(client.supabase);
            return {
                ok: true,
                tenantId: params.tenantId,
                refreshed: refreshed.refreshed,
                accessToken: refreshed.refreshed ? refreshed.accessToken ?? null : null,
                refreshToken: refreshed.refreshed ? refreshed.refreshToken ?? null : null,
                nextActions: ['Proceed with tenant-scoped summary or detail methods.'],
            };
        },
        async searchEntities(params) {
            return client.semanticSearch.searchEntityCandidatesV2(params);
        },
        async createWorkOrderSafe(params) {
            const tenant = await this.ensureTenant({
                tenantId: params.tenantId,
                refreshSession: params.refreshSession,
            });
            const workOrderId = await client.workOrders.create({
                tenantId: params.tenantId,
                title: params.title,
                description: params.description ?? null,
                priority: params.priority,
                maintenanceType: params.maintenanceType ?? null,
                assignedTo: params.assignedTo ?? null,
                locationId: params.locationId ?? null,
                assetId: params.assetId ?? null,
                dueDate: params.dueDate ?? null,
                pmScheduleId: params.pmScheduleId ?? null,
                projectId: params.projectId ?? null,
                clientRequestId: params.clientRequestId ?? null,
            });
            return {
                ok: true,
                tenantId: params.tenantId,
                workOrderId,
                refreshed: tenant.refreshed,
            };
        },
        recommendWorkflowBundle(params) {
            switch (params.goal) {
                case 'tenant_bootstrap':
                    return {
                        bundleId: 'tenant_bootstrap',
                        recommendedMethods: ['agent.resolveTenant', 'agent.ensureTenant', 'tenants.list'],
                        whenToUse: 'At session start or when tenant context is missing.',
                    };
                case 'work_order_lookup':
                    return {
                        bundleId: 'work_order_lookup',
                        recommendedMethods: ['workOrders.listSummary', 'workOrders.getSummary', 'workOrders.getById'],
                        whenToUse: 'To choose a work order before loading full detail.',
                    };
                case 'maintenance_lookup':
                    return {
                        bundleId: 'maintenance_lookup',
                        recommendedMethods: ['assets.listSummary', 'partsInventory.listSummary', 'pm.listSchedulesSummary'],
                        whenToUse: 'To select an asset, part, or PM schedule with small payloads.',
                    };
                case 'work_order_intake':
                default:
                    return {
                        bundleId: 'work_order_intake',
                        recommendedMethods: ['agent.resolveTenant', 'agent.ensureTenant', 'agent.searchEntities', 'agent.createWorkOrderSafe'],
                        whenToUse: 'For end-to-end automation that resolves entities and creates a work order safely.',
                    };
            }
        },
    };
}
