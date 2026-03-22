import { beforeAll, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import dotenv from 'dotenv';
import { SUPABASE_PROJECT_DIR } from './helpers/supabase';

// Load environment variables explicitly (Vitest doesn't auto-load .env files)
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

/**
 * Setup and teardown for Supabase local instance
 * This ensures Supabase is running before tests and can optionally reset the DB
 *
 * Note: If SUPABASE_URL is set in environment, assumes you're using a remote instance
 * and skips local Supabase startup.
 *
 * If you see "Database error finding user" or "Database error querying schema" from
 * many tests, the local DB may be out of sync with migrations. Run
 * `pnpm run supabase:reset` then `pnpm test`, or `pnpm run test:reset`. See
 * CONTRIBUTING.md (Tests) for the runbook.
 */
beforeAll(() => {
  // Debug: Log key lengths (not the actual keys for security)
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Test Setup] Environment check:');
    console.log(`  SUPABASE_URL: ${process.env.SUPABASE_URL ? 'set' : 'missing'}`);
    console.log(`  SUPABASE_ANON_KEY length: ${process.env.SUPABASE_ANON_KEY?.length || 0}`);
    console.log(`  SUPABASE_SERVICE_ROLE_KEY length: ${process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0}`);
  }

  // Skip local Supabase startup if using environment variables (remote instance)
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    return;
  }

  // Check if Supabase is already running (CLI project: apps/supabase)
  try {
    execSync('supabase status', { stdio: 'ignore', cwd: SUPABASE_PROJECT_DIR });
  } catch {
    execSync('supabase start', { stdio: 'inherit', cwd: SUPABASE_PROJECT_DIR });
  }
});

afterAll(() => {
  // Optionally stop Supabase after all tests
  // Uncomment if you want to stop Supabase after tests complete
  // execSync('supabase stop', { stdio: 'inherit' });
});
