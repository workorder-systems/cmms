import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type NamedDefinition = {
  name: string;
  file: string;
  parameters?: string[];
};

const migrationsDir = resolve(__dirname, '..', 'supabase', 'migrations');
const sqlFiles = readdirSync(migrationsDir).filter((file) => file.endsWith('.sql'));

function loadSql(file: string): string {
  return readFileSync(resolve(migrationsDir, file), 'utf-8');
}

function extractPublicViews(): NamedDefinition[] {
  const views: NamedDefinition[] = [];
  const viewRegex = /create\s+(?:or\s+replace\s+)?view\s+public\.([a-z0-9_]+)/gi;

  for (const file of sqlFiles) {
    const contents = loadSql(file);
    let match: RegExpExecArray | null;
    while ((match = viewRegex.exec(contents)) !== null) {
      views.push({ name: match[1], file });
    }
  }

  return views;
}

function parseParameterNames(paramBlock: string): string[] {
  if (!paramBlock.trim()) {
    return [];
  }

  return paramBlock
    .split(',')
    .map((param) => param.trim())
    .filter(Boolean)
    .map((param) => param.replace(/\s+/g, ' '))
    .map((param) => param.split(' ')[0]);
}

function extractPublicFunctions(): NamedDefinition[] {
  const functions: NamedDefinition[] = [];
  const functionRegex =
    /create\s+(?:or\s+replace\s+)?function\s+public\.([a-z0-9_]+)\s*\(([\s\S]*?)\)\s*returns/gi;

  for (const file of sqlFiles) {
    const contents = loadSql(file);
    let match: RegExpExecArray | null;
    while ((match = functionRegex.exec(contents)) !== null) {
      functions.push({
        name: match[1],
        file,
        parameters: parseParameterNames(match[2]),
      });
    }
  }

  return functions;
}

describe('Public API naming conventions', () => {
  it('public views follow v_<resource> naming patterns', () => {
    const views = extractPublicViews();
    const summaryPattern = /^v_[a-z0-9_]+_(summary|overview)(?:_v\d+)?$/;
    const standardPattern = /^v_[a-z0-9_]+(?:_v\d+)?$/;

    for (const view of views) {
      const isSummary = view.name.includes('_summary') || view.name.includes('_overview');
      const matches = isSummary
        ? summaryPattern.test(view.name)
        : standardPattern.test(view.name);

      expect(matches, `${view.name} in ${view.file}`).toBe(true);
    }
  });

  it('public RPCs use rpc_<verb>_<resource> and tenant ordering', () => {
    const functions = extractPublicFunctions();
    const allowedNonRpc = new Set([
      'refresh_analytics_views',
      'refresh_tenant_analytics',
      // Internal trigger functions for updatable views (not public RPCs)
      'handle_v_work_order_time_entries_update',
      'handle_v_work_order_time_entries_delete',
      'handle_v_work_order_attachments_update',
      'handle_v_work_order_attachments_delete',
    ]);
    const rpcPattern = /^rpc_[a-z0-9]+_[a-z0-9_]+(?:_v\d+)?$/;

    for (const fn of functions) {
      if (allowedNonRpc.has(fn.name)) {
        continue;
      }

      expect(rpcPattern.test(fn.name), `${fn.name} in ${fn.file}`).toBe(true);

      if (fn.parameters?.includes('p_tenant_id')) {
        expect(fn.parameters[0], `${fn.name} in ${fn.file}`).toBe('p_tenant_id');
      }
    }
  });
});
