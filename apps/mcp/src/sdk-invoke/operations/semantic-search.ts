import { z } from 'zod';
import type { SdkOperationDef } from '../types.js';
import { ann } from '../annotations.js';
import { uuid } from '../zod-common.js';

const vectorLiteral = z.string().min(4).describe('pgvector literal e.g. [0.1,0.2,...] for 1536 dims');

const batchRow = z.object({
  work_order_id: uuid,
  embedding: vectorLiteral,
  source_text: z.string().nullable().optional(),
  model_name: z.string().nullable().optional(),
  model_version: z.string().nullable().optional(),
  content_hash: z.string().nullable().optional(),
  embedding_profile: z.string().nullable().optional(),
});

const assetBatchRow = z.object({
  asset_id: uuid,
  embedding: vectorLiteral,
  source_text: z.string().nullable().optional(),
  model_name: z.string().nullable().optional(),
  model_version: z.string().nullable().optional(),
  content_hash: z.string().nullable().optional(),
  embedding_profile: z.string().nullable().optional(),
});

const partBatchRow = z.object({
  part_id: uuid,
  embedding: vectorLiteral,
  source_text: z.string().nullable().optional(),
  model_name: z.string().nullable().optional(),
  model_version: z.string().nullable().optional(),
  content_hash: z.string().nullable().optional(),
  embedding_profile: z.string().nullable().optional(),
});

export const semanticSearchOperations: Record<string, SdkOperationDef> = {
  'semantic_search.similar_past_work_orders': {
    description:
      'Semantic search completed work orders (cosine). Requires tenant JWT context. Pass query as pgvector literal or use Edge embed-search for text-in.',
    annotations: ann.read,
    inputSchema: z.object({
      p_query_embedding: vectorLiteral,
      p_limit: z.number().int().min(1).max(50).optional(),
      p_exclude_work_order_id: uuid.optional(),
      p_min_similarity: z.number().min(0).max(1).optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          p_query_embedding: vectorLiteral,
          p_limit: z.number().int().min(1).max(50).optional(),
          p_exclude_work_order_id: uuid.optional(),
          p_min_similarity: z.number().min(0).max(1).optional(),
        })
        .parse(args);
      return client.semanticSearch.similarPastWorkOrders({
        queryEmbedding: parseVectorLiteral(p.p_query_embedding),
        limit: p.p_limit,
        excludeWorkOrderId: p.p_exclude_work_order_id ?? null,
        minSimilarity: p.p_min_similarity ?? undefined,
      });
    },
  },
  'semantic_search.similar_past_by_work_order': {
    description: 'Find similar completed work orders using an existing work order embedding.',
    annotations: ann.read,
    inputSchema: z.object({
      p_work_order_id: uuid,
      p_limit: z.number().int().optional(),
      p_min_similarity: z.number().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          p_work_order_id: uuid,
          p_limit: z.number().int().optional(),
          p_min_similarity: z.number().optional(),
        })
        .parse(args);
      return client.semanticSearch.similarPastWorkOrdersByWorkOrderId(p.p_work_order_id, {
        limit: p.p_limit,
        minSimilarity: p.p_min_similarity,
      });
    },
  },
  'semantic_search.upsert_work_order_embedding': {
    description: 'Upsert a work order embedding (vectors computed in Edge, not in SQL).',
    annotations: ann.write,
    inputSchema: z.object({
      p_work_order_id: uuid,
      p_embedding: vectorLiteral,
      p_source_text: z.string().nullable().optional(),
      p_model_name: z.string().nullable().optional(),
      p_model_version: z.string().nullable().optional(),
      p_content_hash: z.string().nullable().optional(),
      p_embedding_profile: z.string().nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          p_work_order_id: uuid,
          p_embedding: vectorLiteral,
          p_source_text: z.string().nullable().optional(),
          p_model_name: z.string().nullable().optional(),
          p_model_version: z.string().nullable().optional(),
          p_content_hash: z.string().nullable().optional(),
          p_embedding_profile: z.string().nullable().optional(),
        })
        .parse(args);
      await client.semanticSearch.upsertWorkOrderEmbedding({
        workOrderId: p.p_work_order_id,
        embedding: parseVectorLiteral(p.p_embedding),
        sourceText: p.p_source_text ?? undefined,
        modelName: p.p_model_name ?? undefined,
        modelVersion: p.p_model_version ?? undefined,
        contentHash: p.p_content_hash ?? undefined,
        embeddingProfile: p.p_embedding_profile ?? undefined,
      });
      return { ok: true };
    },
  },
  'semantic_search.batch_upsert_work_order_embeddings': {
    description: 'Batch upsert work order embeddings (Edge embed-index worker).',
    annotations: ann.write,
    inputSchema: z.object({ rows: z.array(batchRow) }),
    async invoke(client, args) {
      const { rows } = z.object({ rows: z.array(batchRow) }).parse(args);
      const n = await client.semanticSearch.batchUpsertWorkOrderEmbeddings(rows);
      return { upserted: n };
    },
  },
  'semantic_search.next_work_orders_for_embedding': {
    description: 'List completed work orders missing embeddings (current tenant).',
    annotations: ann.read,
    inputSchema: z.object({ p_limit: z.number().int().min(1).max(500).optional() }),
    async invoke(client, args) {
      const { p_limit } = z.object({ p_limit: z.number().int().optional() }).parse(args);
      return client.semanticSearch.nextWorkOrdersForEmbedding(p_limit);
    },
  },
  'semantic_search.next_assets_for_embedding': {
    description: 'List assets missing embeddings (current tenant; embed-index backfill).',
    annotations: ann.read,
    inputSchema: z.object({ p_limit: z.number().int().min(1).max(500).optional() }),
    async invoke(client, args) {
      const { p_limit } = z.object({ p_limit: z.number().int().optional() }).parse(args);
      return client.semanticSearch.nextAssetsForEmbedding(p_limit);
    },
  },
  'semantic_search.next_parts_for_embedding': {
    description: 'List active parts missing embeddings (current tenant; embed-index backfill).',
    annotations: ann.read,
    inputSchema: z.object({ p_limit: z.number().int().min(1).max(500).optional() }),
    async invoke(client, args) {
      const { p_limit } = z.object({ p_limit: z.number().int().optional() }).parse(args);
      return client.semanticSearch.nextPartsForEmbedding(p_limit);
    },
  },
  'semantic_search.batch_upsert_asset_embeddings': {
    description: 'Batch upsert asset embeddings (Edge embed-index worker).',
    annotations: ann.write,
    inputSchema: z.object({ rows: z.array(assetBatchRow) }),
    async invoke(client, args) {
      const { rows } = z.object({ rows: z.array(assetBatchRow) }).parse(args);
      const n = await client.semanticSearch.batchUpsertAssetEmbeddings(rows);
      return { upserted: n };
    },
  },
  'semantic_search.batch_upsert_part_embeddings': {
    description: 'Batch upsert part embeddings (Edge embed-index worker).',
    annotations: ann.write,
    inputSchema: z.object({ rows: z.array(partBatchRow) }),
    async invoke(client, args) {
      const { rows } = z.object({ rows: z.array(partBatchRow) }).parse(args);
      const n = await client.semanticSearch.batchUpsertPartEmbeddings(rows);
      return { upserted: n };
    },
  },
  'semantic_search.search_entity_candidates': {
    description: 'Ontology-style search: aliases + asset/part/location name matches.',
    annotations: ann.read,
    inputSchema: z.object({
      p_query: z.string().min(1),
      p_entity_types: z.array(z.string()).optional(),
      p_limit: z.number().int().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          p_query: z.string().min(1),
          p_entity_types: z.array(z.string()).optional(),
          p_limit: z.number().int().optional(),
        })
        .parse(args);
      return client.semanticSearch.searchEntityCandidates({
        query: p.p_query,
        entityTypes: p.p_entity_types ?? null,
        limit: p.p_limit,
      });
    },
  },
  'semantic_search.register_entity_alias': {
    description: 'Register entity alias (tenant.admin).',
    annotations: ann.write,
    inputSchema: z.object({
      p_tenant_id: uuid,
      p_entity_type: z.string().min(1),
      p_entity_id: uuid,
      p_alias_text: z.string().min(1),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          p_tenant_id: uuid,
          p_entity_type: z.string().min(1),
          p_entity_id: uuid,
          p_alias_text: z.string().min(1),
        })
        .parse(args);
      const id = await client.semanticSearch.registerEntityAlias({
        tenantId: p.p_tenant_id,
        entityType: p.p_entity_type,
        entityId: p.p_entity_id,
        aliasText: p.p_alias_text,
      });
      return { alias_id: id };
    },
  },
  'semantic_search.claim_idempotency': {
    description: 'Claim idempotency key; returns false if duplicate.',
    annotations: ann.write,
    inputSchema: z.object({
      p_tenant_id: uuid,
      p_scope: z.string().min(1),
      p_idempotency_key: z.string().min(1),
      p_resource_id: uuid.optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          p_tenant_id: uuid,
          p_scope: z.string().min(1),
          p_idempotency_key: z.string().min(1),
          p_resource_id: uuid.optional(),
        })
        .parse(args);
      const first = await client.semanticSearch.claimIdempotency({
        tenantId: p.p_tenant_id,
        scope: p.p_scope,
        idempotencyKey: p.p_idempotency_key,
        resourceId: p.p_resource_id ?? null,
      });
      return { first_claim: first };
    },
  },
  'semantic_search.similar_assets': {
    description: 'Semantic search assets with embeddings.',
    annotations: ann.read,
    inputSchema: z.object({
      p_query_embedding: vectorLiteral,
      p_limit: z.number().int().optional(),
      p_min_similarity: z.number().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          p_query_embedding: vectorLiteral,
          p_limit: z.number().int().optional(),
          p_min_similarity: z.number().optional(),
        })
        .parse(args);
      return client.semanticSearch.similarAssets({
        queryEmbedding: parseVectorLiteral(p.p_query_embedding),
        limit: p.p_limit,
        minSimilarity: p.p_min_similarity,
      });
    },
  },
  'semantic_search.similar_parts': {
    description: 'Semantic search parts with embeddings.',
    annotations: ann.read,
    inputSchema: z.object({
      p_query_embedding: vectorLiteral,
      p_limit: z.number().int().optional(),
      p_min_similarity: z.number().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          p_query_embedding: vectorLiteral,
          p_limit: z.number().int().optional(),
          p_min_similarity: z.number().optional(),
        })
        .parse(args);
      return client.semanticSearch.similarParts({
        queryEmbedding: parseVectorLiteral(p.p_query_embedding),
        limit: p.p_limit,
        minSimilarity: p.p_min_similarity,
      });
    },
  },
};

function parseVectorLiteral(s: string): number[] {
  const t = s.trim();
  if (!t.startsWith('[') || !t.endsWith(']')) {
    throw new Error('embedding must be pgvector literal [..]');
  }
  const inner = t.slice(1, -1).trim();
  if (!inner) {
    return [];
  }
  return inner.split(',').map((x) => {
    const n = Number(x.trim());
    if (!Number.isFinite(n)) {
      throw new Error('invalid float in embedding');
    }
    return n;
  });
}
