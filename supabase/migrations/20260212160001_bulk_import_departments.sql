-- SPDX-License-Identifier: AGPL-3.0-or-later
--
-- Migration: Bulk import departments RPC
--
-- Purpose: Add rpc_bulk_import_departments so the UI can import many
--   departments in one call. Each row requires name; optional description, code.
-- Affected: new function public.rpc_bulk_import_departments
-- Special: Input is jsonb array of { name, description?, code? }. Code must match
--   departments_code_format_check (1-20 chars, uppercase alphanumeric + underscore).

-- ============================================================================
-- Bulk import departments
-- ============================================================================

create or replace function public.rpc_bulk_import_departments(
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
  v_code text;
  v_department_id uuid;
  v_created_ids uuid[] := '{}';
  v_errors jsonb := '[]'::jsonb;
  v_msg text;
begin
  perform util.check_rate_limit('department_bulk_import', null, 1, 1, auth.uid(), p_tenant_id);

  v_user_id := authz.rpc_setup(p_tenant_id, 'department.create');

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
      v_code := nullif(trim(v_row->>'code'), '');

      insert into app.departments (
        tenant_id,
        name,
        description,
        code
      )
      values (
        p_tenant_id,
        v_name,
        v_description,
        v_code
      )
      returning id into v_department_id;

      v_created_ids := array_append(v_created_ids, v_department_id);

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

comment on function public.rpc_bulk_import_departments(uuid, jsonb) is
  'Bulk creates departments for import. Accepts a jsonb array of rows with name (required), description, code. Code must be 1-20 chars, uppercase alphanumeric and underscore. Rate limited to 1 call per minute per user. Returns { created_ids: uuid[], errors: { index, message }[] }.';

revoke all on function public.rpc_bulk_import_departments(uuid, jsonb) from public;
grant execute on function public.rpc_bulk_import_departments(uuid, jsonb) to authenticated;
