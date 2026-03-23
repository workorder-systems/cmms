import {
  resolveDemoTokenCredentials,
} from "@/lib/demo-oauth-server";
import { isProduction } from "@/lib/runtime-env";
import { readSupabasePublicEnv } from "@/lib/supabase-public-env";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type Body = {
  code?: string;
  code_verifier?: string;
  redirect_uri?: string;
};

export async function POST(request: Request) {
  const env = readSupabasePublicEnv();
  if (!env) {
    return NextResponse.json(
      { error: "Server missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY" },
      { status: 500 },
    );
  }

  const store = await cookies();
  const { clientId, clientSecret } = resolveDemoTokenCredentials(store);

  if (!clientId) {
    return NextResponse.json(
      {
        error:
          "No OAuth client id: use “Register demo OAuth client” on /demo or set NEXT_PUBLIC_DEMO_OAUTH_CLIENT_ID.",
      },
      { status: 503 },
    );
  }

  let json: Body;
  try {
    json = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { code, code_verifier, redirect_uri } = json;
  if (!code?.trim() || !code_verifier?.trim() || !redirect_uri?.trim()) {
    return NextResponse.json(
      { error: "code, code_verifier, and redirect_uri are required" },
      { status: 400 },
    );
  }

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code: code.trim(),
    redirect_uri: redirect_uri.trim(),
    client_id: clientId.trim(),
    code_verifier: code_verifier.trim(),
  });

  if (clientSecret?.trim()) {
    params.set("client_secret", clientSecret.trim());
  }

  const res = await fetch(`${env.url}/auth/v1/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      apikey: env.anonKey,
    },
    body: params.toString(),
  });

  const text = await res.text();
  let payload: unknown;
  try {
    payload = JSON.parse(text) as unknown;
  } catch {
    payload = { raw: text };
  }

  if (!res.ok) {
    return NextResponse.json(
      isProduction
        ? { error: "Token exchange failed", status: res.status }
        : { error: "Token endpoint error", status: res.status, details: payload },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, tokens: payload });
}
