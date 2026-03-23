export type SupabasePublicEnv = {
  url: string;
  anonKey: string;
};

/**
 * Reads trimmed public Supabase URL and anon key (used by middleware, API routes, browser client).
 */
export function readSupabasePublicEnv(): SupabasePublicEnv | null {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  if (!rawUrl || !anonKey) {
    return null;
  }
  const url = rawUrl.replace(/\/$/, "");
  return { url, anonKey };
}

export function requireSupabasePublicEnv(): SupabasePublicEnv {
  const env = readSupabasePublicEnv();
  if (!env) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
  return env;
}

/** Base URL for GoTrue routes, e.g. `https://xxx.supabase.co/auth/v1` */
export function authV1BaseUrl(): string | null {
  const env = readSupabasePublicEnv();
  return env ? `${env.url}/auth/v1` : null;
}
