/**
 * Restricts post-login redirects to same-origin paths (no protocol-relative or external URLs).
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || typeof next !== "string") {
    return "/";
  }
  const trimmed = next.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return "/";
  }
  return trimmed;
}
