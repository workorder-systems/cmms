import {
  clearDemoOAuthCookies,
  demoRegistrationCookieBase,
  DEMO_OAUTH_CLIENT_ID_COOKIE,
  DEMO_OAUTH_CLIENT_SECRET_COOKIE,
  redirectUrisForRegistrationRequest,
} from "@/lib/demo-oauth-server";
import {
  parseClientRegistrationJson,
  registerDemoOAuthClientDynamic,
} from "@/lib/demo-oauth-register-server";
import { isProduction } from "@/lib/runtime-env";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Registers a demo OAuth client for /demo via dynamic client registration only
 * (`POST /auth/v1/oauth/clients/register`). Requires `allow_dynamic_registration` on Auth.
 */
export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

  if (!supabaseUrl) {
    return NextResponse.json(
      { error: "Missing NEXT_PUBLIC_SUPABASE_URL" },
      { status: 500 },
    );
  }

  const redirectUris = redirectUrisForRegistrationRequest(
    request.headers.get("origin"),
  );

  const res = await registerDemoOAuthClientDynamic({
    supabaseUrl,
    anonKey,
    redirectUris,
  });

  const text = await res.text();
  const parsed = parseClientRegistrationJson(text);

  if (parsed.parseError) {
    return NextResponse.json(
      { error: "Invalid response from Auth", raw: text.slice(0, 500) },
      { status: 502 },
    );
  }

  const { data } = parsed;

  if (!res.ok || !data.client_id) {
    const apiMsg =
      data.msg ?? data.message ?? data.error_description;
    const hint =
      " Confirm `[auth.oauth_server].allow_dynamic_registration = true` (this repo) or the dashboard equivalent. Use `pnpm supabase:oauth-register-demo` or the Dashboard if you must create clients another way.";
    const body: Record<string, unknown> = {
      error: (apiMsg ?? "Failed to create OAuth client") + hint,
      status: res.status,
    };
    if (!isProduction) {
      body.details = data;
    }
    return NextResponse.json(body, {
      status: res.status >= 400 && res.status < 600 ? res.status : 400,
    });
  }

  const secret = data.client_secret ?? "";
  const out = NextResponse.json({
    ok: true,
    client_id: data.client_id,
    redirect_uris: redirectUris,
    hint: "Cookies set for this browser; optional: copy client_id / secret to .env.local",
  });

  const cookieOpts = demoRegistrationCookieBase();
  out.cookies.set(DEMO_OAUTH_CLIENT_ID_COOKIE, data.client_id, cookieOpts);
  if (secret) {
    out.cookies.set(DEMO_OAUTH_CLIENT_SECRET_COOKIE, secret, cookieOpts);
  }

  return out;
}

export async function DELETE() {
  const store = await cookies();
  clearDemoOAuthCookies(store);
  return NextResponse.json({ ok: true });
}
