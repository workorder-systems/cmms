import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** package.json `version` (single source of truth for MCP `initialize` and health). */
export const MCP_PACKAGE_VERSION: string = (
  JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8')) as { version: string }
).version;
