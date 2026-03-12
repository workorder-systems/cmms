/**
 * Tenant context helpers. Used to avoid redundant rpc_set_tenant_context calls
 * when the JWT already carries the correct tenant_id (from custom_access_token_hook).
 */

/** Session-like shape with access_token (Supabase Auth session). */
export interface SessionLike {
  access_token: string
}

/**
 * Reads tenant_id from the current session's JWT payload (no verification).
 * Used only to skip redundant setTenant + refresh when the JWT already has
 * the desired tenant. Security is enforced server-side via RLS and authz.
 */
export function getTenantIdFromSession(session: SessionLike | null): string | null {
  if (!session?.access_token) return null
  try {
    const parts = session.access_token.split('.')
    const payloadB64 = parts[1]
    if (parts.length !== 3 || !payloadB64) return null
    const payload = JSON.parse(
      decodeBase64Url(payloadB64)
    ) as Record<string, unknown>
    // Custom access token hook adds tenant_id to claims
    const tenantId =
      (payload.tenant_id as string) ??
      (payload.claims as Record<string, unknown> | undefined)?.tenant_id as string | undefined
    return tenantId ?? null
  } catch {
    return null
  }
}

function decodeBase64Url(str: string): string {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  if (typeof atob !== 'undefined') return atob(base64)
  return Buffer.from(base64, 'base64').toString('utf8')
}
