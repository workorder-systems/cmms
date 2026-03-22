-- 20260210162000_18_move_vector_extension.sql
--
-- Purpose
-- -------
-- Satisfy the `extension_in_public` linter by moving the pgvector extension
-- out of the `public` schema into the `extensions` schema.
--
-- Notes
-- -----
-- - The extension is initially created in migration 10 with:
--     create extension if not exists vector;
--   which defaults to the current schema (public).
-- - Here we ensure the `extensions` schema exists and then relocate the
--   extension. All code that relies on the pgvector <=> operator already
--   sets search_path = public, extensions or similar, so behaviour remains
--   unchanged.

set check_function_bodies = off;

-- Ensure extensions schema exists (idempotent if already created).
create schema if not exists extensions;

-- Move the pgvector extension from public to extensions.
-- This keeps the existing types/operators but relocates their schema.
alter extension vector set schema extensions;

