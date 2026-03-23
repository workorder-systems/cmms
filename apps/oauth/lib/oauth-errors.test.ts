import { describe, expect, it } from "vitest";

import { getOAuthConsentLoadErrorMessage } from "./oauth-errors";

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
});
