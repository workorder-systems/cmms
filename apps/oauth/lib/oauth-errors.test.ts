import { describe, expect, it } from "vitest";

import {
  getOAuthConsentLoadErrorMessage,
  isOAuthAuthorizationNoLongerPendingError,
} from "./oauth-errors";
import { buildOAuthRedirectClientErrorUrl } from "./oauth-redirect-url";

describe("getOAuthConsentLoadErrorMessage", () => {
  it("maps HTTP 404 with empty body to invalid authorization copy", () => {
    expect(getOAuthConsentLoadErrorMessage("HTTP 404: (empty response body)")).toBe(
      "This authorization request is no longer valid. Start the connection again from the app you were using.",
    );
  });

  it("maps HTTP 410 to invalid authorization copy", () => {
    expect(getOAuthConsentLoadErrorMessage("HTTP 410: gone")).toBe(
      "This authorization request is no longer valid. Start the connection again from the app you were using.",
    );
  });

  it("maps HTTP 401 to session copy", () => {
    expect(getOAuthConsentLoadErrorMessage("HTTP 401: invalid JWT")).toBe(
      "Your session expired or is not valid for this request. Sign in again, then restart the connection from the app you were using.",
    );
  });

  it("maps missing public env message to configuration copy", () => {
    expect(
      getOAuthConsentLoadErrorMessage(
        "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
      ),
    ).toBe(
      "This OAuth app is missing Supabase settings. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to match the same Supabase project that issued this sign-in link.",
    );
  });

  it("maps JSON not_found style bodies", () => {
    expect(getOAuthConsentLoadErrorMessage('HTTP 404: {"error":"not_found"}')).toBe(
      "This authorization request is no longer valid. Start the connection again from the app you were using.",
    );
  });

  it("falls back to generic for unrecognized errors", () => {
    expect(getOAuthConsentLoadErrorMessage("HTTP 418: teapot")).toBe(
      "We couldn't load this request. Try again or contact support.",
    );
  });

  it("maps GoTrue validation_failed when authorization is no longer pending", () => {
    expect(
      getOAuthConsentLoadErrorMessage(
        'HTTP 400: {"code":400,"error_code":"validation_failed","msg":"authorization request cannot be processed"}',
      ),
    ).toBe(
      "This sign-in request was already used or is no longer active. Start a new connection from the app you were using (for example, reconnect MCP in Cursor). If you clicked Allow twice, the first click may have succeeded.",
    );
  });

  it("detects no-longer-pending errors for consent redirect handling", () => {
    expect(
      isOAuthAuthorizationNoLongerPendingError(
        'HTTP 400: {"code":400,"error_code":"validation_failed","msg":"authorization request cannot be processed"}',
      ),
    ).toBe(true);
    expect(
      isOAuthAuthorizationNoLongerPendingError("HTTP 418: teapot"),
    ).toBe(false);
  });

  it("builds OAuth error redirect URLs for MCP callback compatibility", () => {
    const url = buildOAuthRedirectClientErrorUrl(
      "http://127.0.0.1:9876/oauth/callback",
      "server_error",
      "authorization_step_already_completed",
    );
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe("http://127.0.0.1:9876/oauth/callback");
    expect(parsed.searchParams.get("error")).toBe("server_error");
    expect(parsed.searchParams.get("error_description")).toBe(
      "authorization_step_already_completed",
    );
  });
});
