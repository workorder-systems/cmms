# Test suite

## What we test

- **DB contract (Supabase direct):** All `*.test.ts` files **except** `sdk.test.ts`. They use the Supabase client directly (`createTestClient`, `createServiceRoleClient`) and hit public views (`v_*`) and RPCs (`rpc_*`). These tests validate RLS, permissions, RPC behavior, and view content.
- **SDK:** Only `sdk.test.ts`. It uses `createDbClient()` from `@workorder-systems/sdk` to validate that the SDK wraps the public API correctly.
- **Similar Past Fixes:** `similar_past_fixes_experiment.test.ts` covers tenant isolation, RPC contract, backfill helper, index→search round-trip (synthetic embeddings, no OpenAI). `similar_past_fixes_e2e.test.ts` runs backfill + search (indexing is server-only; requires `OPENAI_API_KEY` and `supabase functions serve`); excluded from CI. Run with `pnpm run test:e2e`.

## How to run

| Command | What runs |
|--------|-----------|
| `npm test` | All tests |
| `npm run test:ci` | All tests except E2E (used in CI) |
| `npm run test:db` | All tests except SDK (DB contract only) |
| `npm run test:sdk` | Only `tests/sdk.test.ts` |
| `npm run test:e2e` | Only E2E (backfill + search; requires OPENAI_API_KEY, supabase functions serve) |
| `npm test -- tests/work_orders.test.ts` | Single file |
| `npm test -- -t "should create a work order"` | Single test by name |

Ensure Supabase is running locally (`npm run supabase:start`) or set `SUPABASE_URL` and `SUPABASE_ANON_KEY` (and optionally `SUPABASE_SERVICE_ROLE_KEY`) for a remote instance.

## Helpers

Use these so setup and errors stay consistent and easy to debug:

| Helper | Purpose |
|--------|--------|
| `tests/helpers/supabase.ts` | `createTestClient()`, `createServiceRoleClient()`, `getSupabaseConfig()`, `waitForSupabase()` |
| `tests/helpers/sdk.ts` | `createTestSdkClient()` — SDK client with test auth options |
| `tests/helpers/faker.ts` | `makeTenant()`, `shortSlug()`, `makeUser()`, and other test data generators |
| `tests/helpers/tenant.ts` | `createTestTenant()`, `setTenantContext()`, `clearTenantContext()`, `getTenantBySlug()`, `assignRoleToUser()` |
| `tests/helpers/entities.ts` | `createTestWorkOrder()`, `createTestAsset()`, `createTestLocation()`, etc. |
| `tests/helpers/auth.ts` | `createTestUser()`, `signInTestUser()`, `signOutUser()`, `TEST_PASSWORD` |
| `tests/helpers/rpc.ts` | `callRPC()`, `expectRPCError()` |
| `tests/helpers/errors.ts` | `formatPostgrestError()` — used internally so thrown errors include PostgREST `details` and `hint` |

## Debugging

- When a test fails, read the full error message: helpers include PostgREST `code`, `details`, and `hint` when present.
- To isolate a failure, run a single file (`npm test -- tests/<file>.test.ts`) or a single test (`npm test -- -t "<test name>"`).
- Use `npm run test:db` vs `npm run test:sdk` to narrow to DB contract vs SDK layer.
