-- Migration: Persist drawn map shapes (zones / footprints) per tenant
--
-- Purpose: Store polygons, polylines, and other GeoJSON shapes drawn on the map so they
--   survive refresh. Optional link to a location (e.g. building footprint).
-- Affected: app.map_zones (new), public.v_map_zones, RPCs for create/update/delete.
-- Geometry stored as GeoJSON (jsonb); supports Polygon, MultiPolygon, Polyline, Point, etc.

-- ============================================================================
-- 1. app.map_zones table
-- ============================================================================

create table app.map_zones (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  name text not null,
  geometry jsonb not null,
  location_id uuid references app.locations(id) on delete set null,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint map_zones_name_length check (length(name) >= 1 and length(name) <= 255),
  constraint map_zones_geometry_type check (
    geometry ? 'type' and geometry ? 'coordinates'
    and (geometry->>'type') in ('Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon')
  )
);

comment on table app.map_zones is 'Saved map shapes (zones, footprints) drawn on the locations map. Geometry is GeoJSON. Optionally linked to a location.';
comment on column app.map_zones.name is 'Display name for the zone (e.g. "Delivery area", "Building A footprint").';
comment on column app.map_zones.geometry is 'GeoJSON geometry: type and coordinates (RFC 7946).';
comment on column app.map_zones.location_id is 'Optional link to a location (e.g. building footprint).';

create index map_zones_tenant_idx on app.map_zones (tenant_id);
create index map_zones_location_id_idx on app.map_zones (location_id) where location_id is not null;

alter table app.map_zones enable row level security;

-- RLS: tenant isolation
create policy map_zones_select_tenant on app.map_zones
  for select to authenticated using (authz.is_current_user_tenant_member(tenant_id));
create policy map_zones_insert_tenant on app.map_zones
  for insert to authenticated with check (authz.is_current_user_tenant_member(tenant_id));
create policy map_zones_update_tenant on app.map_zones
  for update to authenticated using (authz.is_current_user_tenant_member(tenant_id)) with check (authz.is_current_user_tenant_member(tenant_id));
create policy map_zones_delete_tenant on app.map_zones
  for delete to authenticated using (authz.is_current_user_tenant_member(tenant_id));

create policy map_zones_select_anon on app.map_zones for select to anon using (false);
create policy map_zones_insert_anon on app.map_zones for insert to anon with check (false);
create policy map_zones_update_anon on app.map_zones for update to anon using (false) with check (false);
create policy map_zones_delete_anon on app.map_zones for delete to anon using (false);

grant select, insert, update, delete on app.map_zones to authenticated;

create trigger map_zones_set_updated_at
  before update on app.map_zones
  for each row execute function util.set_updated_at();

-- ============================================================================
-- 2. public.v_map_zones (tenant-scoped view)
-- ============================================================================

create view public.v_map_zones
with (security_invoker = true)
as
select
  z.id,
  z.tenant_id,
  z.name,
  z.geometry,
  z.location_id,
  z.created_at,
  z.updated_at
from app.map_zones z
where z.tenant_id = authz.get_current_tenant_id();

comment on view public.v_map_zones is 'Tenant-scoped map zones (saved drawn shapes). Set tenant context via rpc_set_tenant_context.';

grant select on public.v_map_zones to authenticated;
grant select on public.v_map_zones to anon;

-- ============================================================================
-- 3. RPCs (create, update, delete) for use by client
-- ============================================================================

create or replace function public.rpc_create_map_zone(
  p_tenant_id uuid,
  p_name text,
  p_geometry jsonb,
  p_location_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_zone_id uuid;
  v_user_id uuid;
begin
  v_user_id := authz.validate_authenticated();
  perform util.check_rate_limit('map_zone_create', null, 30, 1, v_user_id, p_tenant_id);

  if not authz.is_tenant_member(v_user_id, p_tenant_id) then
    raise exception using message = 'Unauthorized: not a member of this tenant', errcode = '42501';
  end if;

  if length(p_name) < 1 or length(p_name) > 255 then
    raise exception using message = 'Name must be 1–255 characters', errcode = '23514';
  end if;

  if p_geometry is null or not (p_geometry ? 'type' and p_geometry ? 'coordinates') then
    raise exception using message = 'geometry must be valid GeoJSON with type and coordinates', errcode = '22P02';
  end if;

  if p_location_id is not null then
    if not exists (select 1 from app.locations where id = p_location_id and tenant_id = p_tenant_id) then
      raise exception using message = 'Location not found or wrong tenant', errcode = 'P0001';
    end if;
  end if;

  insert into app.map_zones (tenant_id, name, geometry, location_id)
  values (p_tenant_id, p_name, p_geometry, p_location_id)
  returning id into v_zone_id;

  return v_zone_id;
end;
$$;

comment on function public.rpc_create_map_zone(uuid, text, jsonb, uuid) is
  'Creates a saved map zone (drawn shape). geometry is GeoJSON. Optional location_id to link to a location.';

revoke all on function public.rpc_create_map_zone(uuid, text, jsonb, uuid) from public;
grant execute on function public.rpc_create_map_zone(uuid, text, jsonb, uuid) to authenticated;

create or replace function public.rpc_update_map_zone(
  p_tenant_id uuid,
  p_zone_id uuid,
  p_name text default null,
  p_geometry jsonb default null,
  p_location_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_tenant_id uuid;
begin
  v_user_id := authz.validate_authenticated();
  perform util.check_rate_limit('map_zone_update', null, 30, 1, v_user_id, p_tenant_id);

  if not authz.is_tenant_member(v_user_id, p_tenant_id) then
    raise exception using message = 'Unauthorized: not a member of this tenant', errcode = '42501';
  end if;

  select tenant_id into v_tenant_id from app.map_zones where id = p_zone_id;
  if v_tenant_id is null then
    raise exception using message = 'Map zone not found', errcode = 'P0001';
  end if;
  if v_tenant_id != p_tenant_id then
    raise exception using message = 'Unauthorized: zone belongs to another tenant', errcode = '42501';
  end if;

  if p_name is not null and (length(p_name) < 1 or length(p_name) > 255) then
    raise exception using message = 'Name must be 1–255 characters', errcode = '23514';
  end if;

  if p_geometry is not null and not (p_geometry ? 'type' and p_geometry ? 'coordinates') then
    raise exception using message = 'geometry must be valid GeoJSON with type and coordinates', errcode = '22P02';
  end if;

  if p_location_id is not null and not exists (select 1 from app.locations where id = p_location_id and tenant_id = p_tenant_id) then
    raise exception using message = 'Location not found or wrong tenant', errcode = 'P0001';
  end if;

  update app.map_zones
  set
    name = coalesce(p_name, name),
    geometry = coalesce(p_geometry, geometry),
    location_id = coalesce(p_location_id, location_id),
    updated_at = pg_catalog.now()
  where id = p_zone_id;
end;
$$;

comment on function public.rpc_update_map_zone(uuid, uuid, text, jsonb, uuid) is
  'Updates a map zone. All params optional except tenant_id and zone_id.';

revoke all on function public.rpc_update_map_zone(uuid, uuid, text, jsonb, uuid) from public;
grant execute on function public.rpc_update_map_zone(uuid, uuid, text, jsonb, uuid) to authenticated;

create or replace function public.rpc_delete_map_zone(
  p_tenant_id uuid,
  p_zone_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_tenant_id uuid;
begin
  v_user_id := authz.validate_authenticated();
  perform util.check_rate_limit('map_zone_delete', null, 30, 1, v_user_id, p_tenant_id);

  if not authz.is_tenant_member(v_user_id, p_tenant_id) then
    raise exception using message = 'Unauthorized: not a member of this tenant', errcode = '42501';
  end if;

  select tenant_id into v_tenant_id from app.map_zones where id = p_zone_id;
  if v_tenant_id is null then
    raise exception using message = 'Map zone not found', errcode = 'P0001';
  end if;
  if v_tenant_id != p_tenant_id then
    raise exception using message = 'Unauthorized: zone belongs to another tenant', errcode = '42501';
  end if;

  delete from app.map_zones where id = p_zone_id;
end;
$$;

comment on function public.rpc_delete_map_zone(uuid, uuid) is 'Deletes a map zone.';

revoke all on function public.rpc_delete_map_zone(uuid, uuid) from public;
grant execute on function public.rpc_delete_map_zone(uuid, uuid) to authenticated;
