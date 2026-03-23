import { requireSupabasePublicEnv } from "@/lib/supabase-public-env";
import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  const { url, anonKey } = requireSupabasePublicEnv();
  return createBrowserClient(url, anonKey);
}
