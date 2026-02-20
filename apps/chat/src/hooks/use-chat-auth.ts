"use client"

import * as React from "react"
import { getDbClient } from "@/lib/db-client"

const CHAT_TENANT_STORAGE_KEY = "chat_tenant_id"

function getStoredTenantId(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(CHAT_TENANT_STORAGE_KEY)
}

function setStoredTenantId(id: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(CHAT_TENANT_STORAGE_KEY, id)
  }
}

export function useChatAuth() {
  const [session, setSession] = React.useState<{
    access_token: string
    refresh_token: string
  } | null>(null)
  const [tenantId, setTenantIdState] = React.useState<string | null>(() =>
    getStoredTenantId()
  )
  const [loading, setLoading] = React.useState(true)
  const client = getDbClient()

  React.useEffect(() => {
    client.supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (s?.access_token) {
        setSession({ access_token: s.access_token, refresh_token: s.refresh_token ?? "" })
        const stored = getStoredTenantId()
        if (!stored) {
          client.tenants
            .list()
            .then((tenants) => {
              if (tenants.length > 0) {
                const first = tenants[0]
                const id = typeof first === "object" && first !== null && "id" in first ? String((first as { id: string }).id) : null
                if (id) {
                  setStoredTenantId(id)
                  setTenantIdState(id)
                }
              }
            })
            .catch(() => {})
        }
      } else {
        setSession(null)
      }
      setLoading(false)
    })

    const {
      data: { subscription },
    } = client.supabase.auth.onAuthStateChange((_event, s) => {
      if (s?.access_token) {
        setSession({ access_token: s.access_token, refresh_token: s.refresh_token ?? "" })
        const stored = getStoredTenantId()
        if (!stored) {
          client.tenants.list().then((tenants) => {
            if (tenants.length > 0) {
              const first = tenants[0]
              const id = typeof first === "object" && first !== null && "id" in first ? String((first as { id: string }).id) : null
              if (id) {
                setStoredTenantId(id)
                setTenantIdState(id)
              }
            }
          })
        }
      } else {
        setSession(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [client])

  const setTenantId = React.useCallback((id: string) => {
    setStoredTenantId(id)
    setTenantIdState(id)
  }, [])

  return { session, tenantId, setTenantId, loading }
}
