import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { OAuthTokenVerifier } from '@modelcontextprotocol/sdk/server/auth/provider.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { InvalidTokenError } from '@modelcontextprotocol/sdk/server/auth/errors.js';
import { buildAuthV1Issuer } from './oauth-metadata.js';

function jwksUrlForProject(supabaseUrl: string): URL {
  const base = supabaseUrl.replace(/\/$/, '');
  return new URL('/auth/v1/.well-known/jwks.json', `${base}/`);
}

/**
 * Verifies Supabase-issued JWT access tokens for MCP Bearer auth.
 * Issuer is `{origin}/auth/v1` per GoTrue.
 */
export function createSupabaseJwtVerifier(options: {
  supabaseUrl: string;
  /** When set, must match the token aud claim (Supabase typically uses "authenticated"). */
  audience?: string;
  /** When set, added to AuthInfo for RFC 8707-aware clients. */
  resource?: URL;
}): OAuthTokenVerifier {
  const issuer = buildAuthV1Issuer(options.supabaseUrl);
  const JWKS = createRemoteJWKSet(jwksUrlForProject(options.supabaseUrl));

  return {
    async verifyAccessToken(token: string): Promise<AuthInfo> {
      try {
        const verifyOpts: Parameters<typeof jwtVerify>[2] = { issuer };
        if (options.audience) {
          verifyOpts.audience = options.audience;
        }
        const { payload } = await jwtVerify(token, JWKS, verifyOpts);

        const exp = payload.exp;
        if (typeof exp !== 'number') {
          throw new InvalidTokenError('Token missing exp claim');
        }

        const sub = typeof payload.sub === 'string' ? payload.sub : '';
        const clientIdClaim = payload.client_id;
        const clientId =
          typeof clientIdClaim === 'string' && clientIdClaim.length > 0 ? clientIdClaim : sub || 'unknown';

        const scopeStr = payload.scope;
        const scopes = typeof scopeStr === 'string' && scopeStr.length > 0 ? scopeStr.split(/\s+/) : [];

        return {
          token,
          clientId,
          scopes,
          expiresAt: exp,
          resource: options.resource,
        };
      } catch (e) {
        if (e instanceof InvalidTokenError) {
          throw e;
        }
        const message = e instanceof Error ? e.message : String(e);
        throw new InvalidTokenError(`Invalid access token: ${message}`);
      }
    },
  };
}
