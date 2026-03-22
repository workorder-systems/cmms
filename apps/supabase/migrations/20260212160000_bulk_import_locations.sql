-- SPDX-License-Identifier: AGPL-3.0-or-later
--
-- Migration: Bulk import locations RPC
--
-- Purpose: Add rpc_bulk_import_locations so the UI can import many locations
--   in one call. Each row requires name; optional description, parent_location_id.
-- Affected: new function public.rpc_bulk_import_locations
-- Special: Input is jsonb array of { name, description?, parent_location_id? }.

-- ============================================================================
-- Bulk import locations
-- ============================================================================

create or replace function public.rpc_bulk_import_locations(
  p_tenant_id uuid,
  p_rows jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_row jsonb;
  v_idx int;
  v_name text;
  v_description text;
  v_parent_location_id uuid;
  v_location_id uuid;
  v_created_ids uuid[] := '{}';
  v_errors jsonb := '[]'::jsonb;
  v_msg text;
begin
  perform util.check_rate_limit('location_bulk_import', null, 1, 1, auth.uid(), p_tenant_id);

  v_user_id := authz.rpc_setup(p_tenant_id, 'location.create');

  if jsonb_typeof(p_rows) <> 'array' then
    raise exception using
      message = 'p_rows must be a jsonb array',
      errcode = '22P02';
  end if;

  for v_idx in 0 .. (jsonb_array_length(p_rows) - 1) loop
    begin
      v_row := p_rows->v_idx;
      v_name := nullif(trim(v_row->>'name'), '');
      if v_name is null or length(v_name) < 1 then
        v_errors := v_errors || jsonb_build_object('index', v_idx, 'message', 'Name is required');
        continue;
      end if;

      v_description := nullif(trim(v_row->>'description'), '');
      if v_row ? 'parent_location_id' and v_row->>'parent_location_id' is not null and trim(v_row->>'parent_location_id') <> '' then
        v_parent_location_id := (trim(v_row->>'parent_location_id'))::uuid;
      else
        v_parent_location_id := null;
      end if;

      insert into app.locations (
        tenant_id,
        name,
        description,
        parent_location_id
      )
      values (
        p_tenant_id,
        v_name,
        v_description,
        v_parent_location_id
      )
      returning id into v_location_id;

      v_created_ids := array_append(v_created_ids, v_location_id);

    exception
      when others then
        get stacked diagnostics v_msg = message_text;
        v_errors := v_errors || jsonb_build_object('index', v_idx, 'message', v_msg);
    end;
  end loop;

  return jsonb_build_object(
    'created_ids', to_jsonb(v_created_ids),
    'errors', v_errors
  );
end;
$$;

comment on function public.rpc_bulk_import_locations(uuid, jsonb) is
  'Bulk creates locations for import. Accepts a jsonb array of rows with name (required), description, parent_location_id. parent_location_id must be a valid UUID for the same tenant. Rate limited to 1 call per minute per user. Returns { created_ids: uuid[], errors: { index, message }[] }.';

revoke all on function public.rpc_bulk_import_locations(uuid, jsonb) from public;
grant execute on function public.rpc_bulk_import_locations(uuid, jsonb) to authenticated;
