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
import { createUserDbClient } from './user-client.js';
import { createWorkOrderSystemsMcpServer } from './tools.js';
import { tryLoadMcpLocalEnv } from './load-local-env.js';
import { oauthCallbackWrongServerHtml } from './oauth-callback-fallback.js';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v?.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v.trim();
}

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

  const app = createMcpExpressApp({ host });
  app.use(
    cors({
      origin: true,
      exposedHeaders: ['Mcp-Session-Id'],
    })
  );
  app.use(express.urlencoded({ extended: true }));

  app.get('/health', (_req, res) => {
    res.status(200).json({ ok: true, service: 'work-order-systems-mcp' });
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

      const getClient = async () => createUserDbClient(supabaseUrl, anonKey, token);
      const mcpServer = createWorkOrderSystemsMcpServer(getClient);
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
    console.error(`work-order-systems-mcp HTTP listening on http://${host}:${port}${mcpPath}`);
    console.error('Protected resource metadata: GET /.well-known/oauth-protected-resource');
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
