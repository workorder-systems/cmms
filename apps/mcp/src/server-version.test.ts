import { describe, expect, it } from 'vitest';
import { MCP_PACKAGE_VERSION } from './server-version.js';

describe('MCP_PACKAGE_VERSION', () => {
  it('matches semver-like pattern from package.json', () => {
    expect(MCP_PACKAGE_VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });
});
