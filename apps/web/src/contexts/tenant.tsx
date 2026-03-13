import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { create } from 'zustand'
import { getDbClient } from '../lib/db-client'
import { DASHBOARD_TENANT_STORAGE_KEY } from '../lib/tenant-storage'
import { getTenantIdFromSession } from '../lib/tenant-context'
import type { TenantRow } from '@workorder-systems/sdk'

function getStoredTenantId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(DASHBOARD_TENANT_STORAGE_KEY)
}

function setStoredTenantId(id: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(DASHBOARD_TENANT_STORAGE_KEY, id)
  }
}

function clearStoredTenantId(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(DASHBOARD_TENANT_STORAGE_KEY)
  }
}

/** True if the error is the DB telling us the user is not a member of the selected tenant. */
export function isNotMemberOfTenantError(error: unknown): boolean {
  const msg =
    error != null && typeof error === 'object' && 'message' in error
      ? String((error as { message: unknown }).message)
      : ''
  return /not a member of this tenant|Unauthorized.*tenant/i.test(msg)
}

/** Clear stored tenant and store state so UI resyncs to a valid tenant. Call when a query fails with "not a member". */
export function clearInvalidTenantAndResync(queryClient: { invalidateQueries: (opts: { queryKey: string[] }) => void }): void {
  clearStoredTenantId()
  useTenantStore.getState().setActiveTenantIdSync(null)
  queryClient.invalidateQueries({ queryKey: ['tenants'] })
}

interface TenantState {
  activeTenantId: string | null
  isSetting: boolean
  setActiveTenantId: (id: string) => Promise<void>
  setActiveTenantIdSync: (id: string | null) => void
  setSetting: (value: boolean) => void
}

export const useTenantStore = create<TenantState>()((set, get) => ({
  activeTenantId: getStoredTenantId(),
  isSetting: false,
  setActiveTenantIdSync(id: string | null) {
    if (id) setStoredTenantId(id)
    else clearStoredTenantId()
    set({ activeTenantId: id })
  },
  setSetting(value: boolean) {
    set({ isSetting: value })
  },
  setActiveTenantId: async (id: string) => {
    const { activeTenantId } = get()
    if (id === activeTenantId) return
    set({ isSetting: true })
    const client = getDbClient()
    try {
      await client.setTenant(id)
      await client.supabase.auth.refreshSession()
      setStoredTenantId(id)
      set({ activeTenantId: id, isSetting: false })
    } catch (err) {
      if (isNotMemberOfTenantError(err)) {
        clearStoredTenantId()
        set({ activeTenantId: null, isSetting: false })
      } else {
        set({ isSetting: false })
      }
    }
  },
}))

/**
 * Tenants list comes from React Query (prefetched in _protected beforeLoad).
 * Active tenant state and switch action come from Zustand.
 */
export function useTenant() {
  const client = getDbClient()
  const queryClient = useQueryClient()
  const { data: tenants = [], isLoading: isLoadingTenants } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => client.tenants.list(),
  })

  const activeTenantId = useTenantStore((s) => s.activeTenantId)
  const isSetting = useTenantStore((s) => s.isSetting)
  const setActiveTenantIdStore = useTenantStore((s) => s.setActiveTenantId)
  const setActiveTenantIdSync = useTenantStore((s) => s.setActiveTenantIdSync)

  const setActiveTenantId = React.useCallback(
    async (id: string) => {
      await setActiveTenantIdStore(id)
      queryClient.invalidateQueries({ queryKey: ['catalogs'] })
    },
    [setActiveTenantIdStore, queryClient]
  )

  const activeTenant =
    tenants.find((t) => t.id === activeTenantId) ?? tenants[0] ?? null
  const effectiveId = activeTenant?.id ?? null

  // Initial sync: when tenants load, set active tenant from storage or first, and set tenant context
  const initialSyncDone = React.useRef(false)
  React.useEffect(() => {
    if (isLoadingTenants || tenants.length === 0 || initialSyncDone.current) return
    const stored = getStoredTenantId()
    const validStored = stored && tenants.some((t) => t.id === stored)
    const targetId = validStored ? stored : tenants[0]?.id ?? null
    if (!targetId) return
    setActiveTenantIdSync(targetId)
    client.supabase.auth.getSession().then(({ data: { session } }) => {
      if (getTenantIdFromSession(session) === targetId) {
        initialSyncDone.current = true
        queryClient.invalidateQueries({ queryKey: ['catalogs'] })
        return
      }
      client
        .setTenant(targetId)
        .then(() => client.supabase.auth.refreshSession())
        .then(() => {
          initialSyncDone.current = true
          queryClient.invalidateQueries({ queryKey: ['catalogs'] })
        })
        .catch((err) => {
          initialSyncDone.current = false
          if (isNotMemberOfTenantError(err)) {
            clearStoredTenantId()
            setActiveTenantIdSync(tenants[0]?.id ?? null)
            if (tenants[0]?.id) {
              client
                .setTenant(tenants[0].id)
                .then(() => client.supabase.auth.refreshSession())
                .then(() => queryClient.invalidateQueries({ queryKey: ['catalogs'] }))
                .finally(() => {
                  initialSyncDone.current = true
                })
            }
          }
        })
    })
  }, [isLoadingTenants, tenants, client, setActiveTenantIdSync, queryClient])

  return {
    tenants,
    activeTenant,
    activeTenantId: effectiveId,
    setActiveTenantId,
    isLoading: isLoadingTenants,
    isSetting,
  }
}
