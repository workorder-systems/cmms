import type { CreateMcpExpressAppOptions } from '@modelcontextprotocol/sdk/server/express.js';

/**
 * Builds options for {@link createMcpExpressApp}: DNS rebinding protection when binding
 * to all interfaces (0.0.0.0) by deriving allowed Hostnames from `WORKORDER_SYSTEMS_PUBLIC_ORIGIN`
 * or an explicit `WORKORDER_SYSTEMS_ALLOWED_HOSTS` list.
 */
export function buildMcpExpressAppOptions(host: string): CreateMcpExpressAppOptions {
  return buildMcpExpressAppOptionsFromEnv(host, process.env);
}

/** @internal exported for tests */
export function buildMcpExpressAppOptionsFromEnv(
  host: string,
  env: NodeJS.ProcessEnv
): CreateMcpExpressAppOptions {
  const explicit = env.WORKORDER_SYSTEMS_ALLOWED_HOSTS?.trim();
  if (explicit) {
    return {
      host,
      allowedHosts: explicit
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };
  }
  const publicOrigin = env.WORKORDER_SYSTEMS_PUBLIC_ORIGIN?.trim();
  if (publicOrigin) {
    try {
      const hostname = new URL(publicOrigin).hostname;
      if (hostname) {
        return {
          host,
          allowedHosts: [hostname, '127.0.0.1', 'localhost', '[::1]'],
        };
      }
    } catch {
      /* invalid URL — fall through */
    }
  }
  return { host };
}
