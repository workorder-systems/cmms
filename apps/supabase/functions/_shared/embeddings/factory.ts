// SPDX-License-Identifier: AGPL-3.0-or-later
import type { EmbeddingProvider } from './types.ts';
import { OpenAiEmbeddingProvider } from './openai.ts';
import { StubEmbeddingProvider } from './stub.ts';

function parseDimensions(): number {
  const raw = Deno.env.get('EMBEDDING_DIMENSIONS') ?? '1536';
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) {
    throw new Error(`Invalid EMBEDDING_DIMENSIONS: ${raw}`);
  }
  return n;
}

/**
 * Create provider from env:
 * - EMBEDDING_PROVIDER=openai (default if OPENAI_API_KEY set) | stub
 * - OPENAI_API_KEY, EMBEDDING_MODEL, EMBEDDING_DIMENSIONS, OPENAI_BASE_URL (optional)
 */
export function createEmbeddingProvider(): EmbeddingProvider {
  const dims = parseDimensions();
  const explicit = (Deno.env.get('EMBEDDING_PROVIDER') ?? '').toLowerCase().trim();
  const key = Deno.env.get('OPENAI_API_KEY') ?? '';

  if (explicit === 'stub' || (!key && explicit !== 'openai')) {
    return new StubEmbeddingProvider(dims);
  }

  if (!key) {
    throw new Error('OPENAI_API_KEY is required when EMBEDDING_PROVIDER=openai');
  }

  return new OpenAiEmbeddingProvider({
    apiKey: key,
    model: Deno.env.get('EMBEDDING_MODEL') ?? undefined,
    dimensions: dims,
    baseUrl: Deno.env.get('OPENAI_BASE_URL') ?? undefined,
  });
}

export function assertDimensionsMatch(provider: EmbeddingProvider): void {
  const expected = parseDimensions();
  if (provider.dimensions !== expected) {
    throw new Error(
      `Provider dimensions ${provider.dimensions} != EMBEDDING_DIMENSIONS ${expected}`
    );
  }
}
