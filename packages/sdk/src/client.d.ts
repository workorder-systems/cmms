import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types.js';
import type { DbClient, DbClientOptions } from './types.js';
/**
 * Create a typed database client. Use this in browser, Node, or edge runtimes.
 *
 * For edge runtimes (Cloudflare Workers, Vercel Edge), pass a custom `fetch` and
 * optionally disable or customize session persistence:
 *
 * @example
 * ```ts
 * const client = createDbClient(url, anonKey, {
 *   global: { fetch: fetch },
 *   auth: { persistSession: false, storage: customStorage }
 * });
 * ```
 *
 * @param url - Supabase project URL (e.g. https://xxx.supabase.co)
 * @param anonKey - Supabase anon/public key
 * @param options - Optional. Custom fetch, auth storage, db schema, etc.
 * @returns DbClient with typed supabase client and domain resources
 */
export declare function createDbClient(url: string, anonKey: string, options?: DbClientOptions): DbClient;
/**
 * Create a DbClient from an existing Supabase client (e.g. one already authenticated
 * with a user session). Use this in server routes when you have set the session
 * via auth.setSession({ access_token, refresh_token }).
 */
export declare function createDbClientFromSupabase(supabase: SupabaseClient<Database>): DbClient;
//# sourceMappingURL=client.d.ts.map