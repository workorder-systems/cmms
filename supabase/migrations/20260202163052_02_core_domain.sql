-- SPDX-License-Identifier: AGPL-3.0-or-later

-- ============================================================================
-- Core Domain Tables
-- ============================================================================

create table app.tenants (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null,
  slug text not null,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint tenants_slug_unique unique (slug),
  constraint tenants_slug_format_check check (
    slug ~ '^[a-z0-9_-]+$' 
    and length(slug) >= 2 
    and length(slug) <= 63
  ),
  constraint tenants_name_length_check check (
    length(name) >= 1 
    and length(name) <= 255
  )
);

comment on table app.tenants is 'Multi-tenant workspaces. Each tenant is a separate organization with isolated data. Tenant isolation is enforced via RLS policies that check membership in app.tenant_memberships.';
comment on column app.tenants.name is 'Human-readable tenant name (1-255 characters).';
comment on column app.tenants.slug is 'URL-friendly tenant identifier (2-63 characters, lowercase alphanumeric with hyphens/underscores). Must be unique across all tenants.';

create trigger tenants_set_updated_at 
  before update on app.tenants 
  for each row 
  execute function util.set_updated_at();

alter table app.tenants enable row level security;

create table app.tenant_memberships (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  joined_at timestamptz not null default pg_catalog.now(),
  constraint tenant_memberships_user_tenant_unique unique (user_id, tenant_id)
);

comment on table app.tenant_memberships is 'User memberships to tenants. Establishes which users belong to which tenants, enabling multi-tenancy. CRITICAL: The composite unique constraint on (user_id, tenant_id) automatically creates a composite index that is REQUIRED for RLS performance.';
comment on column app.tenant_memberships.joined_at is 'Timestamp when user joined the tenant.';

create index tenant_memberships_tenant_idx 
  on app.tenant_memberships (tenant_id);

create index tenant_memberships_user_idx 
  on app.tenant_memberships (user_id);

create index tenant_memberships_joined_at_brin_idx 
  on app.tenant_memberships using brin (joined_at);

alter table app.tenant_memberships enable row level security;

-- ============================================================================
-- Profiles Table
-- ============================================================================

-- Helper function to build full name from first and last name
create function util.build_full_name(
  p_first_name text,
  p_last_name text
)
returns text
language sql
immutable
as $$
  select case
    when p_first_name is null and p_last_name is null then null
    when p_first_name is null then trim(p_last_name)
    when p_last_name is null then trim(p_first_name)
    else trim(p_first_name) || ' ' || trim(p_last_name)
  end;
$$;

comment on function util.build_full_name(text, text) is
  'Intelligently concatenates first_name and last_name into full_name. Handles nulls gracefully: returns single name if one is null, null if both are null, or properly formatted "First Last" if both exist. Trims whitespace.';

create table app.profiles (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  first_name text,
  last_name text,
  display_name_override text,
  is_name_overridden boolean not null default false,
  full_name text generated always as (
    case
      when display_name_override is not null then display_name_override
      else util.build_full_name(first_name, last_name)
    end
  ) stored,
  avatar_url text,
  synced_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint profiles_user_tenant_unique unique (user_id, tenant_id),
  constraint profiles_name_length_check check (
    (first_name is null or length(first_name) <= 100)
    and (last_name is null or length(last_name) <= 100)
    and (display_name_override is null or length(display_name_override) <= 200)
  )
);

comment on table app.profiles is 'User profiles with display information, scoped to a tenant. One profile per user per tenant. Preserves historical user names even if user leaves tenant. Automatically created via trigger on tenant_memberships insert. Contains user metadata that is accessible via RLS policies.';
comment on column app.profiles.user_id is 'References auth.users(id) - the user this profile belongs to.';
comment on column app.profiles.tenant_id is 'References app.tenants(id) - the tenant this profile is scoped to.';
comment on column app.profiles.first_name is 'User first name from auth.users.raw_user_meta_data. Synced automatically on tenant membership.';
comment on column app.profiles.last_name is 'User last name from auth.users.raw_user_meta_data. Synced automatically on tenant membership.';
comment on column app.profiles.display_name_override is 'Optional manual override for display name (e.g., "John (Contractor)"). If set, takes precedence over computed full_name.';
comment on column app.profiles.is_name_overridden is 'True if display_name_override is set, preventing automatic sync from overwriting custom names.';
comment on column app.profiles.full_name is 'Computed full name: uses display_name_override if set, otherwise combines first_name and last_name. Stored generated column for performance.';
comment on column app.profiles.avatar_url is 'Optional avatar URL for user profile picture. Synced from auth.users.raw_user_meta_data.';
comment on column app.profiles.synced_at is 'Timestamp when profile was last synced from auth.users. Used to track sync freshness.';
comment on column app.profiles.is_active is 'True if user is currently a member of this tenant. Set to false when membership is removed, but profile is preserved for historical data.';

create index profiles_user_tenant_idx on app.profiles (user_id, tenant_id);
create index profiles_tenant_user_idx on app.profiles (tenant_id, user_id);

create trigger profiles_set_updated_at
  before update on app.profiles
  for each row
  execute function util.set_updated_at();

alter table app.profiles enable row level security;

-- Profile sync function
create function util.sync_profile_from_auth_user(
  p_user_id uuid,
  p_tenant_id uuid,
  p_force boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_meta jsonb;
  v_first_name text;
  v_last_name text;
  v_avatar_url text;
  v_profile_exists boolean;
  v_is_overridden boolean;
begin
  -- Get user metadata
  select raw_user_meta_data
  into v_user_meta
  from auth.users
  where id = p_user_id;
  
  if v_user_meta is null then
    return; -- User doesn't exist
  end if;
  
  -- Extract names (try multiple formats: snake_case and camelCase)
  v_first_name := coalesce(
    v_user_meta->>'first_name',
    v_user_meta->>'firstName'
  );
  v_last_name := coalesce(
    v_user_meta->>'last_name',
    v_user_meta->>'lastName'
  );
  v_avatar_url := coalesce(
    v_user_meta->>'avatar_url',
    v_user_meta->>'avatarUrl'
  );
  
  -- Check if profile exists and if name is overridden
  select exists(select 1 from app.profiles where user_id = p_user_id and tenant_id = p_tenant_id),
         coalesce((select is_name_overridden from app.profiles where user_id = p_user_id and tenant_id = p_tenant_id), false)
  into v_profile_exists, v_is_overridden;
  
  -- Only update names if not overridden (unless forced)
  if v_is_overridden and not p_force then
    v_first_name := null;
    v_last_name := null;
  end if;
  
  -- Upsert profile
  insert into app.profiles (user_id, tenant_id, first_name, last_name, avatar_url, synced_at, is_active)
  values (p_user_id, p_tenant_id, v_first_name, v_last_name, v_avatar_url, pg_catalog.now(), true)
  on conflict (user_id, tenant_id) do update
  set
    first_name = coalesce(excluded.first_name, app.profiles.first_name),
    last_name = coalesce(excluded.last_name, app.profiles.last_name),
    avatar_url = coalesce(excluded.avatar_url, app.profiles.avatar_url),
    synced_at = pg_catalog.now(),
    is_active = true,
    updated_at = pg_catalog.now();
end;
$$;

comment on function util.sync_profile_from_auth_user(uuid, uuid, boolean) is
  'Syncs profile data from auth.users.raw_user_meta_data. Reads first_name, last_name, and avatar_url (handles both snake_case and camelCase). Only updates names if is_name_overridden is false (unless p_force = true). Sets synced_at and is_active = true. Uses SECURITY DEFINER to access auth.users.';

revoke all on function util.sync_profile_from_auth_user(uuid, uuid, boolean) from public;
grant execute on function util.sync_profile_from_auth_user(uuid, uuid, boolean) to postgres;

-- Trigger function to auto-create profile on tenant membership
create function util.handle_new_tenant_member_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform util.sync_profile_from_auth_user(new.user_id, new.tenant_id);
  return new;
end;
$$;

comment on function util.handle_new_tenant_member_profile() is
  'Trigger function that automatically creates or updates a tenant-scoped profile when a new user joins a tenant. Calls sync_profile_from_auth_user to sync data from auth.users.';

revoke all on function util.handle_new_tenant_member_profile() from public;
grant execute on function util.handle_new_tenant_member_profile() to postgres;

-- Auto-create profile on tenant membership
create trigger on_tenant_membership_created
  after insert on app.tenant_memberships
  for each row
  execute function util.handle_new_tenant_member_profile();

comment on trigger on_tenant_membership_created on app.tenant_memberships is
  'Automatically creates or updates a tenant-scoped profile when a new user joins a tenant. Syncs first_name, last_name, and avatar_url from auth.users.raw_user_meta_data.';

create table app.locations (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  name text not null,
  description text,
  parent_location_id uuid references app.locations(id) on delete set null,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint locations_name_length_check check (
    length(name) >= 1 
    and length(name) <= 255
  )
);

comment on table app.locations is 'Physical locations with hierarchical support via parent_location_id. Each location belongs to exactly one tenant. Circular references are prevented via validation triggers.';
comment on column app.locations.name is 'Display name (e.g., "Building A", "Warehouse 3", "Room 201"). Must be 1-255 characters.';
comment on column app.locations.parent_location_id is 'Optional reference to parent location (enables tree structure). Must belong to same tenant (validated), validated to prevent cycles (max depth 1000).';

create index locations_tenant_idx 
  on app.locations (tenant_id);

create index locations_parent_idx 
  on app.locations (parent_location_id) 
  where parent_location_id is not null;

create index locations_parent_full_idx 
  on app.locations (parent_location_id);

create index locations_hierarchy_idx 
  on app.locations (tenant_id, parent_location_id, name);

alter table app.locations enable row level security;

create table app.departments (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  name text not null,
  description text,
  code text,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint departments_name_length_check check (
    length(name) >= 1 
    and length(name) <= 255
  ),
  constraint departments_code_format_check check (
    code is null 
    or (length(code) >= 1 
        and length(code) <= 20
        and code ~ '^[A-Z0-9_]+$')
  )
);

comment on table app.departments is 'Organizational departments within tenants. Each department belongs to exactly one tenant.';
comment on column app.departments.name is 'Display name (e.g., "Engineering", "Maintenance", "Facilities"). Must be 1-255 characters.';
comment on column app.departments.code is 'Optional short code for the department (e.g., "ENG", "MAINT", "FACIL"). Must be 1-20 characters, uppercase alphanumeric with underscores only. Unique per tenant.';

create index departments_tenant_idx 
  on app.departments (tenant_id);

create unique index departments_tenant_code_unique_idx 
  on app.departments (tenant_id, code) 
  where code is not null;

create trigger departments_set_updated_at 
  before update on app.departments 
  for each row 
  execute function util.set_updated_at();

alter table app.departments enable row level security;

create table app.assets (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  name text not null,
  description text,
  asset_number text,
  location_id uuid references app.locations(id) on delete set null,
  department_id uuid references app.departments(id) on delete set null,
  status text not null default 'active',
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint assets_name_length_check check (
    length(name) >= 1 
    and length(name) <= 255
  ),
  constraint assets_asset_number_length_check check (
    asset_number is null 
    or (length(asset_number) >= 1 
        and length(asset_number) <= 100)
  ),
  constraint assets_status_format_check check (
    status ~ '^[a-z0-9_]+$' 
    and length(status) >= 1 
    and length(status) <= 50
  )
);

comment on table app.assets is 'Physical assets that require maintenance. Each asset belongs to exactly one tenant and can be associated with a location and/or department. Assets have a status that is validated against workflow catalogs.';
comment on column app.assets.name is 'Display name (e.g., "HVAC Unit #5", "Conveyor Belt A"). Must be 1-255 characters.';
comment on column app.assets.asset_number is 'Unique identifier per tenant (optional). Used for asset tracking and reporting. Must be 1-100 characters if provided.';
comment on column app.assets.status is 'Asset operational status (validated against workflow catalogs). Default is "active".';
comment on column app.assets.location_id is 'Reference to location where asset is located. Must belong to same tenant (validated).';
comment on column app.assets.department_id is 'Reference to department that owns or manages this asset. Must belong to same tenant (validated).';

create index assets_tenant_location_idx 
  on app.assets (tenant_id, location_id);

create index assets_tenant_department_idx 
  on app.assets (tenant_id, department_id);

create unique index assets_tenant_asset_number_unique_idx 
  on app.assets (tenant_id, asset_number) 
  where asset_number is not null;

create index assets_status_idx 
  on app.assets (status);

create index assets_location_status_idx 
  on app.assets (tenant_id, location_id, status);

create index assets_listing_idx 
  on app.assets (tenant_id, status, updated_at desc);

create index assets_active_idx 
  on app.assets (tenant_id, location_id, name) 
  where status = 'active';

create index assets_covering_list_idx 
  on app.assets (tenant_id, location_id, status) 
  include (id, name, asset_number);

create index assets_fts_idx 
  on app.assets using gin (
    to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
  );

create trigger assets_set_updated_at 
  before update on app.assets 
  for each row 
  execute function util.set_updated_at();

alter table app.assets enable row level security;

create table app.work_orders (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'draft',
  priority text not null default 'medium',
  assigned_to uuid references auth.users(id) on delete set null,
  location_id uuid references app.locations(id) on delete set null,
  asset_id uuid references app.assets(id) on delete set null,
  due_date timestamptz,
  completed_at timestamptz,
  completed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint work_orders_completed_consistency check (
    (completed_by is null) = (completed_at is null)
  ),
  constraint work_orders_title_length_check check (
    length(title) >= 1 
    and length(title) <= 500
  ),
  constraint work_orders_status_format_check check (
    status ~ '^[a-z0-9_]+$' 
    and length(status) >= 1 
    and length(status) <= 50
  ),
  constraint work_orders_priority_format_check check (
    priority ~ '^[a-z0-9_]+$' 
    and length(priority) >= 1 
    and length(priority) <= 50
  )
);

comment on table app.work_orders is 'Work orders represent maintenance requests and tasks. Each work order belongs to exactly one tenant and can be associated with an asset and/or location. Work orders follow a status workflow defined in cfg.status_catalogs and cfg.status_transitions.';
comment on column app.work_orders.title is 'Short title describing the work order (1-500 characters).';
comment on column app.work_orders.status is 'Work order status (validated against workflow catalogs). Default is "draft".';
comment on column app.work_orders.priority is 'Work order priority level (validated against priority catalogs). Default is "medium".';
comment on column app.work_orders.completed_at is 'Timestamp when work order was marked as completed. Must be set/unset together with completed_by.';
comment on column app.work_orders.completed_by is 'User who completed the work order. Must be set/unset together with completed_at.';

create index work_orders_tenant_status_updated_idx 
  on app.work_orders (tenant_id, status, updated_at desc);

create index work_orders_tenant_assigned_status_idx 
  on app.work_orders (tenant_id, assigned_to, status) 
  where assigned_to is not null;

create index work_orders_tenant_due_date_idx 
  on app.work_orders (tenant_id, due_date nulls last);

create index work_orders_assigned_to_idx 
  on app.work_orders (assigned_to) 
  where assigned_to is not null;

create trigger work_orders_set_updated_at 
  before update on app.work_orders 
  for each row 
  execute function util.set_updated_at();

alter table app.work_orders enable row level security;

-- ============================================================================
-- Validation Functions
-- ============================================================================

create function util.validate_tenant_match(
  p_tenant_id uuid,
  p_referenced_tenant_id uuid,
  p_entity_type text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_referenced_tenant_id is not null and p_tenant_id != p_referenced_tenant_id then
    raise exception using
      message = format('%s must belong to the same tenant', p_entity_type),
      errcode = '23503';
  end if;
end;
$$;

comment on function util.validate_tenant_match(uuid, uuid, text) is 'Ensures cross-table tenant consistency. Validates that a referenced entity belongs to the same tenant as the referencing entity.';

revoke all on function util.validate_tenant_match(uuid, uuid, text) from public;
grant execute on function util.validate_tenant_match(uuid, uuid, text) to postgres;

create function util.validate_location_parent_tenant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_parent_tenant_id uuid;
begin
  if new.parent_location_id is not null then
    select tenant_id into v_parent_tenant_id 
    from app.locations 
    where id = new.parent_location_id;
    
    perform util.validate_tenant_match(
      new.tenant_id, 
      v_parent_tenant_id, 
      'Parent location'
    );
  end if;
  
  return new;
end;
$$;

comment on function util.validate_location_parent_tenant() is 'Trigger function that validates parent location belongs to same tenant.';

revoke all on function util.validate_location_parent_tenant() from public;
grant execute on function util.validate_location_parent_tenant() to postgres;

create function util.validate_location_circular_reference()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_has_cycle boolean;
  v_max_depth integer := 1000;
begin
  if new.parent_location_id is null or new.parent_location_id = new.id then
    return new;
  end if;

  with recursive location_hierarchy as (
    select 
      id,
      parent_location_id,
      1 as depth
    from app.locations
    where id = new.parent_location_id
    
    union all
    
    select 
      l.id,
      l.parent_location_id,
      lh.depth + 1
    from app.locations l
    inner join location_hierarchy lh on l.id = lh.parent_location_id
    where lh.depth < v_max_depth
      and l.id != new.id
  )
  select exists (
    select 1 
    from location_hierarchy 
    where id = new.id or depth >= v_max_depth
  ) into v_has_cycle;

  if v_has_cycle then
    raise exception using
      message = format('Circular reference detected: location cannot be its own ancestor, or hierarchy too deep (max %s levels)', v_max_depth),
      errcode = '23503';
  end if;

  return new;
end;
$$;

comment on function util.validate_location_circular_reference() is 'Trigger function that prevents circular references in location hierarchy using recursive CTE. Detects if a location would become its own ancestor, or if hierarchy exceeds max depth (1000 levels).';

revoke all on function util.validate_location_circular_reference() from public;
grant execute on function util.validate_location_circular_reference() to postgres;

create function util.validate_asset_location_tenant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_location_tenant_id uuid;
begin
  if new.location_id is not null then
    select tenant_id into v_location_tenant_id 
    from app.locations 
    where id = new.location_id;
    
    perform util.validate_tenant_match(
      new.tenant_id, 
      v_location_tenant_id, 
      'Location'
    );
  end if;
  
  return new;
end;
$$;

comment on function util.validate_asset_location_tenant() is 'Trigger function that validates asset location belongs to same tenant.';

revoke all on function util.validate_asset_location_tenant() from public;
grant execute on function util.validate_asset_location_tenant() to postgres;

create function util.validate_asset_department_tenant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_department_tenant_id uuid;
begin
  if new.department_id is not null then
    select tenant_id into v_department_tenant_id 
    from app.departments 
    where id = new.department_id;
    
    perform util.validate_tenant_match(
      new.tenant_id, 
      v_department_tenant_id, 
      'Department'
    );
  end if;
  
  return new;
end;
$$;

comment on function util.validate_asset_department_tenant() is 'Trigger function that validates asset department belongs to same tenant.';

revoke all on function util.validate_asset_department_tenant() from public;
grant execute on function util.validate_asset_department_tenant() to postgres;

create function util.validate_work_order_asset_tenant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_asset_tenant_id uuid;
begin
  if new.asset_id is not null then
    select tenant_id into v_asset_tenant_id 
    from app.assets 
    where id = new.asset_id;
    
    perform util.validate_tenant_match(
      new.tenant_id, 
      v_asset_tenant_id, 
      'Asset'
    );
  end if;
  
  return new;
end;
$$;

comment on function util.validate_work_order_asset_tenant() is 'Trigger function that validates work order asset belongs to same tenant.';

revoke all on function util.validate_work_order_asset_tenant() from public;
grant execute on function util.validate_work_order_asset_tenant() to postgres;

create function util.validate_work_order_location_tenant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_location_tenant_id uuid;
begin
  if new.location_id is not null then
    select tenant_id into v_location_tenant_id 
    from app.locations 
    where id = new.location_id;
    
    perform util.validate_tenant_match(
      new.tenant_id, 
      v_location_tenant_id, 
      'Location'
    );
  end if;
  
  return new;
end;
$$;

comment on function util.validate_work_order_location_tenant() is 'Trigger function that validates work order location belongs to same tenant.';

revoke all on function util.validate_work_order_location_tenant() from public;
grant execute on function util.validate_work_order_location_tenant() to postgres;

-- ============================================================================
-- Validation Triggers
-- ============================================================================

create trigger locations_set_updated_at 
  before update on app.locations 
  for each row 
  execute function util.set_updated_at();

create trigger locations_validate_parent_tenant 
  before insert or update on app.locations 
  for each row 
  execute function util.validate_location_parent_tenant();

create trigger locations_validate_circular_reference 
  before insert or update on app.locations 
  for each row 
  execute function util.validate_location_circular_reference();

create trigger assets_validate_location_tenant 
  before insert or update on app.assets 
  for each row 
  execute function util.validate_asset_location_tenant();

create trigger assets_validate_department_tenant 
  before insert or update on app.assets 
  for each row 
  execute function util.validate_asset_department_tenant();

create trigger work_orders_validate_asset_tenant 
  before insert or update on app.work_orders 
  for each row 
  execute function util.validate_work_order_asset_tenant();

create trigger work_orders_validate_location_tenant 
  before insert or update on app.work_orders 
  for each row 
  execute function util.validate_work_order_location_tenant();

-- ============================================================================
-- Authorization Helper Functions (Membership Checks)
-- ============================================================================

create function authz.is_tenant_member(
  p_user_id uuid,
  p_tenant_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  -- Handle NULL user_id (anon users) gracefully - return false
  if p_user_id is null then
    return false;
  end if;
  
  return exists (
    select 1 
    from app.tenant_memberships
    where user_id = p_user_id 
      and tenant_id = p_tenant_id
  );
end;
$$;

comment on function authz.is_tenant_member(uuid, uuid) is 
  'Checks if a user is a member of a tenant. Optimized single indexed lookup using (user_id, tenant_id) composite index. Returns true if membership exists, false otherwise. Used by RLS policies and authorization checks. Security implications: Uses security definer to access tenant_memberships table.';

revoke all on function authz.is_tenant_member(uuid, uuid) from public;
grant execute on function authz.is_tenant_member(uuid, uuid) to authenticated;
grant execute on function authz.is_tenant_member(uuid, uuid) to anon;

create function authz.is_current_user_tenant_member(
  p_tenant_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return authz.is_tenant_member(auth.uid(), p_tenant_id);
end;
$$;

comment on function authz.is_current_user_tenant_member(uuid) is 
  'Checks if the current authenticated user is a member of the specified tenant. Uses auth.uid() to get current user ID. Returns true if membership exists, false otherwise. Used by RLS policies for convenience.';

revoke all on function authz.is_current_user_tenant_member(uuid) from public;
grant execute on function authz.is_current_user_tenant_member(uuid) to authenticated;
grant execute on function authz.is_current_user_tenant_member(uuid) to anon;

-- ============================================================================
-- Row Level Security Policies
-- ============================================================================

-- Tenants: Users can see tenants they are members of
create policy tenants_select_for_members 
  on app.tenants 
  for select 
  to authenticated 
  using (authz.is_current_user_tenant_member(id));

comment on policy tenants_select_for_members on app.tenants is 
  'Allows authenticated users to see tenants they are members of. Uses authz.is_current_user_tenant_member() function to check membership.';

-- Tenants: Anon users get no results (empty set)
create policy tenants_select_anon
  on app.tenants
  for select
  to anon
  using (false);

comment on policy tenants_select_anon on app.tenants is
  'Prevents anonymous users from seeing any tenants. Returns empty result set.';

-- Tenant Memberships: Users can see their own memberships
create policy tenant_memberships_select_combined 
  on app.tenant_memberships 
  for select 
  to authenticated 
  using (user_id = (select auth.uid()));

comment on policy tenant_memberships_select_combined on app.tenant_memberships is 
  'Allows users to see their own tenant memberships. This enables RLS policies on other tables to query tenant_memberships in subqueries without permission errors. Users can only see their own membership records.';

create policy tenant_memberships_select_anon
  on app.tenant_memberships
  for select
  to anon
  using (false);

comment on policy tenant_memberships_select_anon on app.tenant_memberships is 
  'Prevents anonymous users from seeing any tenant memberships.';

-- Profiles: Users can see profiles in tenants they belong to
create policy profiles_select_tenant
  on app.profiles
  for select
  to authenticated
  using (authz.is_current_user_tenant_member(tenant_id));

comment on policy profiles_select_tenant on app.profiles is
  'Allows authenticated users to see profiles in tenants they currently belong to. Historical profiles (is_active = false) are still accessible for historical records.';

create policy profiles_select_anon
  on app.profiles
  for select
  to anon
  using (false);

comment on policy profiles_select_anon on app.profiles is
  'Prevents anonymous users from seeing any profiles. Returns empty result set.';

-- Locations: Users can access locations in tenants they belong to
create policy locations_select_tenant 
  on app.locations 
  for select 
  to authenticated 
  using (authz.is_current_user_tenant_member(tenant_id));

create policy locations_insert_tenant 
  on app.locations 
  for insert 
  to authenticated 
  with check (authz.is_current_user_tenant_member(tenant_id));

create policy locations_update_tenant 
  on app.locations 
  for update 
  to authenticated 
  using (authz.is_current_user_tenant_member(tenant_id))
  with check (authz.is_current_user_tenant_member(tenant_id));

create policy locations_delete_tenant 
  on app.locations 
  for delete 
  to authenticated 
  using (authz.is_current_user_tenant_member(tenant_id));

comment on policy locations_select_tenant on app.locations is 
  'Allows authenticated users to select locations in tenants they are members of.';
comment on policy locations_insert_tenant on app.locations is 
  'Allows authenticated users to insert locations in tenants they are members of.';
comment on policy locations_update_tenant on app.locations is 
  'Allows authenticated users to update locations in tenants they are members of.';
comment on policy locations_delete_tenant on app.locations is 
  'Allows authenticated users to delete locations in tenants they are members of.';

-- Departments: Users can access departments in tenants they belong to
create policy departments_select_tenant 
  on app.departments 
  for select 
  to authenticated 
  using (authz.is_current_user_tenant_member(tenant_id));

create policy departments_insert_tenant 
  on app.departments 
  for insert 
  to authenticated 
  with check (authz.is_current_user_tenant_member(tenant_id));

create policy departments_update_tenant 
  on app.departments 
  for update 
  to authenticated 
  using (authz.is_current_user_tenant_member(tenant_id))
  with check (authz.is_current_user_tenant_member(tenant_id));

create policy departments_delete_tenant 
  on app.departments 
  for delete 
  to authenticated 
  using (authz.is_current_user_tenant_member(tenant_id));

comment on policy departments_select_tenant on app.departments is 
  'Allows authenticated users to select departments in tenants they are members of.';
comment on policy departments_insert_tenant on app.departments is 
  'Allows authenticated users to insert departments in tenants they are members of.';
comment on policy departments_update_tenant on app.departments is 
  'Allows authenticated users to update departments in tenants they are members of.';
comment on policy departments_delete_tenant on app.departments is 
  'Allows authenticated users to delete departments in tenants they are members of.';

-- Assets: Users can access assets in tenants they belong to
create policy assets_select_tenant 
  on app.assets 
  for select 
  to authenticated 
  using (authz.is_current_user_tenant_member(tenant_id));

create policy assets_insert_tenant 
  on app.assets 
  for insert 
  to authenticated 
  with check (authz.is_current_user_tenant_member(tenant_id));

create policy assets_update_tenant 
  on app.assets 
  for update 
  to authenticated 
  using (authz.is_current_user_tenant_member(tenant_id))
  with check (authz.is_current_user_tenant_member(tenant_id));

create policy assets_delete_tenant 
  on app.assets 
  for delete 
  to authenticated 
  using (authz.is_current_user_tenant_member(tenant_id));

comment on policy assets_select_tenant on app.assets is 
  'Allows authenticated users to select assets in tenants they are members of.';
comment on policy assets_insert_tenant on app.assets is 
  'Allows authenticated users to insert assets in tenants they are members of.';
comment on policy assets_update_tenant on app.assets is 
  'Allows authenticated users to update assets in tenants they are members of.';
comment on policy assets_delete_tenant on app.assets is 
  'Allows authenticated users to delete assets in tenants they are members of.';

-- Work Orders: Users can access work orders in tenants they belong to
create policy work_orders_select_tenant 
  on app.work_orders 
  for select 
  to authenticated 
  using (authz.is_current_user_tenant_member(tenant_id));

create policy work_orders_insert_tenant 
  on app.work_orders 
  for insert 
  to authenticated 
  with check (authz.is_current_user_tenant_member(tenant_id));

create policy work_orders_update_tenant 
  on app.work_orders 
  for update 
  to authenticated 
  using (authz.is_current_user_tenant_member(tenant_id))
  with check (authz.is_current_user_tenant_member(tenant_id));

create policy work_orders_delete_tenant 
  on app.work_orders 
  for delete 
  to authenticated 
  using (authz.is_current_user_tenant_member(tenant_id));

comment on policy work_orders_select_tenant on app.work_orders is 
  'Allows authenticated users to select work orders in tenants they are members of.';
comment on policy work_orders_insert_tenant on app.work_orders is 
  'Allows authenticated users to insert work orders in tenants they are members of.';
comment on policy work_orders_update_tenant on app.work_orders is 
  'Allows authenticated users to update work orders in tenants they are members of.';
comment on policy work_orders_delete_tenant on app.work_orders is 
  'Allows authenticated users to delete work orders in tenants they are members of.';

-- ============================================================================
-- Grants for SECURITY INVOKER Views
-- ============================================================================
-- These grants are required for SECURITY INVOKER views to function properly.
-- PostgreSQL requires SELECT/UPDATE/DELETE permissions on underlying tables
-- before RLS policies can be evaluated. RLS policies enforce security.

grant select on app.tenants to authenticated;
grant select on app.tenants to anon;

grant select on app.tenant_memberships to authenticated;
grant select on app.tenant_memberships to anon;

grant select on app.profiles to authenticated;
grant select on app.profiles to anon;

grant select on app.locations to authenticated;
grant select on app.locations to anon;

grant select on app.departments to authenticated;
grant select on app.departments to anon;

grant select on app.assets to authenticated;
grant select on app.assets to anon;

grant select on app.work_orders to authenticated;
grant select on app.work_orders to anon;

grant update on app.locations to authenticated;
grant delete on app.locations to authenticated;

grant update on app.departments to authenticated;
grant delete on app.departments to authenticated;

grant update on app.assets to authenticated;
grant delete on app.assets to authenticated;

grant update on app.work_orders to authenticated;
grant delete on app.work_orders to authenticated;

-- ============================================================================
-- Force RLS on Core Tables
-- ============================================================================

alter table app.tenants force row level security;
alter table app.tenant_memberships force row level security;
alter table app.profiles force row level security;
alter table app.locations force row level security;
alter table app.departments force row level security;
alter table app.assets force row level security;
alter table app.work_orders force row level security;
