'use client'

import { createDbClient } from '@workorder-systems/sdk'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

function create(): ReturnType<typeof createDbClient> {
  if (!url || !anonKey) {
    if (process.env.NODE_ENV === 'development') {
      throw new Error(
        'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Add them to .env.local.'
      )
    }
    throw new Error('Missing Supabase environment variables.')
  }
  return createDbClient(url, anonKey)
}

let instance: ReturnType<typeof createDbClient> | null = null

/** Singleton DbClient for the app. Use in auth pages and other client components. */
export function getDbClient(): ReturnType<typeof createDbClient> {
  if (!instance) {
    instance = create()
  }
  return instance
}
