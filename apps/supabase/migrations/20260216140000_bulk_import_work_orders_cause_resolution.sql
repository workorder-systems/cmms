-- 20260216140000_bulk_import_work_orders_cause_resolution.sql
--
-- Purpose: Extend rpc_bulk_import_work_orders to accept optional cause and resolution
--   per row so imports can pre-fill root cause and resolution (e.g. for completed WOs).
-- Affected: public.rpc_bulk_import_work_orders
--
-- Replaces the existing function (create or replace); no drop needed. Same signature.
-- Input rows may now include cause?: string, resolution?: string (optional).

create or replace function public.rpc_bulk_import_work_orders(
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
  v_title text;
  v_description text;
  v_cause text;
  v_resolution text;
  v_status_key text;
  v_priority_key text;
  v_due_date timestamptz;
  v_status_is_final boolean;
  v_status_category text;
  v_work_order_id uuid;
  v_created_ids uuid[] := '{}';
  v_errors jsonb := '[]'::jsonb;
  v_msg text;
begin
  perform util.check_rate_limit('work_order_bulk_import', null, 1, 1, auth.uid(), p_tenant_id);

  v_user_id := authz.rpc_setup(p_tenant_id, 'workorder.create');

  if jsonb_typeof(p_rows) <> 'array' then
    raise exception using
      message = 'p_rows must be a jsonb array',
      errcode = '22P02';
  end if;

  for v_idx in 0 .. (jsonb_array_length(p_rows) - 1) loop
    begin
      v_row := p_rows->v_idx;
      v_title := nullif(trim(v_row->>'title'), '');
      if v_title is null or length(v_title) < 1 then
        v_errors := v_errors || jsonb_build_object('index', v_idx, 'message', 'Title is required');
        continue;
      end if;

      v_description := nullif(trim(v_row->>'description'), '');
      v_cause := nullif(trim(v_row->>'cause'), '');
      v_resolution := nullif(trim(v_row->>'resolution'), '');
      v_status_key := nullif(trim(v_row->>'status'), '');
      if v_status_key is null then
        v_status_key := 'draft';
      end if;
      v_priority_key := nullif(trim(v_row->>'priority'), '');
      if v_priority_key is null then
        v_priority_key := 'medium';
      end if;

      if v_row ? 'due_date' and v_row->>'due_date' is not null and trim(v_row->>'due_date') <> '' then
        v_due_date := (trim(v_row->>'due_date'))::timestamptz;
      else
        v_due_date := null;
      end if;

      if not exists (
        select 1
        from cfg.status_catalogs
        where tenant_id = p_tenant_id
          and entity_type = 'work_order'
          and key = v_status_key
      ) then
        v_errors := v_errors || jsonb_build_object('index', v_idx, 'message', format('Invalid status: %s', v_status_key));
        continue;
      end if;

      if not exists (
        select 1
        from cfg.priority_catalogs
        where tenant_id = p_tenant_id
          and entity_type = 'work_order'
          and key = v_priority_key
      ) then
        v_errors := v_errors || jsonb_build_object('index', v_idx, 'message', format('Invalid priority: %s', v_priority_key));
        continue;
      end if;

      select sc.is_final, sc.category
      into v_status_is_final, v_status_category
      from cfg.status_catalogs sc
      where sc.tenant_id = p_tenant_id
        and sc.entity_type = 'work_order'
        and sc.key = v_status_key;

      insert into app.work_orders (
        tenant_id,
        title,
        description,
        cause,
        resolution,
        status,
        priority,
        due_date,
        completed_at,
        completed_by
      )
      values (
        p_tenant_id,
        v_title,
        v_description,
        v_cause,
        v_resolution,
        v_status_key,
        v_priority_key,
        v_due_date,
        case when v_status_is_final and v_status_category = 'closed' then pg_catalog.now() else null end,
        case when v_status_is_final and v_status_category = 'closed' then v_user_id else null end
      )
      returning id into v_work_order_id;

      v_created_ids := array_append(v_created_ids, v_work_order_id);

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

comment on function public.rpc_bulk_import_work_orders(uuid, jsonb) is
  'Bulk creates work orders for import. Accepts a jsonb array of rows with title (required), description, cause, resolution, status, priority, due_date. Cause and resolution are optional. Status and priority must exist in tenant catalogs; defaults: draft, medium. Sets completed_at/completed_by when status is final and category closed. Rate limited to 1 call per minute per user. Returns { created_ids: uuid[], errors: { index, message }[] }.';

revoke all on function public.rpc_bulk_import_work_orders(uuid, jsonb) from public;
grant execute on function public.rpc_bulk_import_work_orders(uuid, jsonb) to authenticated;

