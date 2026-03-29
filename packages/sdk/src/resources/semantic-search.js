import { callRpc } from '../unwrap.js';
const rpc = (supabase) => supabase.rpc.bind(supabase);
/** Serialize a float embedding to pgvector text for PostgREST `vector(1536)` RPC args. */
export function formatEmbeddingForRpc(embedding) {
    return `[${embedding.join(',')}]`;
}
function normalizeEntityTypes(entityTypes) {
    return entityTypes === undefined ? undefined : entityTypes ?? null;
}
export function createSemanticSearchResource(supabase) {
    const r = rpc(supabase);
    return {
        async similarPastWorkOrders(params) {
            return callRpc(r, 'rpc_similar_past_work_orders', {
                p_query_embedding: formatEmbeddingForRpc(params.queryEmbedding),
                p_limit: params.limit ?? undefined,
                p_exclude_work_order_id: params.excludeWorkOrderId ?? undefined,
                p_min_similarity: params.minSimilarity ?? undefined,
            });
        },
        async similarPastWorkOrdersByWorkOrderId(workOrderId, options) {
            return callRpc(r, 'rpc_similar_past_work_orders_by_work_order_id', {
                p_work_order_id: workOrderId,
                p_limit: options?.limit ?? undefined,
                p_min_similarity: options?.minSimilarity ?? undefined,
            });
        },
        async upsertWorkOrderEmbedding(params) {
            await callRpc(r, 'rpc_upsert_work_order_embedding', {
                p_work_order_id: params.workOrderId,
                p_embedding: formatEmbeddingForRpc(params.embedding),
                p_source_text: params.sourceText ?? undefined,
                p_model_name: params.modelName ?? undefined,
                p_model_version: params.modelVersion ?? undefined,
                p_content_hash: params.contentHash ?? undefined,
                p_embedding_profile: params.embeddingProfile ?? undefined,
            });
        },
        async batchUpsertWorkOrderEmbeddings(rows) {
            return callRpc(r, 'rpc_batch_upsert_work_order_embeddings', {
                p_rows: rows,
            });
        },
        async batchUpsertAssetEmbeddings(rows) {
            return callRpc(r, 'rpc_batch_upsert_asset_embeddings', {
                p_rows: rows,
            });
        },
        async batchUpsertPartEmbeddings(rows) {
            return callRpc(r, 'rpc_batch_upsert_part_embeddings', {
                p_rows: rows,
            });
        },
        async getWorkOrderEmbedding(workOrderId) {
            const data = await callRpc(r, 'rpc_get_work_order_embedding', {
                p_work_order_id: workOrderId,
            });
            return data ?? null;
        },
        async nextWorkOrdersForEmbedding(limit) {
            return callRpc(r, 'rpc_next_work_orders_for_embedding', {
                p_limit: limit ?? undefined,
            });
        },
        async nextAssetsForEmbedding(limit) {
            return callRpc(r, 'rpc_next_assets_for_embedding', {
                p_limit: limit ?? undefined,
            });
        },
        async nextPartsForEmbedding(limit) {
            return callRpc(r, 'rpc_next_parts_for_embedding', {
                p_limit: limit ?? undefined,
            });
        },
        async similarAssets(params) {
            return callRpc(r, 'rpc_similar_assets', {
                p_query_embedding: formatEmbeddingForRpc(params.queryEmbedding),
                p_limit: params.limit ?? undefined,
                p_min_similarity: params.minSimilarity ?? undefined,
            });
        },
        async similarParts(params) {
            return callRpc(r, 'rpc_similar_parts', {
                p_query_embedding: formatEmbeddingForRpc(params.queryEmbedding),
                p_limit: params.limit ?? undefined,
                p_min_similarity: params.minSimilarity ?? undefined,
            });
        },
        async upsertAssetEmbedding(params) {
            await callRpc(r, 'rpc_upsert_asset_embedding', {
                p_asset_id: params.assetId,
                p_embedding: formatEmbeddingForRpc(params.embedding),
                p_source_text: params.sourceText ?? undefined,
                p_model_name: params.modelName ?? undefined,
                p_model_version: params.modelVersion ?? undefined,
                p_content_hash: params.contentHash ?? undefined,
                p_embedding_profile: params.embeddingProfile ?? undefined,
            });
        },
        async upsertPartEmbedding(params) {
            await callRpc(r, 'rpc_upsert_part_embedding', {
                p_part_id: params.partId,
                p_embedding: formatEmbeddingForRpc(params.embedding),
                p_source_text: params.sourceText ?? undefined,
                p_model_name: params.modelName ?? undefined,
                p_model_version: params.modelVersion ?? undefined,
                p_content_hash: params.contentHash ?? undefined,
                p_embedding_profile: params.embeddingProfile ?? undefined,
            });
        },
        async registerEntityAlias(params) {
            const n = await callRpc(r, 'rpc_register_entity_alias', {
                p_tenant_id: params.tenantId,
                p_entity_type: params.entityType,
                p_entity_id: params.entityId,
                p_alias_text: params.aliasText,
            });
            return typeof n === 'string' ? parseInt(n, 10) : n;
        },
        async searchEntityCandidates(params) {
            return callRpc(r, 'rpc_search_entity_candidates', {
                p_query: params.query,
                p_entity_types: normalizeEntityTypes(params.entityTypes),
                p_limit: params.limit ?? undefined,
            });
        },
        async searchEntityCandidatesV2(params) {
            return callRpc(r, 'rpc_search_entity_candidates_v2', {
                p_query: params.query,
                p_entity_types: normalizeEntityTypes(params.entityTypes),
                p_limit: params.limit ?? undefined,
            });
        },
        async claimIdempotency(params) {
            return callRpc(r, 'rpc_claim_idempotency', {
                p_tenant_id: params.tenantId,
                p_scope: params.scope,
                p_idempotency_key: params.idempotencyKey,
                p_resource_id: params.resourceId ?? undefined,
            });
        },
        async getIdempotencyResource(tenantId, scope, idempotencyKey) {
            const id = await callRpc(r, 'rpc_get_idempotency_resource', {
                p_tenant_id: tenantId,
                p_scope: scope,
                p_idempotency_key: idempotencyKey,
            });
            return id ?? null;
        },
    };
}
