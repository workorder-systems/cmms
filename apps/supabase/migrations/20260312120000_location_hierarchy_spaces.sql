-- SPDX-License-Identifier: AGPL-3.0-or-later
--
-- Location hierarchy and spaces: typed locations (region, site, building, floor, room, zone),
-- app.spaces for room/space attributes, hierarchy and portfolio views, updated RPCs.
-- Breaking: location_type required (default 'site'); RPC signatures extended.
--
-- Affected: app.locations (new columns), app.spaces (new), app/public views, MVs, RPCs.

-- ============================================================================
-- 1. app.locations: add location_type, code, address_line, external_id
-- ============================================================================

alter table app.locations
  add column if not exists location_type text not null default 'site',
  add column if not exists code text,
  add column if not exists address_line text,
  add column if not exists external_id text;

comment on column app.locations.location_type is 'Hierarchy level: region, site, building, floor, room, or zone. Required; default site for existing rows.';
comment on column app.locations.code is 'Short code (e.g. BLD-A, FL-2, RM-201). Unique per tenant when set.';
comment on column app.locations.address_line is 'Single-line address for sites/buildings.';
comment on column app.locations.external_id is 'External system id for sync (e.g. CAFM).';

alter table app.locations
  add constraint locations_location_type_check check (
    location_type in ('region', 'site', 'building', 'floor', 'room', 'zone')
  );

alter table app.locations
  add constraint locations_code_format_check check (
    code is null or (length(code) >= 1 and length(code) <= 50 and code ~ '^[a-zA-Z0-9_-]+$')
  );

create unique index locations_tenant_code_unique_idx
  on app.locations (tenant_id, code)
  where code is not null;

create index locations_tenant_type_idx
  on app.locations (tenant_id, location_type);

-- Optional: validate parent type compatibility (room -> floor, floor -> building, etc.)
create or replace function util.validate_location_parent_type()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_parent_type text;
begin
  if new.parent_location_id is null then
    return new;
  end if;
  select location_type into v_parent_type
  from app.locations
  where id = new.parent_location_id;
  if v_parent_type is null then
    return new;
  end if;
  /* room/zone under floor; floor under building; building under site; site under region or root */
  case new.location_type
    when 'room', 'zone' then
      if v_parent_type not in ('floor', 'zone') then
        raise exception using message = 'Room or zone location must have parent type floor or zone', errcode = '23514';
      end if;
    when 'floor' then
      if v_parent_type not in ('building') then
        raise exception using message = 'Floor location must have parent type building', errcode = '23514';
      end if;
    when 'building' then
      if v_parent_type not in ('site') then
        raise exception using message = 'Building location must have parent type site', errcode = '23514';
      end if;
    when 'site' then
      if v_parent_type is not null and v_parent_type not in ('region', 'site') then
        raise exception using message = 'Site location must have parent type region, site, or no parent', errcode = '23514';
      end if;
    when 'region' then
      if v_parent_type is not null then
        raise exception using message = 'Region location should not have a parent', errcode = '23514';
      end if;
    else
      null;
  end case;
  return new;
end;
$$;

comment on function util.validate_location_parent_type() is 'Validates parent location type compatibility with location_type (room->floor, floor->building, building->site, site->region).';

revoke all on function util.validate_location_parent_type() from public;
grant execute on function util.validate_location_parent_type() to postgres;

create trigger locations_validate_parent_type
  before insert or update on app.locations
  for each row
  execute function util.validate_location_parent_type();

-- ============================================================================
-- 2. app.spaces: room/space attributes (1:1 with location, typically room/zone)
-- ============================================================================

create table app.spaces (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  location_id uuid not null references app.locations(id) on delete cascade,
  usage_type text,
  capacity integer,
  status text not null default 'available',
  area_sqft numeric(12, 2),
  attributes jsonb,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint spaces_location_id_unique unique (location_id),
  constraint spaces_status_check check (
    status in ('available', 'occupied', 'maintenance', 'reserved', 'offline')
  ),
  constraint spaces_capacity_check check (capacity is null or capacity >= 0)
);

comment on table app.spaces is 'Room/space-level attributes for facilities, hospitality, healthcare (CMMS). One space per location (typically location_type room or zone).';
comment on column app.spaces.usage_type is 'E.g. office, conference, patient_room, lab, storage, lobby.';
comment on column app.spaces.capacity is 'Occupancy/person capacity.';
comment on column app.spaces.status is 'available, occupied, maintenance, reserved, offline.';
comment on column app.spaces.area_sqft is 'Area in square feet.';
comment on column app.spaces.attributes is 'Extensible jsonb (amenities, BMS zone id, etc.).';

create index spaces_tenant_idx on app.spaces (tenant_id);
create index spaces_location_idx on app.spaces (location_id);
create index spaces_status_idx on app.spaces (tenant_id, status);

create trigger spaces_set_updated_at
  before update on app.spaces
  for each row
  execute function util.set_updated_at();

-- Set tenant_id from location and validate same tenant
create or replace function util.spaces_set_tenant_and_validate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_location_tenant_id uuid;
begin
  select tenant_id into v_location_tenant_id
  from app.locations
  where id = new.location_id;
  if v_location_tenant_id is null then
    raise exception using message = 'Location not found', errcode = '23503';
  end if;
  new.tenant_id := v_location_tenant_id;
  return new;
end;
$$;

revoke all on function util.spaces_set_tenant_and_validate() from public;
grant execute on function util.spaces_set_tenant_and_validate() to postgres;

create trigger spaces_tenant_from_location
  before insert or update on app.spaces
  for each row
  execute function util.spaces_set_tenant_and_validate();

alter table app.spaces enable row level security;

create policy spaces_select_tenant on app.spaces for select to authenticated using (authz.is_current_user_tenant_member(tenant_id));
create policy spaces_insert_tenant on app.spaces for insert to authenticated with check (authz.is_current_user_tenant_member(tenant_id));
create policy spaces_update_tenant on app.spaces for update to authenticated using (authz.is_current_user_tenant_member(tenant_id)) with check (authz.is_current_user_tenant_member(tenant_id));
create policy spaces_delete_tenant on app.spaces for delete to authenticated using (authz.is_current_user_tenant_member(tenant_id));
create policy spaces_select_anon on app.spaces for select to anon using (false);
create policy spaces_insert_anon on app.spaces for insert to anon with check (false);
create policy spaces_update_anon on app.spaces for update to anon using (false) with check (false);
create policy spaces_delete_anon on app.spaces for delete to anon using (false);

grant select on app.spaces to authenticated, anon;
grant insert, update, delete on app.spaces to authenticated;
alter table app.spaces force row level security;

-- ============================================================================
-- 3. app.v_location_hierarchy: recursive path and depth
-- ============================================================================

create or replace view app.v_location_hierarchy
with (security_invoker = true)
as
with recursive loc_tree as (
  select
    id,
    tenant_id,
    name,
    description,
    parent_location_id,
    location_type,
    code,
    address_line,
    external_id,
    array[id] as path_ids,
    array[name] as path_names,
    0 as depth
  from app.locations
  where parent_location_id is null
  union all
  select
    l.id,
    l.tenant_id,
    l.name,
    l.description,
    l.parent_location_id,
    l.location_type,
    l.code,
    l.address_line,
    l.external_id,
    lt.path_ids || l.id,
    lt.path_names || l.name,
    lt.depth + 1
  from app.locations l
  join loc_tree lt on l.parent_location_id = lt.id
)
select
  id,
  tenant_id,
  name,
  description,
  parent_location_id,
  location_type,
  code,
  address_line,
  external_id,
  path_ids,
  path_names,
  depth
from loc_tree;

comment on view app.v_location_hierarchy is 'Locations with path_ids, path_names, and depth for tree UIs and ancestor filters.';

-- ============================================================================
-- 4. app.v_site_rollup and mv_site_summary
-- ============================================================================

create or replace view app.v_site_rollup
with (security_invoker = true)
as
with recursive site_descendants as (
  select id, tenant_id, parent_location_id, location_type, id as site_id
  from app.locations
  where location_type = 'site'
  union all
  select l.id, l.tenant_id, l.parent_location_id, l.location_type, sd.site_id
  from app.locations l
  join site_descendants sd on l.parent_location_id = sd.id
),
site_agg as (
  select
    sd.site_id,
    sd.tenant_id,
    count(distinct case when sd.location_type = 'building' then sd.id end) as building_count,
    count(distinct case when sd.location_type = 'floor' then sd.id end) as floor_count,
    count(distinct case when sd.location_type = 'room' then sd.id end) as room_count,
    count(distinct case when sd.location_type = 'zone' then sd.id end) as zone_count,
    count(distinct a.id) as asset_count,
    count(distinct a.id) filter (where a.status = 'active') as active_asset_count,
    count(distinct wo.id) as work_order_count,
    count(distinct wo.id) filter (where wo.status not in ('completed', 'cancelled')) as active_work_order_count
  from site_descendants sd
  left join app.assets a on a.location_id = sd.id
  left join app.work_orders wo on wo.location_id = sd.id
  group by sd.site_id, sd.tenant_id
)
select
  l.id as site_id,
  l.tenant_id,
  l.name as site_name,
  l.location_type,
  l.code as site_code,
  sa.building_count,
  sa.floor_count,
  sa.room_count,
  sa.zone_count,
  sa.asset_count,
  sa.active_asset_count,
  sa.work_order_count,
  sa.active_work_order_count
from app.locations l
join site_agg sa on sa.site_id = l.id
where l.location_type = 'site';

comment on view app.v_site_rollup is 'Per-site aggregates: building/floor/room/zone counts and asset/work order counts for multi-site dashboards.';

create materialized view public.mv_site_summary as
select * from app.v_site_rollup;

comment on materialized view public.mv_site_summary is 'Pre-computed site rollup for portfolio overview. Refreshed via refresh_analytics_views().';

create unique index mv_site_summary_pkey on public.mv_site_summary (site_id);
create index mv_site_summary_tenant_idx on public.mv_site_summary (tenant_id);

-- ============================================================================
-- 5. mv_location_summary: add location_type and site_id; drop and recreate
-- ============================================================================

drop view if exists public.v_locations_summary;

drop materialized view if exists public.mv_location_summary;

create materialized view public.mv_location_summary as
with recursive loc_with_site as (
  select
    id,
    tenant_id,
    parent_location_id,
    location_type,
    name,
    case when location_type = 'site' then id else null end as site_id
  from app.locations
  where parent_location_id is null
  union all
  select
    l.id,
    l.tenant_id,
    l.parent_location_id,
    l.location_type,
    l.name,
    case when l.location_type = 'site' then l.id else p.site_id end
  from app.locations l
  join loc_with_site p on l.parent_location_id = p.id
)
select
  l.tenant_id,
  l.id as location_id,
  l.name as location_name,
  l.parent_location_id,
  l.location_type,
  l.site_id,
  count(distinct a.id) as asset_count,
  count(distinct a.id) filter (where a.status = 'active') as active_asset_count,
  count(distinct wo.id) as work_order_count,
  count(distinct wo.id) filter (where wo.status not in ('completed', 'cancelled')) as active_work_order_count,
  count(distinct wo.id) filter (where wo.status in ('completed', 'cancelled')) as completed_work_order_count,
  max(wo.updated_at) as last_work_order_activity_at,
  max(a.updated_at) as last_asset_activity_at
from loc_with_site l
left join app.assets a on a.location_id = l.id
left join app.work_orders wo on wo.location_id = l.id
group by l.tenant_id, l.id, l.name, l.parent_location_id, l.location_type, l.site_id;

comment on materialized view public.mv_location_summary is 'Pre-computed location statistics including location_type, site_id, asset and work order counts.';

create unique index mv_location_summary_pkey on public.mv_location_summary (location_id);
create index mv_location_summary_tenant_idx on public.mv_location_summary (tenant_id);
create index mv_location_summary_parent_idx on public.mv_location_summary (parent_location_id) where parent_location_id is not null;
create index mv_location_summary_site_idx on public.mv_location_summary (site_id) where site_id is not null;
create index mv_location_summary_tenant_type_idx on public.mv_location_summary (tenant_id, location_type);

create or replace view public.v_locations_summary
with (security_invoker = true)
as
select *
from public.mv_location_summary
where tenant_id = authz.get_current_tenant_id();

comment on view public.v_locations_summary is
  'Tenant-scoped locations summary. Returns data for current tenant context only. Filters materialized view by tenant. Uses SECURITY INVOKER to enforce RLS policies correctly.';

grant select on public.v_locations_summary to authenticated;
grant select on public.v_locations_summary to anon;

-- ============================================================================
-- 6. public.v_locations: add new columns (drop and create so column list can change)
-- ============================================================================

drop view if exists public.v_locations;

create view public.v_locations
with (security_invoker = true)
as
select
  l.id,
  l.tenant_id,
  l.name,
  l.description,
  l.parent_location_id,
  l.location_type,
  l.code,
  l.address_line,
  l.external_id,
  l.created_at,
  l.updated_at
from app.locations l
where l.tenant_id = authz.get_current_tenant_id();

comment on view public.v_locations is 'Locations view scoped to current tenant. Includes location_type, code, address_line, external_id.';

grant select on public.v_locations to authenticated;
grant select on public.v_locations to anon;

-- ============================================================================
-- 7. public v_location_hierarchy, v_site_rollup, v_portfolio_overview
-- ============================================================================

create or replace view public.v_location_hierarchy
with (security_invoker = true)
as
select *
from app.v_location_hierarchy
where tenant_id = authz.get_current_tenant_id();

comment on view public.v_location_hierarchy is 'Tenant-scoped location hierarchy with path and depth.';

grant select on public.v_location_hierarchy to authenticated;
grant select on public.v_location_hierarchy to anon;

create or replace view public.v_site_rollup
with (security_invoker = true)
as
select *
from public.mv_site_summary
where tenant_id = authz.get_current_tenant_id();

comment on view public.v_site_rollup is 'Tenant-scoped site rollup for multi-site dashboards.';

grant select on public.v_site_rollup to authenticated;
grant select on public.v_site_rollup to anon;

create or replace view public.v_portfolio_overview
with (security_invoker = true)
as
select
  t.tenant_id,
  t.tenant_name,
  t.slug,
  t.member_count,
  t.location_count,
  t.asset_count,
  t.work_order_count,
  t.active_work_order_count,
  t.overdue_work_order_count,
  t.first_work_order_at,
  t.last_work_order_at,
  t.tenant_created_at,
  s.site_id,
  s.site_name,
  s.site_code,
  s.building_count,
  s.floor_count,
  s.room_count,
  s.zone_count,
  s.asset_count as site_asset_count,
  s.active_asset_count as site_active_asset_count,
  s.work_order_count as site_work_order_count,
  s.active_work_order_count as site_active_work_order_count
from public.mv_tenant_overview t
left join public.mv_site_summary s on s.tenant_id = t.tenant_id
where t.tenant_id = authz.get_current_tenant_id();

comment on view public.v_portfolio_overview is 'Tenant-level summary with per-site breakdown for portfolio reporting.';

grant select on public.v_portfolio_overview to authenticated;
grant select on public.v_portfolio_overview to anon;

-- Tenant-scoped spaces view for SDK (spaces joined to location name/type).
create or replace view public.v_spaces
with (security_invoker = true)
as
select
  s.id,
  s.tenant_id,
  s.location_id,
  l.name as location_name,
  l.location_type as location_type,
  s.usage_type,
  s.capacity,
  s.status,
  s.area_sqft,
  s.attributes,
  s.created_at,
  s.updated_at
from app.spaces s
join app.locations l on l.id = s.location_id
where s.tenant_id = authz.get_current_tenant_id();

comment on view public.v_spaces is 'Tenant-scoped spaces with location name and type.';

grant select on public.v_spaces to authenticated;
grant select on public.v_spaces to anon;

-- ============================================================================
-- 8. refresh_analytics_views: include mv_site_summary
-- ============================================================================

create or replace function public.refresh_analytics_views()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  refresh materialized view concurrently public.mv_work_order_summary;
  refresh materialized view concurrently public.mv_asset_summary;
  refresh materialized view concurrently public.mv_location_summary;
  refresh materialized view concurrently public.mv_site_summary;
  refresh materialized view concurrently public.mv_tenant_overview;
end;
$$;

comment on function public.refresh_analytics_views() is 'Refreshes all analytics materialized views including mv_site_summary.';

revoke select on public.mv_site_summary from anon, authenticated;

-- ============================================================================
-- 9. RPCs: location create/update (breaking signatures), bulk_import, space CRUD
-- ============================================================================

drop function if exists public.rpc_create_location(uuid, text, text, uuid);
drop function if exists public.rpc_update_location(uuid, uuid, text, text, uuid);

create or replace function public.rpc_create_location(
  p_tenant_id uuid,
  p_name text,
  p_description text default null,
  p_parent_location_id uuid default null,
  p_location_type text default 'site',
  p_code text default null,
  p_address_line text default null,
  p_external_id text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_location_id uuid;
  v_user_id uuid;
begin
  v_user_id := authz.validate_authenticated();
  perform util.check_rate_limit('location_create', null, 50, 1, v_user_id, p_tenant_id);

  if not authz.is_tenant_member(v_user_id, p_tenant_id) then
    raise exception using message = 'Unauthorized: User is not a member of this tenant', errcode = '42501';
  end if;

  if length(p_name) < 1 or length(p_name) > 255 then
    raise exception using message = 'Location name must be between 1 and 255 characters', errcode = '23514';
  end if;

  if p_location_type is null or p_location_type not in ('region', 'site', 'building', 'floor', 'room', 'zone') then
    raise exception using message = 'location_type must be one of: region, site, building, floor, room, zone', errcode = '23514';
  end if;

  insert into app.locations (tenant_id, name, description, parent_location_id, location_type, code, address_line, external_id)
  values (p_tenant_id, p_name, p_description, p_parent_location_id, p_location_type, p_code, p_address_line, p_external_id)
  returning id into v_location_id;

  return v_location_id;
end;
$$;

comment on function public.rpc_create_location(uuid, text, text, uuid, text, text, text, text) is
  'Creates a new location. location_type required (default site). Optional: code, address_line, external_id. Returns location id.';

revoke all on function public.rpc_create_location(uuid, text, text, uuid, text, text, text, text) from public;
grant execute on function public.rpc_create_location(uuid, text, text, uuid, text, text, text, text) to authenticated;

create or replace function public.rpc_update_location(
  p_tenant_id uuid,
  p_location_id uuid,
  p_name text default null,
  p_description text default null,
  p_parent_location_id uuid default null,
  p_location_type text default null,
  p_code text default null,
  p_address_line text default null,
  p_external_id text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_location_tenant_id uuid;
begin
  v_user_id := authz.validate_authenticated();
  perform util.check_rate_limit('location_update', null, 50, 1, v_user_id, p_tenant_id);

  if not authz.is_tenant_member(v_user_id, p_tenant_id) then
    raise exception using message = 'Unauthorized: User is not a member of this tenant', errcode = '42501';
  end if;

  select tenant_id into v_location_tenant_id from app.locations where id = p_location_id;
  if v_location_tenant_id is null then
    raise exception using message = 'Location not found', errcode = 'P0001';
  end if;
  if v_location_tenant_id != p_tenant_id then
    raise exception using message = 'Unauthorized: Location does not belong to this tenant', errcode = '42501';
  end if;

  if p_name is not null and (length(p_name) < 1 or length(p_name) > 255) then
    raise exception using message = 'Location name must be between 1 and 255 characters', errcode = '23514';
  end if;

  if p_location_type is not null and p_location_type not in ('region', 'site', 'building', 'floor', 'room', 'zone') then
    raise exception using message = 'location_type must be one of: region, site, building, floor, room, zone', errcode = '23514';
  end if;

  update app.locations
  set
    name = coalesce(p_name, name),
    description = coalesce(p_description, description),
    parent_location_id = coalesce(p_parent_location_id, parent_location_id),
    location_type = coalesce(p_location_type, location_type),
    code = coalesce(p_code, code),
    address_line = coalesce(p_address_line, address_line),
    external_id = coalesce(p_external_id, external_id),
    updated_at = pg_catalog.now()
  where id = p_location_id;
end;
$$;

comment on function public.rpc_update_location(uuid, uuid, text, text, uuid, text, text, text, text) is
  'Updates an existing location. All params optional except tenant_id and location_id.';

revoke all on function public.rpc_update_location(uuid, uuid, text, text, uuid, text, text, text, text) from public;
grant execute on function public.rpc_update_location(uuid, uuid, text, text, uuid, text, text, text, text) to authenticated;

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
  v_location_type text;
  v_code text;
  v_address_line text;
  v_external_id text;
  v_location_id uuid;
  v_created_ids uuid[] := '{}';
  v_errors jsonb := '[]'::jsonb;
  v_msg text;
begin
  perform util.check_rate_limit('location_bulk_import', null, 1, 1, auth.uid(), p_tenant_id);
  v_user_id := authz.rpc_setup(p_tenant_id, 'location.create');

  if jsonb_typeof(p_rows) <> 'array' then
    raise exception using message = 'p_rows must be a jsonb array', errcode = '22P02';
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

      v_location_type := nullif(trim(v_row->>'location_type'), '');
      if v_location_type is null then
        v_location_type := 'site';
      end if;
      if v_location_type not in ('region', 'site', 'building', 'floor', 'room', 'zone') then
        v_errors := v_errors || jsonb_build_object('index', v_idx, 'message', 'location_type must be region, site, building, floor, room, or zone');
        continue;
      end if;

      v_code := nullif(trim(v_row->>'code'), '');
      v_address_line := nullif(trim(v_row->>'address_line'), '');
      v_external_id := nullif(trim(v_row->>'external_id'), '');

      insert into app.locations (tenant_id, name, description, parent_location_id, location_type, code, address_line, external_id)
      values (p_tenant_id, v_name, v_description, v_parent_location_id, v_location_type, v_code, v_address_line, v_external_id)
      returning id into v_location_id;

      v_created_ids := array_append(v_created_ids, v_location_id);
    exception
      when others then
        get stacked diagnostics v_msg = message_text;
        v_errors := v_errors || jsonb_build_object('index', v_idx, 'message', v_msg);
    end;
  end loop;

  return jsonb_build_object('created_ids', to_jsonb(v_created_ids), 'errors', v_errors);
end;
$$;

comment on function public.rpc_bulk_import_locations(uuid, jsonb) is
  'Bulk create locations. Each row: name (required), description?, parent_location_id?, location_type? (default site), code?, address_line?, external_id?.';

revoke all on function public.rpc_bulk_import_locations(uuid, jsonb) from public;
grant execute on function public.rpc_bulk_import_locations(uuid, jsonb) to authenticated;

-- Space RPCs
create or replace function public.rpc_create_space(
  p_tenant_id uuid,
  p_location_id uuid,
  p_usage_type text default null,
  p_capacity integer default null,
  p_status text default 'available',
  p_area_sqft numeric default null,
  p_attributes jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_space_id uuid;
  v_user_id uuid;
  v_location_tenant_id uuid;
begin
  v_user_id := authz.validate_authenticated();
  perform util.check_rate_limit('space_create', null, 50, 1, v_user_id, p_tenant_id);

  if not authz.is_tenant_member(v_user_id, p_tenant_id) then
    raise exception using message = 'Unauthorized: User is not a member of this tenant', errcode = '42501';
  end if;

  select tenant_id into v_location_tenant_id from app.locations where id = p_location_id;
  if v_location_tenant_id is null then
    raise exception using message = 'Location not found', errcode = 'P0001';
  end if;
  if v_location_tenant_id != p_tenant_id then
    raise exception using message = 'Unauthorized: Location does not belong to this tenant', errcode = '42501';
  end if;

  if p_status is not null and p_status not in ('available', 'occupied', 'maintenance', 'reserved', 'offline') then
    raise exception using message = 'status must be one of: available, occupied, maintenance, reserved, offline', errcode = '23514';
  end if;

  insert into app.spaces (tenant_id, location_id, usage_type, capacity, status, area_sqft, attributes)
  values (p_tenant_id, p_location_id, p_usage_type, p_capacity, coalesce(p_status, 'available'), p_area_sqft, p_attributes)
  returning id into v_space_id;

  return v_space_id;
end;
$$;

comment on function public.rpc_create_space(uuid, uuid, text, integer, text, numeric, jsonb) is
  'Creates a space for a location (typically room/zone). Returns space id.';

revoke all on function public.rpc_create_space(uuid, uuid, text, integer, text, numeric, jsonb) from public;
grant execute on function public.rpc_create_space(uuid, uuid, text, integer, text, numeric, jsonb) to authenticated;

create or replace function public.rpc_update_space(
  p_tenant_id uuid,
  p_space_id uuid,
  p_usage_type text default null,
  p_capacity integer default null,
  p_status text default null,
  p_area_sqft numeric default null,
  p_attributes jsonb default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_space_tenant_id uuid;
begin
  v_user_id := authz.validate_authenticated();
  perform util.check_rate_limit('space_update', null, 50, 1, v_user_id, p_tenant_id);

  if not authz.is_tenant_member(v_user_id, p_tenant_id) then
    raise exception using message = 'Unauthorized: User is not a member of this tenant', errcode = '42501';
  end if;

  select tenant_id into v_space_tenant_id from app.spaces where id = p_space_id;
  if v_space_tenant_id is null then
    raise exception using message = 'Space not found', errcode = 'P0001';
  end if;
  if v_space_tenant_id != p_tenant_id then
    raise exception using message = 'Unauthorized: Space does not belong to this tenant', errcode = '42501';
  end if;

  if p_status is not null and p_status not in ('available', 'occupied', 'maintenance', 'reserved', 'offline') then
    raise exception using message = 'status must be one of: available, occupied, maintenance, reserved, offline', errcode = '23514';
  end if;

  update app.spaces
  set
    usage_type = coalesce(p_usage_type, usage_type),
    capacity = coalesce(p_capacity, capacity),
    status = coalesce(p_status, status),
    area_sqft = coalesce(p_area_sqft, area_sqft),
    attributes = coalesce(p_attributes, attributes),
    updated_at = pg_catalog.now()
  where id = p_space_id;
end;
$$;

comment on function public.rpc_update_space(uuid, uuid, text, integer, text, numeric, jsonb) is
  'Updates a space. All params optional except tenant_id and space_id.';

revoke all on function public.rpc_update_space(uuid, uuid, text, integer, text, numeric, jsonb) from public;
grant execute on function public.rpc_update_space(uuid, uuid, text, integer, text, numeric, jsonb) to authenticated;

create or replace function public.rpc_delete_space(
  p_tenant_id uuid,
  p_space_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_space_tenant_id uuid;
begin
  v_user_id := authz.validate_authenticated();
  perform util.check_rate_limit('space_delete', null, 20, 1, v_user_id, p_tenant_id);

  if not authz.is_tenant_member(v_user_id, p_tenant_id) then
    raise exception using message = 'Unauthorized: User is not a member of this tenant', errcode = '42501';
  end if;

  select tenant_id into v_space_tenant_id from app.spaces where id = p_space_id;
  if v_space_tenant_id is null then
    raise exception using message = 'Space not found', errcode = 'P0001';
  end if;
  if v_space_tenant_id != p_tenant_id then
    raise exception using message = 'Unauthorized: Space does not belong to this tenant', errcode = '42501';
  end if;

  delete from app.spaces where id = p_space_id;
end;
$$;

comment on function public.rpc_delete_space(uuid, uuid) is
  'Deletes a space. Requires tenant membership.';

revoke all on function public.rpc_delete_space(uuid, uuid) from public;
grant execute on function public.rpc_delete_space(uuid, uuid) to authenticated;
