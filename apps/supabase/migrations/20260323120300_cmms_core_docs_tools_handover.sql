-- SPDX-License-Identifier: AGPL-3.0-or-later
--
-- Documents: type catalog + attachment metadata, tools + checkouts,
-- shift handover logbook. Extends public attachment views.

insert into cfg.permissions (key, name, category, description) values
  ('tool.manage', 'Manage Tools', 'tool', 'Create and edit tool catalog entries'),
  ('tool.checkout', 'Checkout Tools', 'tool', 'Check out tools to users or work orders'),
  ('tool.return', 'Return Tools', 'tool', 'Return checked-out tools'),
  ('shift_handover.create', 'Create Shift Handovers', 'shift_handover', 'Create shift handover drafts'),
  ('shift_handover.acknowledge', 'Acknowledge Shift Handovers', 'shift_handover', 'Acknowledge incoming shift handover')
on conflict (key) do nothing;

-- ============================================================================
-- cfg.document_types
-- ============================================================================

create table cfg.document_types (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  key text not null,
  name text not null,
  display_order integer not null default 0,
  requires_controlled_flag boolean not null default false,
  is_system boolean not null default false,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint document_types_unique unique (tenant_id, key),
  constraint document_types_key_format check (
    key ~ '^[a-z0-9_]+$' and length(key) between 1 and 50
  )
);

create trigger document_types_set_updated_at
  before update on cfg.document_types
  for each row
  execute function util.set_updated_at();

alter table cfg.document_types enable row level security;

create policy document_types_select_auth on cfg.document_types for select to authenticated
  using (authz.is_current_user_tenant_member(tenant_id));
create policy document_types_select_anon on cfg.document_types for select to anon
  using (authz.is_current_user_tenant_member(tenant_id));
create policy document_types_insert_auth on cfg.document_types for insert to authenticated
  with check (
    authz.is_current_user_tenant_member(tenant_id)
    and authz.has_current_user_permission(tenant_id, 'tenant.admin')
  );
create policy document_types_insert_anon on cfg.document_types for insert to anon with check (false);
create policy document_types_update_auth on cfg.document_types for update to authenticated
  using (
    authz.is_current_user_tenant_member(tenant_id)
    and authz.has_current_user_permission(tenant_id, 'tenant.admin')
  )
  with check (
    authz.is_current_user_tenant_member(tenant_id)
    and authz.has_current_user_permission(tenant_id, 'tenant.admin')
  );
create policy document_types_update_anon on cfg.document_types for update to anon using (false) with check (false);
create policy document_types_delete_auth on cfg.document_types for delete to authenticated
  using (
    authz.is_current_user_tenant_member(tenant_id)
    and authz.has_current_user_permission(tenant_id, 'tenant.admin')
  );
create policy document_types_delete_anon on cfg.document_types for delete to anon using (false);

alter table cfg.document_types force row level security;
grant select on cfg.document_types to authenticated, anon;
grant insert, update, delete on cfg.document_types to authenticated;

-- Attachment metadata (nullable; document_type_key is catalog key string)
alter table app.asset_attachments
  add column document_type_key text,
  add column is_controlled boolean not null default false,
  add column effective_date date,
  add column revision_label text;

alter table app.location_attachments
  add column document_type_key text,
  add column is_controlled boolean not null default false,
  add column effective_date date,
  add column revision_label text;

alter table app.work_order_attachments
  add column document_type_key text,
  add column is_controlled boolean not null default false,
  add column effective_date date,
  add column revision_label text;

-- ============================================================================
-- app.tools + app.tool_checkouts
-- ============================================================================

create table app.tools (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  name text not null,
  asset_tag text,
  serial_number text,
  status text not null default 'available',
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint tools_name_length check (length(trim(name)) between 1 and 255),
  constraint tools_status_check check (
    status ~ '^[a-z0-9_]+$' and length(status) between 1 and 50
  )
);

create index tools_tenant_idx on app.tools (tenant_id);

create trigger tools_set_updated_at
  before update on app.tools
  for each row
  execute function util.set_updated_at();

alter table app.tools enable row level security;

create policy tools_select_auth on app.tools for select to authenticated
  using (authz.is_current_user_tenant_member(tenant_id));
create policy tools_select_anon on app.tools for select to anon
  using (authz.is_current_user_tenant_member(tenant_id));
create policy tools_insert_auth on app.tools for insert to authenticated
  with check (
    authz.is_current_user_tenant_member(tenant_id)
    and authz.has_current_user_permission(tenant_id, 'tool.manage')
  );
create policy tools_insert_anon on app.tools for insert to anon with check (false);
create policy tools_update_auth on app.tools for update to authenticated
  using (
    authz.is_current_user_tenant_member(tenant_id)
    and authz.has_current_user_permission(tenant_id, 'tool.manage')
  )
  with check (
    authz.is_current_user_tenant_member(tenant_id)
    and authz.has_current_user_permission(tenant_id, 'tool.manage')
  );
create policy tools_update_anon on app.tools for update to anon using (false) with check (false);
create policy tools_delete_auth on app.tools for delete to authenticated
  using (
    authz.is_current_user_tenant_member(tenant_id)
    and authz.has_current_user_permission(tenant_id, 'tool.manage')
  );
create policy tools_delete_anon on app.tools for delete to anon using (false);

alter table app.tools force row level security;
grant select, insert, update, delete on app.tools to authenticated;

create table app.tool_checkouts (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  tool_id uuid not null references app.tools(id) on delete cascade,
  checked_out_to_user_id uuid not null references auth.users(id) on delete cascade,
  checked_out_at timestamptz not null default pg_catalog.now(),
  due_at timestamptz,
  returned_at timestamptz,
  work_order_id uuid references app.work_orders(id) on delete set null,
  notes text,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint tool_checkouts_return_after_checkout check (
    returned_at is null or returned_at >= checked_out_at
  )
);

create unique index tool_checkouts_one_open_per_tool_idx
  on app.tool_checkouts (tool_id)
  where returned_at is null;

create index tool_checkouts_user_idx on app.tool_checkouts (tenant_id, checked_out_to_user_id);

create trigger tool_checkouts_set_updated_at
  before update on app.tool_checkouts
  for each row
  execute function util.set_updated_at();

create or replace function util.validate_tool_checkouts_tenant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tool_tenant uuid;
  v_wo_tenant uuid;
begin
  select tenant_id into v_tool_tenant from app.tools where id = new.tool_id;
  if v_tool_tenant is null or v_tool_tenant != new.tenant_id then
    raise exception using message = 'tool tenant mismatch', errcode = '23503';
  end if;
  if new.work_order_id is not null then
    select tenant_id into v_wo_tenant from app.work_orders where id = new.work_order_id;
    if v_wo_tenant is null or v_wo_tenant != new.tenant_id then
      raise exception using message = 'work order tenant mismatch', errcode = '23503';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function util.validate_tool_checkouts_tenant() from public;
grant execute on function util.validate_tool_checkouts_tenant() to postgres;

create trigger tool_checkouts_validate_tenant
  before insert or update on app.tool_checkouts
  for each row
  execute function util.validate_tool_checkouts_tenant();

alter table app.tool_checkouts enable row level security;

create policy tool_checkouts_select_auth on app.tool_checkouts for select to authenticated
  using (authz.is_current_user_tenant_member(tenant_id));
create policy tool_checkouts_select_anon on app.tool_checkouts for select to anon
  using (authz.is_current_user_tenant_member(tenant_id));
create policy tool_checkouts_insert_auth on app.tool_checkouts for insert to authenticated
  with check (
    authz.is_current_user_tenant_member(tenant_id)
    and authz.has_current_user_permission(tenant_id, 'tool.checkout')
  );
create policy tool_checkouts_insert_anon on app.tool_checkouts for insert to anon with check (false);
create policy tool_checkouts_update_auth on app.tool_checkouts for update to authenticated
  using (
    authz.is_current_user_tenant_member(tenant_id)
    and (
      authz.has_current_user_permission(tenant_id, 'tool.return')
      or authz.has_current_user_permission(tenant_id, 'tool.manage')
    )
  )
  with check (authz.is_current_user_tenant_member(tenant_id));
create policy tool_checkouts_update_anon on app.tool_checkouts for update to anon using (false) with check (false);
create policy tool_checkouts_delete_auth on app.tool_checkouts for delete to authenticated
  using (
    authz.is_current_user_tenant_member(tenant_id)
    and authz.has_current_user_permission(tenant_id, 'tool.manage')
  );
create policy tool_checkouts_delete_anon on app.tool_checkouts for delete to anon using (false);

alter table app.tool_checkouts force row level security;
grant select, insert, update, delete on app.tool_checkouts to authenticated;

-- ============================================================================
-- Shift handovers
-- ============================================================================

create table app.shift_handovers (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  location_id uuid references app.locations(id) on delete set null,
  shift_started_at timestamptz not null,
  shift_ended_at timestamptz not null,
  from_user_id uuid not null references auth.users(id) on delete restrict,
  to_user_id uuid not null references auth.users(id) on delete restrict,
  summary text,
  status text not null default 'draft',
  acknowledged_at timestamptz,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint shift_handovers_status_check check (
    status in ('draft', 'submitted', 'acknowledged')
  ),
  constraint shift_handovers_time_order check (shift_ended_at >= shift_started_at)
);

create index shift_handovers_tenant_idx on app.shift_handovers (tenant_id, created_at desc);

create table app.shift_handover_items (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  handover_id uuid not null references app.shift_handovers(id) on delete cascade,
  work_order_id uuid references app.work_orders(id) on delete set null,
  body text not null,
  priority text not null default 'normal',
  created_at timestamptz not null default pg_catalog.now(),
  constraint shift_handover_items_priority_check check (
    priority in ('low', 'normal', 'high', 'critical')
  ),
  constraint shift_handover_items_body_length check (length(trim(body)) >= 1)
);

create index shift_handover_items_handover_idx on app.shift_handover_items (handover_id);

create trigger shift_handovers_set_updated_at
  before update on app.shift_handovers
  for each row
  execute function util.set_updated_at();

alter table app.shift_handovers enable row level security;
alter table app.shift_handover_items enable row level security;

create policy shift_handovers_select_auth on app.shift_handovers for select to authenticated
  using (
    authz.is_current_user_tenant_member(tenant_id)
    and (
      from_user_id = auth.uid()
      or to_user_id = auth.uid()
      or authz.has_current_user_permission(tenant_id, 'workorder.view')
    )
  );
create policy shift_handovers_select_anon on app.shift_handovers for select to anon using (false);

create policy shift_handovers_insert_auth on app.shift_handovers for insert to authenticated
  with check (
    authz.is_current_user_tenant_member(tenant_id)
    and authz.has_current_user_permission(tenant_id, 'shift_handover.create')
    and from_user_id = auth.uid()
  );
create policy shift_handovers_insert_anon on app.shift_handovers for insert to anon with check (false);

create policy shift_handovers_update_auth on app.shift_handovers for update to authenticated
  using (
    authz.is_current_user_tenant_member(tenant_id)
    and (
      (
        status = 'draft'
        and from_user_id = auth.uid()
        and authz.has_current_user_permission(tenant_id, 'shift_handover.create')
      )
      or (
        status = 'submitted'
        and to_user_id = auth.uid()
        and authz.has_current_user_permission(tenant_id, 'shift_handover.acknowledge')
      )
    )
  )
  with check (authz.is_current_user_tenant_member(tenant_id));
create policy shift_handovers_update_anon on app.shift_handovers for update to anon using (false) with check (false);

create policy shift_handovers_delete_auth on app.shift_handovers for delete to authenticated
  using (
    authz.is_current_user_tenant_member(tenant_id)
    and status = 'draft'
    and from_user_id = auth.uid()
  );
create policy shift_handovers_delete_anon on app.shift_handovers for delete to anon using (false);

create policy shift_handover_items_select_auth on app.shift_handover_items for select to authenticated
  using (
    authz.is_current_user_tenant_member(tenant_id)
    and exists (
      select 1
      from app.shift_handovers h
      where h.id = shift_handover_items.handover_id
        and h.tenant_id = shift_handover_items.tenant_id
        and (
          h.from_user_id = auth.uid()
          or h.to_user_id = auth.uid()
          or authz.has_current_user_permission(h.tenant_id, 'workorder.view')
        )
    )
  );
create policy shift_handover_items_select_anon on app.shift_handover_items for select to anon using (false);
create policy shift_handover_items_insert_auth on app.shift_handover_items for insert to authenticated
  with check (
    authz.is_current_user_tenant_member(tenant_id)
    and authz.has_current_user_permission(tenant_id, 'shift_handover.create')
    and exists (
      select 1 from app.shift_handovers h
      where h.id = handover_id and h.tenant_id = tenant_id
        and h.status = 'draft' and h.from_user_id = auth.uid()
    )
  );
create policy shift_handover_items_insert_anon on app.shift_handover_items for insert to anon with check (false);
create policy shift_handover_items_update_auth on app.shift_handover_items for update to authenticated
  using (
    authz.is_current_user_tenant_member(tenant_id)
    and exists (
      select 1 from app.shift_handovers h
      where h.id = handover_id and h.tenant_id = tenant_id
        and h.status = 'draft' and h.from_user_id = auth.uid()
    )
  )
  with check (authz.is_current_user_tenant_member(tenant_id));
create policy shift_handover_items_update_anon on app.shift_handover_items for update to anon using (false) with check (false);
create policy shift_handover_items_delete_auth on app.shift_handover_items for delete to authenticated
  using (
    authz.is_current_user_tenant_member(tenant_id)
    and exists (
      select 1 from app.shift_handovers h
      where h.id = handover_id and h.tenant_id = tenant_id
        and h.status = 'draft' and h.from_user_id = auth.uid()
    )
  );
create policy shift_handover_items_delete_anon on app.shift_handover_items for delete to anon using (false);

alter table app.shift_handovers force row level security;
alter table app.shift_handover_items force row level security;

grant select, insert, update, delete on app.shift_handovers to authenticated;
grant select, insert, update, delete on app.shift_handover_items to authenticated;

-- ============================================================================
-- Refresh public attachment views (drop/recreate: column set change)
-- ============================================================================

drop view if exists public.v_work_order_attachments cascade;

create view public.v_work_order_attachments
with (security_invoker = true)
as
select
  woa.id,
  woa.tenant_id,
  woa.work_order_id,
  woa.file_id,
  f.bucket_id,
  f.storage_path,
  f.filename,
  f.content_type,
  woa.label,
  woa.kind,
  woa.document_type_key,
  woa.is_controlled,
  woa.effective_date,
  woa.revision_label,
  woa.created_by,
  p_created_by.full_name as created_by_name,
  woa.created_at,
  woa.updated_at
from app.work_order_attachments woa
left join app.files f on f.id = woa.file_id
left join app.profiles p_created_by on p_created_by.user_id = woa.created_by and p_created_by.tenant_id = woa.tenant_id
where woa.tenant_id = authz.get_current_tenant_id()
order by woa.created_at desc;

grant select on public.v_work_order_attachments to authenticated, anon;
grant update on public.v_work_order_attachments to authenticated;
grant delete on public.v_work_order_attachments to authenticated;

create or replace function public.handle_v_work_order_attachments_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update app.work_order_attachments
  set
    work_order_id = new.work_order_id,
    file_id = new.file_id,
    label = new.label,
    kind = new.kind,
    document_type_key = new.document_type_key,
    is_controlled = new.is_controlled,
    effective_date = new.effective_date,
    revision_label = new.revision_label,
    created_by = new.created_by,
    updated_at = pg_catalog.now()
  where id = old.id;

  return new;
end;
$$;

drop trigger if exists v_work_order_attachments_instead_of_update on public.v_work_order_attachments;
drop trigger if exists v_work_order_attachments_instead_of_delete on public.v_work_order_attachments;

create trigger v_work_order_attachments_instead_of_update
  instead of update on public.v_work_order_attachments
  for each row
  execute function public.handle_v_work_order_attachments_update();

create trigger v_work_order_attachments_instead_of_delete
  instead of delete on public.v_work_order_attachments
  for each row
  execute function public.handle_v_work_order_attachments_delete();

drop view if exists public.v_asset_attachments cascade;

create view public.v_asset_attachments
with (security_invoker = true)
as
select
  aa.id,
  aa.tenant_id,
  aa.asset_id,
  aa.file_id,
  f.bucket_id,
  f.storage_path,
  f.filename,
  f.content_type,
  aa.label,
  aa.kind,
  aa.document_type_key,
  aa.is_controlled,
  aa.effective_date,
  aa.revision_label,
  aa.created_by,
  p_created_by.full_name as created_by_name,
  aa.created_at,
  aa.updated_at
from app.asset_attachments aa
left join app.files f on f.id = aa.file_id
left join app.profiles p_created_by on p_created_by.user_id = aa.created_by and p_created_by.tenant_id = aa.tenant_id
where aa.tenant_id = authz.get_current_tenant_id()
order by aa.created_at desc;

grant select on public.v_asset_attachments to authenticated, anon;

drop view if exists public.v_location_attachments cascade;

create view public.v_location_attachments
with (security_invoker = true)
as
select
  la.id,
  la.tenant_id,
  la.location_id,
  la.file_id,
  f.bucket_id,
  f.storage_path,
  f.filename,
  f.content_type,
  la.label,
  la.kind,
  la.document_type_key,
  la.is_controlled,
  la.effective_date,
  la.revision_label,
  la.created_by,
  p_created_by.full_name as created_by_name,
  la.created_at,
  la.updated_at
from app.location_attachments la
left join app.files f on f.id = la.file_id
left join app.profiles p_created_by on p_created_by.user_id = la.created_by and p_created_by.tenant_id = la.tenant_id
where la.tenant_id = authz.get_current_tenant_id()
order by la.created_at desc;

grant select on public.v_location_attachments to authenticated, anon;

-- ============================================================================
-- RPCs: tools + handover
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
begin
  perform authz.rpc_setup(p_tenant_id, 'tool.checkout');

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

revoke all on function public.rpc_checkout_tool(uuid, uuid, uuid, timestamptz, uuid, text) from public;
grant execute on function public.rpc_checkout_tool(uuid, uuid, uuid, timestamptz, uuid, text) to authenticated;

create or replace function public.rpc_return_tool(
  p_tenant_id uuid,
  p_checkout_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform authz.rpc_setup(p_tenant_id, 'tool.return');

  update app.tool_checkouts
  set returned_at = pg_catalog.now()
  where id = p_checkout_id
    and tenant_id = p_tenant_id
    and returned_at is null;

  if not found then
    raise exception using message = 'Checkout not found or already returned', errcode = 'P0001';
  end if;
end;
$$;

revoke all on function public.rpc_return_tool(uuid, uuid) from public;
grant execute on function public.rpc_return_tool(uuid, uuid) to authenticated;

create or replace function public.rpc_create_shift_handover(
  p_tenant_id uuid,
  p_location_id uuid,
  p_shift_started_at timestamptz,
  p_shift_ended_at timestamptz,
  p_to_user_id uuid,
  p_summary text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_from uuid := auth.uid();
begin
  perform authz.rpc_setup(p_tenant_id, 'shift_handover.create');

  insert into app.shift_handovers (
    tenant_id, location_id, shift_started_at, shift_ended_at, from_user_id, to_user_id, summary, status
  )
  values (
    p_tenant_id, p_location_id, p_shift_started_at, p_shift_ended_at, v_from, p_to_user_id, p_summary, 'draft'
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.rpc_create_shift_handover(uuid, uuid, timestamptz, timestamptz, uuid, text) from public;
grant execute on function public.rpc_create_shift_handover(uuid, uuid, timestamptz, timestamptz, uuid, text) to authenticated;

create or replace function public.rpc_submit_shift_handover(
  p_tenant_id uuid,
  p_handover_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform authz.rpc_setup(p_tenant_id, 'shift_handover.create');

  update app.shift_handovers
  set status = 'submitted', updated_at = pg_catalog.now()
  where id = p_handover_id
    and tenant_id = p_tenant_id
    and from_user_id = auth.uid()
    and status = 'draft';

  if not found then
    raise exception using message = 'Handover not found or not editable', errcode = 'P0001';
  end if;
end;
$$;

revoke all on function public.rpc_submit_shift_handover(uuid, uuid) from public;
grant execute on function public.rpc_submit_shift_handover(uuid, uuid) to authenticated;

create or replace function public.rpc_acknowledge_shift_handover(
  p_tenant_id uuid,
  p_handover_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform authz.rpc_setup(p_tenant_id, 'shift_handover.acknowledge');

  update app.shift_handovers
  set
    status = 'acknowledged',
    acknowledged_at = pg_catalog.now(),
    updated_at = pg_catalog.now()
  where id = p_handover_id
    and tenant_id = p_tenant_id
    and to_user_id = auth.uid()
    and status = 'submitted';

  if not found then
    raise exception using message = 'Handover not found or not awaiting acknowledgment', errcode = 'P0001';
  end if;
end;
$$;

revoke all on function public.rpc_acknowledge_shift_handover(uuid, uuid) from public;
grant execute on function public.rpc_acknowledge_shift_handover(uuid, uuid) to authenticated;

create or replace function public.rpc_add_shift_handover_item(
  p_tenant_id uuid,
  p_handover_id uuid,
  p_body text,
  p_work_order_id uuid default null,
  p_priority text default 'normal'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform authz.rpc_setup(p_tenant_id, 'shift_handover.create');

  insert into app.shift_handover_items (
    tenant_id, handover_id, work_order_id, body, priority
  )
  values (
    p_tenant_id, p_handover_id, p_work_order_id, trim(p_body), coalesce(p_priority, 'normal')
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.rpc_add_shift_handover_item(uuid, uuid, text, uuid, text) from public;
grant execute on function public.rpc_add_shift_handover_item(uuid, uuid, text, uuid, text) to authenticated;

-- ============================================================================
-- Default document types + extend create_default_tenant_roles
-- ============================================================================

create or replace function cfg.create_default_document_types(
  p_tenant_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into cfg.document_types (
    tenant_id, key, name, display_order, requires_controlled_flag, is_system
  )
  values
    (p_tenant_id, 'manual', 'Manual', 1, true, true),
    (p_tenant_id, 'sop', 'SOP', 2, true, true),
    (p_tenant_id, 'drawing', 'Drawing', 3, false, true),
    (p_tenant_id, 'photo', 'Photo', 4, false, true),
    (p_tenant_id, 'other', 'Other', 5, false, true)
  on conflict (tenant_id, key) do nothing;
end;
$$;

revoke all on function cfg.create_default_document_types(uuid) from public;
grant execute on function cfg.create_default_document_types(uuid) to postgres;

insert into cfg.document_types (tenant_id, key, name, display_order, requires_controlled_flag, is_system)
select t.id, v.key, v.name, v.ord, v.req, true
from app.tenants t
cross join (
  values
    ('manual'::text, 'Manual'::text, 1, true),
    ('sop', 'SOP', 2, true),
    ('drawing', 'Drawing', 3, false),
    ('photo', 'Photo', 4, false),
    ('other', 'Other', 5, false)
) as v(key, name, ord, req)
where not exists (
  select 1 from cfg.document_types d
  where d.tenant_id = t.id and d.key = v.key
);

create or replace function cfg.create_default_tenant_roles(
  p_tenant_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_role_id uuid;
  v_member_role_id uuid;
  v_technician_role_id uuid;
  v_manager_role_id uuid;
  v_requestor_role_id uuid;
begin
  insert into cfg.tenant_roles (tenant_id, key, name, is_default, is_system)
  values (p_tenant_id, 'admin', 'Administrator', false, true)
  returning id into v_admin_role_id;

  insert into cfg.tenant_roles (tenant_id, key, name, is_default, is_system)
  values (p_tenant_id, 'member', 'Member', true, true)
  returning id into v_member_role_id;

  insert into cfg.tenant_roles (tenant_id, key, name, is_default, is_system)
  values (p_tenant_id, 'technician', 'Technician', false, true)
  returning id into v_technician_role_id;

  insert into cfg.tenant_roles (tenant_id, key, name, is_default, is_system)
  values (p_tenant_id, 'manager', 'Manager', false, true)
  returning id into v_manager_role_id;

  insert into cfg.tenant_roles (tenant_id, key, name, is_default, is_system)
  values (p_tenant_id, 'requestor', 'Requestor', false, true)
  returning id into v_requestor_role_id;

  insert into cfg.tenant_role_permissions (tenant_role_id, permission_id)
  select v_admin_role_id, id from cfg.permissions;

  insert into cfg.tenant_role_permissions (tenant_role_id, permission_id)
  select v_member_role_id, id
  from cfg.permissions
  where key like '%.view';

  insert into cfg.tenant_role_permissions (tenant_role_id, permission_id)
  select v_technician_role_id, id
  from cfg.permissions
  where key in (
    'workorder.view',
    'workorder.complete.assigned',
    'asset.view',
    'location.view',
    'downtime.record',
    'downtime.view',
    'notification.read',
    'notification.preference.manage',
    'tool.checkout',
    'tool.return',
    'shift_handover.create',
    'shift_handover.acknowledge'
  );

  insert into cfg.tenant_role_permissions (tenant_role_id, permission_id)
  select v_manager_role_id, id
  from cfg.permissions
  where key like 'workorder.%'
     or key like 'asset.%'
     or key like 'location.%'
     or key like 'downtime.%'
     or key like 'tool.%'
     or key like 'shift_handover.%';

  insert into cfg.tenant_role_permissions (tenant_role_id, permission_id)
  select v_requestor_role_id, id
  from cfg.permissions
  where key in (
    'workorder.request.create',
    'workorder.request.view.own',
    'asset.view',
    'location.view',
    'notification.read',
    'notification.preference.manage'
  );

  perform cfg.create_default_work_order_statuses(p_tenant_id);
  perform cfg.create_default_work_order_priorities(p_tenant_id);
  perform cfg.create_default_asset_statuses(p_tenant_id);
  perform cfg.create_default_maintenance_types(p_tenant_id);
  perform cfg.seed_default_work_order_sla_rules(p_tenant_id);
  perform cfg.create_default_downtime_reasons(p_tenant_id);
  perform cfg.create_default_document_types(p_tenant_id);
end;
$$;

-- Backfill role permissions for tool/shift on existing tenants
insert into cfg.tenant_role_permissions (tenant_role_id, permission_id)
select tr.id, p.id
from cfg.tenant_roles tr
cross join cfg.permissions p
where tr.key = 'technician'
  and p.key in (
    'tool.checkout',
    'tool.return',
    'shift_handover.create',
    'shift_handover.acknowledge'
  )
  and not exists (
    select 1 from cfg.tenant_role_permissions x
    where x.tenant_role_id = tr.id and x.permission_id = p.id
  );

insert into cfg.tenant_role_permissions (tenant_role_id, permission_id)
select tr.id, p.id
from cfg.tenant_roles tr
cross join cfg.permissions p
where tr.key = 'manager'
  and (p.key like 'tool.%' or p.key like 'shift_handover.%')
  and not exists (
    select 1 from cfg.tenant_role_permissions x
    where x.tenant_role_id = tr.id and x.permission_id = p.id
  );

create or replace view public.v_tools
with (security_invoker = true)
as
select *
from app.tools t
where t.tenant_id = authz.get_current_tenant_id();

grant select on public.v_tools to authenticated, anon;

create or replace view public.v_tool_checkouts
with (security_invoker = true)
as
select *
from app.tool_checkouts c
where c.tenant_id = authz.get_current_tenant_id();

grant select on public.v_tool_checkouts to authenticated, anon;

create or replace view public.v_shift_handovers
with (security_invoker = true)
as
select *
from app.shift_handovers h
where h.tenant_id = authz.get_current_tenant_id();

grant select on public.v_shift_handovers to authenticated, anon;
