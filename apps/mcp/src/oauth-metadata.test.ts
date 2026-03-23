import { describe, expect, it } from 'vitest';
import { buildAuthV1Issuer, buildProtectedResourceMetadata } from './oauth-metadata.js';

describe('buildAuthV1Issuer', () => {
  it('appends /auth/v1 to origin', () => {
    expect(buildAuthV1Issuer('https://abc.supabase.co')).toBe('https://abc.supabase.co/auth/v1');
    expect(buildAuthV1Issuer('https://abc.supabase.co/')).toBe('https://abc.supabase.co/auth/v1');
  });

  it('handles local supabase URL', () => {
    expect(buildAuthV1Issuer('http://127.0.0.1:54321')).toBe('http://127.0.0.1:54321/auth/v1');
  });
});

describe('buildProtectedResourceMetadata', () => {
  it('returns RFC 9728-style document', () => {
    const doc = buildProtectedResourceMetadata({
      resource: 'https://mcp.example.com/mcp',
      supabaseUrl: 'https://proj.supabase.co',
    });
    expect(doc.resource).toBe('https://mcp.example.com/mcp');
    expect(doc.authorization_servers).toEqual(['https://proj.supabase.co/auth/v1']);
    expect(doc.bearer_methods_supported).toEqual(['header']);
  });

  it('strips trailing slash from resource', () => {
    const doc = buildProtectedResourceMetadata({
      resource: 'https://mcp.example.com/mcp/',
      supabaseUrl: 'https://proj.supabase.co',
    });
    expect(doc.resource).toBe('https://mcp.example.com/mcp');
  });
});
