#!/usr/bin/env node
/**
 * Ensures packages/sdk/dist exists before `tsc` runs. Without it, NodeNext resolution
 * cannot load @workorder-systems/sdk (no declaration entry), which breaks Docker/CI
 * when only `pnpm --filter mcp build` runs.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..', '..');
const marker = join(repoRoot, 'packages', 'sdk', 'dist', 'index.d.ts');

if (existsSync(marker)) {
  process.exit(0);
}

const r = spawnSync(
  'pnpm',
  ['--filter', '@workorder-systems/sdk', 'run', 'build'],
  { stdio: 'inherit', cwd: repoRoot },
);

process.exit(r.status === null ? 1 : r.status);
