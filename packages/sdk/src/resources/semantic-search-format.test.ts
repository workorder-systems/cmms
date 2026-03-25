import { describe, it, expect } from 'vitest';
import { formatEmbeddingForRpc } from './semantic-search.js';

describe('formatEmbeddingForRpc (golden wire format)', () => {
  it('produces pgvector literal', () => {
    expect(formatEmbeddingForRpc([0, 1, -1])).toBe('[0,1,-1]');
  });

  it('handles 1536 dimensions', () => {
    const v = Array(1536).fill(0);
    const s = formatEmbeddingForRpc(v);
    expect(s.split(',').length).toBe(1536);
  });
});
