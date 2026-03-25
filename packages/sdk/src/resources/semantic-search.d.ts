import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.js';
/** Serialize a float embedding to pgvector text for PostgREST `vector(1536)` RPC args. */
export declare function formatEmbeddingForRpc(embedding: readonly number[]): string;
export type SimilarPastWorkOrderRow = Database['public']['Functions']['rpc_similar_past_work_orders']['Returns'][number];
export type SimilarAssetRow = Database['public']['Functions']['rpc_similar_assets']['Returns'][number];
export type SimilarPartRow = Database['public']['Functions']['rpc_similar_parts']['Returns'][number];
export type EntityCandidateRow = Database['public']['Functions']['rpc_search_entity_candidates']['Returns'][number];
export type NextWorkOrderForEmbeddingRow = Database['public']['Functions']['rpc_next_work_orders_for_embedding']['Returns'][number];
export type NextAssetForEmbeddingRow = Database['public']['Functions']['rpc_next_assets_for_embedding']['Returns'][number];
export type NextPartForEmbeddingRow = Database['public']['Functions']['rpc_next_parts_for_embedding']['Returns'][number];
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
    similarPastWorkOrdersByWorkOrderId(workOrderId: string, options?: {
        limit?: number;
        minSimilarity?: number | null;
    }): Promise<SimilarPastWorkOrderRow[]>;
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
    claimIdempotency(params: {
        tenantId: string;
        scope: string;
        idempotencyKey: string;
        resourceId?: string | null;
    }): Promise<boolean>;
    getIdempotencyResource(tenantId: string, scope: string, idempotencyKey: string): Promise<string | null>;
}
export declare function createSemanticSearchResource(supabase: SupabaseClient<Database>): SemanticSearchResource;
//# sourceMappingURL=semantic-search.d.ts.map