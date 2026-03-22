-- 20260322163000_drop_similar_past_fixes.sql
--
-- purpose
-- -------
-- remove the "similar past fixes" feature: pgvector-backed work order embeddings,
-- related public rpcs, and the pgvector extension. keeps work_orders cause/resolution
-- columns and v_work_orders (added for richer completion data) unchanged.
--
-- affected
-- --------
-- drops: app.work_order_embeddings, util.validate_work_order_embedding_work_order,
--   extension vector (in extensions schema after prior migration), and rpcs:
--   rpc_similar_past_work_orders_by_work_order_id, rpc_similar_past_work_orders (all
--   signatures), rpc_check_similar_past_fixes_rate_limit, rpc_get_work_order_embedding,
--   rpc_next_work_orders_for_embedding, rpc_upsert_work_order_embedding,
--   rpc_backfill_upsert_work_order_embedding.
--
-- optional cleanup: cfg.rate_limit_configs rows for similar_past operation types.

set check_function_bodies = off;

-- ---------------------------------------------------------------------------
-- optional: remove tenant-specific rate limit rows for this feature (if any)
-- ---------------------------------------------------------------------------

delete from cfg.rate_limit_configs
where operation_type = 'similar_past_fixes_search'
   or operation_type like 'similar_past%';

-- ---------------------------------------------------------------------------
-- drop public rpcs (depend on vector type and/or embeddings table)
-- ---------------------------------------------------------------------------

drop function if exists public.rpc_similar_past_work_orders_by_work_order_id(uuid, int, float);

drop function if exists public.rpc_similar_past_work_orders(vector(1536), int, uuid, float);

drop function if exists public.rpc_similar_past_work_orders(vector(1536), int, uuid);

drop function if exists public.rpc_check_similar_past_fixes_rate_limit(text);

drop function if exists public.rpc_get_work_order_embedding(uuid);

drop function if exists public.rpc_next_work_orders_for_embedding(int);

drop function if exists public.rpc_upsert_work_order_embedding(uuid, vector(1536), text, text, text);

drop function if exists public.rpc_backfill_upsert_work_order_embedding(
  uuid,
  uuid,
  vector(1536),
  text,
  text,
  text
);

-- ---------------------------------------------------------------------------
-- drop embeddings storage and validation trigger function
-- ---------------------------------------------------------------------------

drop table if exists app.work_order_embeddings cascade;

drop function if exists util.validate_work_order_embedding_work_order();

-- ---------------------------------------------------------------------------
-- drop pgvector (no remaining column types should reference it)
-- ---------------------------------------------------------------------------

drop extension if exists vector cascade;
