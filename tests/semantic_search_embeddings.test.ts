import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient, waitForSupabase } from './helpers/supabase';
import { createTestUser } from './helpers/auth';
import { createTestTenant, setTenantContext } from './helpers/tenant';
import { createTestAsset, createTestWorkOrder, transitionWorkOrderStatus } from './helpers/entities';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Deterministic 1536-d unit vector for pgvector RPC tests (no OpenAI). */
function unitEmbedding(seed: number): string {
  const v = Array.from({ length: 1536 }, (_, i) => Math.sin((i + 1) * seed * 0.001) * 0.01);
  const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  const norm = v.map((x) => x / n);
  return `[${norm.join(',')}]`;
}

describe('Semantic search & embeddings (AI-native)', () => {
  let client: SupabaseClient;

  beforeAll(async () => {
    await waitForSupabase();
    client = createTestClient();
  });

  it('should upsert embedding and return similar completed work orders', async () => {
    const userClient = createTestClient();
    await createTestUser(userClient);
    const tenantId = await createTestTenant(userClient);
    await setTenantContext(userClient, tenantId);

    const woId = await createTestWorkOrder(userClient, tenantId, 'Pump seal leak repair');
    await transitionWorkOrderStatus(userClient, tenantId, woId, 'assigned');
    await transitionWorkOrderStatus(userClient, tenantId, woId, 'in_progress');
    await transitionWorkOrderStatus(userClient, tenantId, woId, 'completed');

    const emb = unitEmbedding(42);
    const { error: upErr } = await userClient.rpc('rpc_upsert_work_order_embedding', {
      p_work_order_id: woId,
      p_embedding: emb,
      p_source_text: 'Pump seal leak repair',
      p_model_name: 'test:unit',
      p_model_version: 'v1',
      p_content_hash: 'abc123',
      p_embedding_profile: 'test_1536',
    });
    expect(upErr).toBeNull();

    const { data: sim, error: simErr } = await userClient.rpc('rpc_similar_past_work_orders', {
      p_query_embedding: emb,
      p_limit: 5,
      p_min_similarity: 0.0,
    });
    expect(simErr).toBeNull();
    expect(Array.isArray(sim)).toBe(true);
    const hit = (sim as { work_order_id: string }[]).find((r) => r.work_order_id === woId);
    expect(hit).toBeDefined();
  });

  it('should batch upsert embeddings for current tenant', async () => {
    const userClient = createTestClient();
    await createTestUser(userClient);
    const tenantId = await createTestTenant(userClient);
    await setTenantContext(userClient, tenantId);

    const woId = await createTestWorkOrder(userClient, tenantId, 'Batch embed WO');
    await transitionWorkOrderStatus(userClient, tenantId, woId, 'assigned');
    await transitionWorkOrderStatus(userClient, tenantId, woId, 'in_progress');
    await transitionWorkOrderStatus(userClient, tenantId, woId, 'completed');

    const emb = unitEmbedding(7);
    const { data: n, error } = await userClient.rpc('rpc_batch_upsert_work_order_embeddings', {
      p_rows: [
        {
          work_order_id: woId,
          embedding: emb,
          source_text: 'batch',
          model_name: 'test',
          model_version: 'v1',
        },
      ],
    });
    expect(error).toBeNull();
    expect(n).toBe(1);
  });

  it('should search entity candidates across aliases and names', async () => {
    const userClient = createTestClient();
    await createTestUser(userClient);
    const tenantId = await createTestTenant(userClient);
    await setTenantContext(userClient, tenantId);

    const { data: hits, error } = await userClient.rpc('rpc_search_entity_candidates', {
      p_query: 'test',
      p_limit: 5,
    });
    expect(error).toBeNull();
    expect(Array.isArray(hits)).toBe(true);
  });

  it('should claim idempotency only once', async () => {
    const userClient = createTestClient();
    await createTestUser(userClient);
    const tenantId = await createTestTenant(userClient);

    const { data: first, error: e1 } = await userClient.rpc('rpc_claim_idempotency', {
      p_tenant_id: tenantId,
      p_scope: 'test_scope',
      p_idempotency_key: 'key-1',
      p_resource_id: null,
    });
    expect(e1).toBeNull();
    expect(first).toBe(true);

    const { data: second, error: e2 } = await userClient.rpc('rpc_claim_idempotency', {
      p_tenant_id: tenantId,
      p_scope: 'test_scope',
      p_idempotency_key: 'key-1',
      p_resource_id: null,
    });
    expect(e2).toBeNull();
    expect(second).toBe(false);
  });

  it('should list assets without embeddings via rpc_next_assets_for_embedding', async () => {
    const userClient = createTestClient();
    await createTestUser(userClient);
    const tenantId = await createTestTenant(userClient);
    await setTenantContext(userClient, tenantId);

    const assetId = await createTestAsset(userClient, tenantId, 'Semantic embed test asset');

    const { data: rows, error } = await userClient.rpc('rpc_next_assets_for_embedding', {
      p_limit: 50,
    });
    expect(error).toBeNull();
    expect(Array.isArray(rows)).toBe(true);
    const hit = (rows as { asset_id: string }[]).find((r) => r.asset_id === assetId);
    expect(hit).toBeDefined();
  });

  it('should batch upsert asset embeddings for current tenant', async () => {
    const userClient = createTestClient();
    await createTestUser(userClient);
    const tenantId = await createTestTenant(userClient);
    await setTenantContext(userClient, tenantId);

    const assetId = await createTestAsset(userClient, tenantId, 'Batch asset embed');
    const emb = unitEmbedding(99);

    const { data: n, error } = await userClient.rpc('rpc_batch_upsert_asset_embeddings', {
      p_rows: [
        {
          asset_id: assetId,
          embedding: emb,
          source_text: 'batch asset',
          model_name: 'test',
          model_version: 'v1',
        },
      ],
    });
    expect(error).toBeNull();
    expect(n).toBe(1);

    const { data: after, error: e2 } = await userClient.rpc('rpc_next_assets_for_embedding', {
      p_limit: 50,
    });
    expect(e2).toBeNull();
    expect((after as { asset_id: string }[]).some((r) => r.asset_id === assetId)).toBe(false);
  });

  it('should list parts without embeddings via rpc_next_parts_for_embedding', async () => {
    const userClient = createTestClient();
    await createTestUser(userClient);
    const tenantId = await createTestTenant(userClient);
    await setTenantContext(userClient, tenantId);

    const { data: partId, error: pe } = await userClient.rpc('rpc_create_part', {
      p_tenant_id: tenantId,
      p_part_number: 'SEM-EMBED-1',
      p_name: 'Semantic test part',
      p_description: null,
      p_unit: 'each',
      p_preferred_supplier_id: null,
      p_external_id: null,
      p_reorder_point: 1,
      p_min_quantity: 0,
      p_max_quantity: 10,
      p_lead_time_days: 1,
    });
    expect(pe).toBeNull();
    expect(partId).toBeDefined();

    const { data: rows, error } = await userClient.rpc('rpc_next_parts_for_embedding', {
      p_limit: 50,
    });
    expect(error).toBeNull();
    expect(Array.isArray(rows)).toBe(true);
    const hit = (rows as { part_id: string }[]).find((r) => r.part_id === partId);
    expect(hit).toBeDefined();
  });
});
