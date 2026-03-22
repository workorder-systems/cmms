// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Edge Function: ingest-meter-reading
//
// Purpose
// -------
// IoT meter reading ingestion. Accepts POST requests with a tenant-scoped
// API key (Bearer or X-API-Key) and records a meter reading with
// reading_type = 'automated'.
//
// POST /
//   Headers:
//     Authorization: Bearer <tenant_api_key>
//     or X-API-Key: <tenant_api_key>
//   Body (JSON):
//     {
//       "meterId": "uuid",
//       "readingValue": number,
//       "readingDate": "ISO8601 string (optional)",
//       "notes": "string (optional)"
//     }
//   Response:
//     201 { "readingId": "uuid" }
//     4xx { "error": "message", "code": "INVALID_API_KEY" | "BAD_REQUEST" | ... }
//
// Environment variables
// ---------------------
// - SUPABASE_URL: PostgREST base URL
// - SUPABASE_SERVICE_ROLE_KEY: service role key (required for RPCs)

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

type IngestBody = {
  meterId?: string;
  readingValue?: number;
  readingDate?: string | null;
  notes?: string | null;
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    'ingest-meter-reading: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set'
  );
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function sha256Hex(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function getApiKeyFromRequest(req: Request): string | null {
  const auth = req.headers.get('Authorization');
  if (auth?.startsWith('Bearer ')) {
    return auth.slice(7).trim() || null;
  }
  const xKey = req.headers.get('X-API-Key');
  if (xKey) {
    return xKey.trim() || null;
  }
  return null;
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return jsonResponse(
      { error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' },
      405
    );
  }

  const apiKey = getApiKeyFromRequest(req);
  if (!apiKey) {
    return jsonResponse(
      { error: 'Missing API key. Use Authorization: Bearer <key> or X-API-Key: <key>.', code: 'INVALID_API_KEY' },
      401
    );
  }

  let body: IngestBody;
  try {
    body = (await req.json()) as IngestBody;
  } catch {
    return jsonResponse(
      { error: 'Invalid JSON body', code: 'BAD_REQUEST' },
      400
    );
  }

  const meterId = body.meterId;
  const readingValue = body.readingValue;
  if (!meterId || typeof readingValue !== 'number') {
    return jsonResponse(
      { error: 'Body must include meterId (UUID) and readingValue (number).', code: 'BAD_REQUEST' },
      400
    );
  }

  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRe.test(meterId)) {
    return jsonResponse(
      { error: 'meterId must be a valid UUID.', code: 'BAD_REQUEST' },
      400
    );
  }

  if (readingValue < 0 || !Number.isFinite(readingValue)) {
    return jsonResponse(
      { error: 'readingValue must be a non-negative number.', code: 'BAD_REQUEST' },
      400
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const keyHash = await sha256Hex(apiKey);

  const { data: keyRows, error: validateError } = await supabase.rpc(
    'rpc_validate_tenant_api_key',
    { p_key_hash: keyHash }
  );

  if (validateError) {
    console.error('ingest-meter-reading: rpc_validate_tenant_api_key failed', validateError);
    return jsonResponse(
      { error: 'API key validation failed', code: 'INTERNAL_ERROR' },
      500
    );
  }

  const rows = (keyRows ?? []) as { tenant_id: string; key_id: string }[];
  if (rows.length === 0) {
    return jsonResponse(
      { error: 'Invalid or expired API key', code: 'INVALID_API_KEY' },
      401
    );
  }

  const { tenant_id: tenantId, key_id: keyId } = rows[0];

  const readingDate = body.readingDate ?? null;
  const notes = body.notes ?? null;

  const { error: touchError } = await supabase.rpc('rpc_tenant_api_key_touch', {
    p_key_id: keyId,
  });
  if (touchError) {
    console.warn('ingest-meter-reading: rpc_tenant_api_key_touch failed', touchError);
  }

  const { data: readingId, error: recordError } = await supabase.rpc(
    'rpc_record_meter_reading_automated',
    {
      p_tenant_id: tenantId,
      p_meter_id: meterId,
      p_reading_value: readingValue,
      p_reading_date: readingDate,
      p_notes: notes,
    }
  );

  if (recordError) {
    const msg = recordError.message ?? 'Failed to record reading';
    const code = msg.includes('not found')
      ? 'NOT_FOUND'
      : msg.includes('Unauthorized') || msg.includes('does not belong')
        ? 'FORBIDDEN'
        : msg.includes('cannot be more than')
          ? 'BAD_REQUEST'
          : 'RPC_FAIL';
    return jsonResponse(
      { error: msg, code },
      code === 'NOT_FOUND' ? 404 : code === 'FORBIDDEN' ? 403 : 400
    );
  }

  return jsonResponse({ readingId }, 201);
});
