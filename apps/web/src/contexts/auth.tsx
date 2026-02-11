import * as React from 'react'
import type { User } from '@supabase/supabase-js'
import { getDbClient } from '../lib/db-client'

interface AuthState {
  user: User | null
  loading: boolean
}

interface AuthContextValue extends AuthState {
  signOut: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AuthState>({ user: null, loading: true })
  const client = getDbClient()

  React.useEffect(() => {
    client.supabase.auth.getSession().then(({ data: { session } }) => {
      setState((s) => ({ ...s, user: session?.user ?? null, loading: false }))
    })

    const {
      data: { subscription },
    } = client.supabase.auth.onAuthStateChange((_event, session) => {
      setState((s) => ({ ...s, user: session?.user ?? null }))
    })

    return () => subscription.unsubscribe()
  }, [client])

  const signOut = React.useCallback(async () => {
    await client.supabase.auth.signOut()
  }, [client])

  const value: AuthContextValue = {
    user: state.user,
    loading: state.loading,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
