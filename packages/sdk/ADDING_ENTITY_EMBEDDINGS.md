# Checklist: add embeddings for a new CMMS entity

1. **Migration (Postgres)**  
   - `create extension vector` if not present.  
   - Table `app.<entity>_embeddings` with `tenant_id`, FK to parent, `vector(1536)`, `content_hash`, `embedding_profile`, metadata columns.  
   - RLS (authenticated member policies; anon deny).  
   - HNSW index (`vector_cosine_ops`).  
   - `rpc_upsert_<entity>_embedding`, `rpc_similar_<entities>`, optional backfill list RPC.  
   - Grant `execute` to `authenticated`.

2. **Types**  
   - Run `pnpm gen-types` and commit `packages/sdk/src/database.types.ts`.

3. **SDK**  
   - Extend `semantic-search.ts` (or a dedicated resource) with typed methods calling new RPCs.

4. **Edge**  
   - Add `domain` branch in `embed-search` / `embed-index` routers.  
   - Reuse `_shared/embeddings` providers; assert `EMBEDDING_DIMENSIONS` matches `vector(N)`.

5. **MCP**  
   - Add `operation_id` entries in `apps/mcp/src/sdk-invoke/operations/`.  
   - Register in `registry.ts`.  
   - Optional composite tool if high-traffic.

6. **Tests**  
   - Vitest: RLS, upsert, similarity, batch path.

7. **Ops**  
   - Set Edge secrets (`OPENAI_API_KEY`, `EMBEDDING_*`).  
   - Reload PostgREST schema if needed (`NOTIFY pgrst, 'reload schema'`).
