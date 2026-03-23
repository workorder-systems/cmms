"use client";

import { OauthFrame } from "@/app/components/oauth-frame";
import { IconCheck } from "@/app/components/icons";
import {
  DEMO_PKCE_STATE_KEY,
  DEMO_PKCE_VERIFIER_KEY,
  demoPkceRedirectUri,
} from "@/lib/demo-client";
import { isProduction } from "@/lib/runtime-env";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type ExchangeState =
  | { status: "idle" | "working" }
  | { status: "ok"; body: unknown }
  | { status: "error"; message: string };

export function DemoCallbackClient() {
  const searchParams = useSearchParams();
  const [exchange, setExchange] = useState<ExchangeState>({ status: "idle" });

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const err = searchParams.get("error");
  const errDesc = searchParams.get("error_description");

  useEffect(() => {
    const ac = new AbortController();

    if (err) {
      setExchange({
        status: "error",
        message: errDesc ? `${err}: ${errDesc}` : err,
      });
      return () => ac.abort();
    }
    if (!code || !state) {
      setExchange({
        status: "error",
        message: "Invalid return from sign-in. Start again from the demo.",
      });
      return () => ac.abort();
    }

    const verifier = sessionStorage.getItem(DEMO_PKCE_VERIFIER_KEY);
    const expectedState = sessionStorage.getItem(DEMO_PKCE_STATE_KEY);
    if (!verifier) {
      setExchange({
        status: "error",
        message: "Session expired. Start again from the demo.",
      });
      return () => ac.abort();
    }
    if (state !== expectedState) {
      setExchange({
        status: "error",
        message: "Request could not be verified. Start again from the demo.",
      });
      return () => ac.abort();
    }

    const redirectUri = demoPkceRedirectUri();

    setExchange({ status: "working" });

    void (async () => {
      try {
        const res = await fetch("/api/demo/oauth-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            code,
            code_verifier: verifier,
            redirect_uri: redirectUri,
          }),
          signal: ac.signal,
        });
        const data = (await res.json()) as {
          ok?: boolean;
          tokens?: unknown;
          error?: string;
        };

        if (ac.signal.aborted) return;

        sessionStorage.removeItem(DEMO_PKCE_VERIFIER_KEY);
        sessionStorage.removeItem(DEMO_PKCE_STATE_KEY);

        if (!res.ok) {
          const message =
            typeof data.error === "string"
              ? data.error
              : isProduction
                ? "Could not complete sign-in."
                : JSON.stringify(data, null, 2);
          setExchange({ status: "error", message });
          return;
        }

        setExchange({ status: "ok", body: data.tokens });
      } catch (e) {
        if (ac.signal.aborted) return;
        setExchange({
          status: "error",
          message: e instanceof Error ? e.message : String(e),
        });
      }
    })();

    return () => ac.abort();
  }, [code, state, err, errDesc]);

  const emptyVisit = !code && !state && !err;
  const showError = Boolean(err || exchange.status === "error");
  const errorText = err
    ? errDesc
      ? `${err}: ${errDesc}`
      : err
    : exchange.status === "error"
      ? exchange.message
      : "";

  const bootstrapping =
    Boolean(code && state && !err) &&
    (exchange.status === "idle" || exchange.status === "working");

  if (emptyVisit) {
    return (
      <OauthFrame wide>
        <h1 className="oauth-title" style={{ marginBottom: 8 }}>
          Nothing to do here
        </h1>
        <p className="oauth-muted">
          Start from the developer demo to run the OAuth flow.
        </p>
        <div className="oauth-links-row">
          <Link href="/demo">Developer demo</Link>
          <Link href="/">Home</Link>
        </div>
      </OauthFrame>
    );
  }

  return (
    <OauthFrame wide>
      {showError ? (
        <>
          <h1 className="oauth-title" style={{ marginBottom: 12 }}>
            Couldn&apos;t finish
          </h1>
          <p className="oauth-error" role="alert">
            {errorText}
          </p>
        </>
      ) : null}

      {bootstrapping ? (
        <>
          <h1 className="oauth-title" style={{ marginBottom: 8 }}>
            Finishing up…
          </h1>
          <p className="oauth-muted">Securely completing sign-in.</p>
        </>
      ) : null}

      {exchange.status === "ok" && !isProduction ? (
        <>
          <div className="oauth-success-icon" aria-hidden>
            <IconCheck />
          </div>
          <h1 className="oauth-title" style={{ marginBottom: 8 }}>
            Demo complete
          </h1>
          <p className="oauth-muted" style={{ marginBottom: 16 }}>
            Token response (development only):
          </p>
          <pre className="oauth-pre">{JSON.stringify(exchange.body, null, 2)}</pre>
        </>
      ) : null}

      {exchange.status === "ok" && isProduction ? (
        <>
          <div className="oauth-success-icon" aria-hidden>
            <IconCheck />
          </div>
          <h1 className="oauth-title" style={{ marginBottom: 8 }}>
            You&apos;re connected
          </h1>
          <p className="oauth-muted">
            This app has access. You can close this window.
          </p>
        </>
      ) : null}

      <div className="oauth-links-row">
        <Link href="/demo">Run again</Link>
        <Link href="/">Home</Link>
      </div>
    </OauthFrame>
  );
}
