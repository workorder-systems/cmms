// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Edge Function: similar-past-fixes
//
// Purpose
// -------
// Search for similar past work orders. Indexing is done only by the server
// (backfill cron); tenant users cannot index.
//
// POST /similar-past-fixes/search
//   Body:
//     {
//       "workOrderId"?: "uuid-string",
//       "queryText"?: "free text describing the issue",
//       "limit"?: number,            // optional, 1–50, default 5
//       "minSimilarity"?: number     // optional, 0–1, default 0.5
//     }
//   Exactly one of workOrderId or queryText must be provided.
//   Response:
//     {
//       "results": [
//         {
//           "workOrderId": "uuid",
//           "title": "string",
//           "description": "string | null",
//           "status": "string",
//           "completedAt": "ISO string | null",
//           "similarityScore": number,
//           "assetId": "uuid | null",
//           "locationId": "uuid | null"
//         },
//         ...
//       ]
//     }
//   or { "error": "message", "code": "BAD_REQUEST" | "EMBED_FAIL" | "RPC_FAIL" | "NOT_FOUND" }
//
// Environment variables
// ---------------------
// - SUPABASE_URL: PostgREST base URL
// - SUPABASE_ANON_KEY: anon key (RLS is enforced; we forward the user JWT)
// - OPENAI_API_KEY: secret for embedding provider (or compatible endpoint)
// - EMBEDDING_MODEL (optional): model name, defaults to text-embedding-3-small
// - EMBEDDING_MODEL_VERSION (optional): logical version tag (e.g. v1, 2026-02-09)

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

type SearchRequest = {
  workOrderId?: string;
  queryText?: string;
  /**
   * Maximum number of similar results to return (1–50, default 5).
   */
  limit?: number;
  /**
   * Optional similarity threshold in [0,1]. Defaults to 0.5 if omitted.
   * Higher values return only very close matches; lower values favor recall.
   */
  minSimilarity?: number;
};

type SimilarResult = {
  workOrderId: string;
  title: string;
  description: string | null;
  status: string;
  completedAt: string | null;
  similarityScore: number;
  assetId: string | null;
  locationId: string | null;
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';
const EMBEDDING_MODEL =
  Deno.env.get('EMBEDDING_MODEL') ?? 'text-embedding-3-small';
const EMBEDDING_MODEL_VERSION =
  Deno.env.get('EMBEDDING_MODEL_VERSION') ?? 'v1';

const MAX_TEXT_CHARS = 4000;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    'similar-past-fixes: SUPABASE_URL and SUPABASE_ANON_KEY must be set'
  );
}

if (!OPENAI_API_KEY) {
  console.error(
    'similar-past-fixes: OPENAI_API_KEY is not set; embedding calls will fail'
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
    // Return a zero vector; pgvector treats this as a valid but uninformative embedding.
    return new Array<number>(1536).fill(0);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

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

async function handleSearch(
  supabase: ReturnType<typeof createClient>,
  body: SearchRequest
): Promise<Response> {
  const startedAt = Date.now();
  const { workOrderId, queryText, limit, minSimilarity } = body;

  if (!workOrderId && (!queryText || !queryText.trim())) {
    return jsonResponse(
      {
        error: 'Either workOrderId or queryText must be provided',
        code: 'BAD_REQUEST',
      },
      400
    );
  }

  let textToEmbed: string;
  let excludeWorkOrderId: string | null = null;

  if (workOrderId) {
    // Fetch the work order to build the embedding text.
    const { data: woRows, error: woError } = await supabase
      .from('v_work_orders')
      .select('id,title,description,asset_id,location_id')
      .eq('id', workOrderId)
      .limit(1);

    if (woError) {
      console.error('similar-past-fixes/search: failed to fetch work order', woError);
      return jsonResponse(
        { error: 'Failed to fetch work order for search', code: 'RPC_FAIL' },
        500
      );
    }

    const wo = woRows && woRows.length > 0 ? woRows[0] : null;
    if (!wo) {
      return jsonResponse(
        { error: 'Work order not found', code: 'NOT_FOUND' },
        404
      );
    }

    const parts: string[] = [];
    if (wo.title) parts.push(String(wo.title));
    if (wo.description) parts.push(String(wo.description));
    try {
      if (wo.asset_id) {
        const { data: assetRows } = await supabase
          .from('v_assets')
          .select('name')
          .eq('id', wo.asset_id)
          .limit(1);
        const assetName = assetRows && assetRows[0]?.name;
        if (assetName) parts.push(String(assetName));
      }
      if (wo.location_id) {
        const { data: locationRows } = await supabase
          .from('v_locations')
          .select('name')
          .eq('id', wo.location_id)
          .limit(1);
        const locationName = locationRows && locationRows[0]?.name;
        if (locationName) parts.push(String(locationName));
      }
    } catch (lookupErr) {
      console.error(
        'similar-past-fixes/search: failed to enrich text with asset/location names',
        lookupErr
      );
    }
    textToEmbed = parts.join('\n').trim();
    excludeWorkOrderId = String(wo.id);
  } else {
    // Free-text query
    textToEmbed = (queryText ?? '').trim();
  }

  let queryEmbedding: number[];
  try {
    queryEmbedding = await embed(textToEmbed);
  } catch (err) {
    console.error('similar-past-fixes/search: embed failed', err);
    return jsonResponse(
      { error: 'Failed to compute embedding', code: 'EMBED_FAIL' },
      500
    );
  }

  const clampedLimit = Math.min(Math.max(limit ?? 5, 1), 50);

  const { data, error } = await supabase.rpc(
    'rpc_similar_past_work_orders',
    {
      p_query_embedding: queryEmbedding,
      p_limit: clampedLimit,
      p_exclude_work_order_id: excludeWorkOrderId,
      p_min_similarity:
        typeof minSimilarity === 'number' ? minSimilarity : undefined,
    }
  );

  if (error) {
    console.error(
      'similar-past-fixes/search: rpc_similar_past_work_orders failed',
      error
    );
    return jsonResponse(
      {
        error: 'Failed to fetch similar past work orders',
        code: 'RPC_FAIL',
      },
      500
    );
  }

  const results: SimilarResult[] = (data ?? []).map((row: any) => ({
    workOrderId: String(row.work_order_id),
    title: row.title ?? '',
    description: row.description ?? null,
    status: row.status ?? '',
    completedAt: row.completed_at ?? null,
    similarityScore: Number(row.similarity_score ?? 0),
    assetId: row.asset_id ?? null,
    locationId: row.location_id ?? null,
  }));

  const durationMs = Date.now() - startedAt;
  console.log(
    JSON.stringify({
      source: 'similar-past-fixes',
      path: '/search',
      workOrderId: workOrderId ?? null,
      durationMs,
      resultCount: results.length,
    })
  );

  return jsonResponse({ results });
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed', code: 'BAD_REQUEST' }, 405);
  }

  const url = new URL(req.url);
  const path = url.pathname.toLowerCase();

  const authHeader = req.headers.get('Authorization') ?? '';
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        // Forward caller JWT so RLS and auth.uid() work as expected.
        Authorization: authHeader,
      },
    },
  });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body', code: 'BAD_REQUEST' }, 400);
  }

  /* Accept both /search (direct fetch) and base path (supabase.functions.invoke) */
  if (path.endsWith('/search') || path.endsWith('similar-past-fixes')) {
    return handleSearch(supabase, body as SearchRequest);
  }

  return jsonResponse(
    { error: 'Unknown route. Use /similar-past-fixes/search', code: 'BAD_REQUEST' },
    404
  );
});

