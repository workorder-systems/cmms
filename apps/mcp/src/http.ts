#!/usr/bin/env node
/**
 * Streamable HTTP MCP with Supabase JWT Bearer auth and RFC 9728 protected resource metadata.
 */
import cors from 'cors';
import express from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { requireBearerAuth } from '@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js';
import { buildProtectedResourceMetadata } from './oauth-metadata.js';
import { createSupabaseJwtVerifier } from './supabase-jwt-verifier.js';
import { createSessionDbClient, createUserDbClient } from './user-client.js';
import { createWorkOrderSystemsMcpServer } from './tools.js';
import { tryLoadMcpLocalEnv } from './load-local-env.js';
import { oauthCallbackWrongServerHtml } from './oauth-callback-fallback.js';
import { requireEnv } from './env.js';
import { buildMcpExpressAppOptions } from './http-app-options.js';
import { MCP_PACKAGE_VERSION } from './server-version.js';

function publicOriginFromRequest(req: express.Request): string {
  const explicit = process.env.WORKORDER_SYSTEMS_PUBLIC_ORIGIN?.replace(/\/$/, '');
  if (explicit) {
    return explicit;
  }
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol;
  const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || '127.0.0.1';
  return `${proto}://${host}`;
}

function mcpResourceUrl(origin: string, mcpPath: string): string {
  const path = mcpPath.startsWith('/') ? mcpPath : `/${mcpPath}`;
  return `${origin.replace(/\/$/, '')}${path}`;
}

async function main(): Promise<void> {
  tryLoadMcpLocalEnv();
  const supabaseUrl = requireEnv('SUPABASE_URL');
  const anonKey = requireEnv('SUPABASE_ANON_KEY');
  const mcpPath = (process.env.WORKORDER_SYSTEMS_MCP_PATH || '/mcp').trim() || '/mcp';
  const host = process.env.HOST || '0.0.0.0';
  const port = Number(process.env.PORT || '3765');

  const audience = process.env.SUPABASE_JWT_AUD?.trim();

  const app = createMcpExpressApp(buildMcpExpressAppOptions(host));
  if (
    process.env.WORKORDER_SYSTEMS_TRUST_PROXY === 'true' ||
    process.env.WORKORDER_SYSTEMS_TRUST_PROXY === '1'
  ) {
    app.set('trust proxy', 1);
  }
  app.use(
    cors({
      origin: true,
      exposedHeaders: ['Mcp-Session-Id'],
    })
  );
  app.use(express.urlencoded({ extended: true }));

  app.get('/health', (_req, res) => {
    res.status(200).json({
      ok: true,
      service: 'mcp',
      version: MCP_PACKAGE_VERSION,
      transport: 'streamable-http',
    });
  });

  /*
   * Browsers may GET or POST here (e.g. form_post) when redirect_uri incorrectly equals this host:port.
   * mcp-remote must listen on its own port; respond with guidance instead of Express's "Cannot POST".
   */
  app.get('/oauth/callback', (_req, res) => {
    res.status(200).type('html').send(oauthCallbackWrongServerHtml());
  });
  app.post('/oauth/callback', (_req, res) => {
    res.status(200).type('html').send(oauthCallbackWrongServerHtml());
  });

  app.get('/.well-known/oauth-protected-resource', (req, res) => {
    const origin = publicOriginFromRequest(req);
    const resource = mcpResourceUrl(origin, mcpPath);
    const doc = buildProtectedResourceMetadata({ resource, supabaseUrl });
    res.json(doc);
  });

  app.post(
    mcpPath,
    (req, res, next) => {
      const origin = publicOriginFromRequest(req);
      const resourceMetadataUrl = `${origin}/.well-known/oauth-protected-resource`;
      const resource = new URL(mcpResourceUrl(origin, mcpPath));
      const requestVerifier = createSupabaseJwtVerifier({
        supabaseUrl,
        audience: audience || undefined,
        resource,
      });
      requireBearerAuth({
        verifier: requestVerifier,
        resourceMetadataUrl,
      })(req, res, next);
    },
    async (req, res) => {
      const token = req.auth?.token;
      if (!token) {
        res.status(401).json({ error: 'invalid_token', error_description: 'Missing token' });
        return;
      }

      const refreshHeader = req.headers['x-supabase-refresh-token'];
      const refreshToken =
        typeof refreshHeader === 'string'
          ? refreshHeader.trim()
          : Array.isArray(refreshHeader)
            ? (refreshHeader[0] ?? '').trim()
            : '';

      /*
       * Mutable tokens for this HTTP request: set_active_tenant + refreshSession mints a new JWT
       * (tenant_id claim). If we kept the original Bearer string, sdk_catalog / sdk_invoke would
       * keep decoding the stale token for the rest of the request.
       */
      const tokenState = { accessToken: token, refreshToken };

      const getClient = async () =>
        tokenState.refreshToken
          ? await createSessionDbClient(supabaseUrl, anonKey, tokenState.accessToken, tokenState.refreshToken)
          : createUserDbClient(supabaseUrl, anonKey, tokenState.accessToken);

      const embedSearchUrl = process.env.WORKORDER_SYSTEMS_EMBED_SEARCH_URL?.trim();
      const mcpServer = createWorkOrderSystemsMcpServer(getClient, {
        ...(embedSearchUrl
          ? {
              embedSearch: {
                embedSearchUrl,
                anonKey,
                getAccessToken: async () => tokenState.accessToken,
              },
            }
          : {}),
        tryRefreshAccessTokenAfterSetTenant: tokenState.refreshToken
          ? async () => {
              const client = await getClient();
              const { data, error } = await client.supabase.auth.refreshSession();
              const session = data.session;
              const next = session?.access_token;
              if (error || !next || !session) {
                return { refreshed: false } as const;
              }
              tokenState.accessToken = next;
              if (session.refresh_token) {
                tokenState.refreshToken = session.refresh_token;
              }
              return { refreshed: true, access_token: next } as const;
            }
          : undefined,
        getMcpBearerAccessToken: async () => tokenState.accessToken,
      });
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });

      try {
        await mcpServer.connect(transport);
        await transport.handleRequest(req, res, req.body);
        res.on('close', () => {
          void transport.close();
          void mcpServer.close();
        });
      } catch (err) {
        console.error('MCP HTTP error:', err);
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: '2.0',
            error: { code: -32603, message: 'Internal server error' },
            id: null,
          });
        }
      }
    }
  );

  app.get(mcpPath, (_req, res) => {
    res.status(405).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Method not allowed.' },
      id: null,
    });
  });

  app.listen(port, host, () => {
    console.error(`mcp HTTP listening on http://${host}:${port}${mcpPath}`);
    console.error('Protected resource metadata: GET /.well-known/oauth-protected-resource');
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
