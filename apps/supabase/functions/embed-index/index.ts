// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Edge: batch index entities without embeddings (work_orders, assets, parts).
//
// POST /embed-index
// Headers: Authorization: Bearer <user JWT>, apikey: <anon>
// Body: { "limit"?: number (per domain, default 20, max 50), "domains"?: ("work_orders"|"assets"|"parts")[], "domain"?: "all"|same }
//
// Uses shared canonical text + content_hash; embeds via provider; batch upserts per domain.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import {
  canonicalAssetText,
  canonicalPartText,
  canonicalWorkOrderText,
  MAX_SOURCE_TEXT_CHARS,
  resolveEmbeddingProfileEnv,
  sha256Hex,
} from '../_shared/embeddings/canonical.ts';
import { createEmbeddingProvider, assertDimensionsMatch } from '../_shared/embeddings/factory.ts';
import { parseEmbedIndexDomains, type EmbedIndexDomain } from '../_shared/embeddings/domains.ts';
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

type SupabaseRpc = ReturnType<typeof createClient>;

async function indexWorkOrders(
  supabase: SupabaseRpc,
  provider: { modelId: string; dimensions: number; embedDocuments: (t: string[]) => Promise<number[][]> },
  limit: number,
  modelVersion: string
): Promise<{ domain: EmbedIndexDomain; indexed: number; ids: string[] }> {
  const { data: rows, error: nextErr } = await supabase.rpc('rpc_next_work_orders_for_embedding', {
    p_limit: limit,
  });
  if (nextErr) {
    throw new Error(`work_orders rpc_next: ${nextErr.message}`);
  }
  const list = (rows ?? []) as {
    work_order_id: string;
    title: string;
    description: string | null;
    cause: string | null;
    resolution: string | null;
    asset_name: string | null;
    location_name: string | null;
  }[];
  if (list.length === 0) {
    return { domain: 'work_orders', indexed: 0, ids: [] };
  }
  const texts = list.map((r) => canonicalWorkOrderText(r));
  const vectors = await provider.embedDocuments(texts);
  const profile = resolveEmbeddingProfileEnv(provider.modelId, provider.dimensions);
  const batchRows = await Promise.all(
    list.map(async (r, i) => {
      const text = texts[i];
      const hash = await sha256Hex(text);
      return {
        work_order_id: r.work_order_id,
        embedding: toPgVectorLiteral(vectors[i]),
        source_text: text.slice(0, MAX_SOURCE_TEXT_CHARS),
        model_name: provider.modelId,
        model_version: modelVersion,
        content_hash: hash,
        embedding_profile: profile,
      };
    })
  );
  const { data: count, error: upErr } = await supabase.rpc('rpc_batch_upsert_work_order_embeddings', {
    p_rows: batchRows,
  });
  if (upErr) {
    throw new Error(`work_orders batch_upsert: ${upErr.message}`);
  }
  return { domain: 'work_orders', indexed: count ?? batchRows.length, ids: list.map((r) => r.work_order_id) };
}

async function indexAssets(
  supabase: SupabaseRpc,
  provider: { modelId: string; dimensions: number; embedDocuments: (t: string[]) => Promise<number[][]> },
  limit: number,
  modelVersion: string
): Promise<{ domain: EmbedIndexDomain; indexed: number; ids: string[] }> {
  const { data: rows, error: nextErr } = await supabase.rpc('rpc_next_assets_for_embedding', {
    p_limit: limit,
  });
  if (nextErr) {
    throw new Error(`assets rpc_next: ${nextErr.message}`);
  }
  const list = (rows ?? []) as {
    asset_id: string;
    name: string;
    description: string | null;
    asset_number: string | null;
    location_name: string | null;
  }[];
  if (list.length === 0) {
    return { domain: 'assets', indexed: 0, ids: [] };
  }
  const texts = list.map((r) => canonicalAssetText(r));
  const vectors = await provider.embedDocuments(texts);
  const profile = resolveEmbeddingProfileEnv(provider.modelId, provider.dimensions);
  const batchRows = await Promise.all(
    list.map(async (r, i) => {
      const text = texts[i];
      const hash = await sha256Hex(text);
      return {
        asset_id: r.asset_id,
        embedding: toPgVectorLiteral(vectors[i]),
        source_text: text.slice(0, MAX_SOURCE_TEXT_CHARS),
        model_name: provider.modelId,
        model_version: modelVersion,
        content_hash: hash,
        embedding_profile: profile,
      };
    })
  );
  const { data: count, error: upErr } = await supabase.rpc('rpc_batch_upsert_asset_embeddings', {
    p_rows: batchRows,
  });
  if (upErr) {
    throw new Error(`assets batch_upsert: ${upErr.message}`);
  }
  return { domain: 'assets', indexed: count ?? batchRows.length, ids: list.map((r) => r.asset_id) };
}

async function indexParts(
  supabase: SupabaseRpc,
  provider: { modelId: string; dimensions: number; embedDocuments: (t: string[]) => Promise<number[][]> },
  limit: number,
  modelVersion: string
): Promise<{ domain: EmbedIndexDomain; indexed: number; ids: string[] }> {
  const { data: rows, error: nextErr } = await supabase.rpc('rpc_next_parts_for_embedding', {
    p_limit: limit,
  });
  if (nextErr) {
    throw new Error(`parts rpc_next: ${nextErr.message}`);
  }
  const list = (rows ?? []) as {
    part_id: string;
    part_number: string;
    name: string | null;
    description: string | null;
  }[];
  if (list.length === 0) {
    return { domain: 'parts', indexed: 0, ids: [] };
  }
  const texts = list.map((r) => canonicalPartText(r));
  const vectors = await provider.embedDocuments(texts);
  const profile = resolveEmbeddingProfileEnv(provider.modelId, provider.dimensions);
  const batchRows = await Promise.all(
    list.map(async (r, i) => {
      const text = texts[i];
      const hash = await sha256Hex(text);
      return {
        part_id: r.part_id,
        embedding: toPgVectorLiteral(vectors[i]),
        source_text: text.slice(0, MAX_SOURCE_TEXT_CHARS),
        model_name: provider.modelId,
        model_version: modelVersion,
        content_hash: hash,
        embedding_profile: profile,
      };
    })
  );
  const { data: count, error: upErr } = await supabase.rpc('rpc_batch_upsert_part_embeddings', {
    p_rows: batchRows,
  });
  if (upErr) {
    throw new Error(`parts batch_upsert: ${upErr.message}`);
  }
  return { domain: 'parts', indexed: count ?? batchRows.length, ids: list.map((r) => r.part_id) };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }
  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  const auth = req.headers.get('Authorization');
  const apikey = req.headers.get('apikey') ?? '';
  if (!auth?.startsWith('Bearer ')) {
    return json({ error: 'missing_bearer' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? apikey;
  if (!supabaseUrl || !anon) {
    return json({ error: 'server_misconfigured' }, 500);
  }

  let limit = 20;
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
    if (typeof body.limit === 'number') {
      limit = Math.min(50, Math.max(1, body.limit));
    }
  } catch {
    /* default */
  }

  const domains = parseEmbedIndexDomains(body);
  const modelVersion = Deno.env.get('EMBEDDING_MODEL_VERSION') ?? 'v1';

  let provider;
  try {
    provider = createEmbeddingProvider();
    assertDimensionsMatch(provider);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: 'embedding_provider', message: msg }, 500);
  }

  const supabase = createClient(supabaseUrl, anon, {
    global: { headers: { Authorization: auth } },
  });

  const results: { domain: EmbedIndexDomain; indexed: number; ids: string[] }[] = [];

  try {
    for (const d of domains) {
      if (d === 'work_orders') {
        results.push(await indexWorkOrders(supabase, provider, limit, modelVersion));
      } else if (d === 'assets') {
        results.push(await indexAssets(supabase, provider, limit, modelVersion));
      } else if (d === 'parts') {
        results.push(await indexParts(supabase, provider, limit, modelVersion));
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: 'embed_index_failed', message: msg }, 400);
  }

  const totalIndexed = results.reduce((s, r) => s + r.indexed, 0);

  return json({
    model_id: provider.modelId,
    domains,
    per_domain: results,
    indexed_total: totalIndexed,
  });
});
