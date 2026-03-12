import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';

/** Same as default config but excludes slow tests (rate limiting, concurrency, e2e). */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    test: {
      globals: true,
      environment: 'node',
      setupFiles: ['./tests/setup.ts'],
      testTimeout: 30000,
      hookTimeout: 30000,
      teardownTimeout: 10000,
      env,
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/rate_limiting.test.ts',
        '**/concurrency.test.ts',
        '**/similar_past_fixes_e2e.test.ts',
      ],
    },
  };
});
