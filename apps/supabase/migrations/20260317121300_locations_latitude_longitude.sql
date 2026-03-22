-- Migration: Add latitude and longitude to locations for map display and configuration
--
-- Purpose: Allow locations to be positioned on a map, shown as markers, and configured
--   via "set on map" flow. Both coordinates must be set together or both null.
-- Affected: app.locations (new columns), public.v_locations, rpc_create_location,
--   rpc_update_location.
-- Constraints: latitude in [-90, 90], longitude in [-180, 180]; both null or both set.

-- ============================================================================
-- 1. app.locations: add latitude, longitude
-- ============================================================================

alter table app.locations
  add column if not exists latitude numeric(10, 7),
  add column if not exists longitude numeric(10, 7);

comment on column app.locations.latitude is 'WGS84 latitude for map display. Set with longitude together.';
comment on column app.locations.longitude is 'WGS84 longitude for map display. Set with latitude together.';

alter table app.locations
  add constraint locations_lat_lng_pair check (
    (latitude is null and longitude is null)
    or (
      latitude is not null
      and longitude is not null
      and latitude >= -90
      and latitude <= 90
      and longitude >= -180
      and longitude <= 180
    )
  );

-- ============================================================================
-- 2. public.v_locations: expose latitude, longitude
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
  l.latitude,
  l.longitude,
  l.created_at,
  l.updated_at
from app.locations l
where l.tenant_id = authz.get_current_tenant_id();

comment on view public.v_locations is 'Tenant-scoped locations. Includes location_type, code, address_line, external_id, latitude, longitude.';

grant select on public.v_locations to authenticated;
grant select on public.v_locations to anon;

-- ============================================================================
-- 3. rpc_create_location: add p_latitude, p_longitude
-- ============================================================================

drop function if exists public.rpc_create_location(uuid, text, text, uuid, text, text, text, text);

create or replace function public.rpc_create_location(
  p_tenant_id uuid,
  p_name text,
  p_description text default null,
  p_parent_location_id uuid default null,
  p_location_type text default 'site',
  p_code text default null,
  p_address_line text default null,
  p_external_id text default null,
  p_latitude numeric default null,
  p_longitude numeric default null
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

  /* Require both or neither lat/lng */
  if (p_latitude is null) <> (p_longitude is null) then
    raise exception using message = 'latitude and longitude must be set together or both null', errcode = '23514';
  end if;
  if p_latitude is not null and (p_latitude < -90 or p_latitude > 90 or p_longitude < -180 or p_longitude > 180) then
    raise exception using message = 'latitude must be in [-90,90] and longitude in [-180,180]', errcode = '23514';
  end if;

  insert into app.locations (tenant_id, name, description, parent_location_id, location_type, code, address_line, external_id, latitude, longitude)
  values (p_tenant_id, p_name, p_description, p_parent_location_id, p_location_type, p_code, p_address_line, p_external_id, p_latitude, p_longitude)
  returning id into v_location_id;

  return v_location_id;
end;
$$;

comment on function public.rpc_create_location(uuid, text, text, uuid, text, text, text, text, numeric, numeric) is
  'Creates a new location. Optional: code, address_line, external_id, latitude, longitude. Returns location id.';

revoke all on function public.rpc_create_location(uuid, text, text, uuid, text, text, text, text, numeric, numeric) from public;
grant execute on function public.rpc_create_location(uuid, text, text, uuid, text, text, text, text, numeric, numeric) to authenticated;

-- ============================================================================
-- 4. rpc_update_location: add p_latitude, p_longitude
-- ============================================================================

drop function if exists public.rpc_update_location(uuid, uuid, text, text, uuid, text, text, text, text);

create or replace function public.rpc_update_location(
  p_tenant_id uuid,
  p_location_id uuid,
  p_name text default null,
  p_description text default null,
  p_parent_location_id uuid default null,
  p_location_type text default null,
  p_code text default null,
  p_address_line text default null,
  p_external_id text default null,
  p_latitude numeric default null,
  p_longitude numeric default null,
  p_clear_position boolean default false
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

  if p_clear_position then
    /* Clear map position; ignore p_latitude/p_longitude */
    update app.locations
    set
      name = coalesce(p_name, name),
      description = coalesce(p_description, description),
      parent_location_id = coalesce(p_parent_location_id, parent_location_id),
      location_type = coalesce(p_location_type, location_type),
      code = coalesce(p_code, code),
      address_line = coalesce(p_address_line, address_line),
      external_id = coalesce(p_external_id, external_id),
      latitude = null,
      longitude = null,
      updated_at = pg_catalog.now()
    where id = p_location_id;
  else
    if p_latitude is not null or p_longitude is not null then
      if p_latitude is null or p_longitude is null then
        raise exception using message = 'latitude and longitude must be set together or both null', errcode = '23514';
      end if;
      if p_latitude < -90 or p_latitude > 90 or p_longitude < -180 or p_longitude > 180 then
        raise exception using message = 'latitude must be in [-90,90] and longitude in [-180,180]', errcode = '23514';
      end if;
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
      latitude = coalesce(p_latitude, latitude),
      longitude = coalesce(p_longitude, longitude),
      updated_at = pg_catalog.now()
    where id = p_location_id;
  end if;
end;
$$;

comment on function public.rpc_update_location(uuid, uuid, text, text, uuid, text, text, text, text, numeric, numeric, boolean) is
  'Updates an existing location. All params optional except tenant_id and location_id. Pass latitude/longitude together to set position; set p_clear_position true to remove position.';

revoke all on function public.rpc_update_location(uuid, uuid, text, text, uuid, text, text, text, text, numeric, numeric, boolean) from public;
grant execute on function public.rpc_update_location(uuid, uuid, text, text, uuid, text, text, text, text, numeric, numeric, boolean) to authenticated;
