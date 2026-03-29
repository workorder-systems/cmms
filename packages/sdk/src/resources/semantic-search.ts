import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.js';
import { callRpc } from '../unwrap.js';

const rpc = (supabase: SupabaseClient<Database>) =>
  (supabase as unknown as { rpc: (n: string, p?: object) => Promise<{ data: unknown; error: unknown }> }).rpc.bind(
    supabase
  );

/** Serialize a float embedding to pgvector text for PostgREST `vector(1536)` RPC args. */
export function formatEmbeddingForRpc(embedding: readonly number[]): string {
  return `[${embedding.join(',')}]`;
}

export type SimilarPastWorkOrderRow = Database['public']['Functions']['rpc_similar_past_work_orders']['Returns'][number];

export type SimilarAssetRow = Database['public']['Functions']['rpc_similar_assets']['Returns'][number];

export type SimilarPartRow = Database['public']['Functions']['rpc_similar_parts']['Returns'][number];

export type EntityCandidateRow = Database['public']['Functions']['rpc_search_entity_candidates']['Returns'][number];
export type EntityCandidateV2Row =
  Database['public']['Functions']['rpc_search_entity_candidates_v2']['Returns'][number];

export type NextWorkOrderForEmbeddingRow =
  Database['public']['Functions']['rpc_next_work_orders_for_embedding']['Returns'][number];

export type NextAssetForEmbeddingRow =
  Database['public']['Functions']['rpc_next_assets_for_embedding']['Returns'][number];

export type NextPartForEmbeddingRow =
  Database['public']['Functions']['rpc_next_parts_for_embedding']['Returns'][number];

export interface UpsertWorkOrderEmbeddingParams {
  workOrderId: string;
  /** 1536 floats; passed as pgvector literal. */
  embedding: readonly number[];
  sourceText?: string | null;
  modelName?: string | null;
  modelVersion?: string | null;
  contentHash?: string | null;
  embeddingProfile?: string | null;
}

export interface BatchWorkOrderEmbeddingRow {
  work_order_id: string;
  /** pgvector text `[...]` or pass numbers and use formatter upstream. */
  embedding: string;
  source_text?: string | null;
  model_name?: string | null;
  model_version?: string | null;
  content_hash?: string | null;
  embedding_profile?: string | null;
}

export interface BatchAssetEmbeddingRow {
  asset_id: string;
  embedding: string;
  source_text?: string | null;
  model_name?: string | null;
  model_version?: string | null;
  content_hash?: string | null;
  embedding_profile?: string | null;
}

export interface BatchPartEmbeddingRow {
  part_id: string;
  embedding: string;
  source_text?: string | null;
  model_name?: string | null;
  model_version?: string | null;
  content_hash?: string | null;
  embedding_profile?: string | null;
}

export interface SimilarPastWorkOrdersParams {
  queryEmbedding: readonly number[];
  limit?: number;
  excludeWorkOrderId?: string | null;
  minSimilarity?: number | null;
}

export interface SemanticSearchResource {
  similarPastWorkOrders(params: SimilarPastWorkOrdersParams): Promise<SimilarPastWorkOrderRow[]>;
  similarPastWorkOrdersByWorkOrderId(
    workOrderId: string,
    options?: { limit?: number; minSimilarity?: number | null }
  ): Promise<SimilarPastWorkOrderRow[]>;
  upsertWorkOrderEmbedding(params: UpsertWorkOrderEmbeddingParams): Promise<void>;
  batchUpsertWorkOrderEmbeddings(rows: BatchWorkOrderEmbeddingRow[]): Promise<number>;
  batchUpsertAssetEmbeddings(rows: BatchAssetEmbeddingRow[]): Promise<number>;
  batchUpsertPartEmbeddings(rows: BatchPartEmbeddingRow[]): Promise<number>;
  getWorkOrderEmbedding(workOrderId: string): Promise<string | null>;
  nextWorkOrdersForEmbedding(limit?: number): Promise<NextWorkOrderForEmbeddingRow[]>;
  nextAssetsForEmbedding(limit?: number): Promise<NextAssetForEmbeddingRow[]>;
  nextPartsForEmbedding(limit?: number): Promise<NextPartForEmbeddingRow[]>;
  similarAssets(params: {
    queryEmbedding: readonly number[];
    limit?: number;
    minSimilarity?: number | null;
  }): Promise<SimilarAssetRow[]>;
  similarParts(params: {
    queryEmbedding: readonly number[];
    limit?: number;
    minSimilarity?: number | null;
  }): Promise<SimilarPartRow[]>;
  upsertAssetEmbedding(params: {
    assetId: string;
    embedding: readonly number[];
    sourceText?: string | null;
    modelName?: string | null;
    modelVersion?: string | null;
    contentHash?: string | null;
    embeddingProfile?: string | null;
  }): Promise<void>;
  upsertPartEmbedding(params: {
    partId: string;
    embedding: readonly number[];
    sourceText?: string | null;
    modelName?: string | null;
    modelVersion?: string | null;
    contentHash?: string | null;
    embeddingProfile?: string | null;
  }): Promise<void>;
  registerEntityAlias(params: {
    tenantId: string;
    entityType: string;
    entityId: string;
    aliasText: string;
  }): Promise<number>;
  searchEntityCandidates(params: {
    query: string;
    entityTypes?: string[] | null;
    limit?: number;
  }): Promise<EntityCandidateRow[]>;
  searchEntityCandidatesV2(params: {
    query: string;
    entityTypes?: string[] | null;
    limit?: number;
  }): Promise<EntityCandidateV2Row[]>;
  claimIdempotency(params: {
    tenantId: string;
    scope: string;
    idempotencyKey: string;
    resourceId?: string | null;
  }): Promise<boolean>;
  getIdempotencyResource(
    tenantId: string,
    scope: string,
    idempotencyKey: string
  ): Promise<string | null>;
}

export function createSemanticSearchResource(supabase: SupabaseClient<Database>): SemanticSearchResource {
  const r = rpc(supabase);
  return {
    async similarPastWorkOrders(params: SimilarPastWorkOrdersParams): Promise<SimilarPastWorkOrderRow[]> {
      return callRpc<SimilarPastWorkOrderRow[]>(r, 'rpc_similar_past_work_orders', {
        p_query_embedding: formatEmbeddingForRpc(params.queryEmbedding),
        p_limit: params.limit ?? undefined,
        p_exclude_work_order_id: params.excludeWorkOrderId ?? undefined,
        p_min_similarity: params.minSimilarity ?? undefined,
      });
    },

    async similarPastWorkOrdersByWorkOrderId(
      workOrderId: string,
      options?: { limit?: number; minSimilarity?: number | null }
    ): Promise<SimilarPastWorkOrderRow[]> {
      return callRpc<SimilarPastWorkOrderRow[]>(r, 'rpc_similar_past_work_orders_by_work_order_id', {
        p_work_order_id: workOrderId,
        p_limit: options?.limit ?? undefined,
        p_min_similarity: options?.minSimilarity ?? undefined,
      });
    },

    async upsertWorkOrderEmbedding(params: UpsertWorkOrderEmbeddingParams): Promise<void> {
      await callRpc<undefined>(r, 'rpc_upsert_work_order_embedding', {
        p_work_order_id: params.workOrderId,
        p_embedding: formatEmbeddingForRpc(params.embedding),
        p_source_text: params.sourceText ?? undefined,
        p_model_name: params.modelName ?? undefined,
        p_model_version: params.modelVersion ?? undefined,
        p_content_hash: params.contentHash ?? undefined,
        p_embedding_profile: params.embeddingProfile ?? undefined,
      });
    },

    async batchUpsertWorkOrderEmbeddings(rows: BatchWorkOrderEmbeddingRow[]): Promise<number> {
      return callRpc<number>(r, 'rpc_batch_upsert_work_order_embeddings', {
        p_rows: rows,
      });
    },

    async batchUpsertAssetEmbeddings(rows: BatchAssetEmbeddingRow[]): Promise<number> {
      return callRpc<number>(r, 'rpc_batch_upsert_asset_embeddings', {
        p_rows: rows,
      });
    },

    async batchUpsertPartEmbeddings(rows: BatchPartEmbeddingRow[]): Promise<number> {
      return callRpc<number>(r, 'rpc_batch_upsert_part_embeddings', {
        p_rows: rows,
      });
    },

    async getWorkOrderEmbedding(workOrderId: string): Promise<string | null> {
      const data = await callRpc<string | null>(r, 'rpc_get_work_order_embedding', {
        p_work_order_id: workOrderId,
      });
      return data ?? null;
    },

    async nextWorkOrdersForEmbedding(limit?: number): Promise<NextWorkOrderForEmbeddingRow[]> {
      return callRpc<NextWorkOrderForEmbeddingRow[]>(r, 'rpc_next_work_orders_for_embedding', {
        p_limit: limit ?? undefined,
      });
    },

    async nextAssetsForEmbedding(limit?: number): Promise<NextAssetForEmbeddingRow[]> {
      return callRpc<NextAssetForEmbeddingRow[]>(r, 'rpc_next_assets_for_embedding', {
        p_limit: limit ?? undefined,
      });
    },

    async nextPartsForEmbedding(limit?: number): Promise<NextPartForEmbeddingRow[]> {
      return callRpc<NextPartForEmbeddingRow[]>(r, 'rpc_next_parts_for_embedding', {
        p_limit: limit ?? undefined,
      });
    },

    async similarAssets(params: {
      queryEmbedding: readonly number[];
      limit?: number;
      minSimilarity?: number | null;
    }): Promise<SimilarAssetRow[]> {
      return callRpc<SimilarAssetRow[]>(r, 'rpc_similar_assets', {
        p_query_embedding: formatEmbeddingForRpc(params.queryEmbedding),
        p_limit: params.limit ?? undefined,
        p_min_similarity: params.minSimilarity ?? undefined,
      });
    },

    async similarParts(params: {
      queryEmbedding: readonly number[];
      limit?: number;
      minSimilarity?: number | null;
    }): Promise<SimilarPartRow[]> {
      return callRpc<SimilarPartRow[]>(r, 'rpc_similar_parts', {
        p_query_embedding: formatEmbeddingForRpc(params.queryEmbedding),
        p_limit: params.limit ?? undefined,
        p_min_similarity: params.minSimilarity ?? undefined,
      });
    },

    async upsertAssetEmbedding(params: {
      assetId: string;
      embedding: readonly number[];
      sourceText?: string | null;
      modelName?: string | null;
      modelVersion?: string | null;
      contentHash?: string | null;
      embeddingProfile?: string | null;
    }): Promise<void> {
      await callRpc<undefined>(r, 'rpc_upsert_asset_embedding', {
        p_asset_id: params.assetId,
        p_embedding: formatEmbeddingForRpc(params.embedding),
        p_source_text: params.sourceText ?? undefined,
        p_model_name: params.modelName ?? undefined,
        p_model_version: params.modelVersion ?? undefined,
        p_content_hash: params.contentHash ?? undefined,
        p_embedding_profile: params.embeddingProfile ?? undefined,
      });
    },

    async upsertPartEmbedding(params: {
      partId: string;
      embedding: readonly number[];
      sourceText?: string | null;
      modelName?: string | null;
      modelVersion?: string | null;
      contentHash?: string | null;
      embeddingProfile?: string | null;
    }): Promise<void> {
      await callRpc<undefined>(r, 'rpc_upsert_part_embedding', {
        p_part_id: params.partId,
        p_embedding: formatEmbeddingForRpc(params.embedding),
        p_source_text: params.sourceText ?? undefined,
        p_model_name: params.modelName ?? undefined,
        p_model_version: params.modelVersion ?? undefined,
        p_content_hash: params.contentHash ?? undefined,
        p_embedding_profile: params.embeddingProfile ?? undefined,
      });
    },

    async registerEntityAlias(params: {
      tenantId: string;
      entityType: string;
      entityId: string;
      aliasText: string;
    }): Promise<number> {
      const n = await callRpc<number>(r, 'rpc_register_entity_alias', {
        p_tenant_id: params.tenantId,
        p_entity_type: params.entityType,
        p_entity_id: params.entityId,
        p_alias_text: params.aliasText,
      });
      return typeof n === 'string' ? parseInt(n, 10) : n;
    },

    async searchEntityCandidates(params: {
      query: string;
      entityTypes?: string[] | null;
      limit?: number;
    }): Promise<EntityCandidateRow[]> {
      return callRpc<EntityCandidateRow[]>(r, 'rpc_search_entity_candidates', {
        p_query: params.query,
        p_entity_types: params.entityTypes ?? undefined,
        p_limit: params.limit ?? undefined,
      });
    },

    async searchEntityCandidatesV2(params: {
      query: string;
      entityTypes?: string[] | null;
      limit?: number;
    }): Promise<EntityCandidateV2Row[]> {
      return callRpc<EntityCandidateV2Row[]>(r, 'rpc_search_entity_candidates_v2', {
        p_query: params.query,
        p_entity_types: params.entityTypes ?? undefined,
        p_limit: params.limit ?? undefined,
      });
    },

    async claimIdempotency(params: {
      tenantId: string;
      scope: string;
      idempotencyKey: string;
      resourceId?: string | null;
    }): Promise<boolean> {
      return callRpc<boolean>(r, 'rpc_claim_idempotency', {
        p_tenant_id: params.tenantId,
        p_scope: params.scope,
        p_idempotency_key: params.idempotencyKey,
        p_resource_id: params.resourceId ?? undefined,
      });
    },

    async getIdempotencyResource(
      tenantId: string,
      scope: string,
      idempotencyKey: string
    ): Promise<string | null> {
      const id = await callRpc<string | null>(r, 'rpc_get_idempotency_resource', {
        p_tenant_id: tenantId,
        p_scope: scope,
        p_idempotency_key: idempotencyKey,
      });
      return id ?? null;
    },
  };
}
