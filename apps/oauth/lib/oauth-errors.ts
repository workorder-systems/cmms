const GENERIC_CONSENT_LOAD_ERROR =
  "We couldn't load this request. Try again or contact support.";

const INVALID_AUTHORIZATION_ERROR =
  "This authorization request is no longer valid. Start the connection again from the app you were using.";

const CONFIG_ERROR =
  "This OAuth app is missing Supabase settings. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to match the same Supabase project that issued this sign-in link.";

const SESSION_ERROR =
  "Your session expired or is not valid for this request. Sign in again, then restart the connection from the app you were using.";

const FORBIDDEN_ERROR =
  "You do not have access to this authorization request. Sign in with the same account that started the connection, then try again.";

const SERVER_ERROR =
  "The authorization service returned an error. Confirm Supabase Auth is running and try again.";

function extractHttpStatus(raw: string): number | null {
  const match = raw.match(/\bHTTP\s+(\d{3})\b/);
  return match ? Number(match[1]) : null;
}

function normalizeForKeywords(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "";
  }

  try {
    const parsed = JSON.parse(trimmed) as {
      error?: string;
      error_code?: string;
      message?: string;
      msg?: string;
      error_description?: string;
    };
    const combined = [
      parsed.error,
      parsed.error_code,
      parsed.message,
      parsed.msg,
      parsed.error_description,
    ]
      .filter(Boolean)
      .join(" ");
    return combined ? combined.toString().toLowerCase() : trimmed.toLowerCase();
  } catch {
    return trimmed.toLowerCase();
  }
}

/**
 * User-facing copy when GET /auth/v1/oauth/authorizations/:id fails on the consent page.
 * GoTrue often returns an empty body with 404/410, or JSON without the substring "authorization".
 */
export function getOAuthConsentLoadErrorMessage(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return SERVER_ERROR;
  }

  if (
    trimmed.includes("NEXT_PUBLIC_SUPABASE_URL") ||
    trimmed.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  ) {
    return CONFIG_ERROR;
  }

  const status = extractHttpStatus(trimmed);
  if (status === 404 || status === 410) {
    return INVALID_AUTHORIZATION_ERROR;
  }
  if (status === 401) {
    return SESSION_ERROR;
  }
  if (status === 403) {
    return FORBIDDEN_ERROR;
  }
  if (status !== null && status >= 500 && status < 600) {
    return SERVER_ERROR;
  }

  if (/econnrefused|enotfound|fetch failed|networkerror/i.test(trimmed)) {
    return SERVER_ERROR;
  }

  const n = normalizeForKeywords(trimmed);

  if (
    n.includes("not found") ||
    n.includes("no rows") ||
    n.includes("unknown authorization") ||
    n.includes("invalid_grant") ||
    n.includes("access_denied")
  ) {
    return INVALID_AUTHORIZATION_ERROR;
  }

  if (
    n.includes("expired") ||
    n.includes("already been") ||
    n.includes("already used") ||
    n.includes("already completed") ||
    n.includes("already consumed") ||
    n.includes("consumed") ||
    n.includes("completed")
  ) {
    return INVALID_AUTHORIZATION_ERROR;
  }

  if (
    n.includes("authorization") &&
    (n.includes("invalid") || n.includes("mismatch") || n.includes("revoked"))
  ) {
    return INVALID_AUTHORIZATION_ERROR;
  }

  if (n.includes("jwt") || n.includes("session") || n.includes("unauthorized")) {
    return SESSION_ERROR;
  }

  return GENERIC_CONSENT_LOAD_ERROR;
}
