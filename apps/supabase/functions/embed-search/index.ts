// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Edge: text-in semantic search (embed query via modular provider → rpc_similar_*).
//
// POST /embed-search
// Headers: Authorization: Bearer <user JWT>, apikey: <anon key>
// Body: { "domain": "work_orders" | "assets" | "parts", "query_text": "...", "limit"?, "detail_level"? ... }
//
// Env: SUPABASE_URL, SUPABASE_ANON_KEY, EMBEDDING_*, OPENAI_* (see _shared/embeddings/factory.ts)

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { buildSearchResponse } from '../_shared/embed-search/envelope.ts';
import type { EmbedSearchDomain } from '../_shared/embed-search/hits.ts';
import { createEmbeddingProvider, assertDimensionsMatch } from '../_shared/embeddings/factory.ts';
import { toPgVectorLiteral } from '../_shared/vector.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

const ALLOWED_DOMAINS: EmbedSearchDomain[] = ['work_orders', 'assets', 'parts'];

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }
  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  const auth = req.headers.get('Authorization');
  const apikey = req.headers.get('apikey') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  if (!auth?.startsWith('Bearer ')) {
    return json({ error: 'missing_bearer' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? apikey;
  if (!supabaseUrl || !anon) {
    return json({ error: 'server_misconfigured' }, 500);
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const domain = String(body.domain ?? '') as EmbedSearchDomain;
  const queryText = String(body.query_text ?? '').trim();
  const detailLevel = ['summary', 'standard', 'full'].includes(String(body.detail_level))
    ? String(body.detail_level)
    : 'summary';
  if (!queryText) {
    return json({ error: 'query_text_required' }, 400);
  }

  if (!ALLOWED_DOMAINS.includes(domain)) {
    return json({ error: 'unknown_domain', allowed: ALLOWED_DOMAINS }, 400);
  }

  let provider;
  try {
    provider = createEmbeddingProvider();
    assertDimensionsMatch(provider);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: 'embedding_provider', message: msg }, 500);
  }

  let queryEmbedding: number[];
  try {
    queryEmbedding = await provider.embedQuery(queryText);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: 'embed_failed', message: msg }, 502);
  }

  const vec = toPgVectorLiteral(queryEmbedding);
  const supabase = createClient(supabaseUrl, anon, {
    global: { headers: { Authorization: auth } },
  });

  const limit = typeof body.limit === 'number' ? body.limit : undefined;

  try {
    if (domain === 'work_orders') {
      const { data, error } = await supabase.rpc('rpc_similar_past_work_orders', {
        p_query_embedding: vec,
        p_limit: limit ?? 5,
        p_exclude_work_order_id: (body.exclude_work_order_id as string) ?? undefined,
        p_min_similarity: (body.min_similarity as number) ?? undefined,
      });
      if (error) {
        return json({ error: 'rpc_failed', message: error.message }, 400);
      }
      return json(buildSearchResponse(domain, provider.modelId, detailLevel, data ?? []));
    }

    if (domain === 'assets') {
      const { data, error } = await supabase.rpc('rpc_similar_assets', {
        p_query_embedding: vec,
        p_limit: limit ?? 10,
        p_min_similarity: (body.min_similarity as number) ?? undefined,
      });
      if (error) {
        return json({ error: 'rpc_failed', message: error.message }, 400);
      }
      return json(buildSearchResponse(domain, provider.modelId, detailLevel, data ?? []));
    }

    const { data, error } = await supabase.rpc('rpc_similar_parts', {
      p_query_embedding: vec,
      p_limit: limit ?? 10,
      p_min_similarity: (body.min_similarity as number) ?? undefined,
    });
    if (error) {
      return json({ error: 'rpc_failed', message: error.message }, 400);
    }
    return json(buildSearchResponse('parts', provider.modelId, detailLevel, data ?? []));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: 'internal', message: msg }, 500);
  }
});
