import type { QueryClient } from '@tanstack/react-query'
import type { DbClient } from '@workorder-systems/sdk'

/** 1 hour – catalogs change rarely; avoid refetch on every navigation. */
export const CATALOG_STALE_TIME_MS = 1000 * 60 * 60
/** 24 hours – keep in memory and IndexedDB for fast restore. */
export const CATALOG_GC_TIME_MS = 1000 * 60 * 60 * 24

export const catalogQueryKeys = {
  statuses: (tenantId: string) => ['catalogs', 'statuses', tenantId] as const,
  priorities: (tenantId: string) => ['catalogs', 'priorities', tenantId] as const,
}

export const catalogQueryOptions = {
  statuses: (tenantId: string, client: DbClient) => ({
    queryKey: catalogQueryKeys.statuses(tenantId),
    queryFn: () => client.catalogs.listStatuses(),
    staleTime: CATALOG_STALE_TIME_MS,
    gcTime: CATALOG_GC_TIME_MS,
  }),
  priorities: (tenantId: string, client: DbClient) => ({
    queryKey: catalogQueryKeys.priorities(tenantId),
    queryFn: () => client.catalogs.listPriorities(),
    staleTime: CATALOG_STALE_TIME_MS,
    gcTime: CATALOG_GC_TIME_MS,
  }),
}

/**
 * Prefetch status and priority catalogs for a tenant. Call after setTenant(tenantId).
 * Used in route beforeLoad and ensures catalog data is ready when the work orders page mounts.
 */
export async function prefetchCatalogs(
  queryClient: QueryClient,
  dbClient: DbClient,
  tenantId: string
): Promise<void> {
  await Promise.all([
    queryClient.prefetchQuery(catalogQueryOptions.statuses(tenantId, dbClient)),
    queryClient.prefetchQuery(catalogQueryOptions.priorities(tenantId, dbClient)),
  ])
}
