import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { get, set, del, createStore } from 'idb-keyval'

const IDB_DB_NAME = 'work-order-systems'
const IDB_STORE_NAME = 'query-cache'

/**
 * IndexedDB storage adapter for TanStack Query.
 * Only catalog queries are persisted (see shouldDehydrateQuery in main.tsx).
 */
const idbStore = createStore(IDB_DB_NAME, IDB_STORE_NAME)

export const catalogPersister = createAsyncStoragePersister({
  storage: {
    getItem: async (key: string) => (await get(key, idbStore)) ?? null,
    setItem: async (key: string, value: string) => set(key, value, idbStore),
    removeItem: async (key: string) => del(key, idbStore),
  },
})

/** Only persist catalog queries so work orders and tenants are not stored in IndexedDB. */
export function shouldDehydrateCatalogQuery(query: {
  queryKey: unknown[]
  state: { status: string; data?: unknown }
}): boolean {
  if (query.state.status !== 'success' || !Array.isArray(query.queryKey) || query.queryKey[0] !== 'catalogs') {
    return false
  }
  // Never persist empty catalog results so we always refetch when empty (e.g. after logout or wrong tenant)
  const data = query.state.data
  if (Array.isArray(data) && data.length === 0) return false
  return true
}
