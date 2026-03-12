/** Default page size for dashboard data tables (list pages). */
export const DEFAULT_PAGE_SIZE = 10

/** Query key for work orders list; use with tenant id for cache invalidation/refetch. */
export function workOrdersListQueryKey(tenantId: string | null | undefined) {
  return tenantId ? (['work-orders', tenantId] as const) : (['work-orders'] as const)
}

/** Query key names used by useDataTable for URL sync (pagination, sort, filters). */
export type DataTableQueryKeys = {
  page: string
  perPage: string
  sort: string
  filters: string
  joinOperator: string
}

/**
 * Builds the query key names for a data table. Use the same prefix as your
 * entity (e.g. 'workOrders', 'locations') so URL params stay namespaced.
 */
export function createDataTableQueryKeys(prefix: string): DataTableQueryKeys {
  const p = prefix.endsWith('_') ? prefix : `${prefix}_`
  return {
    page: `${p}page`,
    perPage: `${p}perPage`,
    sort: `${p}sort`,
    filters: `${p}filters`,
    joinOperator: `${p}joinOperator`,
  }
}
