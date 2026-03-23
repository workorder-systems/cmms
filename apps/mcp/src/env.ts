/**
 * Shared env helpers for MCP entrypoints (stdio, HTTP, OAuth utilities).
 */

export function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}
