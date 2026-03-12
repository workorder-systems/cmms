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
  cause: string | null;
  resolution: string | null;
}

/** Error response from the Edge Function. */
interface SearchErrorResponse {
  error: string;
  code?: string;
}

/** Raw row returned by rpc_similar_past_work_orders / rpc_similar_past_work_orders_by_work_order_id. */
interface SimilarPastWorkOrderRow {
  work_order_id: string;
  title: string;
  description: string | null;
  status: string;
  completed_at: string | null;
  similarity_score: number;
  asset_id: string | null;
  location_id: string | null;
  cause: string | null;
  resolution: string | null;
}

function mapRowToResult(row: SimilarPastWorkOrderRow): SimilarPastFixResult {
  return {
    workOrderId: String(row.work_order_id),
    title: row.title ?? '',
    description: row.description ?? null,
    status: row.status ?? '',
    completedAt: row.completed_at ?? null,
    similarityScore: Number(row.similarity_score ?? 0),
    assetId: row.asset_id ?? null,
    locationId: row.location_id ?? null,
    cause: row.cause ?? null,
    resolution: row.resolution ?? null,
  };
}

/**
 * Similar Past Fixes resource: search for semantically similar completed work orders.
 * When searching by workOrderId, uses RPC only (stored embedding). When searching by
 * queryText, uses the similar-past-fixes Edge Function to embed the query then RPC.
 * Requires tenant context before calling.
 */
export function createSimilarPastFixesResource(
  supabase: SupabaseClient
): { search(params: SearchSimilarParams): Promise<SimilarPastFixResult[]> } {
  return {
    /**
     * Search for similar past work orders by query text or work order ID.
     * Pass exactly one of queryText or workOrderId.
     * workOrderId path uses RPC only (no Edge Function); queryText path uses the Edge Function to embed.
     */
    async search(params: SearchSimilarParams): Promise<SimilarPastFixResult[]> {
      const hasQuery = Boolean(params.queryText?.trim());
      const hasWorkOrder = Boolean(params.workOrderId);
      if (hasQuery === hasWorkOrder) {
        throw new Error(
          'Similar Past Fixes search requires exactly one of queryText or workOrderId'
        );
      }

      // By work order ID: use stored embedding via RPC only (no Edge Function, no OpenAI).
      if (params.workOrderId) {
        const limit = Math.min(Math.max(params.limit ?? 5, 1), 50);
        const { data, error } = await supabase.rpc(
          'rpc_similar_past_work_orders_by_work_order_id',
          {
            p_work_order_id: params.workOrderId,
            p_limit: limit,
            p_min_similarity:
              typeof params.minSimilarity === 'number' ? params.minSimilarity : undefined,
          }
        );
        if (error) throw normalizeError(error);
        const rows = (data ?? []) as SimilarPastWorkOrderRow[];
        return rows.map(mapRowToResult);
      }

      // By query text: Edge Function embeds the query then calls RPC.
      const body: Record<string, unknown> = {};
      if (params.queryText != null) body.queryText = params.queryText;
      if (params.limit != null) body.limit = params.limit;
      if (params.minSimilarity != null) body.minSimilarity = params.minSimilarity;

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const { data, error } = await supabase.functions.invoke(
        'similar-past-fixes',
        { body, headers }
      );

      if (error) {
        throw normalizeError(error);
      }

      const resolved = data as { results?: SimilarPastFixResult[] } | SearchErrorResponse;
      if ('error' in resolved && resolved.error) {
        const message = `Similar Past Fixes search failed: ${resolved.error}`;
        const err = new (require('../errors.js').SdkError)(message, {
          code: resolved.code,
        });
        throw err;
      }

      const results = (resolved as { results?: SimilarPastFixResult[] }).results ?? [];
      return results;
    },
  };
}

export type SimilarPastFixesResource = ReturnType<
  typeof createSimilarPastFixesResource
>;
