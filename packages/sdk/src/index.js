/**
 * @workorder-systems/sdk – Type-safe domain SDK for the database public API.
 *
 * Exposes only public views (reads) and RPCs (writes). Use createDbClient()
 * to get a typed client; set tenant context before tenant-scoped operations.
 *
 * @packageDocumentation
 */
export { createDbClient, createDbClientFromSupabase } from './client.js';
export { SdkError, normalizeError } from './errors.js';
export { formatEmbeddingForRpc } from './resources/semantic-search.js';
