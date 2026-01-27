-- SPDX-License-Identifier: AGPL-3.0-or-later
create table if not exists cfg.permissions (
  id uuid primary key default extensions.gen_random_uuid(),
  key text unique not null,
  name text not null,
  category text not null,
  description text,
  created_at timestamptz not null default pg_catalog.now(),
  constraint permissions_key_format_check check (
    key ~ '^[a-z0-9_.]+$' 
    and length(key) >= 3 
    and length(key) <= 100
  )
);

comment on table cfg.permissions is 
  'Global immutable permission catalog. Same permissions available to all tenants. Permissions follow <resource>.<action>[.<qualifier>] pattern (e.g., workorder.create, workorder.complete.assigned). Tenants cannot modify this catalog, but can assign permissions to their custom roles.';

comment on column cfg.permissions.key is 
  'Permission key following <resource>.<action>[.<qualifier>] pattern. Unique across all tenants. Examples: workorder.create, asset.view, tenant.admin.';

create index if not exists permissions_key_idx 
  on cfg.permissions (key);

create index if not exists permissions_category_idx 
  on cfg.permissions (category);

create index if not exists permissions_category_key_idx 
  on cfg.permissions (category, key);

alter table cfg.permissions enable row level security;

create policy permissions_select_all 
  on cfg.permissions 
  for select 
  to authenticated 
  using (true);

insert into cfg.permissions (key, name, category, description) values
  ('workorder.create', 'Create Work Orders', 'workorder', 'Allows creating new work orders'),
  ('workorder.view', 'View Work Orders', 'workorder', 'Allows viewing work orders'),
  ('workorder.edit', 'Edit Work Orders', 'workorder', 'Allows editing work order details'),
  ('workorder.delete', 'Delete Work Orders', 'workorder', 'Allows deleting work orders'),
  ('workorder.assign', 'Assign Work Orders', 'workorder', 'Allows assigning work orders to users'),
  ('workorder.complete.assigned', 'Complete Assigned Work Orders', 'workorder', 'Allows completing work orders assigned to the user'),
  ('workorder.complete.any', 'Complete Any Work Order', 'workorder', 'Allows completing any work order regardless of assignment'),
  ('workorder.cancel', 'Cancel Work Orders', 'workorder', 'Allows cancelling work orders')
on conflict (key) do nothing;

insert into cfg.permissions (key, name, category, description) values
  ('asset.create', 'Create Assets', 'asset', 'Allows creating new assets'),
  ('asset.view', 'View Assets', 'asset', 'Allows viewing assets'),
  ('asset.edit', 'Edit Assets', 'asset', 'Allows editing asset details'),
  ('asset.delete', 'Delete Assets', 'asset', 'Allows deleting assets')
on conflict (key) do nothing;

insert into cfg.permissions (key, name, category, description) values
  ('location.create', 'Create Locations', 'location', 'Allows creating new locations'),
  ('location.view', 'View Locations', 'location', 'Allows viewing locations'),
  ('location.edit', 'Edit Locations', 'location', 'Allows editing location details'),
  ('location.delete', 'Delete Locations', 'location', 'Allows deleting locations')
on conflict (key) do nothing;

insert into cfg.permissions (key, name, category, description) values
  ('department.create', 'Create Departments', 'department', 'Allows creating new departments'),
  ('department.view', 'View Departments', 'department', 'Allows viewing departments'),
  ('department.edit', 'Edit Departments', 'department', 'Allows editing department details'),
  ('department.delete', 'Delete Departments', 'department', 'Allows deleting departments')
on conflict (key) do nothing;

insert into cfg.permissions (key, name, category, description) values
  ('tenant.admin', 'Tenant Administration', 'tenant', 'Full administrative access to tenant settings, roles, and members'),
  ('tenant.member.invite', 'Invite Members', 'tenant', 'Allows inviting new members to the tenant'),
  ('tenant.member.remove', 'Remove Members', 'tenant', 'Allows removing members from the tenant'),
  ('tenant.role.manage', 'Manage Roles', 'tenant', 'Allows creating, editing, and assigning tenant roles')
on conflict (key) do nothing;

insert into cfg.permissions (key, name, category, description) values
  ('inventory.stock.view', 'View Stock', 'inventory', 'Allows viewing inventory stock levels'),
  ('inventory.stock.move', 'Move Stock', 'inventory', 'Allows moving inventory between locations'),
  ('inventory.stock.adjust', 'Adjust Stock', 'inventory', 'Allows adjusting inventory quantities')
on conflict (key) do nothing;


create table if not exists cfg.tenant_roles (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  key text not null,
  name text not null,
  is_default boolean not null default false,
  is_system boolean not null default false,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint tenant_roles_tenant_key_unique unique (tenant_id, key),
  constraint tenant_roles_key_format_check check (
    key ~ '^[a-z0-9_]+$' 
    and length(key) >= 1 
    and length(key) <= 50
  )
);

comment on table cfg.tenant_roles is 
  'Tenant-defined roles. Each tenant can create custom roles and assign permissions from the global permissions catalog. System roles (admin, member) are created automatically and cannot be deleted.';

comment on column cfg.tenant_roles.key is 
  'Role key (e.g., admin, member, technician). Unique within tenant. Used for programmatic role references.';

comment on column cfg.tenant_roles.is_default is 
  'If true, this role is automatically assigned to new members when they join the tenant.';

comment on column cfg.tenant_roles.is_system is 
  'If true, role cannot be deleted (e.g., admin, member roles created automatically).';

create index if not exists tenant_roles_tenant_idx 
  on cfg.tenant_roles (tenant_id);

create trigger tenant_roles_set_updated_at 
  before update on cfg.tenant_roles 
  for each row 
  execute function util.set_updated_at();

alter table cfg.tenant_roles enable row level security;

create policy tenant_roles_select_tenant 
  on cfg.tenant_roles 
  for select 
  to authenticated 
  using (tenant_id = authz.get_current_tenant_id());


create table if not exists cfg.tenant_role_permissions (
  id bigint generated always as identity primary key,
  tenant_role_id uuid not null references cfg.tenant_roles(id) on delete cascade,
  permission_id uuid not null references cfg.permissions(id) on delete cascade,
  granted_at timestamptz not null default pg_catalog.now(),
  constraint tenant_role_permissions_unique unique (tenant_role_id, permission_id)
);

comment on table cfg.tenant_role_permissions is 
  'Maps tenant roles to permissions. Defines which permissions each role has. Users inherit permissions through their role assignments.';

create index if not exists tenant_role_permissions_role_idx 
  on cfg.tenant_role_permissions (tenant_role_id);

create index if not exists tenant_role_permissions_permission_idx 
  on cfg.tenant_role_permissions (permission_id);

create index if not exists tenant_role_permissions_permission_role_idx 
  on cfg.tenant_role_permissions (permission_id, tenant_role_id);

alter table cfg.tenant_role_permissions enable row level security;

create policy tenant_role_permissions_select_tenant 
  on cfg.tenant_role_permissions 
  for select 
  to authenticated 
  using (
    exists (
      select 1 
      from cfg.tenant_roles 
      where tenant_roles.id = tenant_role_permissions.tenant_role_id 
        and tenant_roles.tenant_id = authz.get_current_tenant_id()
    )
  );


create table if not exists app.user_tenant_roles (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  tenant_role_id uuid not null references cfg.tenant_roles(id) on delete cascade,
  assigned_at timestamptz not null default pg_catalog.now(),
  assigned_by uuid references auth.users(id) on delete set null,
  constraint user_tenant_roles_unique unique (user_id, tenant_id, tenant_role_id)
);

comment on table app.user_tenant_roles is 
  'User role assignments within tenants. Users can have multiple roles within a tenant. Roles determine which permissions the user has.';

comment on column app.user_tenant_roles.assigned_by is 
  'User who assigned this role (for audit trail). Null for system-assigned roles (e.g., default member role).';

create index if not exists user_tenant_roles_user_tenant_idx 
  on app.user_tenant_roles (user_id, tenant_id);

create index if not exists user_tenant_roles_role_idx 
  on app.user_tenant_roles (tenant_role_id);

create index if not exists user_tenant_roles_role_user_idx 
  on app.user_tenant_roles (tenant_role_id, user_id);

alter table app.user_tenant_roles enable row level security;

create policy user_tenant_roles_select_combined 
  on app.user_tenant_roles 
  for select 
  to authenticated 
  using (
    user_id = (select auth.uid()) 
    or tenant_id = authz.get_current_tenant_id()
  );


create table if not exists app.membership_scopes (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  scope_type text not null,
  scope_value uuid,
  granted_at timestamptz not null default pg_catalog.now(),
  constraint membership_scopes_unique unique (user_id, tenant_id, scope_type, scope_value),
  constraint membership_scopes_scope_type_format_check check (
    scope_type ~ '^[a-z0-9_]+$' 
    and length(scope_type) >= 1 
    and length(scope_type) <= 50
  )
);

comment on table app.membership_scopes is 
  'User scopes within tenants for Attribute-Based Access Control (ABAC). Tracks location access, department membership, contractor flags, etc. Enables fine-grained access control beyond role-based permissions.';

comment on column app.membership_scopes.scope_type is 
  'Type of scope: location (scope_value = location_id), department (scope_value = department_id), contractor (scope_value = null for boolean), etc.';

comment on column app.membership_scopes.scope_value is 
  'Scope value UUID (e.g., location_id, department_id). Null for boolean scopes (e.g., contractor flag).';

create index if not exists membership_scopes_user_tenant_idx 
  on app.membership_scopes (user_id, tenant_id);

create index if not exists membership_scopes_tenant_type_value_idx 
  on app.membership_scopes (tenant_id, scope_type, scope_value) 
  where scope_value is not null;

create index if not exists membership_scopes_tenant_type_boolean_idx 
  on app.membership_scopes (tenant_id, scope_type) 
  where scope_value is null;

create index if not exists membership_scopes_value_user_idx 
  on app.membership_scopes (scope_value, user_id) 
  where scope_value is not null;

alter table app.membership_scopes enable row level security;

create policy membership_scopes_select_combined 
  on app.membership_scopes 
  for select 
  to authenticated 
  using (
    user_id = (select auth.uid()) 
    or tenant_id = authz.get_current_tenant_id()
  );

create or replace view authz.v_user_tenants as
select distinct 
  tenant_id, 
  user_id 
from app.tenant_memberships 
where user_id = (select auth.uid());

comment on view authz.v_user_tenants is 
  'Optimized view for RLS policy membership checks. Returns distinct tenant IDs for the current authenticated user. Used in EXISTS patterns for fast membership verification.';

create or replace function authz.is_tenant_member(
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

create or replace function authz.is_current_user_tenant_member(
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

create or replace function authz.require_tenant_context()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tenant_id uuid;
begin
  v_tenant_id := authz.get_current_tenant_id();
  if v_tenant_id is null then
    raise exception using
      message = 'Tenant context not set. RPC functions must set app.current_tenant_id before accessing tenant data.',
      errcode = 'P0001';
  end if;
  return v_tenant_id;
end;
$$;

comment on function authz.require_tenant_context() is 
  'Returns current tenant ID from session context, raising exception if not set. For RPC convenience only, not used for security enforcement. RLS policies must derive tenant access via auth.uid() and membership tables. Side effects: Raises exception if tenant context not set.';

revoke all on function authz.require_tenant_context() from public;
grant execute on function authz.require_tenant_context() to authenticated;

create or replace function authz.set_tenant_context(
  p_tenant_id uuid
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception using
      message = 'Unauthorized: User must be authenticated',
      errcode = '28000';
  end if;
  
  if not authz.is_tenant_member(v_user_id, p_tenant_id) then
    raise exception using
      message = 'Unauthorized: User is not a member of this tenant',
      errcode = '42501';
  end if;
  
  perform pg_catalog.set_config('app.current_tenant_id', p_tenant_id::text, true);
end;
$$;

comment on function authz.set_tenant_context(uuid) is 
  'Validates user membership in tenant and sets session context variable. For RPC convenience only - security must not depend on this. Validates membership before setting context. Side effects: Sets app.current_tenant_id session variable. Security implications: Requires user to be authenticated and member of the tenant.';

revoke all on function authz.set_tenant_context(uuid) from public;
grant execute on function authz.set_tenant_context(uuid) to authenticated;

create or replace function authz.validate_authenticated()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception using
      message = 'Unauthorized: User must be authenticated',
      errcode = '28000';
  end if;
  return v_user_id;
end;
$$;

comment on function authz.validate_authenticated() is 
  'Validates that user is authenticated and returns user ID. Uses auth.uid() which is always available in Supabase RLS context. Raises exception if user not authenticated. Used by RPC functions for authorization checks.';

revoke all on function authz.validate_authenticated() from public;
grant execute on function authz.validate_authenticated() to authenticated;

create or replace function authz.get_user_tenant_roles(
  p_user_id uuid,
  p_tenant_id uuid
)
returns uuid[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_role_ids uuid[];
begin
  if not authz.is_tenant_member(p_user_id, p_tenant_id) then
    return array[]::uuid[];
  end if;

  select array_agg(tenant_role_id)
  into v_role_ids
  from app.user_tenant_roles
  where user_tenant_roles.user_id = p_user_id
    and user_tenant_roles.tenant_id = p_tenant_id;

  return coalesce(v_role_ids, array[]::uuid[]);
end;
$$;

comment on function authz.get_user_tenant_roles(uuid, uuid) is 
  'Returns array of role IDs assigned to user in tenant. Returns empty array if user is not a tenant member or has no roles. Includes tenant membership check. Used by permission check functions.';

revoke all on function authz.get_user_tenant_roles(uuid, uuid) from public;
grant execute on function authz.get_user_tenant_roles(uuid, uuid) to authenticated;

create or replace function authz.has_permission(
  p_user_id uuid,
  p_tenant_id uuid,
  p_permission_key text
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_has_permission boolean;
begin
  if not authz.is_tenant_member(p_user_id, p_tenant_id) then
    return false;
  end if;

  select exists (
    select 1
    from app.user_tenant_roles utr
    join cfg.tenant_role_permissions trp on utr.tenant_role_id = trp.tenant_role_id
    join cfg.permissions p on trp.permission_id = p.id
    where utr.user_id = p_user_id
      and utr.tenant_id = p_tenant_id
      and p.key = p_permission_key
  ) into v_has_permission;

  return coalesce(v_has_permission, false);
end;
$$;

comment on function authz.has_permission(uuid, uuid, text) is 
  'Checks if user has a specific permission in tenant. Optimized single query with membership check. Returns true if user has the permission through any of their roles, false otherwise. Used by RPC functions for authorization checks.';

revoke all on function authz.has_permission(uuid, uuid, text) from public;
grant execute on function authz.has_permission(uuid, uuid, text) to authenticated;

create or replace function authz.has_any_permission(
  p_user_id uuid,
  p_tenant_id uuid,
  p_permission_keys text[]
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_has_any boolean;
begin
  if not authz.is_tenant_member(p_user_id, p_tenant_id) then
    return false;
  end if;

  select exists (
    select 1
    from app.user_tenant_roles utr
    join cfg.tenant_role_permissions trp on utr.tenant_role_id = trp.tenant_role_id
    join cfg.permissions p on trp.permission_id = p.id
    where utr.user_id = p_user_id
      and utr.tenant_id = p_tenant_id
      and p.key = any(p_permission_keys)
  ) into v_has_any;

  return coalesce(v_has_any, false);
end;
$$;

comment on function authz.has_any_permission(uuid, uuid, text[]) is 
  'Checks if user has any of the specified permissions in tenant. Batch check optimized for multiple permission checks. Returns true if user has at least one of the permissions, false otherwise.';

revoke all on function authz.has_any_permission(uuid, uuid, text[]) from public;
grant execute on function authz.has_any_permission(uuid, uuid, text[]) to authenticated;

create or replace function authz.get_user_permissions(
  p_user_id uuid,
  p_tenant_id uuid
)
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_permission_keys text[];
begin
  if not authz.is_tenant_member(p_user_id, p_tenant_id) then
    return array[]::text[];
  end if;

  select array_agg(distinct p.key)
  into v_permission_keys
  from app.user_tenant_roles utr
  join cfg.tenant_role_permissions trp on utr.tenant_role_id = trp.tenant_role_id
  join cfg.permissions p on trp.permission_id = p.id
  where utr.user_id = p_user_id
    and utr.tenant_id = p_tenant_id;

  return coalesce(v_permission_keys, array[]::text[]);
end;
$$;

comment on function authz.get_user_permissions(uuid, uuid) is 
  'Returns array of all permission keys for user in tenant. Returns empty array if user is not a tenant member or has no permissions. Used for permission listing and debugging.';

revoke all on function authz.get_user_permissions(uuid, uuid) from public;
grant execute on function authz.get_user_permissions(uuid, uuid) to authenticated;

create or replace function authz.has_current_user_permission(
  p_tenant_id uuid,
  p_permission_key text
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return authz.has_permission(auth.uid(), p_tenant_id, p_permission_key);
end;
$$;

comment on function authz.has_current_user_permission(uuid, text) is 
  'Checks if current authenticated user has a specific permission in tenant. Convenience wrapper around has_permission using auth.uid().';

revoke all on function authz.has_current_user_permission(uuid, text) from public;
grant execute on function authz.has_current_user_permission(uuid, text) to authenticated;

create or replace function authz.validate_permission(
  p_user_id uuid,
  p_tenant_id uuid,
  p_permission_key text
)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not authz.has_permission(p_user_id, p_tenant_id, p_permission_key) then
    raise exception using
      message = format('Permission denied: %s', p_permission_key),
      errcode = '42501';
  end if;
end;
$$;

comment on function authz.validate_permission(uuid, uuid, text) is 
  'Validates user has a specific permission in tenant, raising exception if not. Used by RPC functions to enforce authorization. Side effects: Raises exception with 42501 error code if permission denied.';

revoke all on function authz.validate_permission(uuid, uuid, text) from public;
grant execute on function authz.validate_permission(uuid, uuid, text) to authenticated;

create or replace function authz.check_abac_scope(
  p_user_id uuid,
  p_tenant_id uuid,
  p_scope_type text,
  p_scope_value uuid default null
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not authz.is_tenant_member(p_user_id, p_tenant_id) then
    return false;
  end if;

  return exists (
    select 1
    from app.membership_scopes
    where user_id = p_user_id
      and tenant_id = p_tenant_id
      and scope_type = p_scope_type
      and (
        (p_scope_value is null and scope_value is null)
        or scope_value = p_scope_value
      )
  );
end;
$$;

comment on function authz.check_abac_scope(uuid, uuid, text, uuid) is 
  'Checks if user has a specific ABAC scope in tenant. Returns true if scope exists, false otherwise. Used for attribute-based access control beyond role permissions.';

revoke all on function authz.check_abac_scope(uuid, uuid, text, uuid) from public;
grant execute on function authz.check_abac_scope(uuid, uuid, text, uuid) to authenticated;

create or replace function authz.has_location_scope(
  p_user_id uuid,
  p_tenant_id uuid,
  p_location_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return authz.check_abac_scope(p_user_id, p_tenant_id, 'location', p_location_id);
end;
$$;

comment on function authz.has_location_scope(uuid, uuid, uuid) is 
  'Checks if user has access to a specific location in tenant. Convenience wrapper around check_abac_scope for location scopes.';

revoke all on function authz.has_location_scope(uuid, uuid, uuid) from public;
grant execute on function authz.has_location_scope(uuid, uuid, uuid) to authenticated;

create or replace function authz.has_department_scope(
  p_user_id uuid,
  p_tenant_id uuid,
  p_department_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return authz.check_abac_scope(p_user_id, p_tenant_id, 'department', p_department_id);
end;
$$;

comment on function authz.has_department_scope(uuid, uuid, uuid) is 
  'Checks if user has access to a specific department in tenant. Convenience wrapper around check_abac_scope for department scopes. Used for department-based access control - users can be granted access to specific departments via ABAC scopes in app.membership_scopes table.';

revoke all on function authz.has_department_scope(uuid, uuid, uuid) from public;
grant execute on function authz.has_department_scope(uuid, uuid, uuid) to authenticated;

create or replace function authz.rpc_setup(
  p_tenant_id uuid,
  p_permission_key text default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  v_user_id := authz.validate_authenticated();
  
  if not authz.is_tenant_member(v_user_id, p_tenant_id) then
    raise exception using
      message = 'Unauthorized: User is not a member of this tenant',
      errcode = '42501';
  end if;
  
  if p_permission_key is not null then
    perform authz.validate_permission(v_user_id, p_tenant_id, p_permission_key);
  end if;
  
  perform authz.set_tenant_context(p_tenant_id);
  
  return p_tenant_id;
end;
$$;

comment on function authz.rpc_setup(uuid, text) is 
  'RPC setup function that validates authentication, tenant membership, optional permission, and sets tenant context. Convenience function for RPC functions that need to establish tenant context. Side effects: Sets app.current_tenant_id session variable. Security implications: Validates user is authenticated, tenant member, and optionally has required permission.';

revoke all on function authz.rpc_setup(uuid, text) from public;
grant execute on function authz.rpc_setup(uuid, text) to authenticated;

--
--
--
create policy tenants_select_for_members 
  on app.tenants 
  for select 
  to authenticated 
  using (
    id in (
      select tenant_id 
      from app.tenant_memberships 
      where user_id = (select auth.uid())
    )
  );

create policy tenant_memberships_select_combined 
  on app.tenant_memberships 
  for select 
  to authenticated 
  using (
    user_id = (select auth.uid())
    or tenant_id in (
      select tenant_id 
      from app.tenant_memberships 
      where user_id = (select auth.uid())
    )
  );

create policy locations_select_tenant 
  on app.locations 
  for select 
  to authenticated 
  using (
    tenant_id in (
      select tenant_id 
      from app.tenant_memberships 
      where user_id = (select auth.uid())
    )
  );

create policy locations_insert_tenant 
  on app.locations 
  for insert 
  to authenticated 
  with check (
    tenant_id in (
      select tenant_id 
      from app.tenant_memberships 
      where user_id = (select auth.uid())
    )
  );

create policy locations_update_tenant 
  on app.locations 
  for update 
  to authenticated 
  using (
    tenant_id in (
      select tenant_id 
      from app.tenant_memberships 
      where user_id = (select auth.uid())
    )
  )
  with check (
    tenant_id in (
      select tenant_id 
      from app.tenant_memberships 
      where user_id = (select auth.uid())
    )
  );

create policy locations_delete_tenant 
  on app.locations 
  for delete 
  to authenticated 
  using (
    tenant_id in (
      select tenant_id 
      from app.tenant_memberships 
      where user_id = (select auth.uid())
    )
  );

create policy assets_select_tenant 
  on app.assets 
  for select 
  to authenticated 
  using (
    tenant_id in (
      select tenant_id 
      from app.tenant_memberships 
      where user_id = (select auth.uid())
    )
  );

create policy assets_insert_tenant 
  on app.assets 
  for insert 
  to authenticated 
  with check (
    tenant_id in (
      select tenant_id 
      from app.tenant_memberships 
      where user_id = (select auth.uid())
    )
  );

create policy assets_update_tenant 
  on app.assets 
  for update 
  to authenticated 
  using (
    tenant_id in (
      select tenant_id 
      from app.tenant_memberships 
      where user_id = (select auth.uid())
    )
  )
  with check (
    tenant_id in (
      select tenant_id 
      from app.tenant_memberships 
      where user_id = (select auth.uid())
    )
  );

create policy assets_delete_tenant 
  on app.assets 
  for delete 
  to authenticated 
  using (
    tenant_id in (
      select tenant_id 
      from app.tenant_memberships 
      where user_id = (select auth.uid())
    )
  );

create policy work_orders_select_tenant 
  on app.work_orders 
  for select 
  to authenticated 
  using (
    tenant_id in (
      select tenant_id 
      from app.tenant_memberships 
      where user_id = (select auth.uid())
    )
  );

create policy work_orders_insert_tenant 
  on app.work_orders 
  for insert 
  to authenticated 
  with check (
    tenant_id in (
      select tenant_id 
      from app.tenant_memberships 
      where user_id = (select auth.uid())
    )
  );

create policy work_orders_update_tenant 
  on app.work_orders 
  for update 
  to authenticated 
  using (
    tenant_id in (
      select tenant_id 
      from app.tenant_memberships 
      where user_id = (select auth.uid())
    )
  )
  with check (
    tenant_id in (
      select tenant_id 
      from app.tenant_memberships 
      where user_id = (select auth.uid())
    )
  );

create policy work_orders_delete_tenant 
  on app.work_orders 
  for delete 
  to authenticated 
  using (
    tenant_id in (
      select tenant_id 
      from app.tenant_memberships 
      where user_id = (select auth.uid())
    )
  );

create policy departments_select_tenant 
  on app.departments 
  for select 
  to authenticated 
  using (
    tenant_id in (
      select tenant_id 
      from app.tenant_memberships 
      where user_id = (select auth.uid())
    )
  );

create policy departments_insert_tenant 
  on app.departments 
  for insert 
  to authenticated 
  with check (
    tenant_id in (
      select tenant_id 
      from app.tenant_memberships 
      where user_id = (select auth.uid())
    )
  );

create policy departments_update_tenant 
  on app.departments 
  for update 
  to authenticated 
  using (
    tenant_id in (
      select tenant_id 
      from app.tenant_memberships 
      where user_id = (select auth.uid())
    )
  )
  with check (
    tenant_id in (
      select tenant_id 
      from app.tenant_memberships 
      where user_id = (select auth.uid())
    )
  );

create policy departments_delete_tenant 
  on app.departments 
  for delete 
  to authenticated 
  using (
    tenant_id in (
      select tenant_id 
      from app.tenant_memberships 
      where user_id = (select auth.uid())
    )
  );
