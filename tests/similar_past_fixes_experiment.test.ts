/**
 * Individual Experiment A – Semantic "Similar Past Fixes"
 *
 * Tests:
 * - Tenant isolation: similar-past-work-orders returns only WOs from current tenant.
 * - RPC contract: rpc_upsert_work_order_embedding and rpc_similar_past_work_orders
 *   behave correctly with tenant context and enforce membership.
 * - Relevance and maintainability are evaluated manually; this file covers
 *   correctness and isolation.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient, waitForSupabase } from './helpers/supabase';
import { createTestUser } from './helpers/auth';
import {
  createTestTenant,
  setTenantContext,
  clearTenantContext,
} from './helpers/tenant';
import {
  createTestWorkOrder,
  transitionWorkOrderStatus,
} from './helpers/entities';

/** Build a 1536-dim vector with a single 1 at index i (for reproducible similarity). */
function makeVector(peakIndex: number): number[] {
  const v = new Array<number>(1536).fill(0);
  v[peakIndex] = 1;
  return v;
}

describe('Similar Past Fixes Experiment', () => {
  beforeAll(async () => {
    await waitForSupabase();
  });

  describe('Tenant isolation', () => {
    it('rpc_similar_past_work_orders returns only work orders from current tenant', async () => {
      const clientA = createTestClient();
      await createTestUser(clientA);
      const tenantIdA = await createTestTenant(clientA);
      await setTenantContext(clientA, tenantIdA);

      const clientB = createTestClient();
      await createTestUser(clientB);
      const tenantIdB = await createTestTenant(clientB);
      await setTenantContext(clientB, tenantIdB);

      // Tenant A: create and complete a work order, then add embedding
      const woA = await createTestWorkOrder(clientA, tenantIdA, 'Pump seal replacement', 'Replace seal on pump P-101');
      await transitionWorkOrderStatus(clientA, tenantIdA, woA, 'assigned');
      await transitionWorkOrderStatus(clientA, tenantIdA, woA, 'in_progress');
      await transitionWorkOrderStatus(clientA, tenantIdA, woA, 'completed');

      await clientA.rpc('rpc_upsert_work_order_embedding', {
        p_work_order_id: woA,
        p_embedding: makeVector(0),
        p_source_text: 'Pump seal replacement. Replace seal on pump P-101',
      });

      // Tenant B: create and complete a different work order, add embedding
      const woB = await createTestWorkOrder(clientB, tenantIdB, 'Belt drive repair', 'Replace belt on conveyor C-2');
      await transitionWorkOrderStatus(clientB, tenantIdB, woB, 'assigned');
      await transitionWorkOrderStatus(clientB, tenantIdB, woB, 'in_progress');
      await transitionWorkOrderStatus(clientB, tenantIdB, woB, 'completed');

      await clientB.rpc('rpc_upsert_work_order_embedding', {
        p_work_order_id: woB,
        p_embedding: makeVector(0),
        p_source_text: 'Belt drive repair. Replace belt on conveyor C-2',
      });

      // Query as tenant A with a vector similar to tenant A's WO (peak at 0)
      await setTenantContext(clientA, tenantIdA);
      const { data: similarA, error: errA } = await clientA.rpc('rpc_similar_past_work_orders', {
        p_query_embedding: makeVector(0),
        p_limit: 5,
      });

      expect(errA).toBeNull();
      expect(Array.isArray(similarA)).toBe(true);
      expect(similarA!.length).toBe(1);
      expect(similarA![0].work_order_id).toBe(woA);
      expect(similarA![0].title).toBe('Pump seal replacement');

      // Query as tenant B: must see only B's work order
      await setTenantContext(clientB, tenantIdB);
      const { data: similarB, error: errB } = await clientB.rpc('rpc_similar_past_work_orders', {
        p_query_embedding: makeVector(0),
        p_limit: 5,
      });

      expect(errB).toBeNull();
      expect(Array.isArray(similarB)).toBe(true);
      expect(similarB!.length).toBe(1);
      expect(similarB![0].work_order_id).toBe(woB);
      expect(similarB![0].title).toBe('Belt drive repair');
    });

    it('rpc_similar_past_work_orders requires tenant context', async () => {
      const client = createTestClient();
      await createTestUser(client);
      await createTestTenant(client);
      // createTestTenant() auto-sets tenant context; clear it to test the guard.
      await clearTenantContext(client);

      const { data, error } = await client.rpc('rpc_similar_past_work_orders', {
        p_query_embedding: makeVector(0),
        p_limit: 5,
      });

      expect(error).not.toBeNull();
      expect(error?.message).toMatch(/tenant|context|P0001/i);
      expect(data).toBeNull();
    });

    it('rpc_upsert_work_order_embedding rejects work order from another tenant', async () => {
      const clientA = createTestClient();
      await createTestUser(clientA);
      const tenantIdA = await createTestTenant(clientA);

      const clientB = createTestClient();
      await createTestUser(clientB);
      const tenantIdB = await createTestTenant(clientB);
      await setTenantContext(clientB, tenantIdB);
      const woB = await createTestWorkOrder(clientB, tenantIdB, 'Other tenant WO');

      // User A (tenant A) tries to upsert embedding for tenant B's work order
      await setTenantContext(clientA, tenantIdA);
      const { error } = await clientA.rpc('rpc_upsert_work_order_embedding', {
        p_work_order_id: woB,
        p_embedding: makeVector(0),
        p_source_text: null,
      });

      expect(error).not.toBeNull();
      expect(error?.message).toMatch(/not found|23503/i);
    });
  });

  describe('Backfill helper RPC', () => {
    it('rpc_next_work_orders_for_embedding returns only work orders without embeddings', async () => {
      const client = createTestClient();
      await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      // Two completed work orders; only one gets an embedding.
      const woWithEmbedding = await createTestWorkOrder(
        client,
        tenantId,
        'WO with embedding',
        'First work order'
      );
      await transitionWorkOrderStatus(
        client,
        tenantId,
        woWithEmbedding,
        'assigned'
      );
      await transitionWorkOrderStatus(
        client,
        tenantId,
        woWithEmbedding,
        'in_progress'
      );
      await transitionWorkOrderStatus(
        client,
        tenantId,
        woWithEmbedding,
        'completed'
      );

      const woWithoutEmbedding = await createTestWorkOrder(
        client,
        tenantId,
        'WO without embedding',
        'Second work order'
      );
      await transitionWorkOrderStatus(
        client,
        tenantId,
        woWithoutEmbedding,
        'assigned'
      );
      await transitionWorkOrderStatus(
        client,
        tenantId,
        woWithoutEmbedding,
        'in_progress'
      );
      await transitionWorkOrderStatus(
        client,
        tenantId,
        woWithoutEmbedding,
        'completed'
      );

      // Only the first work order gets an embedding.
      await client.rpc('rpc_upsert_work_order_embedding', {
        p_work_order_id: woWithEmbedding,
        p_embedding: makeVector(5),
        p_source_text: null,
      });

      const { data, error } = await client.rpc(
        'rpc_next_work_orders_for_embedding',
        { p_limit: 5 }
      );

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
      expect(data!.length).toBe(1);
      expect(data![0].work_order_id).toBe(woWithoutEmbedding);
    });
  });

  describe('RPC contract', () => {
    it('rpc_similar_past_work_orders returns similarity_score and completed work orders only', async () => {
      const client = createTestClient();
      await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const woCompleted = await createTestWorkOrder(client, tenantId, 'Completed job', 'Fixed the motor');
      await transitionWorkOrderStatus(client, tenantId, woCompleted, 'assigned');
      await transitionWorkOrderStatus(client, tenantId, woCompleted, 'in_progress');
      await transitionWorkOrderStatus(client, tenantId, woCompleted, 'completed');

      await client.rpc('rpc_upsert_work_order_embedding', {
        p_work_order_id: woCompleted,
        p_embedding: makeVector(10),
        p_source_text: 'Completed job. Fixed the motor',
      });

      const woDraft = await createTestWorkOrder(client, tenantId, 'Draft job', 'Not done');
      await client.rpc('rpc_upsert_work_order_embedding', {
        p_work_order_id: woDraft,
        p_embedding: makeVector(10),
        p_source_text: 'Draft job. Not done',
      });

      const { data: similar, error } = await client.rpc('rpc_similar_past_work_orders', {
        p_query_embedding: makeVector(10),
        p_limit: 5,
      });

      expect(error).toBeNull();
      expect(similar!.length).toBe(1);
      expect(similar![0].work_order_id).toBe(woCompleted);
      expect(similar![0].status).toBe('completed');
      expect(similar![0].completed_at).toBeDefined();
      expect(typeof similar![0].similarity_score).toBe('number');
      expect(similar![0].similarity_score).toBeGreaterThan(0);
    });

    it('rpc_similar_past_work_orders respects p_exclude_work_order_id', async () => {
      const client = createTestClient();
      await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const wo1 = await createTestWorkOrder(client, tenantId, 'Job one', 'Desc one');
      await transitionWorkOrderStatus(client, tenantId, wo1, 'assigned');
      await transitionWorkOrderStatus(client, tenantId, wo1, 'in_progress');
      await transitionWorkOrderStatus(client, tenantId, wo1, 'completed');
      await client.rpc('rpc_upsert_work_order_embedding', {
        p_work_order_id: wo1,
        p_embedding: makeVector(20),
        p_source_text: null,
      });

      const wo2 = await createTestWorkOrder(client, tenantId, 'Job two', 'Desc two');
      await transitionWorkOrderStatus(client, tenantId, wo2, 'assigned');
      await transitionWorkOrderStatus(client, tenantId, wo2, 'in_progress');
      await transitionWorkOrderStatus(client, tenantId, wo2, 'completed');
      await client.rpc('rpc_upsert_work_order_embedding', {
        p_work_order_id: wo2,
        p_embedding: makeVector(20),
        p_source_text: null,
      });

      const { data: similarExclude1 } = await client.rpc('rpc_similar_past_work_orders', {
        p_query_embedding: makeVector(20),
        p_limit: 5,
        p_exclude_work_order_id: wo1,
      });

      expect(similarExclude1!.length).toBe(1);
      expect(similarExclude1![0].work_order_id).toBe(wo2);

      const { data: similarNoExclude } = await client.rpc('rpc_similar_past_work_orders', {
        p_query_embedding: makeVector(20),
        p_limit: 5,
      });

      expect(similarNoExclude!.length).toBe(2);
    });

    it('rpc_similar_past_work_orders respects p_min_similarity threshold', async () => {
      const client = createTestClient();
      await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      // First completed work order: embedding aligned with query
      const wo1 = await createTestWorkOrder(client, tenantId, 'High similarity job', 'Aligned text');
      await transitionWorkOrderStatus(client, tenantId, wo1, 'assigned');
      await transitionWorkOrderStatus(client, tenantId, wo1, 'in_progress');
      await transitionWorkOrderStatus(client, tenantId, wo1, 'completed');
      await client.rpc('rpc_upsert_work_order_embedding', {
        p_work_order_id: wo1,
        p_embedding: makeVector(30),
        p_source_text: null,
      });

      // Second completed work order: different embedding (lower similarity to query)
      const wo2 = await createTestWorkOrder(client, tenantId, 'Lower similarity job', 'Different text');
      await transitionWorkOrderStatus(client, tenantId, wo2, 'assigned');
      await transitionWorkOrderStatus(client, tenantId, wo2, 'in_progress');
      await transitionWorkOrderStatus(client, tenantId, wo2, 'completed');
      await client.rpc('rpc_upsert_work_order_embedding', {
        p_work_order_id: wo2,
        p_embedding: makeVector(31),
        p_source_text: null,
      });

      // Query embedding matches wo1's embedding exactly; wo2 should be below a high threshold
      const { data: similar, error } = await client.rpc('rpc_similar_past_work_orders', {
        p_query_embedding: makeVector(30),
        p_limit: 5,
        p_min_similarity: 0.99,
      });

      expect(error).toBeNull();
      expect(similar!.length).toBe(1);
      expect(similar![0].work_order_id).toBe(wo1);
    });
  });
});
