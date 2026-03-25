#!/usr/bin/env node
/**
 * STDIO MCP transport: credentials from environment (MCP spec — no HTTP OAuth on stdio).
 * Never log to stdout.
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createSessionDbClient, createUserDbClient } from './user-client.js';
import { createWorkOrderSystemsMcpServer } from './tools.js';
import { tryLoadMcpLocalEnv } from './load-local-env.js';
import { requireEnv } from './env.js';

async function main(): Promise<void> {
  tryLoadMcpLocalEnv();
  const supabaseUrl = requireEnv('SUPABASE_URL');
  const anonKey = requireEnv('SUPABASE_ANON_KEY');
  const accessToken = requireEnv('WORKORDER_SYSTEMS_ACCESS_TOKEN');
  const refreshToken = process.env.WORKORDER_SYSTEMS_REFRESH_TOKEN?.trim();

  const useSession = Boolean(refreshToken);
  const dbClient = useSession
    ? await createSessionDbClient(supabaseUrl, anonKey, accessToken, refreshToken)
    : createUserDbClient(supabaseUrl, anonKey, accessToken);

  const tryRefreshAccessTokenAfterSetTenant = useSession
    ? async () => {
        const { data, error } = await dbClient.supabase.auth.refreshSession();
        const token = data.session?.access_token;
        if (error || !token) {
          return { refreshed: false } as const;
        }
        return { refreshed: true, access_token: token } as const;
      }
    : undefined;

  const embedSearchUrl = process.env.WORKORDER_SYSTEMS_EMBED_SEARCH_URL?.trim();

  const server = createWorkOrderSystemsMcpServer(async () => dbClient, {
    tryRefreshAccessTokenAfterSetTenant,
    ...(embedSearchUrl
      ? {
          embedSearch: {
            embedSearchUrl,
            anonKey,
            getAccessToken: async () => {
              const { data } = await dbClient.supabase.auth.getSession();
              return data.session?.access_token ?? accessToken;
            },
          },
        }
      : {}),
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
