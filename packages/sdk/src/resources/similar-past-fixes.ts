import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeError } from '../errors.js';

/** Params for searching similar past work orders. */
export interface SearchSimilarParams {
  /** Free text describing the issue (e.g. title + description). Mutually exclusive with workOrderId. */
  queryText?: string;
  /** Work order ID to embed and search from. Mutually exclusive with queryText. */
  workOrderId?: string;
  /** Max results (1–50, default 5). */
  limit?: number;
  /** Min similarity in [0,1] (default 0.5). Higher = stricter; lower = more recall. */
  minSimilarity?: number;
}

/** A similar past work order result. */
export interface SimilarPastFixResult {
  workOrderId: string;
  title: string;
  description: string | null;
  status: string;
  completedAt: string | null;
  similarityScore: number;
  assetId: string | null;
  locationId: string | null;
}

/** Error response from the Edge Function. */
interface SearchErrorResponse {
  error: string;
  code?: string;
}

/**
 * Similar Past Fixes resource: search for semantically similar completed work orders.
 * Uses the similar-past-fixes Edge Function (embeds query, calls RPC, enriches results).
 * Requires tenant context before calling.
 */
export function createSimilarPastFixesResource(
  supabase: SupabaseClient
): { search(params: SearchSimilarParams): Promise<SimilarPastFixResult[]> } {
  return {
    /**
     * Search for similar past work orders by query text or work order ID.
     * Pass exactly one of queryText or workOrderId.
     */
    async search(params: SearchSimilarParams): Promise<SimilarPastFixResult[]> {
      const hasQuery = Boolean(params.queryText?.trim());
      const hasWorkOrder = Boolean(params.workOrderId);
      if (hasQuery === hasWorkOrder) {
        throw new Error(
          'Similar Past Fixes search requires exactly one of queryText or workOrderId'
        );
      }

      const body: Record<string, unknown> = {};
      if (params.queryText != null) body.queryText = params.queryText;
      if (params.workOrderId != null) body.workOrderId = params.workOrderId;
      if (params.limit != null) body.limit = params.limit;
      if (params.minSimilarity != null) body.minSimilarity = params.minSimilarity;

      const { data, error } = await supabase.functions.invoke(
        'similar-past-fixes',
        { body }
      );

      if (error) {
        throw normalizeError(error);
      }

      const resolved = data as { results?: SimilarPastFixResult[] } | SearchErrorResponse;
      if ('error' in resolved && resolved.error) {
        throw new Error(
          `Similar Past Fixes search failed: ${resolved.error}${resolved.code ? ` (${resolved.code})` : ''}`
        );
      }

      const results = (resolved as { results?: SimilarPastFixResult[] }).results ?? [];
      return results;
    },
  };
}

export type SimilarPastFixesResource = ReturnType<
  typeof createSimilarPastFixesResource
>;
