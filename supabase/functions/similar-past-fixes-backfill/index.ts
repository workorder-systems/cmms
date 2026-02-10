// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Edge Function: similar-past-fixes-backfill
//
// Purpose
// -------
// Cron-oriented backfill job for the \"Similar Past Fixes\" experiment.
// - Finds completed work orders that do not yet have embeddings.
// - Computes embeddings in small batches.
// - Upserts into app.work_order_embeddings directly (service role, bypassing RPC).
//
// This function is intended to be invoked on a schedule (e.g. every 5–15 minutes)
// using Supabase Edge Function cron. It uses the service role key to bypass RLS
// while still explicitly filtering by completed_at and join conditions.
//
// Environment variables
// ---------------------
// - SUPABASE_URL: PostgREST base URL
// - SUPABASE_SERVICE_ROLE_KEY: service role key (must be kept secret)
// - OPENAI_API_KEY: secret for embedding provider
// - EMBEDDING_MODEL (optional): model name, defaults to text-embedding-3-small
// - EMBEDDING_MODEL_VERSION (optional): logical version tag (e.g. v1, 2026-02-09)
// - BACKFILL_BATCH_LIMIT (optional): max work orders per run, defaults to 50
// - CRON_SECRET (optional but recommended): shared secret required in x-cron-secret
//   header for invoking this function. Helps ensure only your scheduler can trigger
//   backfills.
//
// Backfill strategy
// -----------------
// - Scope: all work orders with completed_at IS NOT NULL and no row in
//   app.work_order_embeddings (left join).
// - Batching: each run processes up to BACKFILL_BATCH_LIMIT work orders.
// - Rate limiting: control cost and load via BACKFILL_BATCH_LIMIT and cron
//   frequency; per-tenant caps can be layered later if needed.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

type BackfillCandidate = {
  work_order_id: string;
  tenant_id: string;
  title: string | null;
  description: string | null;
  asset_name: string | null;
  location_name: string | null;
};

type BackfillResult = {
  processed: number;
  failed: number;
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';
const EMBEDDING_MODEL =
  Deno.env.get('EMBEDDING_MODEL') ?? 'text-embedding-3-small';
const EMBEDDING_MODEL_VERSION =
  Deno.env.get('EMBEDDING_MODEL_VERSION') ?? 'v1';
const BACKFILL_BATCH_LIMIT = Number(
  Deno.env.get('BACKFILL_BATCH_LIMIT') ?? '50'
);
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? '';
const MAX_TEXT_CHARS = 4000;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    'similar-past-fixes-backfill: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set'
  );
}

if (!OPENAI_API_KEY) {
  console.error(
    'similar-past-fixes-backfill: OPENAI_API_KEY is not set; embedding calls will fail'
  );
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function embed(text: string): Promise<number[]> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const trimmed = text.trim().slice(0, MAX_TEXT_CHARS);
  if (!trimmed) {
    return new Array<number>(1536).fill(0);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: trimmed,
    }),
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout));

  if (!response.ok) {
    const textBody = await response.text().catch(() => '');
    throw new Error(
      `Failed to fetch embedding: ${response.status} ${response.statusText} ${textBody}`
    );
  }

  const data = await response.json();
  const embedding = data?.data?.[0]?.embedding as number[] | undefined;

  if (!embedding || !Array.isArray(embedding)) {
    throw new Error('Embedding response missing data[0].embedding');
  }

  return embedding;
}

async function backfillBatch(): Promise<BackfillResult> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const limit = Math.max(1, Math.min(BACKFILL_BATCH_LIMIT, 500));

  // Use helper RPC to find candidate work orders without embeddings.
  const { data: candidates, error: rpcError } = await supabase.rpc(
    'rpc_next_work_orders_for_embedding',
    { p_limit: limit }
  );

  if (rpcError) {
    console.error(
      'similar-past-fixes-backfill: rpc_next_work_orders_for_embedding failed',
      rpcError
    );
    throw new Error('rpc_next_work_orders_for_embedding failed');
  }

  const rows: BackfillCandidate[] = (candidates ?? []) as BackfillCandidate[];
  if (!rows.length) {
    return { processed: 0, failed: 0 };
  }

  let processed = 0;
  let failed = 0;

  for (const row of rows) {
    const parts: string[] = [];
    if (row.title) parts.push(String(row.title));
    if (row.description) parts.push(String(row.description));
    if (row.asset_name) parts.push(String(row.asset_name));
    if (row.location_name) parts.push(String(row.location_name));
    const sourceText = parts.join('\n').trim();

    // Best-effort retry on transient failures (embedding or upsert).
    let attempt = 0;
    let success = false;
    while (attempt < 2 && !success) {
      try {
        const embedding = await embed(sourceText);
        const { error: upsertError } = await supabase
          .from('app.work_order_embeddings')
          .upsert({
            work_order_id: row.work_order_id,
            tenant_id: row.tenant_id,
            embedding,
            source_text: sourceText || null,
            model_name: EMBEDDING_MODEL,
            model_version: EMBEDDING_MODEL_VERSION,
            embedded_at: new Date().toISOString(),
          });

        if (upsertError) {
          throw upsertError;
        }

        processed += 1;
        success = true;
      } catch (err) {
        attempt += 1;
        if (attempt >= 2) {
          failed += 1;
          console.error(
            'similar-past-fixes-backfill: embedding/upsert failed for work_order_id after retries',
            row.work_order_id,
            err
          );
        } else {
          console.warn(
            'similar-past-fixes-backfill: transient failure, retrying for work_order_id',
            row.work_order_id,
            err
          );
          // Small delay before retrying to avoid hammering downstream services.
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      }
    }
  }

  return { processed, failed };
}

serve(async (req: Request) => {
  // Cron runs can use GET or POST; we accept both for simplicity.
  if (req.method !== 'GET' && req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  // Optional shared-secret auth so only trusted schedulers can trigger this.
  if (CRON_SECRET) {
    const headerSecret = req.headers.get('x-cron-secret');
    if (!headerSecret || headerSecret !== CRON_SECRET) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }
  }

  try {
    const start = Date.now();
    const result = await backfillBatch();
    const durationMs = Date.now() - start;

    console.log(
      JSON.stringify({
        source: 'similar-past-fixes-backfill',
        processed: result.processed,
        failed: result.failed,
        durationMs,
        batchLimit: BACKFILL_BATCH_LIMIT,
        model: EMBEDDING_MODEL,
        modelVersion: EMBEDDING_MODEL_VERSION,
      })
    );

    return jsonResponse({
      ok: true,
      processed: result.processed,
      failed: result.failed,
      durationMs,
    });
  } catch (err) {
    console.error('similar-past-fixes-backfill: fatal error', err);
    return jsonResponse({ error: 'Backfill failed' }, 500);
  }
});

