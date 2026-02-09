#!/usr/bin/env bash
# Generate TypeScript types from the local Supabase public schema.
# Run from repo root with Supabase running: npm run supabase:start then npm run gen-types
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OUTPUT="$SCRIPT_DIR/../src/database.types.ts"
cd "$REPO_ROOT"
if ! command -v supabase &>/dev/null; then
  echo "supabase CLI not found. Install: npm i -g supabase or npx supabase" >&2
  exit 1
fi
echo "Generating types from local DB (schema: public) into $OUTPUT ..."
npx supabase gen types typescript --local -s public > "$OUTPUT"
echo "Done. Update packages/sdk if you added views or RPCs."
