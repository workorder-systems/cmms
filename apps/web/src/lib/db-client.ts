import { createDbClient } from '@workorder-systems/sdk'
import type { DbClient } from '@workorder-systems/sdk'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

function create(): DbClient {
  if (!url || !anonKey) {
    if (import.meta.env.DEV) {
      throw new Error(
        'Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Add them to .env.local.'
      )
    }
    throw new Error('Missing Supabase environment variables.')
  }
  return createDbClient(url, anonKey)
}

let instance: DbClient | null = null

/**
 * Singleton DbClient for the app. Use in AuthProvider, route loaders, and components.
 */
export function getDbClient(): DbClient {
  if (!instance) {
    instance = create()
  }
  return instance
}
