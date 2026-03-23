#!/usr/bin/env node
/**
 * End-to-end: OAuth with Supabase (via MCP SDK) → initialize → tools/list (optional tools/call).
 * Demonstrates the same flow Cursor/mcp-remote should use: Bearer from OAuth, then MCP RPCs.
 *
 * Prerequisites: HTTP MCP server running (pnpm --filter mcp start).
 *
 * Usage:
 *   pnpm --filter mcp mcp:oauth-call
 *   pnpm --filter mcp mcp:oauth-call tenants_list
 *   pnpm --filter mcp mcp:oauth-call work_orders_get '{"work_order_id":"..."}'
 */
import { randomInt } from 'node:crypto';
import { createServer } from 'node:http';
import { URL } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { UnauthorizedError } from '@modelcontextprotocol/sdk/client/auth.js';
import {
  CallToolResultSchema,
  ListToolsResultSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { tryLoadMcpLocalEnv } from './load-local-env.js';
import { createAnonFetch, InMemoryOAuthClientProvider } from './in-memory-oauth-provider.js';
import { requireEnv } from './env.js';
import { openBrowser } from './open-browser.js';

/**
 * Listen before `client.connect()` so a fast browser redirect is not dropped.
 */
function startOAuthCallbackListener(
  port: number,
  path: string
): { waitCode: Promise<string>; close: () => void } {
  let settled = false;
  let resolveCode!: (c: string) => void;
  let rejectCode!: (e: Error) => void;
  const waitCode = new Promise<string>((res, rej) => {
    resolveCode = res;
    rejectCode = rej;
  });

  const server = createServer((req, res) => {
    const u = new URL(req.url || '/', `http://127.0.0.1:${port}`);
    if (u.pathname !== path) {
      res.writeHead(404);
      res.end();
      return;
    }
    const err = u.searchParams.get('error');
    const desc = u.searchParams.get('error_description');
    if (err) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<!doctype html><p>Authorization failed: ${err}</p><p>${desc ?? ''}</p>`);
      if (!settled) {
        settled = true;
        rejectCode(new Error(desc ?? err));
      }
      server.close();
      return;
    }
    const code = u.searchParams.get('code');
    if (!code) {
      res.writeHead(400);
      res.end('missing code');
      if (!settled) {
        settled = true;
        rejectCode(new Error('missing authorization code'));
      }
      server.close();
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<!doctype html><p>Signed in. You can close this tab.</p>');
    if (!settled) {
      settled = true;
      resolveCode(code);
    }
    server.close();
  });

  server.listen(port, '127.0.0.1', () => {
    console.error(`OAuth callback listening on http://127.0.0.1:${port}${path}`);
  });

  return {
    waitCode,
    /** Stop listening (e.g. MCP connected without needing browser callback). */
    close: () => {
      server.close();
    },
  };
}

async function main(): Promise<void> {
  tryLoadMcpLocalEnv();
  const anonKey = requireEnv('SUPABASE_ANON_KEY');

  const mcpUrlStr =
    process.env.WORKORDER_SYSTEMS_MCP_URL?.trim() || 'http://127.0.0.1:3765/mcp';
  const mcpUrl = new URL(mcpUrlStr);

  const callbackPort = Number(process.env.OAUTH_MCP_CALLBACK_PORT) || randomInt(38100, 38999);
  const callbackPath = '/oauth/callback';
  const redirectUrl = `http://127.0.0.1:${callbackPort}${callbackPath}`;
  const redirectLocalhost = `http://localhost:${callbackPort}${callbackPath}`;

  const clientMetadata = {
    client_name: 'mcp-oauth-pipeline',
    redirect_uris: [redirectUrl, redirectLocalhost],
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'client_secret_post' as const,
  };

  const anonFetch = createAnonFetch(anonKey);
  const provider = new InMemoryOAuthClientProvider(redirectUrl, clientMetadata, (authUrl) => {
    console.error('\nOpen this URL to sign in:\n', authUrl.toString(), '\n');
    openBrowser(authUrl.toString());
  });

  const clientInfo = { name: 'mcp-oauth-pipeline', version: '0.1.0' } as const;
  const makeTransport = () =>
    new StreamableHTTPClientTransport(mcpUrl, {
      authProvider: provider,
      fetch: anonFetch,
    });

  console.error(`Connecting to MCP: ${mcpUrl.href}`);

  const cb = startOAuthCallbackListener(callbackPort, callbackPath);
  let transport = makeTransport();
  let client = new Client(clientInfo, { capabilities: {} });

  try {
    await client.connect(transport);
    cb.close();
  } catch (e) {
    if (!(e instanceof UnauthorizedError)) {
      cb.close();
      await transport.close().catch(() => {});
      await client.close().catch(() => {});
      throw e;
    }
    console.error('OAuth required — complete sign-in in the browser, then return here.\n');
    const code = await cb.waitCode;
    await transport.finishAuth(code);
    /*
     * First connect() already called transport.start(); StreamableHTTPClientTransport cannot start twice.
     * Tokens are on the provider — use a fresh transport + client for the real session.
     */
    await transport.close().catch(() => {});
    await client.close().catch(() => {});
    transport = makeTransport();
    client = new Client(clientInfo, { capabilities: {} });
    await client.connect(transport);
    cb.close();
  }

  const tools = await client.request({ method: 'tools/list', params: {} }, ListToolsResultSchema);
  console.error('\n--- tools/list ---');
  console.log(JSON.stringify(tools, null, 2));

  const toolName = process.argv[2]?.trim();
  if (toolName) {
    const raw = process.argv[3]?.trim();
    const args = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    const result = await client.request(
      {
        method: 'tools/call',
        params: { name: toolName, arguments: args },
      },
      CallToolResultSchema
    );
    console.error(`\n--- tools/call ${toolName} ---`);
    console.log(JSON.stringify(result, null, 2));
  }

  await transport.close();
  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
