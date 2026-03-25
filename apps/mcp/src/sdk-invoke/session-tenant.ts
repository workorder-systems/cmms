import type { DbClient } from '@workorder-systems/sdk';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(s: string): boolean {
  return UUID_RE.test(s);
}

function decodeJwtPayload(accessToken: string): Record<string, unknown> | null {
  try {
    const parts = accessToken.split('.');
    const payloadPart = parts[1];
    if (parts.length < 2 || payloadPart == null) {
      return null;
    }
    const b64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '=');
    const json = Buffer.from(padded, 'base64').toString('utf8');
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function tenantIdFromJwtPayload(payload: Record<string, unknown> | null): string | undefined {
  if (!payload) {
    return undefined;
  }
  const claimTenant = payload.tenant_id;
  if (typeof claimTenant === 'string' && isUuid(claimTenant)) {
    return claimTenant;
  }
  return undefined;
}

/**
 * Tenant id for API calls: JWT `tenant_id` claim (after setTenant + token refresh).
 *
 * **HTTP MCP:** pass `bearerAccessToken` — the Supabase client often has no `setSession()` state, so
 * `auth.getSession()` is empty even though `Authorization: Bearer …` is set. Using the same token as
 * PostgREST keeps catalog/invoke aligned and avoids “stuck” tenant after OAuth token rotation.
 *
 * **Stdio:** omit `bearerAccessToken` and rely on `getSession()` + `user_metadata.current_tenant_id` when
 * the JWT claim is not yet updated.
 */
export async function getSessionTenantId(
  client: DbClient,
  bearerAccessToken?: string
): Promise<string | undefined> {
  if (bearerAccessToken) {
    const fromBearer = tenantIdFromJwtPayload(decodeJwtPayload(bearerAccessToken));
    if (fromBearer) {
      return fromBearer;
    }
    // Bearer had no tenant claim (e.g. after clear + new token) — do not fall back to a phantom session.
    return undefined;
  }

  const { data, error } = await client.supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    return undefined;
  }
  const fromJwt = tenantIdFromJwtPayload(decodeJwtPayload(data.session.access_token));
  if (fromJwt) {
    return fromJwt;
  }
  const meta = data.session.user?.user_metadata as { current_tenant_id?: unknown } | undefined;
  const metaTenant = meta?.current_tenant_id;
  if (typeof metaTenant === 'string' && isUuid(metaTenant)) {
    return metaTenant;
  }
  return undefined;
}
