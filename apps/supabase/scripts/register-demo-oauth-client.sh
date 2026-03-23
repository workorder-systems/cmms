#!/usr/bin/env bash
# Re-register the local OAuth demo client after `supabase db reset` (Auth data is wiped).
# Requires: running local stack, `supabase` CLI, and Node.js (for JSON parse).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! JSON="$(supabase status -o json 2>/dev/null)"; then
  echo "error: run from apps/supabase with Supabase started (supabase start)." >&2
  exit 1
fi

SR="$(echo "$JSON" | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>console.log(JSON.parse(s).SERVICE_ROLE_KEY))")"
API="$(echo "$JSON" | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>console.log(JSON.parse(s).API_URL))")"

BODY='{
  "name": "work-order-oauth-demo",
  "redirect_uris": [
    "http://localhost:3005/demo/callback",
    "http://127.0.0.1:3005/demo/callback"
  ],
  "client_type": "confidential",
  "token_endpoint_auth_method": "client_secret_post"
}'

echo "POST ${API}/auth/v1/admin/oauth/clients"
RESP="$(curl -sS -X POST "${API}/auth/v1/admin/oauth/clients" \
  -H "Authorization: Bearer ${SR}" \
  -H "Content-Type: application/json" \
  -d "${BODY}")"

echo "$RESP" | node -e "
const d = JSON.parse(require('fs').readFileSync(0,'utf8'));
if (d.client_id) {
  console.log('');
  console.log('Add to apps/oauth/.env.local:');
  console.log('NEXT_PUBLIC_DEMO_OAUTH_CLIENT_ID=' + d.client_id);
  if (d.client_secret) console.log('DEMO_OAUTH_CLIENT_SECRET=' + d.client_secret);
  console.log('');
} else {
  console.error(d);
  process.exit(1);
}
"
