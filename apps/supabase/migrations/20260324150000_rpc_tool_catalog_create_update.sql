-- SPDX-License-Identifier: AGPL-3.0-or-later
--
-- Purpose: Let tenant admins manage the tool catalog via public RPCs (tool.manage).
-- Also: checkout requires tool.status = 'available' so retired/unavailable tools cannot be loaned.
-- Affected: new rpc_create_tool, rpc_update_tool; replace public.rpc_checkout_tool.
--

-- ============================================================================
-- rpc_create_tool
-- ============================================================================

create or replace function public.rpc_create_tool(
  p_tenant_id uuid,
  p_name text,
  p_asset_tag text default null,
  p_serial_number text default null,
  p_status text default 'available'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_status text;
begin
  perform util.check_rate_limit('tool_catalog_create', null, 60, 1, auth.uid(), p_tenant_id);
  perform authz.rpc_setup(p_tenant_id, 'tool.manage');

  if length(trim(coalesce(p_name, ''))) < 1 or length(trim(p_name)) > 255 then
    raise exception using message = 'Invalid tool name', errcode = '23514';
  end if;

  v_status := coalesce(nullif(trim(p_status), ''), 'available');
  if v_status !~ '^[a-z0-9_]+$' or length(v_status) < 1 or length(v_status) > 50 then
    raise exception using message = 'Invalid tool status', errcode = '23514';
  end if;

  insert into app.tools (tenant_id, name, asset_tag, serial_number, status)
  values (
    p_tenant_id,
    trim(p_name),
    nullif(trim(p_asset_tag), ''),
    nullif(trim(p_serial_number), ''),
    v_status
  )
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.rpc_create_tool(uuid, text, text, text, text) is
  'Create a catalog tool row. Requires tool.manage.';

revoke all on function public.rpc_create_tool(uuid, text, text, text, text) from public;
grant execute on function public.rpc_create_tool(uuid, text, text, text, text) to authenticated;

-- ============================================================================
-- rpc_update_tool
-- ============================================================================

create or replace function public.rpc_update_tool(
  p_tenant_id uuid,
  p_tool_id uuid,
  p_name text default null,
  p_asset_tag text default null,
  p_serial_number text default null,
  p_status text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
  v_new_status text;
begin
  perform util.check_rate_limit('tool_catalog_update', null, 120, 1, auth.uid(), p_tenant_id);
  perform authz.rpc_setup(p_tenant_id, 'tool.manage');

  v_new_status := null;

  if p_name is not null then
    if length(trim(p_name)) < 1 or length(trim(p_name)) > 255 then
      raise exception using message = 'Invalid tool name', errcode = '23514';
    end if;
  end if;

  if p_status is not null then
    v_status := trim(p_status);
    if v_status !~ '^[a-z0-9_]+$' or length(v_status) < 1 or length(v_status) > 50 then
      raise exception using message = 'Invalid tool status', errcode = '23514';
    end if;
    if v_status != 'available' then
      if exists (
        select 1
        from app.tool_checkouts c
        where c.tenant_id = p_tenant_id
          and c.tool_id = p_tool_id
          and c.returned_at is null
      ) then
        raise exception using
          message = 'Cannot set non-available status while tool is checked out',
          errcode = '23503';
      end if;
    end if;
    v_new_status := v_status;
  end if;

  update app.tools
  set
    name = coalesce(nullif(trim(p_name), ''), name),
    asset_tag = case
      when p_asset_tag is null then asset_tag
      when trim(p_asset_tag) = '' then null
      else trim(p_asset_tag)
    end,
    serial_number = case
      when p_serial_number is null then serial_number
      when trim(p_serial_number) = '' then null
      else trim(p_serial_number)
    end,
    status = coalesce(v_new_status, status),
    updated_at = pg_catalog.now()
  where id = p_tool_id
    and tenant_id = p_tenant_id;

  if not found then
    raise exception using message = 'Tool not found', errcode = 'P0001';
  end if;
end;
$$;

comment on function public.rpc_update_tool(uuid, uuid, text, text, text, text) is
  'Update a catalog tool row. Requires tool.manage. Cannot move to non-available while checked out.';

revoke all on function public.rpc_update_tool(uuid, uuid, text, text, text, text) from public;
grant execute on function public.rpc_update_tool(uuid, uuid, text, text, text, text) to authenticated;

-- ============================================================================
-- rpc_checkout_tool: require available status
-- ============================================================================

create or replace function public.rpc_checkout_tool(
  p_tenant_id uuid,
  p_tool_id uuid,
  p_checked_out_to_user_id uuid,
  p_due_at timestamptz default null,
  p_work_order_id uuid default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_tool_status text;
begin
  perform authz.rpc_setup(p_tenant_id, 'tool.checkout');

  select t.status into v_tool_status
  from app.tools t
  where t.id = p_tool_id
    and t.tenant_id = p_tenant_id;

  if not found then
    raise exception using message = 'Tool not found', errcode = 'P0001';
  end if;

  if v_tool_status is distinct from 'available' then
    raise exception using message = 'Tool is not available for checkout', errcode = '23503';
  end if;

  if exists (
    select 1
    from app.tool_checkouts c
    where c.tenant_id = p_tenant_id
      and c.tool_id = p_tool_id
      and c.returned_at is null
  ) then
    raise exception using message = 'Tool already checked out', errcode = '23505';
  end if;

  insert into app.tool_checkouts (
    tenant_id, tool_id, checked_out_to_user_id, due_at, work_order_id, notes
  )
  values (
    p_tenant_id, p_tool_id, p_checked_out_to_user_id, p_due_at, p_work_order_id, p_notes
  )
  returning id into v_id;

  return v_id;
end;
$$;
