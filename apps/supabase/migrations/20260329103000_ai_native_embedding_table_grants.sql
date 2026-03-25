-- SPDX-License-Identifier: AGPL-3.0-or-later
--
-- migration: 20260329103000_ai_native_embedding_table_grants.sql
--
-- purpose: restore table-level grants on ai-native embedding and ontology tables so
--          security invoker RPCs (e.g. rpc_similar_past_work_orders, rpc_search_entity_candidates,
--          rpc_similar_assets, rpc_similar_parts) can read underlying rows under RLS.
-- affected: app.work_order_embeddings, app.asset_embeddings, app.part_embeddings,
--           app.entity_aliases, app.client_idempotency
-- notes: rpc_upsert_* embedding functions are security definer and worked without these
--        grants; invoker-stable functions failed with SQLSTATE 42501 until authenticated
--        has base SELECT (and matching write grants mirror pre-drop similar_past schema).

-- ============================================================================
-- work_order_embeddings (similarity search joins this table as invoker)
-- ============================================================================

grant select, insert, update, delete on app.work_order_embeddings to authenticated;
grant select on app.work_order_embeddings to anon;

-- ============================================================================
-- asset_embeddings / part_embeddings (rpc_similar_* as invoker)
-- ============================================================================

grant select, insert, update, delete on app.asset_embeddings to authenticated;
grant select on app.asset_embeddings to anon;

grant select, insert, update, delete on app.part_embeddings to authenticated;
grant select on app.part_embeddings to anon;

-- ============================================================================
-- entity_aliases (first branch of rpc_search_entity_candidates union)
-- ============================================================================

grant select, insert, update, delete on app.entity_aliases to authenticated;
grant select on app.entity_aliases to anon;

-- ============================================================================
-- client_idempotency (parity with other app.* tenant tables; RPCs are mostly definer)
-- ============================================================================

grant select, insert, delete on app.client_idempotency to authenticated;
grant select on app.client_idempotency to anon;
