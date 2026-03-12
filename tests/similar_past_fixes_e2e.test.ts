/**
 * E2E test: Similar Past Fixes (backfill + search).
 *
 * Creates a work order, completes it, invokes the backfill to index it,
 * then calls search. Indexing is only done by the server (backfill); users
 * cannot index.
 *
 * Requires: OPENAI_API_KEY, supabase functions serve (both similar-past-fixes
 * and similar-past-fixes-backfill). If CRON_SECRET is set, pass it via
 * x-cron-secret header. Excluded from CI. Run via: pnpm run test:e2e
 *
 * This describe is skipped when OPENAI_API_KEY is unset so CI and local runs
 * without edge functions stay green. To run the full E2E: set OPENAI_API_KEY,
 * run `pnpm run supabase:functions`, then `pnpm run test:e2e`.
 *
 * If you get "Invalid JWT" on search, try: supabase functions serve --no-verify-jwt
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient, waitForSupabase, getSupabaseConfig } from './helpers/supabase';
import { createTestUser } from './helpers/auth';
import {
  createTestTenant,
  setTenantContext,
} from './helpers/tenant';
import {
  createTestWorkOrder,
  transitionWorkOrderStatus,
} from './helpers/entities';

const hasE2EPrereqs = !!process.env.OPENAI_API_KEY;

describe.skipIf(!hasE2EPrereqs)('Similar Past Fixes E2E (backfill + search)', () => {
  beforeAll(async () => {
    await waitForSupabase();
  });

  it('backfill indexes completed work order, then search returns it', async () => {
    const { url, anonKey } = getSupabaseConfig();
    const backfillUrl = `${url}/functions/v1/similar-past-fixes-backfill`;
    const searchUrl = `${url}/functions/v1/similar-past-fixes/search`;

    const client = createTestClient();
    await createTestUser(client);
    const tenantId = await createTestTenant(client);
    await setTenantContext(client, tenantId);

    const title = 'Motor overload';
    const description = 'Check connections';
    const woId = await createTestWorkOrder(client, tenantId, title, description);
    await transitionWorkOrderStatus(client, tenantId, woId, 'assigned');
    await transitionWorkOrderStatus(client, tenantId, woId, 'in_progress');
    await transitionWorkOrderStatus(client, tenantId, woId, 'completed');

    // Backfill indexes completed WOs without embeddings (server-only).
    const backfillHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${anonKey}`,
    };
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) backfillHeaders['x-cron-secret'] = cronSecret;

    const backfillRes = await fetch(backfillUrl, {
      method: 'POST',
      headers: backfillHeaders,
      body: JSON.stringify({}),
    });
    const backfillBody = (await backfillRes.json()) as { ok?: boolean; processed?: number; failed?: number; error?: string };
    expect(backfillRes.ok, `backfill failed: ${JSON.stringify(backfillBody)}`).toBe(true);
    expect(backfillBody.ok).toBe(true);
    expect(
      backfillBody.processed,
      `backfill processed 0 (OPENAI_API_KEY set? Run: pnpm run supabase:functions)`
    ).toBeGreaterThanOrEqual(1);

    // Search (user-facing). Edge Functions require apikey; Authorization carries user JWT for RLS.
    const { data: sessionData } = await client.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) throw new Error('No session');

    const searchRes = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ queryText: `${title} ${description}`, limit: 5 }),
    });
    const searchBody = (await searchRes.json()) as {
      results?: Array<{ workOrderId: string; similarityScore: number; title: string }>;
      error?: string;
    };
    expect(searchRes.ok, `search failed: ${JSON.stringify(searchBody)}`).toBe(true);
    expect(searchBody.results).toBeDefined();
    expect(Array.isArray(searchBody.results)).toBe(true);
    expect(searchBody.results!.length).toBeGreaterThanOrEqual(1);
    expect(searchBody.results!.some((r) => r.workOrderId === woId)).toBe(true);
  }, 45_000);
});
