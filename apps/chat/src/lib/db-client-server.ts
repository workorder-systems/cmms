import { createDbClient } from '@workorder-systems/sdk'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY

function create(): ReturnType<typeof createDbClient> {
  if (!url || !anonKey) {
    if (process.env.NODE_ENV === 'development') {
      throw new Error(
        'Missing Supabase URL or anon key. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or SUPABASE_URL / SUPABASE_ANON_KEY) in .env.local.'
      )
    }
    throw new Error('Missing Supabase environment variables.')
  }
  return createDbClient(url, anonKey)
}

let instance: ReturnType<typeof createDbClient> | null = null

/**
 * Server-side DbClient. Use in Server Components, route handlers, and server actions.
 * Do not import this file from client components; use getDbClient from db-client.ts instead.
 */
export function getServerDbClient(): ReturnType<typeof createDbClient> {
  if (!instance) {
    instance = create()
  }
  return instance
}
