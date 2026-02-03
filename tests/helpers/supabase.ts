import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { execSync } from 'node:child_process';

/**
 * Get Supabase configuration from environment variables or Supabase CLI
 * Priority: Environment variables > Supabase CLI > Default local values
 */
export function getSupabaseConfig(): { url: string; anonKey: string } {
  // Check environment variables first
  const envUrl = process.env.SUPABASE_URL;
  const envAnonKey = process.env.SUPABASE_ANON_KEY;

  if (envUrl && envAnonKey) {
    return {
      url: envUrl,
      anonKey: envAnonKey,
    };
  }

  // Fallback to Supabase CLI
  try {
    const statusOutput = execSync('supabase status --output json', {
      encoding: 'utf-8',
    });
    const status = JSON.parse(statusOutput) as Record<string, unknown>;
    
    // Try multiple possible field names for anon key
    const anonKey = 
      (status.anonKey as string) ||
      (status.anon_key as string) ||
      (status.Publishable as string) ||
      '';
    
    return {
      url: (status.APIUrl as string) || 'http://127.0.0.1:54321',
      anonKey: anonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
    };
  } catch {
    // Fallback to default local values
    return {
      url: 'http://127.0.0.1:54321',
      anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
    };
  }
}

/**
 * Get Supabase service role key from environment or default
 */
function getServiceRoleKeyForUrl(url: string): string {
  // Always check env var first (highest priority)
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY.trim();
    if (key.length > 0) {
      return key;
    }
  }

  const isLocal =
    url.includes('127.0.0.1') ||
    url.includes('localhost') ||
    url.startsWith('http://0.0.0.0');

  // For local tests, prefer the dynamically generated key from `supabase status`
  // (env vars are often stale after `supabase stop/start`).
  if (isLocal) {
    try {
      const statusOutput = execSync('supabase status --output json', {
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      const status = JSON.parse(statusOutput) as Record<string, unknown>;
      const key = status.service_role_key || status.SERVICE_ROLE_KEY;
      if (typeof key === 'string' && key.length > 0) {
        return key;
      }
    } catch {
      // fall through to default
    }
  }

  // Fallback to the historical local default key (may not match if keys were regenerated).
  // This should only be used if Supabase CLI is not available and env var is not set.
  const defaultKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwgnWNReilDMblYTn_I0';
  
  // Log warning if using default key (helps debug env issues)
  if (process.env.NODE_ENV !== 'production') {
    console.warn('[getServiceRoleKeyForUrl] Using default service role key. Set SUPABASE_SERVICE_ROLE_KEY env var or ensure supabase status works.');
  }
  
  return defaultKey;
}

/**
 * Create a Supabase client for testing
 * Uses the local Supabase instance
 */
export function createTestClient(): SupabaseClient {
  const { url, anonKey } = getSupabaseConfig();
  return createClient(url, anonKey, {
    auth: {
      // In tests, avoid leaking sessions between clients/test cases.
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Create a Supabase client with service role key (bypasses RLS)
 * Useful for testing RLS policies or admin operations
 */
export function createServiceRoleClient(): SupabaseClient {
  const { url } = getSupabaseConfig();
  const serviceRoleKey = getServiceRoleKeyForUrl(url);
  
  // Validate key format (basic check - should be a JWT)
  if (!serviceRoleKey || serviceRoleKey.length < 50) {
    throw new Error(
      `Invalid service role key: length=${serviceRoleKey?.length || 0}. ` +
      `Set SUPABASE_SERVICE_ROLE_KEY env var or ensure 'supabase status' works.`
    );
  }
  
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: 'public', // Default schema, can be overridden with .schema() per query
    },
  });
}

/**
 * Reset the database by running migrations
 * Useful for ensuring a clean state between test suites
 */
export function resetDatabase(): void {
  try {
    execSync('supabase db reset', { stdio: 'inherit' });
  } catch (error) {
    throw new Error(`Failed to reset database: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Wait for Supabase to be ready
 * Polls the health endpoint until it responds
 */
export async function waitForSupabase(maxAttempts = 30, delayMs = 1000): Promise<void> {
  const { url } = getSupabaseConfig();
  const healthUrl = `${url}/rest/v1/`;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          'apikey': getSupabaseConfig().anonKey,
        },
      });
      
      if (response.ok || response.status === 404) {
        return; // Supabase is ready
      }
    } catch {
      // Not ready yet, continue waiting
      // Ignore errors and retry
    }
    
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  
  throw new Error('Supabase did not become ready in time');
}
