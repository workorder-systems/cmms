-- SPDX-License-Identifier: AGPL-3.0-or-later
--
-- Migration: Bulk import assets RPC
--
-- Purpose: Add rpc_bulk_import_assets so the UI can import many assets in one
--   call. Each row requires name; optional description, asset_number, status,
--   location_id, department_id. Status defaults to 'active' and is validated
--   by existing app.assets triggers (workflow catalogs).
-- Affected: new function public.rpc_bulk_import_assets
-- Special: Input is jsonb array of { name, description?, asset_number?, status?, location_id?, department_id? }.

-- ============================================================================
-- Bulk import assets
-- ============================================================================

create or replace function public.rpc_bulk_import_assets(
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
  v_asset_number text;
  v_status text;
  v_location_id uuid;
  v_department_id uuid;
  v_asset_id uuid;
  v_created_ids uuid[] := '{}';
  v_errors jsonb := '[]'::jsonb;
  v_msg text;
begin
  perform util.check_rate_limit('asset_bulk_import', null, 1, 1, auth.uid(), p_tenant_id);

  v_user_id := authz.rpc_setup(p_tenant_id, 'asset.create');

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
      v_asset_number := nullif(trim(v_row->>'asset_number'), '');
      v_status := nullif(trim(v_row->>'status'), '');
      if v_status is null then
        v_status := 'active';
      end if;

      if v_row ? 'location_id' and v_row->>'location_id' is not null and trim(v_row->>'location_id') <> '' then
        v_location_id := (trim(v_row->>'location_id'))::uuid;
      else
        v_location_id := null;
      end if;

      if v_row ? 'department_id' and v_row->>'department_id' is not null and trim(v_row->>'department_id') <> '' then
        v_department_id := (trim(v_row->>'department_id'))::uuid;
      else
        v_department_id := null;
      end if;

      insert into app.assets (
        tenant_id,
        name,
        description,
        asset_number,
        location_id,
        department_id,
        status
      )
      values (
        p_tenant_id,
        v_name,
        v_description,
        v_asset_number,
        v_location_id,
        v_department_id,
        v_status
      )
      returning id into v_asset_id;

      v_created_ids := array_append(v_created_ids, v_asset_id);

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

comment on function public.rpc_bulk_import_assets(uuid, jsonb) is
  'Bulk creates assets for import. Accepts a jsonb array of rows with name (required), description, asset_number, status, location_id, department_id. Status defaults to active; validated by workflow catalogs. location_id and department_id must be valid UUIDs for the tenant. Rate limited to 1 call per minute per user. Returns { created_ids: uuid[], errors: { index, message }[] }.';

revoke all on function public.rpc_bulk_import_assets(uuid, jsonb) from public;
grant execute on function public.rpc_bulk_import_assets(uuid, jsonb) to authenticated;
