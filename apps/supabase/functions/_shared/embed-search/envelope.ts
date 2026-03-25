// SPDX-License-Identifier: AGPL-3.0-or-later
import type { EmbedSearchDomain } from './hits.ts';
import { mapHitsForDomain } from './hits.ts';

export type SemanticSearchEnvelope = {
  domain: EmbedSearchDomain;
  model_id: string;
  detail_level: string;
  ranking: { metric: 'cosine_similarity'; note: string };
  hit_count: number;
  hits: unknown[];
};

export function buildSearchResponse(
  domain: EmbedSearchDomain,
  modelId: string,
  detailLevel: string,
  rawRows: unknown[]
): SemanticSearchEnvelope {
  return {
    domain,
    model_id: modelId,
    detail_level: detailLevel,
    ranking: {
      metric: 'cosine_similarity',
      note: 'similarity_score is 1 minus cosine distance (higher is closer).',
    },
    hit_count: (rawRows ?? []).length,
    hits: mapHitsForDomain(domain, rawRows ?? [], detailLevel),
  };
}
