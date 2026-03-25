// SPDX-License-Identifier: AGPL-3.0-or-later
/** Response shaping for embed-search (summary / standard / full). */

export function truncate(s: string | null | undefined, max: number): string | null {
  if (s == null || s === '') {
    return null;
  }
  if (s.length <= max) {
    return s;
  }
  return `${s.slice(0, max)}…`;
}

type WoRow = {
  work_order_id?: string;
  title?: string;
  description?: string | null;
  status?: string;
  completed_at?: string | null;
  similarity_score?: number;
  asset_id?: string | null;
  location_id?: string | null;
  cause?: string | null;
  resolution?: string | null;
};

export function mapWorkOrderHits(rows: unknown[], level: string): unknown[] {
  const list = rows as WoRow[];
  return list.map((h) => {
    const base = {
      work_order_id: h.work_order_id,
      title: h.title,
      similarity_score: h.similarity_score,
      status: h.status,
      completed_at: h.completed_at,
      asset_id: h.asset_id ?? null,
      location_id: h.location_id ?? null,
    };
    if (level === 'summary') {
      return base;
    }
    if (level === 'standard') {
      return { ...base, description_preview: truncate(h.description ?? null, 240) };
    }
    return {
      ...base,
      description: h.description ?? null,
      cause: h.cause ?? null,
      resolution: h.resolution ?? null,
    };
  });
}

type AssetRow = {
  asset_id?: string;
  name?: string;
  description?: string | null;
  asset_number?: string | null;
  similarity_score?: number;
};

export function mapAssetHits(rows: unknown[], level: string): unknown[] {
  const list = rows as AssetRow[];
  return list.map((h) => {
    const base = {
      asset_id: h.asset_id,
      name: h.name,
      asset_number: h.asset_number ?? null,
      similarity_score: h.similarity_score,
    };
    if (level === 'summary') {
      return base;
    }
    if (level === 'standard') {
      return { ...base, description_preview: truncate(h.description ?? null, 200) };
    }
    return { ...base, description: h.description ?? null };
  });
}

type PartRow = {
  part_id?: string;
  name?: string | null;
  description?: string | null;
  part_number?: string;
  similarity_score?: number;
};

export function mapPartHits(rows: unknown[], level: string): unknown[] {
  const list = rows as PartRow[];
  return list.map((h) => {
    const base = {
      part_id: h.part_id,
      name: h.name ?? null,
      part_number: h.part_number,
      similarity_score: h.similarity_score,
    };
    if (level === 'summary') {
      return base;
    }
    if (level === 'standard') {
      return { ...base, description_preview: truncate(h.description ?? null, 200) };
    }
    return { ...base, description: h.description ?? null };
  });
}

export type EmbedSearchDomain = 'work_orders' | 'assets' | 'parts';

export function mapHitsForDomain(domain: EmbedSearchDomain, rows: unknown[], detailLevel: string): unknown[] {
  if (domain === 'work_orders') {
    return mapWorkOrderHits(rows, detailLevel);
  }
  if (domain === 'assets') {
    return mapAssetHits(rows, detailLevel);
  }
  return mapPartHits(rows, detailLevel);
}
