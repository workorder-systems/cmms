import { createClient } from '@supabase/supabase-js';
import type { Database } from '@workorder-systems/sdk';
import { createDbClientFromSupabase, type DbClient } from '@workorder-systems/sdk';

/**
 * Build a DbClient that acts as the signed-in Supabase user (OAuth or password JWT).
 * Uses per-request Authorization header so Streamable HTTP can scope each call.
 */
export function createUserDbClient(supabaseUrl: string, anonKey: string, accessToken: string): DbClient {
  const supabase = createClient<Database>(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return createDbClientFromSupabase(supabase);
}

/**
 * Stdio mode: session-backed client so refreshSession() can rotate the access token after setTenant.
 */
export async function createSessionDbClient(
  supabaseUrl: string,
  anonKey: string,
  accessToken: string,
  refreshToken: string | undefined
): Promise<DbClient> {
  const supabase = createClient<Database>(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken ?? '',
  });
  return createDbClientFromSupabase(supabase);
}
