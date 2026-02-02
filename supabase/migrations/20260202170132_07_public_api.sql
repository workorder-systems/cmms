-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Migration: Public API Layer
-- 
-- This migration creates the complete public API surface for client applications:
-- - All RPC functions for tenant management, work orders, assets, locations, departments, meters, and PM
-- - All public views for reading data (SECURITY INVOKER to enforce RLS)
-- - Dashboard views for analytics and reporting
-- - All necessary grants for SECURITY INVOKER views to function correctly
--
-- All views use SECURITY INVOKER from the start to properly enforce RLS policies.
-- All views filter by authz.get_current_tenant_id() for tenant isolation.
-- All RPC functions follow ADR conventions: security definer, rate limiting, permission checks.

-- ============================================================================
-- Tenant Management RPC Functions
-- ============================================================================

create or replace function public.rpc_create_tenant(
  p_name text,
  p_slug text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant_id uuid;
  v_admin_role_id uuid;
  v_user_id uuid;
begin
  v_user_id := authz.validate_authenticated();

  perform util.check_rate_limit('tenant_create', null, 5, 1, v_user_id, null);

  insert into app.tenants (name, slug)
  values (p_name, p_slug)
  returning id into v_tenant_id;

  perform cfg.create_default_tenant_roles(v_tenant_id);

  select id into v_admin_role_id
  from cfg.tenant_roles
  where tenant_id = v_tenant_id
    and key = 'admin';

  insert into app.tenant_memberships (user_id, tenant_id)
  values (v_user_id, v_tenant_id);

  insert into app.user_tenant_roles (user_id, tenant_id, tenant_role_id, assigned_by)
  values (v_user_id, v_tenant_id, v_admin_role_id, v_user_id);

  return v_tenant_id;
end;
$$;

comment on function public.rpc_create_tenant(text, text) is 
  'Creates a new tenant with the specified name and slug. Validates authentication, enforces rate limiting (5 requests/minute per user), creates default roles and workflows, adds creator as tenant member, and assigns admin role to creator. Returns the UUID of the created tenant.';

revoke all on function public.rpc_create_tenant(text, text) from public;
grant execute on function public.rpc_create_tenant(text, text) to authenticated;

create or replace function public.rpc_set_tenant_context(
  p_tenant_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform authz.set_tenant_context(p_tenant_id);
end;
$$;

comment on function public.rpc_set_tenant_context(uuid) is 
  'Sets tenant context by updating user metadata (for JWT claims) and session variable (for RPC fallback). Validates user membership before setting context. Clients should call this before querying tenant-scoped views, then refresh their token to get new JWT with tenant_id claim.';

revoke all on function public.rpc_set_tenant_context(uuid) from public;
grant execute on function public.rpc_set_tenant_context(uuid) to authenticated;

create or replace function public.rpc_clear_tenant_context()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform authz.clear_tenant_context();
end;
$$;

comment on function public.rpc_clear_tenant_context() is 
  'Clears tenant context by removing tenant_id from user metadata and session variable. Useful for testing or when switching tenants.';

revoke all on function public.rpc_clear_tenant_context() from public;
grant execute on function public.rpc_clear_tenant_context() to authenticated;

create or replace function public.rpc_invite_user_to_tenant(
  p_tenant_id uuid,
  p_invitee_email text,
  p_role_key text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inviter_id uuid;
  v_invitee_id uuid;
  v_role_id uuid;
begin
  perform util.check_rate_limit('user_invite', null, 5, 1, auth.uid(), p_tenant_id);
  
  v_inviter_id := authz.rpc_setup(p_tenant_id, 'tenant.admin');

  select id into v_invitee_id
  from auth.users
  where email = p_invitee_email
  limit 1;

  if v_invitee_id is null then
    raise exception using
      message = format('User with email %s not found', p_invitee_email),
      errcode = 'P0001';
  end if;

  select id into v_role_id
  from cfg.tenant_roles
  where tenant_id = p_tenant_id
    and key = p_role_key;

  if v_role_id is null then
    raise exception using
      message = format('Role %s not found in tenant', p_role_key),
      errcode = 'P0001';
  end if;

  insert into app.tenant_memberships (user_id, tenant_id)
  values (v_invitee_id, p_tenant_id)
  on conflict (user_id, tenant_id) do nothing;

  insert into app.user_tenant_roles (user_id, tenant_id, tenant_role_id, assigned_by)
  values (v_invitee_id, p_tenant_id, v_role_id, v_inviter_id)
  on conflict (user_id, tenant_id, tenant_role_id) do update
  set assigned_by = v_inviter_id;

end;
$$;

comment on function public.rpc_invite_user_to_tenant(uuid, text, text) is 
  'Invites a user to a tenant by email and assigns them a role. Requires tenant.admin permission. Validates invitee email exists in auth.users, creates membership if needed, and assigns specified role. Rate limited to 5 invitations per minute per user.';

revoke all on function public.rpc_invite_user_to_tenant(uuid, text, text) from public;
grant execute on function public.rpc_invite_user_to_tenant(uuid, text, text) to authenticated;

-- ============================================================================
-- Authorization RPC Functions
-- ============================================================================

create or replace function public.rpc_assign_role_to_user(
  p_tenant_id uuid,
  p_user_id uuid,
  p_role_key text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_assigned_by uuid;
  v_role_id uuid;
begin
  perform util.check_rate_limit('role_assign', null, 10, 1, auth.uid(), p_tenant_id);
  
  v_assigned_by := authz.validate_authenticated();

  if v_assigned_by = p_user_id then
    raise exception using
      message = 'Unauthorized: Users cannot modify their own role assignments',
      errcode = '42501';
  end if;

  perform authz.validate_permission(v_assigned_by, p_tenant_id, 'tenant.admin');
  perform authz.set_tenant_context(p_tenant_id);

  select id into v_role_id
  from cfg.tenant_roles
  where tenant_id = p_tenant_id
    and key = p_role_key;

  if v_role_id is null then
    raise exception using
      message = format('Role %s not found in tenant', p_role_key),
      errcode = 'P0001';
  end if;

  insert into app.tenant_memberships (user_id, tenant_id)
  values (p_user_id, p_tenant_id)
  on conflict (user_id, tenant_id) do nothing;

  insert into app.user_tenant_roles (user_id, tenant_id, tenant_role_id, assigned_by)
  values (p_user_id, p_tenant_id, v_role_id, v_assigned_by)
  on conflict (user_id, tenant_id, tenant_role_id) do update
  set assigned_by = v_assigned_by;
end;
$$;

comment on function public.rpc_assign_role_to_user(uuid, uuid, text) is 
  'Assigns a role to a user in a tenant. Requires tenant.admin permission. Security invariant: Users cannot modify their own role assignments. Rate limited to 10 assignments per minute per user.';

revoke all on function public.rpc_assign_role_to_user(uuid, uuid, text) from public;
grant execute on function public.rpc_assign_role_to_user(uuid, uuid, text) to authenticated;

create or replace function public.rpc_grant_scope(
  p_tenant_id uuid,
  p_user_id uuid,
  p_scope_type text,
  p_scope_value uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_granted_by uuid;
begin
  perform util.check_rate_limit('scope_grant', null, 10, 1, auth.uid(), p_tenant_id);
  
  v_granted_by := authz.validate_authenticated();

  -- Validate scope_type format matches table constraint
  if not (p_scope_type ~ '^[a-z0-9_]+$' and length(p_scope_type) >= 1 and length(p_scope_type) <= 50) then
    raise exception using
      message = format('Invalid scope_type format: must match ^[a-z0-9_]+$ and be 1-50 characters, got: %s', p_scope_type),
      errcode = '23514';
  end if;

  -- Validate scope_value belongs to tenant for known scope types
  if p_scope_type = 'location' then
    if p_scope_value is null then
      raise exception using
        message = 'scope_value is required for location scope_type',
        errcode = '23503';
    end if;
    
    if not exists (
      select 1 from app.locations 
      where id = p_scope_value and tenant_id = p_tenant_id
    ) then
      raise exception using
        message = format('Location %s not found or does not belong to tenant', p_scope_value),
        errcode = '23503';
    end if;
  elsif p_scope_type = 'department' then
    if p_scope_value is null then
      raise exception using
        message = 'scope_value is required for department scope_type',
        errcode = '23503';
    end if;
    
    if not exists (
      select 1 from app.departments 
      where id = p_scope_value and tenant_id = p_tenant_id
    ) then
      raise exception using
        message = format('Department %s not found or does not belong to tenant', p_scope_value),
        errcode = '23503';
    end if;
  end if;

  perform authz.validate_permission(v_granted_by, p_tenant_id, 'tenant.admin');
  perform authz.set_tenant_context(p_tenant_id);

  -- Ensure user is tenant member (create membership if needed)
  insert into app.tenant_memberships (user_id, tenant_id)
  values (p_user_id, p_tenant_id)
  on conflict (user_id, tenant_id) do nothing;

  -- Grant scope (idempotent)
  insert into app.membership_scopes (user_id, tenant_id, scope_type, scope_value)
  values (p_user_id, p_tenant_id, p_scope_type, p_scope_value)
  on conflict (user_id, tenant_id, scope_type, scope_value) do nothing;
end;
$$;

comment on function public.rpc_grant_scope(uuid, uuid, text, uuid) is 
  'Grants an ABAC scope to a user in a tenant. Requires tenant.admin permission. Validates scope_type format and that scope_value (for location/department scopes) belongs to the tenant. Rate limited to 10 grants per minute per user.';

revoke all on function public.rpc_grant_scope(uuid, uuid, text, uuid) from public;
grant execute on function public.rpc_grant_scope(uuid, uuid, text, uuid) to authenticated;

create or replace function public.rpc_revoke_scope(
  p_tenant_id uuid,
  p_user_id uuid,
  p_scope_type text,
  p_scope_value uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_revoked_by uuid;
begin
  perform util.check_rate_limit('scope_revoke', null, 10, 1, auth.uid(), p_tenant_id);
  
  v_revoked_by := authz.validate_authenticated();

  -- Validate scope_type format matches table constraint
  if not (p_scope_type ~ '^[a-z0-9_]+$' and length(p_scope_type) >= 1 and length(p_scope_type) <= 50) then
    raise exception using
      message = format('Invalid scope_type format: must match ^[a-z0-9_]+$ and be 1-50 characters, got: %s', p_scope_type),
      errcode = '23514';
  end if;

  -- Validate user is tenant member
  if not authz.is_tenant_member(p_user_id, p_tenant_id) then
    raise exception using
      message = format('User %s is not a member of tenant %s', p_user_id, p_tenant_id),
      errcode = '42501';
  end if;

  perform authz.validate_permission(v_revoked_by, p_tenant_id, 'tenant.admin');
  perform authz.set_tenant_context(p_tenant_id);

  -- Revoke scope (idempotent - no error if scope doesn't exist)
  delete from app.membership_scopes
  where user_id = p_user_id
    and tenant_id = p_tenant_id
    and scope_type = p_scope_type
    and (
      (p_scope_value is null and scope_value is null)
      or scope_value = p_scope_value
    );
end;
$$;

comment on function public.rpc_revoke_scope(uuid, uuid, text, uuid) is 
  'Revokes an ABAC scope from a user in a tenant. Requires tenant.admin permission. Validates scope_type format and user membership. Rate limited to 10 revocations per minute per user.';

revoke all on function public.rpc_revoke_scope(uuid, uuid, text, uuid) from public;
grant execute on function public.rpc_revoke_scope(uuid, uuid, text, uuid) to authenticated;

create or replace function public.rpc_has_permission(
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
  v_user_id uuid;
begin
  v_user_id := authz.validate_authenticated();
  return authz.has_permission(v_user_id, p_tenant_id, p_permission_key);
end;
$$;

comment on function public.rpc_has_permission(uuid, text) is
  'Returns true if current authenticated user has the given permission key in the tenant, otherwise false. Wrapper around authz.has_permission for PostgREST RPC usage.';

revoke all on function public.rpc_has_permission(uuid, text) from public;
grant execute on function public.rpc_has_permission(uuid, text) to authenticated;

create or replace function public.rpc_get_user_permissions(
  p_tenant_id uuid
)
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  v_user_id := authz.validate_authenticated();
  return authz.get_user_permissions(v_user_id, p_tenant_id);
end;
$$;

comment on function public.rpc_get_user_permissions(uuid) is
  'Returns an array of permission keys for the current authenticated user in the tenant. Wrapper around authz.get_user_permissions for PostgREST RPC usage.';

revoke all on function public.rpc_get_user_permissions(uuid) from public;
grant execute on function public.rpc_get_user_permissions(uuid) to authenticated;

create or replace function public.rpc_assign_permission_to_role(
  p_tenant_id uuid,
  p_role_key text,
  p_permission_key text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_role_id uuid;
  v_permission_id uuid;
begin
  perform util.check_rate_limit('permission_assign', null, 20, 1, auth.uid(), p_tenant_id);
  
  v_user_id := authz.rpc_setup(p_tenant_id, 'tenant.admin');

  select id into v_role_id
  from cfg.tenant_roles
  where tenant_id = p_tenant_id
    and key = p_role_key;

  if v_role_id is null then
    raise exception using
      message = format('Role %s not found in tenant', p_role_key),
      errcode = 'P0001';
  end if;

  select id into v_permission_id
  from cfg.permissions
  where key = p_permission_key;

  if v_permission_id is null then
    raise exception using
      message = format('Permission %s not found', p_permission_key),
      errcode = 'P0001';
  end if;

  insert into cfg.tenant_role_permissions (tenant_role_id, permission_id)
  values (v_role_id, v_permission_id)
  on conflict (tenant_role_id, permission_id) do nothing;
end;
$$;

comment on function public.rpc_assign_permission_to_role(uuid, text, text) is 
  'Assigns a permission to a tenant role. Requires tenant.admin permission. Validates that role and permission exist. Rate limited to 20 assignments per minute per user.';

revoke all on function public.rpc_assign_permission_to_role(uuid, text, text) from public;
grant execute on function public.rpc_assign_permission_to_role(uuid, text, text) to authenticated;

-- ============================================================================
-- Department RPC Functions
-- ============================================================================

create or replace function public.rpc_create_department(
  p_tenant_id uuid,
  p_name text,
  p_description text default null,
  p_code text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_department_id uuid;
  v_user_id uuid;
begin
  v_user_id := authz.validate_authenticated();

  perform util.check_rate_limit('department_create', null, 20, 1, v_user_id, p_tenant_id);

  if not authz.is_tenant_member(v_user_id, p_tenant_id) then
    raise exception using
      message = 'Unauthorized: User is not a member of this tenant',
      errcode = '42501';
  end if;

  if not authz.has_permission(v_user_id, p_tenant_id, 'tenant.admin') then
    raise exception using
      message = 'Unauthorized: tenant.admin permission required',
      errcode = '42501';
  end if;

  if length(p_name) < 1 or length(p_name) > 255 then
    raise exception using
      message = 'Department name must be between 1 and 255 characters',
      errcode = '23514';
  end if;

  if p_code is not null then
    if length(p_code) < 1 or length(p_code) > 20 or p_code !~ '^[A-Z0-9_]+$' then
      raise exception using
        message = 'Department code must be 1-20 characters, uppercase alphanumeric with underscores only',
        errcode = '23514';
    end if;
  end if;

  insert into app.departments (tenant_id, name, description, code)
  values (p_tenant_id, p_name, p_description, p_code)
  returning id into v_department_id;

  return v_department_id;
end;
$$;

comment on function public.rpc_create_department(uuid, text, text, text) is 
  'Creates a new department in the tenant. Requires tenant.admin permission. Rate limited to 20 requests per minute per user. Validates name length and code format. Returns the ID of the newly created department.';

revoke all on function public.rpc_create_department(uuid, text, text, text) from public;
grant execute on function public.rpc_create_department(uuid, text, text, text) to authenticated;

create or replace function public.rpc_update_department(
  p_tenant_id uuid,
  p_department_id uuid,
  p_name text default null,
  p_description text default null,
  p_code text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_department_tenant_id uuid;
begin
  v_user_id := authz.validate_authenticated();

  perform util.check_rate_limit('department_update', null, 20, 1, v_user_id, p_tenant_id);

  if not authz.is_tenant_member(v_user_id, p_tenant_id) then
    raise exception using
      message = 'Unauthorized: User is not a member of this tenant',
      errcode = '42501';
  end if;

  if not authz.has_permission(v_user_id, p_tenant_id, 'tenant.admin') then
    raise exception using
      message = 'Unauthorized: tenant.admin permission required',
      errcode = '42501';
  end if;

  select tenant_id into v_department_tenant_id
  from app.departments
  where id = p_department_id;

  if v_department_tenant_id is null then
    raise exception using
      message = 'Department not found',
      errcode = 'P0001';
  end if;

  if v_department_tenant_id != p_tenant_id then
    raise exception using
      message = 'Unauthorized: Department does not belong to this tenant',
      errcode = '42501';
  end if;

  if p_name is not null and (length(p_name) < 1 or length(p_name) > 255) then
    raise exception using
      message = 'Department name must be between 1 and 255 characters',
      errcode = '23514';
  end if;

  if p_code is not null then
    if length(p_code) < 1 or length(p_code) > 20 or p_code !~ '^[A-Z0-9_]+$' then
      raise exception using
        message = 'Department code must be 1-20 characters, uppercase alphanumeric with underscores only',
        errcode = '23514';
    end if;
  end if;

  update app.departments
  set 
    name = coalesce(p_name, name),
    description = coalesce(p_description, description),
    code = coalesce(p_code, code),
    updated_at = pg_catalog.now()
  where id = p_department_id;
end;
$$;

comment on function public.rpc_update_department(uuid, uuid, text, text, text) is 
  'Updates an existing department. Requires tenant.admin permission. Rate limited to 20 requests per minute per user. Validates that department belongs to tenant. Only updates provided fields (null values leave field unchanged).';

revoke all on function public.rpc_update_department(uuid, uuid, text, text, text) from public;
grant execute on function public.rpc_update_department(uuid, uuid, text, text, text) to authenticated;

create or replace function public.rpc_delete_department(
  p_tenant_id uuid,
  p_department_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_department_tenant_id uuid;
begin
  v_user_id := authz.validate_authenticated();

  perform util.check_rate_limit('department_delete', null, 10, 1, v_user_id, p_tenant_id);

  if not authz.is_tenant_member(v_user_id, p_tenant_id) then
    raise exception using
      message = 'Unauthorized: User is not a member of this tenant',
      errcode = '42501';
  end if;

  if not authz.has_permission(v_user_id, p_tenant_id, 'tenant.admin') then
    raise exception using
      message = 'Unauthorized: tenant.admin permission required',
      errcode = '42501';
  end if;

  select tenant_id into v_department_tenant_id
  from app.departments
  where id = p_department_id;

  if v_department_tenant_id is null then
    raise exception using
      message = 'Department not found',
      errcode = 'P0001';
  end if;

  if v_department_tenant_id != p_tenant_id then
    raise exception using
      message = 'Unauthorized: Department does not belong to this tenant',
      errcode = '42501';
  end if;

  delete from app.departments
  where id = p_department_id;
end;
$$;

comment on function public.rpc_delete_department(uuid, uuid) is 
  'Deletes a department. Requires tenant.admin permission. Rate limited to 10 requests per minute per user. Validates that department belongs to tenant. Assets referencing this department will have their department_id set to NULL (on delete set null behavior).';

revoke all on function public.rpc_delete_department(uuid, uuid) from public;
grant execute on function public.rpc_delete_department(uuid, uuid) to authenticated;

-- ============================================================================
-- Work Order RPC Functions
-- ============================================================================

create or replace function public.rpc_create_work_order(
  p_tenant_id uuid,
  p_title text,
  p_description text default null,
  p_priority text default 'medium',
  p_maintenance_type text default null,
  p_assigned_to uuid default null,
  p_location_id uuid default null,
  p_asset_id uuid default null,
  p_due_date timestamptz default null,
  p_pm_schedule_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_work_order_id uuid;
  v_initial_status text;
  v_pm_schedule_tenant_id uuid;
  v_pm_schedule_is_active boolean;
begin
  perform util.check_rate_limit('work_order_create', null, 10, 1, auth.uid(), p_tenant_id);
  
  v_user_id := authz.rpc_setup(p_tenant_id, 'workorder.create');

  -- Validate priority exists (uses index on priority_catalogs)
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

  -- Validate maintenance type exists (uses index on maintenance_type_catalogs_tenant_entity_key_idx)
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

  -- Validate PM schedule if provided
  if p_pm_schedule_id is not null then
    select tenant_id, is_active into v_pm_schedule_tenant_id, v_pm_schedule_is_active
    from app.pm_schedules
    where id = p_pm_schedule_id;

    if not found then
      raise exception using
        message = format('PM schedule %s not found', p_pm_schedule_id),
        errcode = 'P0001';
    end if;

    if v_pm_schedule_tenant_id != p_tenant_id then
      raise exception using
        message = 'Unauthorized: PM schedule does not belong to this tenant',
        errcode = '42501';
    end if;

    if not v_pm_schedule_is_active then
      raise exception using
        message = 'PM schedule is not active',
        errcode = '23503';
    end if;
  end if;

  v_initial_status := cfg.get_default_status(
    p_tenant_id,
    'work_order',
    pg_catalog.jsonb_build_object('assigned_to', p_assigned_to)
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
    pm_schedule_id
  )
  values (
    p_tenant_id,
    p_title,
    p_description,
    p_priority,
    p_maintenance_type,
    p_assigned_to,
    p_location_id,
    p_asset_id,
    p_due_date,
    v_initial_status,
    p_pm_schedule_id
  )
  returning id into v_work_order_id;

  return v_work_order_id;
end;
$$;

comment on function public.rpc_create_work_order(uuid, text, text, text, text, uuid, uuid, uuid, timestamptz, uuid) is 
  'Creates a new work order for the current tenant context. Requires workorder.create permission. Validates priority and optional maintenance_type exist in catalogs, automatically assigns default status from workflow catalogs based on context (e.g., assigned status if assigned_to is provided). Validates that referenced assets, locations, and PM schedules belong to the same tenant. Rate limited to 10 work orders per minute per user. Returns the UUID of the created work order.';

revoke all on function public.rpc_create_work_order(uuid, text, text, text, text, uuid, uuid, uuid, timestamptz, uuid) from public;
grant execute on function public.rpc_create_work_order(uuid, text, text, text, text, uuid, uuid, uuid, timestamptz, uuid) to authenticated;

create or replace function public.rpc_transition_work_order_status(
  p_tenant_id uuid,
  p_work_order_id uuid,
  p_to_status_key text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_work_order app.work_orders%rowtype;
  v_entity_data jsonb;
  v_transition_valid boolean;
  v_to_status_final boolean;
  v_to_status_category text;
begin
  perform util.check_rate_limit('status_transition', 'work_order', 30, 1, auth.uid(), p_tenant_id);
  
  v_user_id := authz.rpc_setup(p_tenant_id);

  select * into v_work_order
  from app.work_orders
  where id = p_work_order_id
    and tenant_id = p_tenant_id;

  if not found then
    raise exception using
      message = 'Work order not found',
      errcode = 'P0001';
  end if;

  v_entity_data := pg_catalog.jsonb_build_object(
    'assigned_to', v_work_order.assigned_to,
    'status', v_work_order.status
  );

  v_transition_valid := cfg.validate_status_transition(
    p_tenant_id,
    'work_order',
    v_work_order.status,
    p_to_status_key,
    v_user_id,
    v_entity_data
  );

  if not v_transition_valid then
    raise exception using
      message = format('Invalid status transition from %s to %s', v_work_order.status, p_to_status_key),
      errcode = '23503';
  end if;

  select category, is_final
  into v_to_status_category, v_to_status_final
  from cfg.status_catalogs
  where tenant_id = p_tenant_id
    and entity_type = 'work_order'
    and key = p_to_status_key;

  update app.work_orders
  set
    status = p_to_status_key,
    completed_at = case 
      when v_to_status_final and v_to_status_category = 'closed' then pg_catalog.now() 
      else completed_at 
    end,
    completed_by = case 
      when v_to_status_final and v_to_status_category = 'closed' then v_user_id 
      else completed_by 
    end
  where id = p_work_order_id
    and tenant_id = p_tenant_id;

  -- PM schedule update is handled by trigger work_orders_update_pm_on_completion
  -- which fires on completed_at update, so we don't need to call it here
end;
$$;

comment on function public.rpc_transition_work_order_status(uuid, uuid, text) is 
  'Transitions a work order to a new status using workflow validation. Validates transition exists in catalog, checks user has required permission, evaluates guard conditions, and updates work order. Automatically sets completed_at and completed_by when transitioning to final closed status. Updates PM schedule on completion if linked. Rate limited to 30 transitions per minute per user.';

revoke all on function public.rpc_transition_work_order_status(uuid, uuid, text) from public;
grant execute on function public.rpc_transition_work_order_status(uuid, uuid, text) to authenticated;

create or replace function public.rpc_complete_work_order(
  p_tenant_id uuid,
  p_work_order_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.rpc_transition_work_order_status(p_tenant_id, p_work_order_id, 'completed');
end;
$$;

comment on function public.rpc_complete_work_order(uuid, uuid) is 
  'Completes a work order. Convenience wrapper around rpc_transition_work_order_status that transitions to "completed" status. Requires appropriate permissions for completing work orders (workorder.complete.assigned if assigned to user, workorder.complete.any otherwise). Rate limited to 30 completions per minute per user.';

revoke all on function public.rpc_complete_work_order(uuid, uuid) from public;
grant execute on function public.rpc_complete_work_order(uuid, uuid) to authenticated;

create or replace function public.rpc_log_work_order_time(
  p_tenant_id uuid,
  p_work_order_id uuid,
  p_minutes integer,
  p_entry_date date default null,
  p_user_id uuid default null,
  p_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_target_user_id uuid;
  v_time_entry_id uuid;
  v_work_order_tenant_id uuid;
begin
  perform util.check_rate_limit('time_entry_create', null, 30, 1, auth.uid(), p_tenant_id);
  
  v_user_id := authz.rpc_setup(p_tenant_id);

  -- Validate work order exists and belongs to tenant
  select tenant_id into v_work_order_tenant_id
  from app.work_orders
  where id = p_work_order_id;

  if not found or v_work_order_tenant_id != p_tenant_id then
    raise exception using
      message = format('Work order %s not found or does not belong to tenant', p_work_order_id),
      errcode = 'P0001';
  end if;

  -- Determine target user (default to current user if not provided)
  v_target_user_id := coalesce(p_user_id, v_user_id);

  -- Validate target user is tenant member (check this first)
  if not authz.is_tenant_member(v_target_user_id, p_tenant_id) then
    raise exception using
      message = format('User %s is not a member of tenant %s', v_target_user_id, p_tenant_id),
      errcode = '23503';
  end if;

  -- If logging time for someone else, require workorder.edit permission
  if v_target_user_id != v_user_id then
    perform authz.validate_permission(v_user_id, p_tenant_id, 'workorder.edit');
  end if;

  -- Insert time entry
  insert into app.work_order_time_entries (
    tenant_id,
    work_order_id,
    user_id,
    entry_date,
    minutes,
    description,
    created_by
  )
  values (
    p_tenant_id,
    p_work_order_id,
    v_target_user_id,
    coalesce(p_entry_date, current_date),
    p_minutes,
    p_description,
    v_user_id
  )
  returning id into v_time_entry_id;

  return v_time_entry_id;
end;
$$;

comment on function public.rpc_log_work_order_time(uuid, uuid, integer, date, uuid, text) is 
  'Logs time spent on a work order. Requires tenant membership. If logging time for another user, requires workorder.edit permission. Defaults entry_date to today and user_id to current user if not provided. Validates work order belongs to tenant and target user is tenant member. Rate limited to 30 entries per minute per user. Returns the UUID of the created time entry.';

revoke all on function public.rpc_log_work_order_time(uuid, uuid, integer, date, uuid, text) from public;
grant execute on function public.rpc_log_work_order_time(uuid, uuid, integer, date, uuid, text) to authenticated;

create or replace function public.rpc_add_work_order_attachment(
  p_tenant_id uuid,
  p_work_order_id uuid,
  p_file_ref text,
  p_label text default null,
  p_kind text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_attachment_id uuid;
  v_work_order_tenant_id uuid;
  v_work_order_assigned_to uuid;
begin
  perform util.check_rate_limit('attachment_create', null, 20, 1, auth.uid(), p_tenant_id);
  
  v_user_id := authz.rpc_setup(p_tenant_id);

  -- Validate work order exists and belongs to tenant
  select tenant_id, assigned_to into v_work_order_tenant_id, v_work_order_assigned_to
  from app.work_orders
  where id = p_work_order_id;

  if not found or v_work_order_tenant_id != p_tenant_id then
    raise exception using
      message = format('Work order %s not found or does not belong to tenant', p_work_order_id),
      errcode = 'P0001';
  end if;

  -- Require workorder.edit permission unless user owns or is assigned to the work order
  if v_work_order_assigned_to != v_user_id then
    perform authz.validate_permission(v_user_id, p_tenant_id, 'workorder.edit');
  end if;

  -- Insert attachment
  insert into app.work_order_attachments (
    tenant_id,
    work_order_id,
    file_ref,
    label,
    kind,
    created_by
  )
  values (
    p_tenant_id,
    p_work_order_id,
    p_file_ref,
    p_label,
    p_kind,
    v_user_id
  )
  returning id into v_attachment_id;

  return v_attachment_id;
end;
$$;

comment on function public.rpc_add_work_order_attachment(uuid, uuid, text, text, text) is 
  'Adds an attachment (photo, file) to a work order. Requires workorder.edit permission unless user is assigned to the work order. Validates work order belongs to tenant. Rate limited to 20 attachments per minute per user. Returns the UUID of the created attachment.';

revoke all on function public.rpc_add_work_order_attachment(uuid, uuid, text, text, text) from public;
grant execute on function public.rpc_add_work_order_attachment(uuid, uuid, text, text, text) to authenticated;

-- ============================================================================
-- Workflow RPC Functions
-- ============================================================================

create or replace function public.rpc_create_status(
  p_tenant_id uuid,
  p_entity_type text,
  p_key text,
  p_name text,
  p_category text,
  p_display_order integer,
  p_color text default null,
  p_icon text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_status_id uuid;
begin
  perform util.check_rate_limit('status_create', null, 20, 1, auth.uid(), p_tenant_id);
  
  v_user_id := authz.rpc_setup(p_tenant_id, 'tenant.admin');

  if p_category not in ('open', 'closed', 'final') then
    raise exception using
      message = 'Invalid category. Must be one of: open, closed, final',
      errcode = '23503';
  end if;

  insert into cfg.status_catalogs (
    tenant_id,
    entity_type,
    key,
    name,
    category,
    display_order,
    color,
    icon
  )
  values (
    p_tenant_id,
    p_entity_type,
    p_key,
    p_name,
    p_category,
    p_display_order,
    p_color,
    p_icon
  )
  returning id into v_status_id;

  return v_status_id;
end;
$$;

comment on function public.rpc_create_status(uuid, text, text, text, text, integer, text, text) is 
  'Creates a new status in the tenant status catalog. Requires tenant.admin permission. Validates category is one of: open, closed, final. Rate limited to 20 status creations per minute per user. Returns the UUID of the created status.';

revoke all on function public.rpc_create_status(uuid, text, text, text, text, integer, text, text) from public;
grant execute on function public.rpc_create_status(uuid, text, text, text, text, integer, text, text) to authenticated;

create or replace function public.rpc_create_status_transition(
  p_tenant_id uuid,
  p_entity_type text,
  p_from_status_key text,
  p_to_status_key text,
  p_required_permission text default null,
  p_guard_condition jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_transition_id uuid;
begin
  perform util.check_rate_limit('transition_create', null, 20, 1, auth.uid(), p_tenant_id);
  
  v_user_id := authz.rpc_setup(p_tenant_id, 'tenant.admin');

  if not exists (
    select 1
    from cfg.status_catalogs
    where tenant_id = p_tenant_id
      and entity_type = p_entity_type
      and key = p_from_status_key
  ) then
    raise exception using
      message = format('From status %s not found', p_from_status_key),
      errcode = '23503';
  end if;

  if not exists (
    select 1
    from cfg.status_catalogs
    where tenant_id = p_tenant_id
      and entity_type = p_entity_type
      and key = p_to_status_key
  ) then
    raise exception using
      message = format('To status %s not found', p_to_status_key),
      errcode = '23503';
  end if;

  insert into cfg.status_transitions (
    tenant_id,
    entity_type,
    from_status_key,
    to_status_key,
    required_permission,
    guard_condition
  )
  values (
    p_tenant_id,
    p_entity_type,
    p_from_status_key,
    p_to_status_key,
    p_required_permission,
    p_guard_condition
  )
  returning id into v_transition_id;

  return v_transition_id;
end;
$$;

comment on function public.rpc_create_status_transition(uuid, text, text, text, text, jsonb) is 
  'Creates a new status transition rule in the tenant workflow. Requires tenant.admin permission. Validates that both from and to statuses exist in the status catalog. Can optionally require specific permission and guard conditions. Rate limited to 20 transition creations per minute per user. Returns the UUID of the created transition.';

revoke all on function public.rpc_create_status_transition(uuid, text, text, text, text, jsonb) from public;
grant execute on function public.rpc_create_status_transition(uuid, text, text, text, text, jsonb) to authenticated;

create or replace function public.rpc_get_workflow_graph(
  p_tenant_id uuid,
  p_entity_type text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_graph jsonb;
begin
  v_user_id := authz.rpc_setup(p_tenant_id);

  select pg_catalog.jsonb_build_object(
    'entity_type', p_entity_type,
    'tenant_id', p_tenant_id,
    'transitions', pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'from_status_key', from_status_key,
        'to_status_key', to_status_key,
        'required_permission', required_permission,
        'guard_condition', guard_condition
      )
      order by from_status_key, to_status_key
    )
  )
  into v_graph
  from cfg.status_transitions
  where tenant_id = p_tenant_id
    and entity_type = p_entity_type;

  return coalesce(v_graph, pg_catalog.jsonb_build_object('entity_type', p_entity_type, 'tenant_id', p_tenant_id, 'transitions', pg_catalog.jsonb_build_array()));
end;
$$;

comment on function public.rpc_get_workflow_graph(uuid, text) is 
  'Returns workflow graph as JSONB containing all valid status transitions for the specified entity type. Used by frontend to display available status transitions. No rate limiting as this is a read-only operation. Returns JSONB object with entity_type, tenant_id, and transitions array. Each transition includes from_status_key, to_status_key, required_permission, and guard_condition.';

revoke all on function public.rpc_get_workflow_graph(uuid, text) from public;
grant execute on function public.rpc_get_workflow_graph(uuid, text) to authenticated;

create or replace function public.rpc_create_priority(
  p_tenant_id uuid,
  p_entity_type text,
  p_key text,
  p_name text,
  p_weight integer,
  p_display_order integer,
  p_color text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_priority_id uuid;
begin
  perform util.check_rate_limit('priority_create', null, 20, 1, auth.uid(), p_tenant_id);
  
  v_user_id := authz.rpc_setup(p_tenant_id, 'tenant.admin');

  insert into cfg.priority_catalogs (
    tenant_id,
    entity_type,
    key,
    name,
    weight,
    display_order,
    color
  )
  values (
    p_tenant_id,
    p_entity_type,
    p_key,
    p_name,
    p_weight,
    p_display_order,
    p_color
  )
  returning id into v_priority_id;

  return v_priority_id;
end;
$$;

comment on function public.rpc_create_priority(uuid, text, text, text, integer, integer, text) is 
  'Creates a new priority in the tenant priority catalog. Requires tenant.admin permission. Weight parameter determines sorting (lower = higher priority). Rate limited to 20 priority creations per minute per user. Returns the UUID of the created priority.';

revoke all on function public.rpc_create_priority(uuid, text, text, text, integer, integer, text) from public;
grant execute on function public.rpc_create_priority(uuid, text, text, text, integer, integer, text) to authenticated;

create or replace function public.rpc_create_maintenance_type(
  p_tenant_id uuid,
  p_category text,
  p_key text,
  p_name text,
  p_description text default null,
  p_display_order integer default null,
  p_color text default null,
  p_icon text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_maintenance_type_id uuid;
  v_max_display_order integer;
begin
  perform util.check_rate_limit('maintenance_type_create', null, 20, 1, auth.uid(), p_tenant_id);
  
  v_user_id := authz.rpc_setup(p_tenant_id, 'tenant.admin');

  if p_category not in ('reactive', 'planned', 'advanced', 'lean', 'other') then
    raise exception using
      message = 'Invalid category. Must be one of: reactive, planned, advanced, lean, other',
      errcode = '23503';
  end if;

  if p_display_order is null then
    select coalesce(max(display_order), 0) + 1
    into v_max_display_order
    from cfg.maintenance_type_catalogs
    where tenant_id = p_tenant_id
      and entity_type = 'work_order'
      and category = p_category;
    
    p_display_order := v_max_display_order;
  end if;

  insert into cfg.maintenance_type_catalogs (
    tenant_id,
    entity_type,
    category,
    key,
    name,
    description,
    display_order,
    color,
    icon
  )
  values (
    p_tenant_id,
    'work_order',
    p_category,
    p_key,
    p_name,
    p_description,
    p_display_order,
    p_color,
    p_icon
  )
  returning id into v_maintenance_type_id;

  return v_maintenance_type_id;
end;
$$;

comment on function public.rpc_create_maintenance_type(uuid, text, text, text, text, integer, text, text) is 
  'Creates a new maintenance type in the tenant catalog. Requires tenant.admin permission. Validates category is one of: reactive, planned, advanced, lean, other. Auto-calculates display_order if not provided. Rate limited to 20 maintenance type creations per minute per user. Returns the UUID of the created maintenance type.';

revoke all on function public.rpc_create_maintenance_type(uuid, text, text, text, text, integer, text, text) from public;
grant execute on function public.rpc_create_maintenance_type(uuid, text, text, text, text, integer, text, text) to authenticated;

-- ============================================================================
-- Location RPC Functions
-- ============================================================================

create or replace function public.rpc_create_location(
  p_tenant_id uuid,
  p_name text,
  p_description text default null,
  p_parent_location_id uuid default null
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
    raise exception using
      message = 'Unauthorized: User is not a member of this tenant',
      errcode = '42501';
  end if;

  if length(p_name) < 1 or length(p_name) > 255 then
    raise exception using
      message = 'Location name must be between 1 and 255 characters',
      errcode = '23514';
  end if;

  insert into app.locations (tenant_id, name, description, parent_location_id)
  values (p_tenant_id, p_name, p_description, p_parent_location_id)
  returning id into v_location_id;

  return v_location_id;
end;
$$;

comment on function public.rpc_create_location(uuid, text, text, uuid) is 
  'Creates a new location in the tenant. Requires tenant membership. Enforces basic name validation; tenant consistency and circular reference checks are handled by underlying triggers. Rate limited to 50 requests per minute per user. Returns the ID of the newly created location.';

revoke all on function public.rpc_create_location(uuid, text, text, uuid) from public;
grant execute on function public.rpc_create_location(uuid, text, text, uuid) to authenticated;

create or replace function public.rpc_update_location(
  p_tenant_id uuid,
  p_location_id uuid,
  p_name text default null,
  p_description text default null,
  p_parent_location_id uuid default null
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
    raise exception using
      message = 'Unauthorized: User is not a member of this tenant',
      errcode = '42501';
  end if;

  select tenant_id into v_location_tenant_id
  from app.locations
  where id = p_location_id;

  if v_location_tenant_id is null then
    raise exception using
      message = 'Location not found',
      errcode = 'P0001';
  end if;

  if v_location_tenant_id != p_tenant_id then
    raise exception using
      message = 'Unauthorized: Location does not belong to this tenant',
      errcode = '42501';
  end if;

  if p_name is not null and (length(p_name) < 1 or length(p_name) > 255) then
    raise exception using
      message = 'Location name must be between 1 and 255 characters',
      errcode = '23514';
  end if;

  update app.locations
  set
    name = coalesce(p_name, name),
    description = coalesce(p_description, description),
    parent_location_id = coalesce(p_parent_location_id, parent_location_id),
    updated_at = pg_catalog.now()
  where id = p_location_id;
end;
$$;

comment on function public.rpc_update_location(uuid, uuid, text, text, uuid) is 
  'Updates an existing location. Requires tenant membership. Validates that location belongs to tenant and basic name constraints; tenant consistency and circular reference checks are enforced by triggers. Rate limited to 50 requests per minute per user.';

revoke all on function public.rpc_update_location(uuid, uuid, text, text, uuid) from public;
grant execute on function public.rpc_update_location(uuid, uuid, text, text, uuid) to authenticated;

create or replace function public.rpc_delete_location(
  p_tenant_id uuid,
  p_location_id uuid
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

  perform util.check_rate_limit('location_delete', null, 20, 1, v_user_id, p_tenant_id);

  if not authz.is_tenant_member(v_user_id, p_tenant_id) then
    raise exception using
      message = 'Unauthorized: User is not a member of this tenant',
      errcode = '42501';
  end if;

  select tenant_id into v_location_tenant_id
  from app.locations
  where id = p_location_id;

  if v_location_tenant_id is null then
    raise exception using
      message = 'Location not found',
      errcode = 'P0001';
  end if;

  if v_location_tenant_id != p_tenant_id then
    raise exception using
      message = 'Unauthorized: Location does not belong to this tenant',
      errcode = '42501';
  end if;

  delete from app.locations
  where id = p_location_id;
end;
$$;

comment on function public.rpc_delete_location(uuid, uuid) is 
  'Deletes a location. Requires tenant membership. Validates that the location belongs to the tenant. Child locations and assets referencing this location are handled via foreign key ON DELETE behavior (e.g., parent_location_id/location_id set to NULL). Rate limited to 20 requests per minute per user.';

revoke all on function public.rpc_delete_location(uuid, uuid) from public;
grant execute on function public.rpc_delete_location(uuid, uuid) to authenticated;

-- ============================================================================
-- Asset RPC Functions
-- ============================================================================

create or replace function public.rpc_create_asset(
  p_tenant_id uuid,
  p_name text,
  p_description text default null,
  p_asset_number text default null,
  p_location_id uuid default null,
  p_department_id uuid default null,
  p_status text default 'active'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_asset_id uuid;
begin
  v_user_id := authz.validate_authenticated();

  perform util.check_rate_limit('asset_create', null, 50, 1, v_user_id, p_tenant_id);

  if not authz.is_tenant_member(v_user_id, p_tenant_id) then
    raise exception using
      message = 'Unauthorized: User is not a member of this tenant',
      errcode = '42501';
  end if;

  if length(p_name) < 1 or length(p_name) > 255 then
    raise exception using
      message = 'Asset name must be between 1 and 255 characters',
      errcode = '23514';
  end if;

  insert into app.assets (
    tenant_id,
    name,
    description,
    asset_number,
    location_id,
    department_id,
    status
  )
  values (
    p_tenant_id,
    p_name,
    p_description,
    p_asset_number,
    p_location_id,
    p_department_id,
    p_status
  )
  returning id into v_asset_id;

  return v_asset_id;
end;
$$;

comment on function public.rpc_create_asset(uuid, text, text, text, uuid, uuid, text) is 
  'Creates a new asset in the tenant. Requires tenant membership. Enforces basic name validation; tenant/location/department consistency and status validation are handled by underlying triggers and workflow catalogs. Rate limited to 50 requests per minute per user. Returns the ID of the newly created asset.';

revoke all on function public.rpc_create_asset(uuid, text, text, text, uuid, uuid, text) from public;
grant execute on function public.rpc_create_asset(uuid, text, text, text, uuid, uuid, text) to authenticated;

create or replace function public.rpc_update_asset(
  p_tenant_id uuid,
  p_asset_id uuid,
  p_name text default null,
  p_description text default null,
  p_asset_number text default null,
  p_location_id uuid default null,
  p_department_id uuid default null,
  p_status text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_asset_tenant_id uuid;
begin
  v_user_id := authz.validate_authenticated();

  perform util.check_rate_limit('asset_update', null, 50, 1, v_user_id, p_tenant_id);

  if not authz.is_tenant_member(v_user_id, p_tenant_id) then
    raise exception using
      message = 'Unauthorized: User is not a member of this tenant',
      errcode = '42501';
  end if;

  select tenant_id into v_asset_tenant_id
  from app.assets
  where id = p_asset_id;

  if v_asset_tenant_id is null then
    raise exception using
      message = 'Asset not found',
      errcode = 'P0001';
  end if;

  if v_asset_tenant_id != p_tenant_id then
    raise exception using
      message = 'Unauthorized: Asset does not belong to this tenant',
      errcode = '42501';
  end if;

  if p_name is not null and (length(p_name) < 1 or length(p_name) > 255) then
    raise exception using
      message = 'Asset name must be between 1 and 255 characters',
      errcode = '23514';
  end if;

  update app.assets
  set
    name = coalesce(p_name, name),
    description = coalesce(p_description, description),
    asset_number = coalesce(p_asset_number, asset_number),
    location_id = coalesce(p_location_id, location_id),
    department_id = coalesce(p_department_id, department_id),
    status = coalesce(p_status, status),
    updated_at = pg_catalog.now()
  where id = p_asset_id;
end;
$$;

comment on function public.rpc_update_asset(uuid, uuid, text, text, text, uuid, uuid, text) is 
  'Updates an existing asset. Requires tenant membership. Validates that asset belongs to tenant and basic name constraints; tenant/location/department consistency and status validation are handled by underlying triggers and workflow catalogs. Rate limited to 50 requests per minute per user.';

revoke all on function public.rpc_update_asset(uuid, uuid, text, text, text, uuid, uuid, text) from public;
grant execute on function public.rpc_update_asset(uuid, uuid, text, text, text, uuid, uuid, text) to authenticated;

create or replace function public.rpc_delete_asset(
  p_tenant_id uuid,
  p_asset_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_asset_tenant_id uuid;
begin
  v_user_id := authz.validate_authenticated();

  perform util.check_rate_limit('asset_delete', null, 20, 1, v_user_id, p_tenant_id);

  if not authz.is_tenant_member(v_user_id, p_tenant_id) then
    raise exception using
      message = 'Unauthorized: User is not a member of this tenant',
      errcode = '42501';
  end if;

  select tenant_id into v_asset_tenant_id
  from app.assets
  where id = p_asset_id;

  if v_asset_tenant_id is null then
    raise exception using
      message = 'Asset not found',
      errcode = 'P0001';
  end if;

  if v_asset_tenant_id != p_tenant_id then
    raise exception using
      message = 'Unauthorized: Asset does not belong to this tenant',
      errcode = '42501';
  end if;

  delete from app.assets
  where id = p_asset_id;
end;
$$;

comment on function public.rpc_delete_asset(uuid, uuid) is 
  'Deletes an asset. Requires tenant membership. Validates that asset belongs to the tenant. Work orders referencing this asset keep their records but have asset_id set to NULL via foreign key behavior. Rate limited to 20 requests per minute per user.';

revoke all on function public.rpc_delete_asset(uuid, uuid) from public;
grant execute on function public.rpc_delete_asset(uuid, uuid) to authenticated;

-- ============================================================================
-- Meter RPC Functions
-- ============================================================================

create or replace function public.rpc_create_meter(
  p_tenant_id uuid,
  p_asset_id uuid,
  p_meter_type text,
  p_name text,
  p_unit text,
  p_current_reading numeric default 0,
  p_reading_direction text default 'increasing',
  p_decimal_places integer default 0,
  p_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_meter_id uuid;
  v_asset_tenant_id uuid;
begin
  perform util.check_rate_limit('meter_create', null, 20, 1, auth.uid(), p_tenant_id);
  
  v_user_id := authz.rpc_setup(p_tenant_id, 'asset.edit');

  -- Validate asset belongs to tenant
  select tenant_id into v_asset_tenant_id
  from app.assets
  where id = p_asset_id;

  if not found then
    raise exception using
      message = format('Asset %s not found', p_asset_id),
      errcode = 'P0001';
  end if;

  if v_asset_tenant_id != p_tenant_id then
    raise exception using
      message = 'Unauthorized: Asset does not belong to this tenant',
      errcode = '42501';
  end if;

  -- Validate meter_type
  if p_meter_type not in ('runtime_hours', 'cycles', 'miles', 'production_units', 'custom') then
    raise exception using
      message = format('Invalid meter_type: %s', p_meter_type),
      errcode = '23514';
  end if;

  -- Validate name length
  if length(p_name) < 1 or length(p_name) > 255 then
    raise exception using
      message = 'Meter name must be between 1 and 255 characters',
      errcode = '23514';
  end if;

  -- Validate unit length
  if length(p_unit) < 1 or length(p_unit) > 50 then
    raise exception using
      message = 'Meter unit must be between 1 and 50 characters',
      errcode = '23514';
  end if;

  -- Validate reading_direction
  if p_reading_direction not in ('increasing', 'decreasing', 'reset') then
    raise exception using
      message = format('Invalid reading_direction: %s', p_reading_direction),
      errcode = '23514';
  end if;

  -- Validate decimal_places
  if p_decimal_places is not null and (p_decimal_places < 0 or p_decimal_places > 6) then
    raise exception using
      message = 'decimal_places must be between 0 and 6',
      errcode = '23514';
  end if;

  -- Validate current_reading
  if p_current_reading < 0 then
    raise exception using
      message = 'current_reading must be >= 0',
      errcode = '23514';
  end if;

  insert into app.asset_meters (
    tenant_id,
    asset_id,
    meter_type,
    name,
    unit,
    current_reading,
    reading_direction,
    decimal_places,
    description
  )
  values (
    p_tenant_id,
    p_asset_id,
    p_meter_type,
    p_name,
    p_unit,
    p_current_reading,
    p_reading_direction,
    p_decimal_places,
    p_description
  )
  returning id into v_meter_id;

  return v_meter_id;
end;
$$;

comment on function public.rpc_create_meter(uuid, uuid, text, text, text, numeric, text, integer, text) is 
  'Creates new meter for asset. Validates asset belongs to tenant, meter_type is valid, name is unique per asset. Requires asset.edit permission. Rate limited to 20 requests per minute per user. Returns the UUID of the created meter.';

revoke all on function public.rpc_create_meter(uuid, uuid, text, text, text, numeric, text, integer, text) from public;
grant execute on function public.rpc_create_meter(uuid, uuid, text, text, text, numeric, text, integer, text) to authenticated;

create or replace function public.rpc_update_meter(
  p_tenant_id uuid,
  p_meter_id uuid,
  p_name text default null,
  p_unit text default null,
  p_reading_direction text default null,
  p_decimal_places integer default null,
  p_description text default null,
  p_is_active boolean default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_meter_tenant_id uuid;
begin
  perform util.check_rate_limit('meter_update', null, 20, 1, auth.uid(), p_tenant_id);
  
  v_user_id := authz.rpc_setup(p_tenant_id, 'asset.edit');

  -- Validate meter belongs to tenant
  select tenant_id into v_meter_tenant_id
  from app.asset_meters
  where id = p_meter_id;

  if not found then
    raise exception using
      message = format('Meter %s not found', p_meter_id),
      errcode = 'P0001';
  end if;

  if v_meter_tenant_id != p_tenant_id then
    raise exception using
      message = 'Unauthorized: Meter does not belong to this tenant',
      errcode = '42501';
  end if;

  -- Validate name length if provided
  if p_name is not null and (length(p_name) < 1 or length(p_name) > 255) then
    raise exception using
      message = 'Meter name must be between 1 and 255 characters',
      errcode = '23514';
  end if;

  -- Validate unit length if provided
  if p_unit is not null and (length(p_unit) < 1 or length(p_unit) > 50) then
    raise exception using
      message = 'Meter unit must be between 1 and 50 characters',
      errcode = '23514';
  end if;

  -- Validate reading_direction if provided
  if p_reading_direction is not null and p_reading_direction not in ('increasing', 'decreasing', 'reset') then
    raise exception using
      message = format('Invalid reading_direction: %s', p_reading_direction),
      errcode = '23514';
  end if;

  -- Validate decimal_places if provided
  if p_decimal_places is not null and (p_decimal_places < 0 or p_decimal_places > 6) then
    raise exception using
      message = 'decimal_places must be between 0 and 6',
      errcode = '23514';
  end if;

  -- Check if meter is referenced by active PM schedules before deactivating
  if p_is_active = false then
    if exists (
      select 1
      from app.pm_schedules
      where trigger_type = 'usage'
        and (trigger_config->>'meter_id')::uuid = p_meter_id
        and is_active = true
    ) then
      raise exception using
        message = 'Cannot deactivate meter: Active PM schedules reference this meter',
        errcode = '23503';
    end if;
  end if;

  update app.asset_meters
  set
    name = coalesce(p_name, name),
    unit = coalesce(p_unit, unit),
    reading_direction = coalesce(p_reading_direction, reading_direction),
    decimal_places = coalesce(p_decimal_places, decimal_places),
    description = coalesce(p_description, description),
    is_active = coalesce(p_is_active, is_active),
    updated_at = pg_catalog.now()
  where id = p_meter_id;
end;
$$;

comment on function public.rpc_update_meter(uuid, uuid, text, text, text, integer, text, boolean) is 
  'Updates meter configuration. Cannot change meter_type or current_reading (use record_reading for that). Validates no active PM schedules reference meter before deactivating. Requires asset.edit permission. Rate limited to 20 requests per minute per user.';

revoke all on function public.rpc_update_meter(uuid, uuid, text, text, text, integer, text, boolean) from public;
grant execute on function public.rpc_update_meter(uuid, uuid, text, text, text, integer, text, boolean) to authenticated;

create or replace function public.rpc_record_meter_reading(
  p_tenant_id uuid,
  p_meter_id uuid,
  p_reading_value numeric,
  p_reading_date timestamptz default null,
  p_reading_type text default 'manual',
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_reading_id uuid;
  v_meter app.asset_meters%rowtype;
  v_pm_schedule app.pm_schedules%rowtype;
  v_threshold numeric;
  v_current_reading numeric;
begin
  perform util.check_rate_limit('meter_reading_record', null, 50, 1, auth.uid(), p_tenant_id);
  
  v_user_id := authz.rpc_setup(p_tenant_id, 'asset.edit');

  -- Validate meter belongs to tenant
  select * into v_meter
  from app.asset_meters
  where id = p_meter_id;

  if not found then
    raise exception using
      message = format('Meter %s not found', p_meter_id),
      errcode = 'P0001';
  end if;

  if v_meter.tenant_id != p_tenant_id then
    raise exception using
      message = 'Unauthorized: Meter does not belong to this tenant',
      errcode = '42501';
  end if;

  -- Validate reading_type
  if p_reading_type not in ('manual', 'automated', 'imported', 'estimated') then
    raise exception using
      message = format('Invalid reading_type: %s', p_reading_type),
      errcode = '23514';
  end if;

  -- Use provided reading_date or default to now
  if p_reading_date is null then
    p_reading_date := pg_catalog.now();
  end if;

  -- Validate reading_date range (allow up to 7 days in future, 90 days in past)
  if p_reading_date > pg_catalog.now() + interval '7 days' then
    raise exception using
      message = 'Reading date cannot be more than 7 days in the future',
      errcode = '23514';
  end if;

  if p_reading_date < pg_catalog.now() - interval '90 days' then
    raise exception using
      message = 'Reading date cannot be more than 90 days in the past',
      errcode = '23514';
  end if;

  -- Insert reading (trigger will validate and update meter)
  insert into app.meter_readings (
    tenant_id,
    meter_id,
    reading_value,
    reading_date,
    reading_type,
    notes,
    recorded_by
  )
  values (
    p_tenant_id,
    p_meter_id,
    p_reading_value,
    p_reading_date,
    p_reading_type,
    p_notes,
    v_user_id
  )
  returning id into v_reading_id;

  -- Get updated meter reading
  select current_reading into v_current_reading
  from app.asset_meters
  where id = p_meter_id;

  -- Check usage-based PM schedules
  for v_pm_schedule in
    select ps.*
    from app.pm_schedules ps
    where ps.tenant_id = p_tenant_id
      and ps.trigger_type = 'usage'
      and ps.is_active = true
      and ps.auto_generate = true
      and (ps.trigger_config->>'meter_id')::uuid = p_meter_id
  loop
    v_threshold := (v_pm_schedule.trigger_config->>'threshold')::numeric;
    
    if v_threshold is not null and v_current_reading >= v_threshold then
      -- Check if PM is due and dependencies are met
      if pm.is_pm_due(v_pm_schedule) and pm.check_pm_dependencies(v_pm_schedule.id) then
        -- Generate work order
        perform pm.generate_pm_work_order(v_pm_schedule.id);
      end if;
    end if;
  end loop;

  return v_reading_id;
end;
$$;

comment on function public.rpc_record_meter_reading(uuid, uuid, numeric, timestamptz, text, text) is 
  'Records new meter reading. Validates reading, updates meter current_reading, creates reading history record, triggers PM usage-based checks. Requires asset.edit permission. Rate limited to 50 requests per minute per user. Returns the UUID of the created reading.';

revoke all on function public.rpc_record_meter_reading(uuid, uuid, numeric, timestamptz, text, text) from public;
grant execute on function public.rpc_record_meter_reading(uuid, uuid, numeric, timestamptz, text, text) to authenticated;

create or replace function public.rpc_delete_meter(
  p_tenant_id uuid,
  p_meter_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_meter_tenant_id uuid;
begin
  perform util.check_rate_limit('meter_delete', null, 10, 1, auth.uid(), p_tenant_id);
  
  v_user_id := authz.rpc_setup(p_tenant_id, 'asset.edit');

  -- Validate meter belongs to tenant
  select tenant_id into v_meter_tenant_id
  from app.asset_meters
  where id = p_meter_id;

  if not found then
    raise exception using
      message = format('Meter %s not found', p_meter_id),
      errcode = 'P0001';
  end if;

  if v_meter_tenant_id != p_tenant_id then
    raise exception using
      message = 'Unauthorized: Meter does not belong to this tenant',
      errcode = '42501';
  end if;

  -- Validate no active PM schedules reference this meter
  if exists (
    select 1
    from app.pm_schedules
    where trigger_type = 'usage'
      and (trigger_config->>'meter_id')::uuid = p_meter_id
      and is_active = true
  ) then
    raise exception using
      message = 'Cannot delete meter: Active PM schedules reference this meter',
      errcode = '23503';
  end if;

  -- Soft delete (set is_active = false)
  update app.asset_meters
  set
    is_active = false,
    updated_at = pg_catalog.now()
  where id = p_meter_id;
end;
$$;

comment on function public.rpc_delete_meter(uuid, uuid) is 
  'Soft deletes meter (sets is_active = false). Validates no active PM schedules reference this meter. Requires asset.edit permission. Rate limited to 10 requests per minute per user.';

revoke all on function public.rpc_delete_meter(uuid, uuid) from public;
grant execute on function public.rpc_delete_meter(uuid, uuid) to authenticated;

-- ============================================================================
-- PM Template RPC Functions
-- ============================================================================

create or replace function public.rpc_create_pm_template(
  p_tenant_id uuid,
  p_name text,
  p_trigger_type text,
  p_trigger_config jsonb,
  p_description text default null,
  p_estimated_hours numeric default null,
  p_wo_title text default null,
  p_wo_description text default null,
  p_wo_priority text default null,
  p_wo_estimated_hours numeric default null,
  p_checklist_items jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_template_id uuid;
  v_wo_title text;
  v_wo_description text;
  v_wo_priority text;
  v_wo_estimated_hours numeric;
  v_checklist_item jsonb;
  v_item_ordinality integer;
begin
  perform util.check_rate_limit('pm_template_create', null, 20, 1, auth.uid(), p_tenant_id);
  
  v_user_id := authz.rpc_setup(p_tenant_id, 'tenant.admin');

  -- Validate name length
  if length(p_name) < 1 or length(p_name) > 255 then
    raise exception using
      message = 'Template name must be between 1 and 255 characters',
      errcode = '23514';
  end if;

  -- Validate trigger_type
  if p_trigger_type not in ('time', 'usage', 'calendar', 'condition', 'manual') then
    raise exception using
      message = format('Invalid trigger_type: %s', p_trigger_type),
      errcode = '23514';
  end if;

  -- Validate trigger_config
  perform pm.validate_trigger_config(p_trigger_type, p_trigger_config);

  -- Use structured parameters
  v_wo_title := p_wo_title;
  v_wo_description := p_wo_description;
  v_wo_priority := p_wo_priority;
  v_wo_estimated_hours := coalesce(p_wo_estimated_hours, p_estimated_hours);

  -- Validate wo_priority if provided
  if v_wo_priority is not null then
    if not exists (
      select 1
      from cfg.priority_catalogs
      where tenant_id = p_tenant_id
        and entity_type = 'work_order'
        and key = v_wo_priority
    ) then
      raise exception using
        message = format('Invalid priority: %s. Priority must exist in tenant priority catalog for work_order entity type.', v_wo_priority),
        errcode = '23503';
    end if;
  end if;

  -- Insert template
  insert into cfg.pm_templates (
    tenant_id,
    name,
    description,
    trigger_type,
    trigger_config,
    wo_title,
    wo_description,
    wo_priority,
    wo_estimated_hours
  )
  values (
    p_tenant_id,
    p_name,
    p_description,
    p_trigger_type,
    p_trigger_config,
    v_wo_title,
    v_wo_description,
    v_wo_priority,
    v_wo_estimated_hours
  )
  returning id into v_template_id;

  -- Insert checklist items
  if p_checklist_items is not null and jsonb_typeof(p_checklist_items) = 'array' then
    for v_checklist_item, v_item_ordinality in 
      select value, ordinality
      from jsonb_array_elements(p_checklist_items) with ordinality as t(value, ordinality)
    loop
      if v_checklist_item->>'description' is not null 
         and length((v_checklist_item->>'description')::text) >= 1 then
        insert into cfg.pm_template_checklist_items (
          template_id,
          description,
          required,
          display_order
        )
        values (
          v_template_id,
          (v_checklist_item->>'description')::text,
          coalesce((v_checklist_item->>'required')::boolean, false),
          v_item_ordinality - 1
        );
      end if;
    end loop;
  end if;

  return v_template_id;
end;
$$;

comment on function public.rpc_create_pm_template(uuid, text, text, jsonb, text, numeric, text, text, text, numeric, jsonb) is 
  'Creates reusable PM template. Validates trigger_config. Accepts structured wo_* parameters and checklist_items JSONB array. Requires tenant.admin permission. Rate limited to 20 requests per minute per user. Returns the UUID of the created template.';

revoke all on function public.rpc_create_pm_template(uuid, text, text, jsonb, text, numeric, text, text, text, numeric, jsonb) from public;
grant execute on function public.rpc_create_pm_template(uuid, text, text, jsonb, text, numeric, text, text, text, numeric, jsonb) to authenticated;

create or replace function public.rpc_update_pm_template(
  p_tenant_id uuid,
  p_template_id uuid,
  p_name text default null,
  p_description text default null,
  p_trigger_config jsonb default null,
  p_estimated_hours numeric default null,
  p_wo_title text default null,
  p_wo_description text default null,
  p_wo_priority text default null,
  p_wo_estimated_hours numeric default null,
  p_checklist_items jsonb default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_template_tenant_id uuid;
  v_trigger_type text;
  v_wo_title text;
  v_wo_description text;
  v_wo_priority text;
  v_wo_estimated_hours numeric;
  v_checklist_item jsonb;
  v_item_ordinality integer;
begin
  perform util.check_rate_limit('pm_template_update', null, 20, 1, auth.uid(), p_tenant_id);
  
  v_user_id := authz.rpc_setup(p_tenant_id, 'tenant.admin');

  -- Validate template belongs to tenant
  select tenant_id, trigger_type into v_template_tenant_id, v_trigger_type
  from cfg.pm_templates
  where id = p_template_id;

  if not found then
    raise exception using
      message = format('PM template %s not found', p_template_id),
      errcode = 'P0001';
  end if;

  if v_template_tenant_id != p_tenant_id then
    raise exception using
      message = 'Unauthorized: PM template does not belong to this tenant',
      errcode = '42501';
  end if;

  -- Validate name length if provided
  if p_name is not null and (length(p_name) < 1 or length(p_name) > 255) then
    raise exception using
      message = 'Template name must be between 1 and 255 characters',
      errcode = '23514';
  end if;

  -- Validate trigger_config if provided
  if p_trigger_config is not null then
    perform pm.validate_trigger_config(v_trigger_type, p_trigger_config);
  end if;

  -- Use structured parameters
  v_wo_title := p_wo_title;
  v_wo_description := p_wo_description;
  v_wo_priority := p_wo_priority;
  v_wo_estimated_hours := coalesce(p_wo_estimated_hours, p_estimated_hours);

  -- Validate wo_priority if provided
  if v_wo_priority is not null then
    if not exists (
      select 1
      from cfg.priority_catalogs
      where tenant_id = p_tenant_id
        and entity_type = 'work_order'
        and key = v_wo_priority
    ) then
      raise exception using
        message = format('Invalid priority: %s. Priority must exist in tenant priority catalog for work_order entity type.', v_wo_priority),
        errcode = '23503';
    end if;
  end if;

  -- Update template
  update cfg.pm_templates
  set
    name = coalesce(p_name, name),
    description = coalesce(p_description, description),
    trigger_config = coalesce(p_trigger_config, trigger_config),
    wo_title = coalesce(v_wo_title, wo_title),
    wo_description = coalesce(v_wo_description, wo_description),
    wo_priority = coalesce(v_wo_priority, wo_priority),
    wo_estimated_hours = coalesce(v_wo_estimated_hours, wo_estimated_hours),
    updated_at = pg_catalog.now()
  where id = p_template_id;

  -- Update checklist items if provided
  if p_checklist_items is not null then
    -- Delete existing checklist items
    delete from cfg.pm_template_checklist_items
    where template_id = p_template_id;

    -- Insert new checklist items
    if jsonb_typeof(p_checklist_items) = 'array' then
      for v_checklist_item, v_item_ordinality in 
        select value, ordinality
        from jsonb_array_elements(p_checklist_items) with ordinality as t(value, ordinality)
      loop
        if v_checklist_item->>'description' is not null 
           and length((v_checklist_item->>'description')::text) >= 1 then
          insert into cfg.pm_template_checklist_items (
            template_id,
            description,
            required,
            display_order
          )
          values (
            p_template_id,
            (v_checklist_item->>'description')::text,
            coalesce((v_checklist_item->>'required')::boolean, false),
            v_item_ordinality - 1
          );
        end if;
      end loop;
    end if;
  end if;
end;
$$;

comment on function public.rpc_update_pm_template(uuid, uuid, text, text, jsonb, numeric, text, text, text, numeric, jsonb) is 
  'Updates PM template. Validates trigger_config. Accepts structured wo_* parameters and checklist_items JSONB array. Updates checklist items by deleting existing and inserting new. Requires tenant.admin permission. Rate limited to 20 requests per minute per user.';

revoke all on function public.rpc_update_pm_template(uuid, uuid, text, text, jsonb, numeric, text, text, text, numeric, jsonb) from public;
grant execute on function public.rpc_update_pm_template(uuid, uuid, text, text, jsonb, numeric, text, text, text, numeric, jsonb) to authenticated;

-- ============================================================================
-- PM Schedule RPC Functions
-- ============================================================================

create or replace function public.rpc_create_pm_schedule(
  p_tenant_id uuid,
  p_asset_id uuid,
  p_title text,
  p_trigger_type text,
  p_trigger_config jsonb,
  p_description text default null,
  p_template_id uuid default null,
  p_auto_generate boolean default true,
  p_estimated_hours numeric default null,
  p_wo_title text default null,
  p_wo_description text default null,
  p_wo_priority text default null,
  p_wo_estimated_hours numeric default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_pm_schedule_id uuid;
  v_asset_tenant_id uuid;
  v_template_tenant_id uuid;
  v_meter_id uuid;
  v_pm_schedule app.pm_schedules%rowtype;
  v_wo_title text;
  v_wo_description text;
  v_wo_priority text;
  v_wo_estimated_hours numeric;
begin
  perform util.check_rate_limit('pm_schedule_create', null, 20, 1, auth.uid(), p_tenant_id);
  
  v_user_id := authz.rpc_setup(p_tenant_id, 'workorder.create');

  -- Validate asset belongs to tenant
  select tenant_id into v_asset_tenant_id
  from app.assets
  where id = p_asset_id;

  if not found then
    raise exception using
      message = format('Asset %s not found', p_asset_id),
      errcode = 'P0001';
  end if;

  if v_asset_tenant_id != p_tenant_id then
    raise exception using
      message = 'Unauthorized: Asset does not belong to this tenant',
      errcode = '42501';
  end if;

  -- Validate template if provided
  if p_template_id is not null then
    select tenant_id into v_template_tenant_id
    from cfg.pm_templates
    where id = p_template_id;

    if not found then
      raise exception using
        message = format('PM template %s not found', p_template_id),
        errcode = 'P0001';
    end if;

    if v_template_tenant_id != p_tenant_id then
      raise exception using
        message = 'Unauthorized: PM template does not belong to this tenant',
        errcode = '42501';
    end if;
  end if;

  -- Validate trigger_type
  if p_trigger_type not in ('time', 'usage', 'calendar', 'condition', 'manual') then
    raise exception using
      message = format('Invalid trigger_type: %s', p_trigger_type),
      errcode = '23514';
  end if;

  -- Validate trigger_config
  perform pm.validate_trigger_config(p_trigger_type, p_trigger_config);

  -- Validate meter exists for usage triggers
  if p_trigger_type = 'usage' then
    v_meter_id := (p_trigger_config->>'meter_id')::uuid;
    
    if v_meter_id is null then
      raise exception using
        message = 'Usage-based trigger requires meter_id in trigger_config',
        errcode = '23514';
    end if;

    if not exists (
      select 1
      from app.asset_meters
      where id = v_meter_id
        and tenant_id = p_tenant_id
        and asset_id = p_asset_id
        and is_active = true
    ) then
      raise exception using
        message = format('Meter %s not found or not active for this asset', v_meter_id),
        errcode = '23503';
    end if;
  end if;

  -- Validate title length
  if length(p_title) < 1 or length(p_title) > 500 then
    raise exception using
      message = 'PM schedule title must be between 1 and 500 characters',
      errcode = '23514';
  end if;

  -- Use structured parameters
  v_wo_title := p_wo_title;
  v_wo_description := p_wo_description;
  v_wo_priority := p_wo_priority;
  v_wo_estimated_hours := coalesce(p_wo_estimated_hours, p_estimated_hours);

  -- Validate wo_priority if provided
  if v_wo_priority is not null then
    if not exists (
      select 1
      from cfg.priority_catalogs
      where tenant_id = p_tenant_id
        and entity_type = 'work_order'
        and key = v_wo_priority
    ) then
      raise exception using
        message = format('Invalid priority: %s. Priority must exist in tenant priority catalog for work_order entity type.', v_wo_priority),
        errcode = '23503';
    end if;
  end if;

  -- Insert PM schedule
  insert into app.pm_schedules (
    tenant_id,
    asset_id,
    template_id,
    title,
    description,
    trigger_type,
    trigger_config,
    wo_title,
    wo_description,
    wo_priority,
    wo_estimated_hours,
    auto_generate
  )
  values (
    p_tenant_id,
    p_asset_id,
    p_template_id,
    p_title,
    p_description,
    p_trigger_type,
    p_trigger_config,
    v_wo_title,
    v_wo_description,
    v_wo_priority,
    v_wo_estimated_hours,
    p_auto_generate
  )
  returning id into v_pm_schedule_id;

  -- Get the PM schedule to calculate next_due_date
  select * into v_pm_schedule
  from app.pm_schedules
  where id = v_pm_schedule_id;

  -- Calculate initial next_due_date
  update app.pm_schedules
  set
    next_due_date = pm.calculate_next_due_date(
      v_pm_schedule,
      null
    ),
    updated_at = pg_catalog.now()
  where id = v_pm_schedule_id;

  return v_pm_schedule_id;
end;
$$;

comment on function public.rpc_create_pm_schedule(uuid, uuid, text, text, jsonb, text, uuid, boolean, numeric, text, text, text, numeric) is 
  'Creates PM schedule for asset. Validates trigger_config, calculates initial next_due_date, validates meter exists for usage triggers. Accepts structured wo_* parameters and p_estimated_hours for backward compatibility. Requires workorder.create permission. Rate limited to 20 requests per minute per user. Returns the UUID of the created PM schedule.';

revoke all on function public.rpc_create_pm_schedule(uuid, uuid, text, text, jsonb, text, uuid, boolean, numeric, text, text, text, numeric) from public;
grant execute on function public.rpc_create_pm_schedule(uuid, uuid, text, text, jsonb, text, uuid, boolean, numeric, text, text, text, numeric) to authenticated;

create or replace function public.rpc_update_pm_schedule(
  p_tenant_id uuid,
  p_pm_schedule_id uuid,
  p_title text default null,
  p_description text default null,
  p_trigger_config jsonb default null,
  p_auto_generate boolean default null,
  p_is_active boolean default null,
  p_estimated_hours numeric default null,
  p_wo_title text default null,
  p_wo_description text default null,
  p_wo_priority text default null,
  p_wo_estimated_hours numeric default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_pm_schedule_tenant_id uuid;
  v_trigger_type text;
  v_pm_schedule app.pm_schedules%rowtype;
  v_wo_title text;
  v_wo_description text;
  v_wo_priority text;
  v_wo_estimated_hours numeric;
  v_new_next_due_date timestamptz;
begin
  perform util.check_rate_limit('pm_schedule_update', null, 20, 1, auth.uid(), p_tenant_id);
  
  v_user_id := authz.rpc_setup(p_tenant_id, 'workorder.create');

  -- Validate PM schedule belongs to tenant
  select tenant_id, trigger_type into v_pm_schedule_tenant_id, v_trigger_type
  from app.pm_schedules
  where id = p_pm_schedule_id;

  if not found then
    raise exception using
      message = format('PM schedule %s not found', p_pm_schedule_id),
      errcode = 'P0001';
  end if;

  if v_pm_schedule_tenant_id != p_tenant_id then
    raise exception using
      message = 'Unauthorized: PM schedule does not belong to this tenant',
      errcode = '42501';
  end if;

  -- Validate title length if provided
  if p_title is not null and (length(p_title) < 1 or length(p_title) > 500) then
    raise exception using
      message = 'PM schedule title must be between 1 and 500 characters',
      errcode = '23514';
  end if;

  -- Validate trigger_config if provided
  if p_trigger_config is not null then
    perform pm.validate_trigger_config(v_trigger_type, p_trigger_config);
  end if;

  -- Use structured parameters
  v_wo_title := p_wo_title;
  v_wo_description := p_wo_description;
  v_wo_priority := p_wo_priority;
  v_wo_estimated_hours := coalesce(p_wo_estimated_hours, p_estimated_hours);

  -- Validate wo_priority if provided
  if v_wo_priority is not null then
    if not exists (
      select 1
      from cfg.priority_catalogs
      where tenant_id = p_tenant_id
        and entity_type = 'work_order'
        and key = v_wo_priority
    ) then
      raise exception using
        message = format('Invalid priority: %s. Priority must exist in tenant priority catalog for work_order entity type.', v_wo_priority),
        errcode = '23503';
    end if;
  end if;

  -- Get current PM schedule for recalculation
  select * into v_pm_schedule
  from app.pm_schedules
  where id = p_pm_schedule_id;

  -- Update PM schedule
  update app.pm_schedules
  set
    title = coalesce(p_title, title),
    description = coalesce(p_description, description),
    trigger_config = coalesce(p_trigger_config, trigger_config),
    wo_title = coalesce(v_wo_title, wo_title),
    wo_description = coalesce(v_wo_description, wo_description),
    wo_priority = coalesce(v_wo_priority, wo_priority),
    wo_estimated_hours = coalesce(v_wo_estimated_hours, wo_estimated_hours),
    auto_generate = coalesce(p_auto_generate, auto_generate),
    is_active = coalesce(p_is_active, is_active),
    updated_at = pg_catalog.now()
  where id = p_pm_schedule_id;

  -- Recalculate next_due_date if trigger_config changed
  if p_trigger_config is not null then
    -- Get updated schedule
    select * into v_pm_schedule
    from app.pm_schedules
    where id = p_pm_schedule_id;

    -- Recalculate next_due_date using the updated trigger_config
    v_new_next_due_date := pm.calculate_next_due_date(
      v_pm_schedule,
      v_pm_schedule.last_completed_at
    );

    update app.pm_schedules
    set
      next_due_date = v_new_next_due_date,
      updated_at = pg_catalog.now()
    where id = p_pm_schedule_id;
  end if;
end;
$$;

comment on function public.rpc_update_pm_schedule(uuid, uuid, text, text, jsonb, boolean, boolean, numeric, text, text, text, numeric) is 
  'Updates PM schedule. Recalculates next_due_date if trigger_config is provided (even if unchanged). Accepts structured wo_* parameters and p_estimated_hours for backward compatibility. Requires workorder.create permission. Rate limited to 20 requests per minute per user.';

revoke all on function public.rpc_update_pm_schedule(uuid, uuid, text, text, jsonb, boolean, boolean, numeric, text, text, text, numeric) from public;
grant execute on function public.rpc_update_pm_schedule(uuid, uuid, text, text, jsonb, boolean, boolean, numeric, text, text, text, numeric) to authenticated;

create or replace function public.rpc_delete_pm_schedule(
  p_tenant_id uuid,
  p_pm_schedule_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_pm_schedule_tenant_id uuid;
begin
  perform util.check_rate_limit('pm_schedule_delete', null, 10, 1, auth.uid(), p_tenant_id);
  
  v_user_id := authz.rpc_setup(p_tenant_id, 'workorder.create');

  -- Validate PM schedule belongs to tenant
  select tenant_id into v_pm_schedule_tenant_id
  from app.pm_schedules
  where id = p_pm_schedule_id;

  if not found then
    raise exception using
      message = format('PM schedule %s not found', p_pm_schedule_id),
      errcode = 'P0001';
  end if;

  if v_pm_schedule_tenant_id != p_tenant_id then
    raise exception using
      message = 'Unauthorized: PM schedule does not belong to this tenant',
      errcode = '42501';
  end if;

  -- Validate no active dependencies
  if exists (
    select 1
    from app.pm_dependencies
    where pm_schedule_id = p_pm_schedule_id
      or depends_on_pm_id = p_pm_schedule_id
  ) then
    raise exception using
      message = 'Cannot delete PM schedule: Active dependencies exist',
      errcode = '23503';
  end if;

  -- Soft delete (set is_active = false)
  update app.pm_schedules
  set
    is_active = false,
    updated_at = pg_catalog.now()
  where id = p_pm_schedule_id;
end;
$$;

comment on function public.rpc_delete_pm_schedule(uuid, uuid) is 
  'Soft deletes PM schedule (sets is_active = false). Validates no active dependencies. Requires workorder.create permission. Rate limited to 10 requests per minute per user.';

revoke all on function public.rpc_delete_pm_schedule(uuid, uuid) from public;
grant execute on function public.rpc_delete_pm_schedule(uuid, uuid) to authenticated;

create or replace function public.rpc_generate_due_pms(
  p_tenant_id uuid,
  p_limit integer default 100
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_pm_schedule app.pm_schedules%rowtype;
  v_generated_count integer := 0;
begin
  perform util.check_rate_limit('pm_generate_due', null, 10, 1, auth.uid(), p_tenant_id);
  
  v_user_id := authz.rpc_setup(p_tenant_id, 'workorder.create');

  -- Find due PMs and generate work orders
  for v_pm_schedule in
    select ps.*
    from app.pm_schedules ps
    where ps.tenant_id = p_tenant_id
      and ps.is_active = true
      and ps.auto_generate = true
      and ps.next_due_date is not null
      and ps.next_due_date <= pg_catalog.now()
      and pm.is_pm_due(ps)
    order by ps.next_due_date asc
    limit p_limit
  loop
    -- Check dependencies
    if pm.check_pm_dependencies(v_pm_schedule.id) then
      -- Generate work order
      perform pm.generate_pm_work_order(v_pm_schedule.id);
      v_generated_count := v_generated_count + 1;
    end if;
  end loop;

  return v_generated_count;
end;
$$;

comment on function public.rpc_generate_due_pms(uuid, integer) is 
  'Batch function to generate work orders for due PMs. Finds PMs where next_due_date <= now() and is_due() = true, checks dependencies, generates WOs, updates next_due_date. Returns count of generated WOs. Requires workorder.create permission. Rate limited to 10 requests per minute per user.';

revoke all on function public.rpc_generate_due_pms(uuid, integer) from public;
grant execute on function public.rpc_generate_due_pms(uuid, integer) to authenticated;

create or replace function public.rpc_trigger_manual_pm(
  p_tenant_id uuid,
  p_pm_schedule_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_pm_schedule app.pm_schedules%rowtype;
  v_work_order_id uuid;
begin
  perform util.check_rate_limit('pm_trigger_manual', null, 20, 1, auth.uid(), p_tenant_id);
  
  v_user_id := authz.rpc_setup(p_tenant_id, 'workorder.create');

  -- Validate PM schedule belongs to tenant
  select * into v_pm_schedule
  from app.pm_schedules
  where id = p_pm_schedule_id;

  if not found then
    raise exception using
      message = format('PM schedule %s not found', p_pm_schedule_id),
      errcode = 'P0001';
  end if;

  if v_pm_schedule.tenant_id != p_tenant_id then
    raise exception using
      message = 'Unauthorized: PM schedule does not belong to this tenant',
      errcode = '42501';
  end if;

  -- Validate trigger type is manual
  if v_pm_schedule.trigger_type != 'manual' then
    raise exception using
      message = format('PM schedule trigger_type must be "manual", got: %s', v_pm_schedule.trigger_type),
      errcode = '23514';
  end if;

  -- Check if PM is active
  if not v_pm_schedule.is_active then
    raise exception using
      message = 'PM schedule is not active',
      errcode = '23503';
  end if;

  -- Check dependencies
  if not pm.check_pm_dependencies(p_pm_schedule_id) then
    raise exception using
      message = 'PM dependencies not satisfied',
      errcode = '23503';
  end if;

  -- Generate work order
  v_work_order_id := pm.generate_pm_work_order(p_pm_schedule_id);

  return v_work_order_id;
end;
$$;

comment on function public.rpc_trigger_manual_pm(uuid, uuid) is 
  'Manually triggers a manual-type PM schedule. Generates work order immediately. Requires workorder.create permission. Rate limited to 20 requests per minute per user. Returns the UUID of the generated work order.';

revoke all on function public.rpc_trigger_manual_pm(uuid, uuid) from public;
grant execute on function public.rpc_trigger_manual_pm(uuid, uuid) to authenticated;

create or replace function public.rpc_create_pm_dependency(
  p_tenant_id uuid,
  p_pm_schedule_id uuid,
  p_depends_on_pm_id uuid,
  p_dependency_type text default 'after'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_dependency_id uuid;
  v_pm_tenant_id uuid;
  v_depends_on_tenant_id uuid;
begin
  perform util.check_rate_limit('pm_dependency_create', null, 20, 1, auth.uid(), p_tenant_id);
  
  v_user_id := authz.rpc_setup(p_tenant_id, 'workorder.create');

  -- Validate dependency_type
  if p_dependency_type not in ('before', 'after', 'same_day') then
    raise exception using
      message = format('Invalid dependency_type: %s', p_dependency_type),
      errcode = '23514';
  end if;

  -- Validate PM schedules belong to tenant
  select tenant_id into v_pm_tenant_id
  from app.pm_schedules
  where id = p_pm_schedule_id;

  if not found then
    raise exception using
      message = format('PM schedule %s not found', p_pm_schedule_id),
      errcode = 'P0001';
  end if;

  select tenant_id into v_depends_on_tenant_id
  from app.pm_schedules
  where id = p_depends_on_pm_id;

  if not found then
    raise exception using
      message = format('PM schedule %s not found', p_depends_on_pm_id),
      errcode = 'P0001';
  end if;

  if v_pm_tenant_id != p_tenant_id or v_depends_on_tenant_id != p_tenant_id then
    raise exception using
      message = 'Unauthorized: PM schedules must belong to this tenant',
      errcode = '42501';
  end if;

  -- Prevent self-dependency
  if p_pm_schedule_id = p_depends_on_pm_id then
    raise exception using
      message = 'PM schedule cannot depend on itself',
      errcode = '23503';
  end if;

  -- Check if dependency already exists
  if exists (
    select 1
    from app.pm_dependencies
    where pm_schedule_id = p_pm_schedule_id
      and depends_on_pm_id = p_depends_on_pm_id
  ) then
    raise exception using
      message = 'PM dependency already exists',
      errcode = '23505';
  end if;

  -- Insert dependency (trigger will validate for cycles)
  insert into app.pm_dependencies (
    tenant_id,
    pm_schedule_id,
    depends_on_pm_id,
    dependency_type
  )
  values (
    p_tenant_id,
    p_pm_schedule_id,
    p_depends_on_pm_id,
    p_dependency_type
  )
  returning id into v_dependency_id;

  return v_dependency_id;
end;
$$;

comment on function public.rpc_create_pm_dependency(uuid, uuid, uuid, text) is 
  'Creates PM dependency. Validates no circular dependencies (via trigger). Requires workorder.create permission. Rate limited to 20 requests per minute per user. Returns the UUID of the created dependency.';

revoke all on function public.rpc_create_pm_dependency(uuid, uuid, uuid, text) from public;
grant execute on function public.rpc_create_pm_dependency(uuid, uuid, uuid, text) to authenticated;

-- ============================================================================
-- Public Views (SECURITY INVOKER)
-- ============================================================================
-- All views use SECURITY INVOKER to properly enforce RLS policies.
-- All views filter by authz.get_current_tenant_id() for tenant isolation.

-- ============================================================================
-- Core Application Views
-- ============================================================================

create or replace view public.v_work_orders
with (security_invoker = true)
as
select 
  wo.id, 
  wo.tenant_id, 
  wo.title, 
  wo.description, 
  wo.status, 
  wo.priority, 
  wo.maintenance_type,
  wo.assigned_to, 
  wo.location_id, 
  wo.asset_id,
  wo.pm_schedule_id,
  wo.due_date, 
  wo.completed_at, 
  wo.completed_by, 
  wo.created_at, 
  wo.updated_at,
  coalesce(
    (
      select sum(tote.minutes)
      from app.work_order_time_entries tote
      where tote.work_order_id = wo.id
        and tote.tenant_id = wo.tenant_id
    ),
    0
  ) as total_labor_minutes
from app.work_orders wo
where wo.tenant_id = authz.get_current_tenant_id();

comment on view public.v_work_orders is 
  'Work orders view scoped to the current tenant context. Uses SECURITY INVOKER to enforce RLS policies correctly. Clients must set tenant context via rpc_set_tenant_context. Underlying table RLS still applies.';

grant select on public.v_work_orders to authenticated;
grant select on public.v_work_orders to anon;

create or replace view public.v_assets
with (security_invoker = true)
as
select 
  a.id, 
  a.tenant_id, 
  a.name, 
  a.description, 
  a.asset_number, 
  a.location_id, 
  a.department_id, 
  a.status,
  a.created_at, 
  a.updated_at
from app.assets a
where a.tenant_id = authz.get_current_tenant_id();

comment on view public.v_assets is 
  'Assets view scoped to the current tenant context. Uses SECURITY INVOKER to enforce RLS policies correctly. Clients must set tenant context via rpc_set_tenant_context. Underlying table RLS still applies.';

grant select on public.v_assets to authenticated;
grant select on public.v_assets to anon;

create or replace view public.v_locations
with (security_invoker = true)
as
select 
  l.id, 
  l.tenant_id, 
  l.name, 
  l.description, 
  l.parent_location_id, 
  l.created_at, 
  l.updated_at
from app.locations l
where l.tenant_id = authz.get_current_tenant_id();

comment on view public.v_locations is 
  'Locations view scoped to the current tenant context. Uses SECURITY INVOKER to enforce RLS policies correctly. Clients must set tenant context via rpc_set_tenant_context. Underlying table RLS still applies.';

grant select on public.v_locations to authenticated;
grant select on public.v_locations to anon;

create or replace view public.v_tenants
with (security_invoker = true)
as
select
  t.id,
  t.name,
  t.slug,
  t.created_at
from app.tenants t
where (select auth.uid()) is not null
  and authz.is_current_user_tenant_member(t.id);

comment on view public.v_tenants is 
  'Tenants the current user belongs to (via tenant_memberships). Uses SECURITY INVOKER to enforce RLS policies correctly. RLS on underlying tables ensures users only see tenants they are members of.';

grant select on public.v_tenants to authenticated;
grant select on public.v_tenants to anon;

create or replace view public.v_departments
with (security_invoker = true)
as
select 
  d.id,
  d.tenant_id,
  d.name,
  d.description,
  d.code,
  d.created_at,
  d.updated_at
from app.departments d
where d.tenant_id = authz.get_current_tenant_id();

comment on view public.v_departments is 
  'Departments view scoped to the current tenant context. Uses SECURITY INVOKER to enforce RLS policies correctly. Clients must set tenant context via rpc_set_tenant_context. Underlying table RLS still applies.';

grant select on public.v_departments to authenticated;
grant select on public.v_departments to anon;

create or replace view public.v_work_order_time_entries
with (security_invoker = true)
as
select
  tote.id,
  tote.tenant_id,
  tote.work_order_id,
  tote.user_id,
  tote.entry_date,
  tote.minutes,
  tote.description,
  tote.logged_at,
  tote.created_by,
  tote.created_at,
  tote.updated_at
from app.work_order_time_entries tote
where tote.tenant_id = authz.get_current_tenant_id()
order by tote.entry_date desc, tote.logged_at desc;

comment on view public.v_work_order_time_entries is 
  'Work order time entries view scoped to the current tenant context. Uses SECURITY INVOKER to enforce RLS policies correctly. Clients must set tenant context via rpc_set_tenant_context. Ordered by entry_date desc, logged_at desc for most recent first.';

grant select on public.v_work_order_time_entries to authenticated;
grant select on public.v_work_order_time_entries to anon;
grant update on public.v_work_order_time_entries to authenticated;
grant delete on public.v_work_order_time_entries to authenticated;

create or replace view public.v_work_order_attachments
with (security_invoker = true)
as
select
  woa.id,
  woa.tenant_id,
  woa.work_order_id,
  woa.file_ref,
  woa.label,
  woa.kind,
  woa.created_by,
  woa.created_at,
  woa.updated_at
from app.work_order_attachments woa
where woa.tenant_id = authz.get_current_tenant_id()
order by woa.created_at desc;

comment on view public.v_work_order_attachments is 
  'Work order attachments view scoped to the current tenant context. Uses SECURITY INVOKER to enforce RLS policies correctly. Clients must set tenant context via rpc_set_tenant_context. Ordered by created_at desc for most recent first.';

grant select on public.v_work_order_attachments to authenticated;
grant select on public.v_work_order_attachments to anon;
grant update on public.v_work_order_attachments to authenticated;
grant delete on public.v_work_order_attachments to authenticated;

-- ============================================================================
-- Authorization Views
-- ============================================================================

create or replace view public.v_tenant_roles
with (security_invoker = true)
as
select
  id,
  tenant_id,
  key,
  name,
  is_default,
  is_system,
  created_at,
  updated_at
from cfg.tenant_roles
where tenant_id = authz.get_current_tenant_id();

comment on view public.v_tenant_roles is 
  'Tenant roles scoped to the current tenant context. Uses SECURITY INVOKER to enforce RLS policies correctly. Clients must set tenant context via rpc_set_tenant_context.';

grant select on public.v_tenant_roles to authenticated;

create or replace view public.v_user_tenant_roles
with (security_invoker = true)
as
select
  utr.id,
  utr.user_id,
  utr.tenant_id,
  utr.tenant_role_id,
  tr.key as role_key,
  tr.name as role_name,
  utr.assigned_at,
  utr.assigned_by
from app.user_tenant_roles utr
join cfg.tenant_roles tr on utr.tenant_role_id = tr.id
where utr.user_id = auth.uid();

comment on view public.v_user_tenant_roles is 
  'Current user role assignments across tenants. Uses SECURITY INVOKER to enforce RLS policies correctly. RLS on underlying tables ensures users only see their own role assignments.';

grant select on public.v_user_tenant_roles to authenticated;

create or replace view public.v_permissions
with (security_invoker = true)
as
select
  id,
  key,
  name,
  category,
  description,
  created_at
from cfg.permissions;

comment on view public.v_permissions is 
  'Global permission catalog (no tenant filter needed as permissions are global). Uses SECURITY INVOKER to enforce RLS policies correctly. All authenticated users can see all permissions.';

grant select on public.v_permissions to authenticated;

create or replace view public.v_role_permissions
with (security_invoker = true)
as
select
  trp.id,
  trp.tenant_role_id,
  tr.tenant_id,
  tr.key as role_key,
  tr.name as role_name,
  p.id as permission_id,
  p.key as permission_key,
  p.name as permission_name,
  p.category as permission_category,
  trp.granted_at
from cfg.tenant_role_permissions trp
join cfg.tenant_roles tr on trp.tenant_role_id = tr.id
join cfg.permissions p on trp.permission_id = p.id
where tr.tenant_id = authz.get_current_tenant_id();

comment on view public.v_role_permissions is 
  'Role-permission mappings scoped to the current tenant context. Uses SECURITY INVOKER to enforce RLS policies correctly. Clients must set tenant context via rpc_set_tenant_context.';

grant select on public.v_role_permissions to authenticated;

-- ============================================================================
-- Dashboard Views
-- ============================================================================

create or replace view public.v_dashboard_open_work_orders
with (security_invoker = true)
as
select
  wo.id,
  wo.tenant_id,
  wo.title,
  wo.description,
  wo.status,
  wo.priority,
  wo.assigned_to,
  wo.location_id,
  wo.asset_id,
  wo.maintenance_type,
  wo.due_date,
  wo.created_at,
  wo.updated_at,
  coalesce(te_agg.total_minutes, 0) as total_labor_minutes
from app.work_orders wo
left join lateral (
  select sum(minutes) as total_minutes
  from app.work_order_time_entries
  where work_order_id = wo.id
) te_agg on true
where wo.tenant_id = authz.get_current_tenant_id()
  and wo.status not in ('completed', 'cancelled')
order by 
  case wo.priority
    when 'critical' then 1
    when 'high' then 2
    when 'medium' then 3
    when 'low' then 4
    else 5
  end,
  wo.due_date nulls last,
  wo.created_at desc;

comment on view public.v_dashboard_open_work_orders is 
  'Open work orders (not completed or cancelled) for the current tenant. Includes total_labor_minutes aggregated from time entries. Ordered by priority (critical first), then due date, then creation date. Uses SECURITY INVOKER to enforce RLS policies correctly.';

grant select on public.v_dashboard_open_work_orders to authenticated;
grant select on public.v_dashboard_open_work_orders to anon;

create or replace view public.v_dashboard_overdue_work_orders
with (security_invoker = true)
as
select
  wo.id,
  wo.tenant_id,
  wo.title,
  wo.description,
  wo.status,
  wo.priority,
  wo.assigned_to,
  wo.location_id,
  wo.asset_id,
  wo.maintenance_type,
  wo.due_date,
  wo.created_at,
  wo.updated_at,
  coalesce(te_agg.total_minutes, 0) as total_labor_minutes,
  extract(epoch from (pg_catalog.now() - wo.due_date)) / 86400 as days_overdue
from app.work_orders wo
left join lateral (
  select sum(minutes) as total_minutes
  from app.work_order_time_entries
  where work_order_id = wo.id
) te_agg on true
where wo.tenant_id = authz.get_current_tenant_id()
  and wo.status not in ('completed', 'cancelled')
  and wo.due_date is not null
  and wo.due_date < pg_catalog.now()
order by 
  wo.due_date asc,
  case wo.priority
    when 'critical' then 1
    when 'high' then 2
    when 'medium' then 3
    when 'low' then 4
    else 5
  end;

comment on view public.v_dashboard_overdue_work_orders is 
  'Overdue work orders (due date in the past, not completed or cancelled) for the current tenant. Includes total_labor_minutes aggregated from time entries and days_overdue calculation. Uses SECURITY INVOKER to enforce RLS policies correctly.';

grant select on public.v_dashboard_overdue_work_orders to authenticated;
grant select on public.v_dashboard_overdue_work_orders to anon;

create or replace view public.v_dashboard_mttr_metrics
with (security_invoker = true)
as
select
  wo.tenant_id,
  count(distinct wo.id) as completed_count,
  avg(extract(epoch from (wo.completed_at - wo.created_at)) / 3600) as mttr_hours,
  avg(extract(epoch from (wo.completed_at - wo.created_at)) / 86400) as mttr_days,
  min(extract(epoch from (wo.completed_at - wo.created_at)) / 3600) as min_completion_hours,
  max(extract(epoch from (wo.completed_at - wo.created_at)) / 3600) as max_completion_hours,
  percentile_cont(0.5) within group (order by extract(epoch from (wo.completed_at - wo.created_at)) / 3600) as median_completion_hours,
  avg(te_agg.total_minutes) as avg_labor_minutes,
  sum(te_agg.total_minutes) as total_labor_minutes
from app.work_orders wo
left join lateral (
  select sum(minutes) as total_minutes
  from app.work_order_time_entries
  where work_order_id = wo.id
) te_agg on true
where wo.tenant_id = authz.get_current_tenant_id()
  and wo.status = 'completed'
  and wo.completed_at is not null
  and wo.completed_at >= pg_catalog.now() - pg_catalog.make_interval(days => 90)
group by wo.tenant_id;

comment on view public.v_dashboard_mttr_metrics is 
  'MTTR (Mean Time To Repair) metrics for the current tenant. Calculates average, min, max, and median completion times for completed work orders in the last 90 days. Includes labor time statistics aggregated from time entries. Uses SECURITY INVOKER to enforce RLS policies correctly.';

grant select on public.v_dashboard_mttr_metrics to authenticated;
grant select on public.v_dashboard_mttr_metrics to anon;

create or replace view public.v_dashboard_metrics
with (security_invoker = true)
as
select
  t.id as tenant_id,
  t.name as tenant_name,
  (select count(*) 
   from app.work_orders 
   where tenant_id = t.id 
     and status not in ('completed', 'cancelled')
  ) as open_count,
  (select count(*) 
   from app.work_orders 
   where tenant_id = t.id 
     and status not in ('completed', 'cancelled')
     and due_date is not null
     and due_date < pg_catalog.now()
  ) as overdue_count,
  (select count(*) 
   from app.work_orders 
   where tenant_id = t.id 
     and status = 'completed'
     and completed_at >= pg_catalog.now() - pg_catalog.make_interval(days => 30)
  ) as completed_last_30_days,
  (select avg(extract(epoch from (completed_at - created_at)) / 3600)
   from app.work_orders 
   where tenant_id = t.id 
     and status = 'completed'
     and completed_at is not null
     and completed_at >= pg_catalog.now() - pg_catalog.make_interval(days => 90)
  ) as mttr_hours,
  (select count(*) from app.assets where tenant_id = t.id) as total_assets,
  (select count(*) from app.assets where tenant_id = t.id and status = 'active') as active_assets,
  (select count(*) from app.locations where tenant_id = t.id) as total_locations
from app.tenants t
where t.id = authz.get_current_tenant_id();

comment on view public.v_dashboard_metrics is 
  'Combined dashboard metrics for the current tenant. Returns one row with key metrics: open work orders count, overdue count, completed in last 30 days, MTTR (last 90 days), asset counts, and location count. Uses SECURITY INVOKER to enforce RLS policies correctly.';

grant select on public.v_dashboard_metrics to authenticated;
grant select on public.v_dashboard_metrics to anon;

create or replace view public.v_dashboard_work_orders_by_status
with (security_invoker = true)
as
select
  wo.status,
  count(*) as count,
  count(*) filter (where wo.assigned_to is not null) as assigned_count,
  count(*) filter (where wo.due_date < pg_catalog.now() and wo.status not in ('completed', 'cancelled')) as overdue_count,
  avg(extract(epoch from (wo.completed_at - wo.created_at)) / 3600) filter (where wo.completed_at is not null) as avg_completion_hours,
  min(wo.created_at) as first_created_at,
  max(wo.created_at) as last_created_at
from app.work_orders wo
where wo.tenant_id = authz.get_current_tenant_id()
group by wo.status
order by 
  case wo.status
    when 'draft' then 1
    when 'assigned' then 2
    when 'in_progress' then 3
    when 'completed' then 4
    when 'cancelled' then 5
    else 6
  end;

comment on view public.v_dashboard_work_orders_by_status is 
  'Work orders grouped by status for the current tenant. Provides status breakdown with counts, assignment stats, overdue counts, and completion metrics. Uses SECURITY INVOKER to enforce RLS policies correctly.';

grant select on public.v_dashboard_work_orders_by_status to authenticated;
grant select on public.v_dashboard_work_orders_by_status to anon;

create or replace view public.v_dashboard_work_orders_by_maintenance_type
with (security_invoker = true)
as
select
  wo.maintenance_type,
  mtc.category,
  count(*) as count,
  count(*) filter (where wo.status not in ('completed', 'cancelled')) as open_count,
  count(*) filter (where wo.status = 'completed') as completed_count,
  count(*) filter (where wo.due_date < pg_catalog.now() and wo.status not in ('completed', 'cancelled')) as overdue_count,
  avg(extract(epoch from (wo.completed_at - wo.created_at)) / 3600) filter (where wo.completed_at is not null) as avg_completion_hours,
  sum(coalesce(te_agg.total_minutes, 0)) as total_labor_minutes,
  avg(coalesce(te_agg.total_minutes, 0)) as avg_labor_minutes
from app.work_orders wo
left join cfg.maintenance_type_catalogs mtc on wo.maintenance_type = mtc.key and wo.tenant_id = mtc.tenant_id and mtc.entity_type = 'work_order'
left join lateral (
  select sum(minutes) as total_minutes
  from app.work_order_time_entries
  where work_order_id = wo.id
) te_agg on true
where wo.tenant_id = authz.get_current_tenant_id()
  and wo.maintenance_type is not null
group by wo.maintenance_type, mtc.category
order by mtc.category, wo.maintenance_type;

comment on view public.v_dashboard_work_orders_by_maintenance_type is 
  'Work orders grouped by maintenance type for the current tenant. Provides breakdown with counts, completion metrics, and labor time statistics. Includes category from maintenance type catalog. Uses SECURITY INVOKER to enforce RLS policies correctly.';

grant select on public.v_dashboard_work_orders_by_maintenance_type to authenticated;
grant select on public.v_dashboard_work_orders_by_maintenance_type to anon;

-- ============================================================================
-- PM System Views
-- ============================================================================

create or replace view public.v_pm_template_checklist_items
with (security_invoker = true)
as
select
  ci.id,
  ci.template_id,
  pt.tenant_id,
  ci.description,
  ci.required,
  ci.display_order,
  ci.created_at
from cfg.pm_template_checklist_items ci
join cfg.pm_templates pt on ci.template_id = pt.id
where pt.tenant_id = authz.get_current_tenant_id()
order by ci.display_order asc;

comment on view public.v_pm_template_checklist_items is
  'PM template checklist items for current tenant. Uses SECURITY INVOKER to enforce RLS policies correctly. Clients must set tenant context via rpc_set_tenant_context. Items are ordered by display_order.';

grant select on public.v_pm_template_checklist_items to authenticated;
grant select on public.v_pm_template_checklist_items to anon;

create or replace view public.v_pm_templates
with (security_invoker = true)
as
select
  pt.id,
  pt.tenant_id,
  pt.name,
  pt.description,
  pt.trigger_type,
  pt.trigger_config,
  pt.wo_title,
  pt.wo_description,
  pt.wo_priority,
  pt.wo_priority_entity_type,
  pt.wo_estimated_hours,
  pt.is_system,
  pt.created_at,
  pt.updated_at
from cfg.pm_templates pt
where pt.tenant_id = authz.get_current_tenant_id()
order by pt.name asc;

comment on view public.v_pm_templates is
  'PM templates for current tenant. Uses SECURITY INVOKER to enforce RLS policies correctly. Clients must set tenant context via rpc_set_tenant_context. Ordered by name.';

grant select on public.v_pm_templates to authenticated;
grant select on public.v_pm_templates to anon;

create or replace view public.v_pm_schedules
with (security_invoker = true)
as
select
  ps.id,
  ps.tenant_id,
  ps.asset_id,
  ps.template_id,
  ps.title,
  ps.description,
  ps.trigger_type,
  ps.trigger_config,
  ps.wo_title,
  ps.wo_description,
  ps.wo_priority,
  ps.wo_priority_entity_type,
  ps.wo_estimated_hours,
  ps.auto_generate,
  ps.next_due_date,
  ps.last_completed_at,
  ps.last_work_order_id,
  ps.completion_count,
  ps.parent_pm_id,
  ps.is_active,
  ps.created_at,
  ps.updated_at,
  a.name as asset_name,
  pt.name as template_name,
  case
    when ps.next_due_date is not null and ps.next_due_date <= pg_catalog.now() and ps.is_active then true
    else false
  end as is_overdue
from app.pm_schedules ps
left join app.assets a on ps.asset_id = a.id
left join cfg.pm_templates pt on ps.template_id = pt.id
where ps.tenant_id = authz.get_current_tenant_id()
order by ps.next_due_date asc nulls last, ps.title asc;

comment on view public.v_pm_schedules is
  'PM schedules for current tenant. Includes asset name and is_overdue flag. Uses SECURITY INVOKER to enforce RLS policies correctly. Clients must set tenant context via rpc_set_tenant_context. Ordered by next_due_date, then title.';

grant select on public.v_pm_schedules to authenticated;
grant select on public.v_pm_schedules to anon;

create or replace view public.v_due_pms
with (security_invoker = true)
as
select
  ps.id,
  ps.tenant_id,
  ps.asset_id,
  a.name as asset_name,
  ps.template_id,
  pt.name as template_name,
  ps.title,
  ps.description,
  ps.trigger_type,
  ps.trigger_config,
  ps.next_due_date,
  ps.last_completed_at,
  ps.completion_count,
  ps.is_active,
  ps.created_at,
  ps.updated_at
from app.pm_schedules ps
left join app.assets a on ps.asset_id = a.id
left join cfg.pm_templates pt on ps.template_id = pt.id
where ps.tenant_id = authz.get_current_tenant_id()
  and ps.is_active = true
  and pm.is_pm_due(ps) = true
order by ps.next_due_date asc nulls last;

comment on view public.v_due_pms is
  'PM schedules that are currently due for the current tenant. Uses pm.is_pm_due() to determine if PM should be generated. Uses SECURITY INVOKER to enforce RLS policies correctly. Clients must set tenant context via rpc_set_tenant_context.';

grant select on public.v_due_pms to authenticated;
grant select on public.v_due_pms to anon;

create or replace view public.v_overdue_pms
with (security_invoker = true)
as
select
  ps.id,
  ps.tenant_id,
  ps.asset_id,
  a.name as asset_name,
  ps.template_id,
  pt.name as template_name,
  ps.title,
  ps.description,
  ps.trigger_type,
  ps.trigger_config,
  ps.next_due_date,
  ps.last_completed_at,
  ps.completion_count,
  ps.is_active,
  ps.created_at,
  ps.updated_at,
  extract(epoch from (pg_catalog.now() - ps.next_due_date)) / 86400 as days_overdue
from app.pm_schedules ps
left join app.assets a on ps.asset_id = a.id
left join cfg.pm_templates pt on ps.template_id = pt.id
where ps.tenant_id = authz.get_current_tenant_id()
  and ps.is_active = true
  and ps.next_due_date is not null
  and ps.next_due_date < pg_catalog.now() - interval '1 day'
order by ps.next_due_date asc;

comment on view public.v_overdue_pms is
  'PM schedules that are overdue (next_due_date more than 1 day in the past) for the current tenant. Includes days_overdue calculation. Uses SECURITY INVOKER to enforce RLS policies correctly. Clients must set tenant context via rpc_set_tenant_context.';

grant select on public.v_overdue_pms to authenticated;
grant select on public.v_overdue_pms to anon;

create or replace view public.v_upcoming_pms
with (security_invoker = true)
as
select
  ps.id,
  ps.tenant_id,
  ps.asset_id,
  a.name as asset_name,
  ps.template_id,
  pt.name as template_name,
  ps.title,
  ps.description,
  ps.trigger_type,
  ps.trigger_config,
  ps.next_due_date,
  ps.last_completed_at,
  ps.completion_count,
  ps.is_active,
  ps.created_at,
  ps.updated_at,
  extract(epoch from (ps.next_due_date - pg_catalog.now())) / 86400 as days_until_due
from app.pm_schedules ps
left join app.assets a on ps.asset_id = a.id
left join cfg.pm_templates pt on ps.template_id = pt.id
where ps.tenant_id = authz.get_current_tenant_id()
  and ps.is_active = true
  and ps.next_due_date is not null
  and ps.next_due_date > pg_catalog.now()
  and ps.next_due_date <= pg_catalog.now() + interval '30 days'
order by ps.next_due_date asc;

comment on view public.v_upcoming_pms is
  'PM schedules due in the next 30 days for the current tenant. Includes days_until_due calculation. Uses SECURITY INVOKER to enforce RLS policies correctly. Clients must set tenant context via rpc_set_tenant_context.';

grant select on public.v_upcoming_pms to authenticated;
grant select on public.v_upcoming_pms to anon;

create or replace view public.v_pm_history
with (security_invoker = true)
as
select
  ph.id,
  ph.tenant_id,
  ph.pm_schedule_id,
  ps.title as pm_title,
  ph.work_order_id,
  wo.title as work_order_title,
  ph.scheduled_date,
  ph.completed_date,
  ph.completed_by,
  null::text as completed_by_name,
  ph.actual_hours,
  ph.cost,
  ph.notes,
  ph.created_at
from app.pm_history ph
left join app.pm_schedules ps on ph.pm_schedule_id = ps.id
left join app.work_orders wo on ph.work_order_id = wo.id
where ph.tenant_id = authz.get_current_tenant_id()
order by ph.scheduled_date desc, ph.completed_date desc nulls last;

comment on view public.v_pm_history is
  'PM execution history for the current tenant. Includes PM and work order details, completion info. completed_by_name is always NULL (auth.users access removed to prevent permission errors for anon users). Uses SECURITY INVOKER to enforce RLS policies correctly. Clients must set tenant context via rpc_set_tenant_context.';

grant select on public.v_pm_history to authenticated;
grant select on public.v_pm_history to anon;

-- ============================================================================
-- Meter System Views
-- ============================================================================

create or replace view public.v_asset_meters
with (security_invoker = true)
as
select
  am.id,
  am.tenant_id,
  am.asset_id,
  am.meter_type,
  am.name,
  am.unit,
  am.current_reading,
  am.last_reading_date,
  am.reading_direction,
  am.decimal_places,
  am.is_active,
  am.description,
  am.installation_date,
  am.created_at,
  am.updated_at,
  a.name as asset_name
from app.asset_meters am
join app.assets a on am.asset_id = a.id
where am.tenant_id = authz.get_current_tenant_id()
order by a.name asc, am.name asc;

comment on view public.v_asset_meters is
  'Asset meters for current tenant. Includes asset name. Uses SECURITY INVOKER to enforce RLS policies correctly. Clients must set tenant context via rpc_set_tenant_context. Ordered by asset name, then meter name.';

grant select on public.v_asset_meters to authenticated;
grant select on public.v_asset_meters to anon;

create or replace view public.v_meter_readings
with (security_invoker = true)
as
select
  mr.id,
  mr.tenant_id,
  mr.meter_id,
  mr.reading_value,
  mr.reading_date,
  mr.reading_type,
  mr.notes,
  mr.recorded_by,
  mr.created_at,
  am.name as meter_name,
  a.name as asset_name
from app.meter_readings mr
join app.asset_meters am on mr.meter_id = am.id
join app.assets a on am.asset_id = a.id
where mr.tenant_id = authz.get_current_tenant_id()
order by mr.reading_date desc, mr.created_at desc;

comment on view public.v_meter_readings is
  'Meter reading history for current tenant. Includes meter name and asset name. Uses SECURITY INVOKER to enforce RLS policies correctly. Clients must set tenant context via rpc_set_tenant_context. Ordered by reading_date desc, then created_at desc.';

grant select on public.v_meter_readings to authenticated;
grant select on public.v_meter_readings to anon;

-- ============================================================================
-- Catalog Views
-- ============================================================================

create or replace view public.v_status_catalogs
with (security_invoker = true)
as
select
  id,
  tenant_id,
  entity_type,
  key,
  name,
  category,
  is_final,
  display_order,
  color,
  icon,
  created_at,
  updated_at
from cfg.status_catalogs
where tenant_id = authz.get_current_tenant_id()
order by display_order asc;

comment on view public.v_status_catalogs is 
  'Status catalog entries scoped to the current tenant context. Uses SECURITY INVOKER to enforce RLS policies correctly. Clients must set tenant context via rpc_set_tenant_context.';

grant select on public.v_status_catalogs to authenticated;
grant select on public.v_status_catalogs to anon;

create or replace view public.v_priority_catalogs
with (security_invoker = true)
as
select
  id,
  tenant_id,
  entity_type,
  key,
  name,
  weight,
  display_order,
  color,
  created_at,
  updated_at
from cfg.priority_catalogs
where tenant_id = authz.get_current_tenant_id()
order by weight asc, display_order asc;

comment on view public.v_priority_catalogs is 
  'Priority catalog entries scoped to the current tenant context. Uses SECURITY INVOKER to enforce RLS policies correctly. Clients must set tenant context via rpc_set_tenant_context.';

grant select on public.v_priority_catalogs to authenticated;
grant select on public.v_priority_catalogs to anon;

create or replace view public.v_maintenance_type_catalogs
with (security_invoker = true)
as
select
  id,
  tenant_id,
  entity_type,
  category,
  key,
  name,
  description,
  display_order,
  color,
  icon,
  is_system,
  created_at,
  updated_at
from cfg.maintenance_type_catalogs
where tenant_id = authz.get_current_tenant_id()
order by category, display_order asc;

comment on view public.v_maintenance_type_catalogs is 
  'Maintenance type catalog entries scoped to the current tenant context. Uses SECURITY INVOKER to enforce RLS policies correctly. Clients must set tenant context via rpc_set_tenant_context.';

grant select on public.v_maintenance_type_catalogs to authenticated;
grant select on public.v_maintenance_type_catalogs to anon;

create or replace view public.v_status_transitions
with (security_invoker = true)
as
select
  id,
  tenant_id,
  entity_type,
  from_status_key,
  to_status_key,
  required_permission,
  guard_condition,
  created_at,
  updated_at
from cfg.status_transitions
where tenant_id = authz.get_current_tenant_id()
order by from_status_key, to_status_key;

comment on view public.v_status_transitions is 
  'Status transition rules scoped to the current tenant context. Uses SECURITY INVOKER to enforce RLS policies correctly. Clients must set tenant context via rpc_set_tenant_context.';

grant select on public.v_status_transitions to authenticated;
grant select on public.v_status_transitions to anon;

-- ============================================================================
-- Grants for SECURITY INVOKER Views
-- ============================================================================
-- With SECURITY INVOKER views, the querying user's privileges are used when accessing
-- underlying tables. PostgreSQL requires SELECT permission on underlying tables before
-- RLS policies can be evaluated. This section grants SELECT, UPDATE, and DELETE on all
-- tables used by views to authenticated and anon roles. RLS policies will enforce security.

-- ============================================================================
-- Core Application Tables
-- ============================================================================

grant select on app.tenants to authenticated;
grant select on app.tenants to anon;

grant select on app.locations to authenticated;
grant select on app.locations to anon;

grant select on app.departments to authenticated;
grant select on app.departments to anon;

grant select on app.assets to authenticated;
grant select on app.assets to anon;

grant select on app.work_orders to authenticated;
grant select on app.work_orders to anon;

grant update on app.work_orders to authenticated;
grant delete on app.work_orders to authenticated;

grant update on app.assets to authenticated;
grant delete on app.assets to authenticated;

grant update on app.locations to authenticated;
grant delete on app.locations to authenticated;

grant update on app.departments to authenticated;
grant delete on app.departments to authenticated;

-- ============================================================================
-- Work Order Related Tables
-- ============================================================================

grant select on app.work_order_time_entries to authenticated;
grant select on app.work_order_time_entries to anon;

grant update on app.work_order_time_entries to authenticated;
grant delete on app.work_order_time_entries to authenticated;

grant select on app.work_order_attachments to authenticated;
grant select on app.work_order_attachments to anon;

grant update on app.work_order_attachments to authenticated;
grant delete on app.work_order_attachments to authenticated;

-- ============================================================================
-- Meter and PM System Tables
-- ============================================================================

grant select on app.asset_meters to authenticated;
grant select on app.asset_meters to anon;

grant update on app.asset_meters to authenticated;
grant delete on app.asset_meters to authenticated;

grant select on app.meter_readings to authenticated;
grant select on app.meter_readings to anon;

grant update on app.meter_readings to authenticated;
grant delete on app.meter_readings to authenticated;

grant select on cfg.pm_templates to authenticated;
grant select on cfg.pm_templates to anon;

grant select on cfg.pm_template_checklist_items to authenticated;
grant select on cfg.pm_template_checklist_items to anon;

grant select on app.pm_schedules to authenticated;
grant select on app.pm_schedules to anon;

grant update on app.pm_schedules to authenticated;
grant delete on app.pm_schedules to authenticated;

grant select on app.pm_history to authenticated;
grant select on app.pm_history to anon;

-- ============================================================================
-- Configuration Tables (used by catalog views)
-- ============================================================================

grant select on cfg.maintenance_type_catalogs to authenticated;
grant select on cfg.maintenance_type_catalogs to anon;

grant select on cfg.status_catalogs to authenticated;
grant select on cfg.status_catalogs to anon;

grant select on cfg.priority_catalogs to authenticated;
grant select on cfg.priority_catalogs to anon;

grant select on cfg.status_transitions to authenticated;
grant select on cfg.status_transitions to anon;

grant select on cfg.tenant_roles to authenticated;
grant select on cfg.tenant_roles to anon;

grant select on cfg.permissions to authenticated;
grant select on cfg.permissions to anon;

grant select on cfg.tenant_role_permissions to authenticated;
grant select on cfg.tenant_role_permissions to anon;

-- ============================================================================
-- Roles and Permissions Tables
-- ============================================================================

grant select on app.user_tenant_roles to authenticated;
grant select on app.user_tenant_roles to anon;

grant select on app.tenant_memberships to authenticated;
grant select on app.tenant_memberships to anon;

-- ============================================================================
-- Schema Usage Grants
-- ============================================================================

grant usage on schema cfg to authenticated;
grant usage on schema cfg to anon;

grant usage on schema authz to authenticated;
grant usage on schema authz to anon;
