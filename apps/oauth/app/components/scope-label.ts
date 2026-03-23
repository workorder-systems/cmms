/** Short labels for common OIDC scopes (consent UI). */
export function scopeConsentLabel(scope: string): string {
  const key = scope.trim().toLowerCase();
  const map: Record<string, string> = {
    openid: "Sign you in",
    email: "See your email address",
    profile: "See your name and profile photo",
    phone: "See your phone number",
  };
  return map[key] ?? scope;
}
