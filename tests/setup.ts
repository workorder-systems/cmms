import { beforeAll, afterAll } from 'vitest';
import { execSync } from 'node:child_process';

/**
 * Setup and teardown for Supabase local instance
 * This ensures Supabase is running before tests and can optionally reset the DB
 * 
 * Note: If SUPABASE_URL is set in environment, assumes you're using a remote instance
 * and skips local Supabase startup.
 */
beforeAll(() => {
  // Skip local Supabase startup if using environment variables (remote instance)
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    return;
  }

  // Check if Supabase is already running
  try {
    execSync('supabase status', { stdio: 'ignore' });
  } catch {
    execSync('supabase start', { stdio: 'inherit' });
  }
});

afterAll(() => {
  // Optionally stop Supabase after all tests
  // Uncomment if you want to stop Supabase after tests complete
  // execSync('supabase stop', { stdio: 'inherit' });
});
