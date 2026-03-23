/**
 * Browser-only helpers for the partner OAuth demo (/demo).
 */

export const DEMO_PKCE_VERIFIER_KEY = "oauth_demo_code_verifier";
export const DEMO_PKCE_STATE_KEY = "oauth_demo_state";

/** Redirect URI sent to /oauth/authorize and the token exchange; must match client registration. */
export function demoPkceRedirectUri(): string {
  if (typeof window === "undefined") {
    return "";
  }
  const override = process.env.NEXT_PUBLIC_DEMO_OAUTH_REDIRECT_URI?.trim();
  if (override) {
    return override;
  }
  return `${window.location.origin}/demo/callback`;
}
