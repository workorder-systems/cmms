"use client";

import { OauthFrame } from "@/app/components/oauth-frame";
import { DEMO_PKCE_STATE_KEY, DEMO_PKCE_VERIFIER_KEY } from "@/lib/demo-client";
import {
  codeChallengeS256,
  generateCodeVerifier,
  generateState,
} from "@/lib/pkce";
import { isDevelopment } from "@/lib/runtime-env";
import { useDemoPkceRedirectUri } from "@/lib/use-demo-pkce-redirect-uri";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const DEFAULT_SCOPE = "openid email profile";

export function PartnerDemoClient() {
  const [scope, setScope] = useState(DEFAULT_SCOPE);
  const [busy, setBusy] = useState(false);
  const [registerBusy, setRegisterBusy] = useState(false);
  const [resolvedClientId, setResolvedClientId] = useState<string | null>(null);
  const [registerMessage, setRegisterMessage] = useState<string | null>(null);
  const [clientLoaded, setClientLoaded] = useState(false);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
  const clientId = resolvedClientId ?? "";
  const redirectUri = useDemoPkceRedirectUri();

  const loadClient = useCallback(async () => {
    setRegisterMessage(null);
    try {
      const res = await fetch("/api/demo/oauth-client", { credentials: "include" });
      const data = (await res.json()) as {
        client_id?: string | null;
      };
      setResolvedClientId(data.client_id?.trim() || null);
    } catch {
      setResolvedClientId(null);
    } finally {
      setClientLoaded(true);
    }
  }, []);

  useEffect(() => {
    void loadClient();
  }, [loadClient]);

  async function registerClient() {
    setRegisterBusy(true);
    setRegisterMessage(null);
    try {
      const res = await fetch("/api/demo/register-oauth-client", {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok) {
        setRegisterMessage(data.error ?? `Error ${res.status}`);
        return;
      }
      setRegisterMessage(null);
      await loadClient();
    } catch (e) {
      setRegisterMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setRegisterBusy(false);
    }
  }

  async function startFlow() {
    if (!supabaseUrl || !clientId || !redirectUri) return;
    setBusy(true);
    try {
      const verifier = generateCodeVerifier();
      const challenge = await codeChallengeS256(verifier);
      const state = generateState();
      sessionStorage.setItem(DEMO_PKCE_VERIFIER_KEY, verifier);
      sessionStorage.setItem(DEMO_PKCE_STATE_KEY, state);

      const authUrl = new URL(`${supabaseUrl}/auth/v1/oauth/authorize`);
      authUrl.searchParams.set("client_id", clientId);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("code_challenge", challenge);
      authUrl.searchParams.set("code_challenge_method", "S256");
      authUrl.searchParams.set("state", state);
      if (scope.trim()) {
        authUrl.searchParams.set("scope", scope.trim().replace(/,/g, " "));
      }

      window.location.assign(authUrl.toString());
    } finally {
      setBusy(false);
    }
  }

  const needsRegistration = Boolean(clientLoaded && supabaseUrl && !clientId);
  const showRegisterControls = Boolean(
    supabaseUrl && (isDevelopment || needsRegistration),
  );

  return (
    <OauthFrame wide>
      <h1 className="oauth-title oauth-title-compact">
        Developer demo
      </h1>
      <p className="oauth-subtitle oauth-subtitle-wide">
        Run a sample OAuth flow against your Supabase project.
      </p>

      {!clientLoaded && supabaseUrl ? (
        <p className="oauth-loading">Loading…</p>
      ) : null}

      {showRegisterControls ? (
        <div className="oauth-demo-section">
          <p className="oauth-muted oauth-muted-compact">
            {needsRegistration
              ? "No client configured for this browser yet."
              : "Need a fresh test client?"}
          </p>
          <button
            type="button"
            className="btn btn-outline"
            disabled={registerBusy}
            onClick={() => void registerClient()}
          >
            {registerBusy ? "Working…" : "Create test client"}
          </button>
          {registerMessage ? (
            <p className="oauth-error oauth-space-top-sm" role="alert">
              {registerMessage}
            </p>
          ) : null}
          {!isDevelopment && needsRegistration ? (
            <p className="oauth-demo-meta oauth-space-top-sm">
              Or set <code>NEXT_PUBLIC_DEMO_OAUTH_CLIENT_ID</code> in your environment.
            </p>
          ) : null}
        </div>
      ) : null}

      {!supabaseUrl ? (
        <p className="oauth-error" role="alert">
          Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to <code>.env.local</code>.
        </p>
      ) : null}

      {supabaseUrl && clientId ? (
        <div className="oauth-demo-section">
          <div className="oauth-field">
            <label htmlFor="demo-scope">Scopes</label>
            <input
              id="demo-scope"
              className="oauth-input"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              placeholder="openid email profile"
            />
          </div>
          <div className="oauth-inline-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy || !redirectUri}
              onClick={() => void startFlow()}
            >
              {busy ? "Redirecting…" : "Continue with OAuth"}
            </button>
          </div>
          <details className="oauth-advanced oauth-space-top-md">
            <summary>Connection details</summary>
            <p className="oauth-demo-meta">
              <strong>Authorize</strong>
              <br />
              <span className="mono-inline">{supabaseUrl}/auth/v1/oauth/authorize</span>
            </p>
            <p className="oauth-demo-meta">
              <strong>Redirect</strong>
              <br />
              <span className="mono-inline">{redirectUri || "—"}</span>
            </p>
            <p className="oauth-demo-meta">
              <strong>Client ID</strong>
              <br />
              <span className="mono-inline">{clientId}</span>
            </p>
          </details>
        </div>
      ) : null}

      <div className="oauth-links-row">
        <Link href="/">Home</Link>
      </div>
    </OauthFrame>
  );
}
