#!/usr/bin/env bash
# Generate TypeScript types from the local Supabase public schema.
# Run from repo root with Supabase running: npm run supabase:start then npm run gen-types
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OUTPUT="$SCRIPT_DIR/../src/database.types.ts"

cd "$REPO_ROOT"

# Prefer an already-installed Supabase CLI (e.g. via supabase/setup-cli in CI),
# and only fall back to npx if it's not available. This avoids on-the-fly
# npm installs like:
#   npm warn exec The following package was not found and will be installed: supabase@...
if command -v supabase &>/dev/null; then
  SUPABASE_CMD="supabase"
else
  echo "supabase CLI not found on PATH, falling back to npx (this may install supabase locally)..." >&2
  SUPABASE_CMD="npx supabase"
fi

echo "Generating types from local DB (schema: public) into $OUTPUT ..."
"$SUPABASE_CMD" gen types typescript --local -s public > "$OUTPUT"
echo "Done. Update packages/sdk if you added views or RPCs."
