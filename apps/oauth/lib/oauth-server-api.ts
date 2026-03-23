/**
 * OAuth 2.1 authorization UI calls (GoTrue).
 * Uses REST until supabase-js exposes auth.oauth.* on all releases we target.
 * @see https://supabase.com/docs/guides/auth/oauth-server
 */

import { authV1BaseUrl, readSupabasePublicEnv } from "@/lib/supabase-public-env";

export type AuthorizationDetails = {
  authorization_id: string;
  redirect_uri?: string;
  scope?: string;
  client?: {
    id: string;
    name?: string;
    uri?: string;
    logo_uri?: string;
  };
  user?: { id?: string; email?: string };
};

function userJwtHeaders(accessToken: string, anonKey: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    apikey: anonKey,
  } as const;
}

function missingEnvError(): { ok: false; error: string } {
  return {
    ok: false,
    error: "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
  };
}

export async function fetchAuthorizationDetails(
  accessToken: string,
  authorizationId: string,
): Promise<{ ok: true; data: AuthorizationDetails } | { ok: false; error: string }> {
  const base = authV1BaseUrl();
  const env = readSupabasePublicEnv();
  if (!base || !env) {
    return missingEnvError();
  }

  const res = await fetch(
    `${base}/oauth/authorizations/${encodeURIComponent(authorizationId)}`,
    {
      method: "GET",
      headers: userJwtHeaders(accessToken, env.anonKey),
      cache: "no-store",
    },
  );

  if (!res.ok) {
    const text = (await res.text()).trim();
    const body = text.length > 0 ? text : "(empty response body)";
    return {
      ok: false,
      error: `HTTP ${res.status}: ${body}`,
    };
  }

  const data = (await res.json()) as AuthorizationDetails;
  return { ok: true, data };
}

export async function postOAuthConsent(
  accessToken: string,
  authorizationId: string,
  action: "approve" | "deny",
): Promise<
  { ok: true; redirect_url: string } | { ok: false; error: string }
> {
  const base = authV1BaseUrl();
  const env = readSupabasePublicEnv();
  if (!base || !env) {
    return missingEnvError();
  }

  const res = await fetch(
    `${base}/oauth/authorizations/${encodeURIComponent(authorizationId)}/consent`,
    {
      method: "POST",
      headers: {
        ...userJwtHeaders(accessToken, env.anonKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action }),
      cache: "no-store",
    },
  );

  if (!res.ok) {
    const text = (await res.text()).trim();
    const body = text.length > 0 ? text : "(empty response body)";
    return {
      ok: false,
      error: `HTTP ${res.status}: ${body}`,
    };
  }

  const body = (await res.json()) as { redirect_url?: string };
  const redirect_url = body.redirect_url ?? "";
  if (!redirect_url) {
    return { ok: false, error: "Missing redirect_url in response" };
  }
  return { ok: true, redirect_url };
}
