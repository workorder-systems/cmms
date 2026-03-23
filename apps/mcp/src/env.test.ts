import { describe, expect, it, afterEach } from 'vitest';
import { requireEnv } from './env.js';

describe('requireEnv', () => {
  const keys: string[] = [];

  afterEach(() => {
    for (const k of keys) {
      delete process.env[k];
    }
    keys.length = 0;
  });

  function setEnv(key: string, value: string): void {
    keys.push(key);
    process.env[key] = value;
  }

  it('returns trimmed value when set', () => {
    setEnv('MCP_ENV_TEST_FOO', '  bar  ');
    expect(requireEnv('MCP_ENV_TEST_FOO')).toBe('bar');
  });

  it('throws when unset', () => {
    expect(() => requireEnv('MCP_ENV_TEST_UNSET')).toThrow(
      /Missing required environment variable: MCP_ENV_TEST_UNSET/
    );
  });

  it('throws when empty or whitespace-only', () => {
    setEnv('MCP_ENV_TEST_EMPTY', '   ');
    expect(() => requireEnv('MCP_ENV_TEST_EMPTY')).toThrow(/Missing required environment variable/);
  });
});
