/**
 * RFC 6749-style error redirect so MCP clients (e.g. mcp-remote) receive a callback URL
 * instead of a JSON body from the consent API route.
 */
export function buildOAuthRedirectClientErrorUrl(
  redirectUri: string,
  errorCode: string,
  errorDescription: string,
): string {
  let u: URL;
  try {
    u = new URL(redirectUri);
  } catch {
    return redirectUri;
  }
  u.searchParams.set("error", errorCode);
  u.searchParams.set("error_description", errorDescription);
  return u.toString();
}
