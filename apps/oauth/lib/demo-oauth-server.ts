import { isDevelopment, isProduction } from "@/lib/runtime-env";

/** HttpOnly cookies set after dynamic or admin demo client registration */
export const DEMO_OAUTH_CLIENT_ID_COOKIE = "oauth_demo_cid";
export const DEMO_OAUTH_CLIENT_SECRET_COOKIE = "oauth_demo_cs";
export const DEMO_OAUTH_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 30;

export const DEMO_OAUTH_REGISTERED_NAME = "work-order-oauth-demo";

const DEMO_CALLBACK_PATH = "/demo/callback";

const LOCAL_DEFAULT_ORIGINS = [
  "http://localhost:3005",
  "http://127.0.0.1:3005",
] as const;

export function defaultDemoRedirectUris(): string[] {
  return LOCAL_DEFAULT_ORIGINS.map((o) => `${o}${DEMO_CALLBACK_PATH}`);
}

/**
 * Merge repo defaults with the browser origin’s callback (and localhost ↔ 127.0.0.1 alias).
 */
export function redirectUrisForRegistrationRequest(requestOrigin: string | null): string[] {
  const base = [...defaultDemoRedirectUris()];
  if (!requestOrigin) {
    return base;
  }
  try {
    const u = new URL(requestOrigin);
    const port = u.port || (u.protocol === "https:" ? "443" : "80");
    const altHost = u.hostname === "localhost" ? "127.0.0.1" : "localhost";
    const primary = `${requestOrigin}${DEMO_CALLBACK_PATH}`;
    const alt = `${u.protocol}//${altHost}:${port}${DEMO_CALLBACK_PATH}`;
    return Array.from(new Set([primary, alt, ...base]));
  } catch {
    return base;
  }
}

type CookieGet = {
  get(name: string): { value: string } | undefined;
};

type CookieDelete = {
  delete(name: string): void;
};

export function resolveDemoEnvClientId(): string {
  return (
    process.env.DEMO_OAUTH_CLIENT_ID?.trim() ||
    process.env.NEXT_PUBLIC_DEMO_OAUTH_CLIENT_ID?.trim() ||
    ""
  );
}

export function resolveDemoEnvClientSecret(): string {
  return process.env.DEMO_OAUTH_CLIENT_SECRET?.trim() || "";
}

/**
 * Credentials for POST /oauth/token (demo). In development, registered client cookies override env.
 */
export function resolveDemoTokenCredentials(store: CookieGet): {
  clientId: string;
  clientSecret: string;
} {
  const envId = resolveDemoEnvClientId();
  const envSecret = resolveDemoEnvClientSecret();
  if (!isDevelopment) {
    return { clientId: envId, clientSecret: envSecret };
  }
  const cookieId = store.get(DEMO_OAUTH_CLIENT_ID_COOKIE)?.value?.trim();
  const cookieSecret = store.get(DEMO_OAUTH_CLIENT_SECRET_COOKIE)?.value?.trim();
  return {
    clientId: cookieId || envId,
    clientSecret: cookieSecret || envSecret,
  };
}

/** Public client id for /demo UI (GET /api/demo/oauth-client). */
export function resolveDemoClientPublicState(store: CookieGet): {
  client_id: string | null;
  source: "cookie" | "env" | null;
  has_client_secret_cookie: boolean;
} {
  const envId = resolveDemoEnvClientId() || null;
  const cookieId = isDevelopment
    ? (store.get(DEMO_OAUTH_CLIENT_ID_COOKIE)?.value?.trim() ?? null)
    : null;
  const hasSecretCookie =
    isDevelopment &&
    Boolean(store.get(DEMO_OAUTH_CLIENT_SECRET_COOKIE)?.value);

  if (cookieId) {
    return {
      client_id: cookieId,
      source: "cookie",
      has_client_secret_cookie: hasSecretCookie,
    };
  }
  if (envId) {
    return {
      client_id: envId,
      source: "env",
      has_client_secret_cookie: hasSecretCookie,
    };
  }
  return {
    client_id: null,
    source: null,
    has_client_secret_cookie: false,
  };
}

export function demoRegistrationCookieBase() {
  return {
    path: "/" as const,
    maxAge: DEMO_OAUTH_COOKIE_MAX_AGE_SEC,
    sameSite: "lax" as const,
    secure: isProduction,
    httpOnly: true as const,
  };
}

export function clearDemoOAuthCookies(store: CookieDelete): void {
  store.delete(DEMO_OAUTH_CLIENT_ID_COOKIE);
  store.delete(DEMO_OAUTH_CLIENT_SECRET_COOKIE);
}
