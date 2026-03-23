import { describe, expect, it } from 'vitest';
import { buildMcpExpressAppOptionsFromEnv } from './http-app-options.js';

describe('buildMcpExpressAppOptionsFromEnv', () => {
  it('returns only host when no env hints', () => {
    expect(buildMcpExpressAppOptionsFromEnv('0.0.0.0', {})).toEqual({ host: '0.0.0.0' });
  });

  it('parses WORKORDER_SYSTEMS_ALLOWED_HOSTS', () => {
    const opts = buildMcpExpressAppOptionsFromEnv('0.0.0.0', {
      WORKORDER_SYSTEMS_ALLOWED_HOSTS: 'a.example.com, b.example.com ',
    });
    expect(opts).toEqual({
      host: '0.0.0.0',
      allowedHosts: ['a.example.com', 'b.example.com'],
    });
  });

  it('derives hostname from WORKORDER_SYSTEMS_PUBLIC_ORIGIN', () => {
    const opts = buildMcpExpressAppOptionsFromEnv('0.0.0.0', {
      WORKORDER_SYSTEMS_PUBLIC_ORIGIN: 'https://mcp.example.com/',
    });
    expect(opts).toEqual({
      host: '0.0.0.0',
      allowedHosts: ['mcp.example.com', '127.0.0.1', 'localhost', '[::1]'],
    });
  });

  it('ignores invalid public origin URL', () => {
    expect(
      buildMcpExpressAppOptionsFromEnv('0.0.0.0', {
        WORKORDER_SYSTEMS_PUBLIC_ORIGIN: 'not a url',
      })
    ).toEqual({ host: '0.0.0.0' });
  });
});
