import { createClient } from "@supabase/supabase-js"
import { createDbClientFromSupabase } from "@workorder-systems/sdk"

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY

/**
 * Create an authenticated DbClient for the given user session and tenant.
 * Use in API routes when the client sends accessToken, refreshToken, and tenantId.
 * All SDK calls will run on behalf of that user and in that tenant context.
 */
export async function getDbClientForUser(
  accessToken: string,
  refreshToken: string | null,
  tenantId: string
): Promise<ReturnType<typeof createDbClientFromSupabase>> {
  if (!url || !anonKey) {
    throw new Error("Missing Supabase URL or anon key for chat API.")
  }
  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false },
  })
  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken ?? "",
  })
  if (error) {
    throw new Error(`Invalid session: ${error.message}`)
  }
  const db = createDbClientFromSupabase(
    supabase as Parameters<typeof createDbClientFromSupabase>[0]
  )
  await db.setTenant(tenantId)
  return db
}
