import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export function loadDotEnvFile(path: string): void {
  if (!existsSync(path)) {
    return;
  }
  const text = readFileSync(path, 'utf8');
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) {
      continue;
    }
    const eq = t.indexOf('=');
    if (eq <= 0) {
      continue;
    }
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = val;
    }
  }
}

/**
 * Load apps/mcp/.env.local when not already set in the environment.
 * Does not override existing process.env (so CI and shells win).
 */
export function tryLoadMcpLocalEnv(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(here, '../.env.local'),
    resolve(process.cwd(), '.env.local'),
    resolve(process.cwd(), 'apps/mcp/.env.local'),
  ];
  for (const p of candidates) {
    loadDotEnvFile(p);
  }
}
