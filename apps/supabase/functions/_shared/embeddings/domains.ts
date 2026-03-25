// SPDX-License-Identifier: AGPL-3.0-or-later

/** Domains supported by embed-index (batch) and embed-search (query). */
export const EMBEDD_INDEX_DOMAINS = ['work_orders', 'assets', 'parts'] as const;
export type EmbedIndexDomain = (typeof EMBEDD_INDEX_DOMAINS)[number];

export const EMBED_SEARCH_DOMAINS = ['work_orders', 'assets', 'parts'] as const;
export type EmbedSearchDomain = (typeof EMBED_SEARCH_DOMAINS)[number];

export function isEmbedIndexDomain(s: string): s is EmbedIndexDomain {
  return (EMBEDD_INDEX_DOMAINS as readonly string[]).includes(s);
}

export function parseEmbedIndexDomains(body: { domains?: unknown; domain?: unknown }): EmbedIndexDomain[] {
  if (Array.isArray(body.domains)) {
    const out = body.domains.filter((x): x is EmbedIndexDomain => typeof x === 'string' && isEmbedIndexDomain(x));
    if (out.length > 0) {
      return out;
    }
  }
  const one = typeof body.domain === 'string' ? body.domain : '';
  if (one === 'all' || one === '') {
    return [...EMBEDD_INDEX_DOMAINS];
  }
  if (isEmbedIndexDomain(one)) {
    return [one];
  }
  return [...EMBEDD_INDEX_DOMAINS];
}
