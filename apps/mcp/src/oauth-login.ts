#!/usr/bin/env node
/**
 * PKCE OAuth login against Supabase Auth: opens the system browser, receives the redirect
 * on a local loopback server, exchanges the code, prints access + refresh tokens (optional: stdio MCP / scripts).
 *
 * Usage (from repo root or this app directory):
 *   node --env-file=apps/mcp/.env.local apps/mcp/dist/oauth-login.js
 *   pnpm --filter mcp mcp:oauth-login
 *
 * Requires: SUPABASE_URL, SUPABASE_ANON_KEY
 */
import { createHash, randomBytes, randomInt } from 'node:crypto';
import { createServer } from 'node:http';
import { tryLoadMcpLocalEnv } from './load-local-env.js';
import { requireEnv } from './env.js';
import { openBrowser } from './open-browser.js';

const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';

function generateCodeVerifier(): string {
  const bytes = randomBytes(48);
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += CHARSET[bytes[i]! % CHARSET.length]!;
  }
  return out;
}

function codeChallengeS256(verifier: string): string {
  return createHash('sha256').update(verifier, 'utf8').digest('base64url');
}

function generateState(): string {
  return randomBytes(16).toString('hex');
}

type RegisterResponse = {
  client_id?: string;
  client_secret?: string;
  error_description?: string;
};

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  error_description?: string;
};

async function registerClient(params: {
  supabaseUrl: string;
  anonKey: string;
  redirectUris: string[];
}): Promise<{ clientId: string; clientSecret: string }> {
  const res = await fetch(`${params.supabaseUrl.replace(/\/$/, '')}/auth/v1/oauth/clients/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: params.anonKey,
    },
    body: JSON.stringify({
      client_name: 'mcp-login',
      redirect_uris: params.redirectUris,
      client_type: 'confidential',
      token_endpoint_auth_method: 'client_secret_post',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
    }),
  });
  const text = await res.text();
  let json: RegisterResponse;
  try {
    json = JSON.parse(text) as RegisterResponse;
  } catch {
    console.error('Client registration: non-JSON response', text.slice(0, 200));
    process.exit(1);
  }
  if (!res.ok || !json.client_id) {
    console.error('Client registration failed:', json.error_description ?? text);
    process.exit(1);
  }
  if (!json.client_secret) {
    console.error('Client registration returned no client_secret (expected confidential client).');
    process.exit(1);
  }
  return { clientId: json.client_id, clientSecret: json.client_secret };
}

async function exchangeCode(params: {
  supabaseUrl: string;
  anonKey: string;
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: params.code,
    redirect_uri: params.redirectUri,
    client_id: params.clientId,
    code_verifier: params.codeVerifier,
    client_secret: params.clientSecret,
  });
  const res = await fetch(`${params.supabaseUrl.replace(/\/$/, '')}/auth/v1/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      apikey: params.anonKey,
    },
    body: body.toString(),
  });
  const text = await res.text();
  try {
    return JSON.parse(text) as TokenResponse;
  } catch {
    return { error_description: text.slice(0, 500) };
  }
}

async function main(): Promise<void> {
  tryLoadMcpLocalEnv();

  const supabaseUrl = requireEnv('SUPABASE_URL');
  const anonKey = requireEnv('SUPABASE_ANON_KEY');
  const base = supabaseUrl.replace(/\/$/, '');

  const port =
    Number(process.env.OAUTH_LOGIN_PORT?.trim()) ||
    randomInt(30_000, 45_000);
  const redirect127 = `http://127.0.0.1:${port}/callback`;
  const redirectLocal = `http://localhost:${port}/callback`;
  const redirectUris = Array.from(new Set([redirect127, redirectLocal]));

  const scope =
    process.env.OAUTH_LOGIN_SCOPE?.trim() || 'openid email profile';

  console.error('Registering temporary OAuth client (dynamic registration)…');
  const { clientId, clientSecret } = await registerClient({
    supabaseUrl: base,
    anonKey,
    redirectUris,
  });

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = codeChallengeS256(codeVerifier);
  const state = generateState();

  const authUrl = new URL(`${base}/auth/v1/oauth/authorize`);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirect127);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('state', state);
  if (scope) {
    authUrl.searchParams.set('scope', scope);
  }

  const result = await new Promise<{ code: string } | { error: string }>((resolvePromise) => {
    const server = createServer((req, res) => {
      if (!req.url?.startsWith('/callback')) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const url = new URL(req.url, `http://127.0.0.1:${port}`);
      const err = url.searchParams.get('error');
      const desc = url.searchParams.get('error_description');
      if (err) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(
          `<!doctype html><title>OAuth</title><p>Authorization failed: ${err}</p><p>${desc ?? ''}</p><p>You can close this tab.</p>`
        );
        resolvePromise({ error: desc ?? err });
        server.close();
        return;
      }
      const code = url.searchParams.get('code');
      const returnedState = url.searchParams.get('state');
      if (!code || returnedState !== state) {
        res.writeHead(400);
        res.end('Invalid callback');
        resolvePromise({ error: 'invalid_callback' });
        server.close();
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(
        '<!doctype html><title>OAuth</title><p>Signed in. You can close this tab and return to the terminal.</p>'
      );
      resolvePromise({ code });
      server.close();
    });

    server.listen(port, '127.0.0.1', () => {
      console.error(`Listening on ${redirect127}`);
      console.error('Opening browser for sign-in…');
      openBrowser(authUrl.toString());
    });

    server.on('error', (e) => {
      console.error(e);
      resolvePromise({ error: String(e) });
    });
  });

  if ('error' in result) {
    console.error('Login aborted:', result.error);
    process.exit(1);
  }

  console.error('Exchanging authorization code for tokens…');
  const tokens = await exchangeCode({
    supabaseUrl: base,
    anonKey,
    clientId,
    clientSecret,
    code: result.code,
    redirectUri: redirect127,
    codeVerifier,
  });

  if (!tokens.access_token) {
    console.error('Token exchange failed:', tokens.error_description ?? tokens);
    process.exit(1);
  }

  console.log('');
  console.log('Paste into .cursor/mcp.json → mcp → env (or export before starting MCP):');
  console.log('');
  console.log(`WORKORDER_SYSTEMS_ACCESS_TOKEN=${tokens.access_token}`);
  if (tokens.refresh_token) {
    console.log(`WORKORDER_SYSTEMS_REFRESH_TOKEN=${tokens.refresh_token}`);
  }
  console.log('');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
