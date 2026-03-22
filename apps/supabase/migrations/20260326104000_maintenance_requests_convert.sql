/*
 * migration: 20260326104000_maintenance_requests_convert.sql
 *
 * purpose: maintenance_requests entity; portal rpc_create_work_order_request
 *          creates a submitted request row then converts to a work order; staff may convert
 *          standalone submitted requests via rpc_convert_maintenance_request_to_work_order.
 *
 * affected: app.maintenance_requests, public rpcs and views
 */

-- ============================================================================
-- 1. maintenance_requests table
-- ============================================================================

create table app.maintenance_requests (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete restrict,
  title text not null,
  description text,
  priority text not null,
  maintenance_type text,
  location_id uuid references app.locations(id) on delete set null,
  asset_id uuid references app.assets(id) on delete set null,
  due_date timestamptz,
  status text not null default 'submitted',
  converted_work_order_id uuid references app.work_orders(id) on delete set null,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint maintenance_requests_status_check check (
    status in ('draft', 'submitted', 'converted', 'cancelled')
  ),
  constraint maintenance_requests_title_length_check check (length(trim(title)) >= 1)
);

comment on table app.maintenance_requests is
  'Pre-work-order maintenance request lifecycle (portal draft/submit, staff conversion to work_orders).';

create index maintenance_requests_tenant_status_idx on app.maintenance_requests (tenant_id, status);
create index maintenance_requests_tenant_requested_by_idx on app.maintenance_requests (tenant_id, requested_by);

create trigger maintenance_requests_set_updated_at
  before update on app.maintenance_requests
  for each row
  execute function util.set_updated_at();

alter table app.maintenance_requests enable row level security;

-- select: same visibility pattern as work_orders (view any / own requestor / full view)
create policy maintenance_requests_select_authenticated on app.maintenance_requests
  for select
  to authenticated
  using (
    authz.is_current_user_tenant_member(tenant_id)
    and (
      authz.has_current_user_permission(tenant_id, 'workorder.view')
      or authz.has_current_user_permission(tenant_id, 'workorder.request.view.any')
      or (
        requested_by = auth.uid()
        and authz.has_current_user_permission(tenant_id, 'workorder.request.view.own')
      )
    )
  );

create policy maintenance_requests_select_anon on app.maintenance_requests
  for select
  to anon
  using (false);

create policy maintenance_requests_insert_authenticated on app.maintenance_requests
  for insert
  to authenticated
  with check (false);

create policy maintenance_requests_insert_anon on app.maintenance_requests
  for insert
  to anon
  with check (false);

create policy maintenance_requests_update_authenticated on app.maintenance_requests
  for update
  to authenticated
  using (false)
  with check (false);

create policy maintenance_requests_update_anon on app.maintenance_requests
  for update
  to anon
  using (false)
  with check (false);

create policy maintenance_requests_delete_authenticated on app.maintenance_requests
  for delete
  to authenticated
  using (false);

create policy maintenance_requests_delete_anon on app.maintenance_requests
  for delete
  to anon
  using (false);

grant select on app.maintenance_requests to authenticated, anon;
alter table app.maintenance_requests force row level security;

-- ============================================================================
-- 2. internal: convert submitted request -> work order (single row, locked)
-- ============================================================================

create or replace function app.internal_convert_maintenance_request_to_work_order(p_request_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  r app.maintenance_requests%rowtype;
  v_initial_status text;
  v_work_order_id uuid;
begin
  select * into r from app.maintenance_requests where id = p_request_id for update;
  if not found then
    raise exception using message = 'Maintenance request not found', errcode = 'P0001';
  end if;

  if r.status <> 'submitted' then
    raise exception using
      message = 'Only submitted requests can be converted',
      errcode = '23514';
  end if;

  if r.converted_work_order_id is not null then
    raise exception using message = 'Request already converted', errcode = '23514';
  end if;

  v_initial_status := cfg.get_default_status(
    r.tenant_id,
    'work_order',
    pg_catalog.jsonb_build_object('assigned_to', null)
  );

  insert into app.work_orders (
    tenant_id,
    title,
    description,
    priority,
    maintenance_type,
    assigned_to,
    location_id,
    asset_id,
    due_date,
    status,
    requested_by
  )
  values (
    r.tenant_id,
    r.title,
    r.description,
    r.priority,
    r.maintenance_type,
    null,
    r.location_id,
    r.asset_id,
    r.due_date,
    v_initial_status,
    r.requested_by
  )
  returning id into v_work_order_id;

  update app.maintenance_requests
  set
    status = 'converted',
    converted_work_order_id = v_work_order_id,
    updated_at = pg_catalog.now()
  where id = p_request_id;

  return v_work_order_id;
end;
$$;

comment on function app.internal_convert_maintenance_request_to_work_order(uuid) is
  'Creates a work order from a submitted maintenance request and marks the request converted. SECURITY DEFINER; not granted to API roles.';

revoke all on function app.internal_convert_maintenance_request_to_work_order(uuid) from public;
grant execute on function app.internal_convert_maintenance_request_to_work_order(uuid) to postgres;

-- ============================================================================
-- 3. rpc_convert_maintenance_request_to_work_order (staff)
-- ============================================================================

create or replace function public.rpc_convert_maintenance_request_to_work_order(
  p_tenant_id uuid,
  p_request_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant uuid;
begin
  perform util.check_rate_limit('maintenance_request_convert', null, 60, 1, auth.uid(), p_tenant_id);
  perform authz.rpc_setup(p_tenant_id, 'workorder.edit');

  select tenant_id into v_tenant from app.maintenance_requests where id = p_request_id;
  if not found or v_tenant <> p_tenant_id then
    raise exception using message = 'Request not found or wrong tenant', errcode = 'P0001';
  end if;

  return app.internal_convert_maintenance_request_to_work_order(p_request_id);
end;
$$;

comment on function public.rpc_convert_maintenance_request_to_work_order(uuid, uuid) is
  'Converts a submitted maintenance request into a work order. Requires workorder.edit.';

revoke all on function public.rpc_convert_maintenance_request_to_work_order(uuid, uuid) from public;
grant execute on function public.rpc_convert_maintenance_request_to_work_order(uuid, uuid) to authenticated;

-- ============================================================================
-- 4. rpc_create_maintenance_request (request row only; optional draft/submitted)
-- ============================================================================

create or replace function public.rpc_create_maintenance_request(
  p_tenant_id uuid,
  p_title text,
  p_description text default null,
  p_priority text default 'medium',
  p_maintenance_type text default null,
  p_location_id uuid default null,
  p_asset_id uuid default null,
  p_due_date timestamptz default null,
  p_status text default 'submitted'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_request_id uuid;
  v_asset_tenant_id uuid;
  v_loc_tenant_id uuid;
  v_status text;
begin
  perform util.check_rate_limit('maintenance_request_create', null, 10, 1, auth.uid(), p_tenant_id);

  v_user_id := authz.rpc_setup(p_tenant_id, 'workorder.request.create');

  v_status := lower(trim(coalesce(p_status, 'submitted')));
  if v_status not in ('draft', 'submitted') then
    raise exception using message = 'status must be draft or submitted', errcode = '23514';
  end if;

  if v_status = 'submitted' and not authz.user_can_request_work_order_at_locations(v_user_id, p_tenant_id, p_location_id, p_asset_id) then
    raise exception using
      message = 'Location or asset not permitted for this user',
      errcode = '42501';
  end if;

  if not exists (
    select 1
    from cfg.priority_catalogs
    where tenant_id = p_tenant_id
      and entity_type = 'work_order'
      and key = p_priority
  ) then
    raise exception using
      message = format('Invalid priority: %s', p_priority),
      errcode = '23503';
  end if;

  if p_maintenance_type is not null then
    if not exists (
      select 1
      from cfg.maintenance_type_catalogs
      where tenant_id = p_tenant_id
        and entity_type = 'work_order'
        and key = p_maintenance_type
    ) then
      raise exception using
        message = format('Invalid maintenance type: %s', p_maintenance_type),
        errcode = '23503';
    end if;
  end if;

  if p_asset_id is not null then
    select tenant_id into v_asset_tenant_id from app.assets where id = p_asset_id;
    if not found or v_asset_tenant_id <> p_tenant_id then
      raise exception using message = 'Asset not found or wrong tenant', errcode = '23503';
    end if;
  end if;

  if p_location_id is not null then
    select tenant_id into v_loc_tenant_id from app.locations where id = p_location_id;
    if not found or v_loc_tenant_id <> p_tenant_id then
      raise exception using message = 'Location not found or wrong tenant', errcode = '23503';
    end if;
  end if;

  insert into app.maintenance_requests (
    tenant_id,
    requested_by,
    title,
    description,
    priority,
    maintenance_type,
    location_id,
    asset_id,
    due_date,
    status
  )
  values (
    p_tenant_id,
    v_user_id,
    p_title,
    p_description,
    p_priority,
    p_maintenance_type,
    p_location_id,
    p_asset_id,
    p_due_date,
    v_status
  )
  returning id into v_request_id;

  return v_request_id;
end;
$$;

comment on function public.rpc_create_maintenance_request(uuid, text, text, text, text, uuid, uuid, timestamptz, text) is
  'Creates a maintenance request (draft or submitted) without a work order. Submitted rows respect portal ABAC. Requires workorder.request.create.';

revoke all on function public.rpc_create_maintenance_request(uuid, text, text, text, text, uuid, uuid, timestamptz, text) from public;
grant execute on function public.rpc_create_maintenance_request(uuid, text, text, text, text, uuid, uuid, timestamptz, text) to authenticated;

-- ============================================================================
-- 5. replace rpc_create_work_order_request: MR row + convert (single rate limit)
-- ============================================================================

create or replace function public.rpc_create_work_order_request(
  p_tenant_id uuid,
  p_title text,
  p_description text default null,
  p_priority text default 'medium',
  p_maintenance_type text default null,
  p_location_id uuid default null,
  p_asset_id uuid default null,
  p_due_date timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_request_id uuid;
  v_asset_tenant_id uuid;
  v_loc_tenant_id uuid;
begin
  perform util.check_rate_limit('work_order_request_create', null, 10, 1, auth.uid(), p_tenant_id);

  v_user_id := authz.rpc_setup(p_tenant_id, 'workorder.request.create');

  if not authz.user_can_request_work_order_at_locations(v_user_id, p_tenant_id, p_location_id, p_asset_id) then
    raise exception using
      message = 'Location or asset not permitted for this user',
      errcode = '42501';
  end if;

  if not exists (
    select 1
    from cfg.priority_catalogs
    where tenant_id = p_tenant_id
      and entity_type = 'work_order'
      and key = p_priority
  ) then
    raise exception using
      message = format('Invalid priority: %s', p_priority),
      errcode = '23503';
  end if;

  if p_maintenance_type is not null then
    if not exists (
      select 1
      from cfg.maintenance_type_catalogs
      where tenant_id = p_tenant_id
        and entity_type = 'work_order'
        and key = p_maintenance_type
    ) then
      raise exception using
        message = format('Invalid maintenance type: %s', p_maintenance_type),
        errcode = '23503';
    end if;
  end if;

  if p_asset_id is not null then
    select tenant_id into v_asset_tenant_id from app.assets where id = p_asset_id;
    if not found or v_asset_tenant_id <> p_tenant_id then
      raise exception using message = 'Asset not found or wrong tenant', errcode = '23503';
    end if;
  end if;

  if p_location_id is not null then
    select tenant_id into v_loc_tenant_id from app.locations where id = p_location_id;
    if not found or v_loc_tenant_id <> p_tenant_id then
      raise exception using message = 'Location not found or wrong tenant', errcode = '23503';
    end if;
  end if;

  insert into app.maintenance_requests (
    tenant_id,
    requested_by,
    title,
    description,
    priority,
    maintenance_type,
    location_id,
    asset_id,
    due_date,
    status
  )
  values (
    p_tenant_id,
    v_user_id,
    p_title,
    p_description,
    p_priority,
    p_maintenance_type,
    p_location_id,
    p_asset_id,
    p_due_date,
    'submitted'
  )
  returning id into v_request_id;

  return app.internal_convert_maintenance_request_to_work_order(v_request_id);
end;
$$;

comment on function public.rpc_create_work_order_request(uuid, text, text, text, text, uuid, uuid, timestamptz) is
  'Portal: inserts a submitted maintenance_request then converts it to a work order (requested_by = caller). Returns work order id.';

-- grants unchanged (function signature unchanged)

-- ============================================================================
-- 6. public views
-- ============================================================================

create or replace view public.v_maintenance_requests
with (security_invoker = true)
as
select
  mr.id,
  mr.tenant_id,
  mr.requested_by,
  mr.title,
  mr.description,
  mr.priority,
  mr.maintenance_type,
  mr.location_id,
  mr.asset_id,
  mr.due_date,
  mr.status,
  mr.converted_work_order_id,
  mr.created_at,
  mr.updated_at
from app.maintenance_requests mr
where mr.tenant_id = authz.get_current_tenant_id();

comment on view public.v_maintenance_requests is
  'Maintenance requests for the current tenant (RLS on base table applies via invoker).';

grant select on public.v_maintenance_requests to authenticated, anon;

create or replace view public.v_my_maintenance_requests
with (security_invoker = true)
as
select
  mr.id,
  mr.tenant_id,
  mr.title,
  mr.status,
  mr.priority,
  mr.created_at,
  mr.due_date,
  mr.location_id,
  mr.asset_id,
  mr.converted_work_order_id
from app.maintenance_requests mr
where mr.tenant_id = authz.get_current_tenant_id()
  and mr.requested_by = auth.uid()
  and authz.has_current_user_permission(mr.tenant_id, 'workorder.request.view.own');

comment on view public.v_my_maintenance_requests is
  'Maintenance requests submitted by the current user (portal).';

grant select on public.v_my_maintenance_requests to authenticated;
grant select on public.v_my_maintenance_requests to anon;
