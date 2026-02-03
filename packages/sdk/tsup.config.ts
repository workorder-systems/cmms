import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ['@supabase/supabase-js'],
  // Isomorphic: no Node-only APIs, works in browser / Node / edge
  platform: 'neutral',
  target: 'es2022',
});
