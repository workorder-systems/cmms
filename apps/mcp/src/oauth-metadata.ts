/**
 * OAuth 2.0 Protected Resource Metadata (RFC 9728) for MCP HTTP transport.
 * Points MCP clients at Supabase Auth as the authorization server.
 */

export type ProtectedResourceMetadata = {
  resource: string;
  authorization_servers: string[];
  bearer_methods_supported?: string[];
  scopes_supported?: string[];
};

export function buildAuthV1Issuer(supabaseUrl: string): string {
  const trimmed = supabaseUrl.replace(/\/$/, '');
  const origin = new URL(trimmed).origin;
  return `${origin}/auth/v1`;
}

export function buildProtectedResourceMetadata(options: {
  /** Canonical MCP HTTPS (or http for local) URL, e.g. https://host/mcp */
  resource: string;
  supabaseUrl: string;
}): ProtectedResourceMetadata {
  return {
    resource: options.resource.replace(/\/$/, ''),
    authorization_servers: [buildAuthV1Issuer(options.supabaseUrl)],
    bearer_methods_supported: ['header'],
  };
}
