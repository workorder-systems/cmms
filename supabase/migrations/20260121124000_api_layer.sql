-- SPDX-License-Identifier: AGPL-3.0-or-later
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
  'Creates a new tenant with the specified name and slug. Validates authentication, enforces rate limiting (5 requests/minute per user), creates default roles and workflows, adds creator as tenant member, and assigns admin role to creator. Returns the UUID of the created tenant. Security implications: Any authenticated user can create tenants (with rate limiting). Tenant creation is audited in Migration 6. Rate limiting prevents abuse.';

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
  'Sets tenant context for subsequent queries in the session. Validates user membership before setting context. Clients should call this before querying tenant-scoped views. No rate limiting as this is a frequent operation. Side effects: Sets app.current_tenant_id session variable. Security implications: Validates user is authenticated and member of the tenant.';

revoke all on function public.rpc_set_tenant_context(uuid) from public;
grant execute on function public.rpc_set_tenant_context(uuid) to authenticated;

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
  'Invites a user to a tenant by email and assigns them a role. Requires tenant.admin permission. Validates invitee email exists in auth.users, creates membership if needed, and assigns specified role. Rate limited to 5 invitations per minute per user. Side effects: Creates tenant membership and role assignment. Security implications: Requires tenant.admin permission.';

revoke all on function public.rpc_invite_user_to_tenant(uuid, text, text) from public;
grant execute on function public.rpc_invite_user_to_tenant(uuid, text, text) to authenticated;

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
  'Assigns a role to a user in a tenant. Requires tenant.admin permission. Security invariant: Users cannot modify their own role assignments. Rate limited to 10 assignments per minute per user. Side effects: Creates tenant membership if needed and assigns role. Security implications: Requires tenant.admin permission. Users cannot assign roles to themselves.';

revoke all on function public.rpc_assign_role_to_user(uuid, uuid, text) from public;
grant execute on function public.rpc_assign_role_to_user(uuid, uuid, text) to authenticated;

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
  'Assigns a permission to a tenant role. Requires tenant.admin permission. Validates that role and permission exist. Rate limited to 20 assignments per minute per user. Side effects: Creates role-permission mapping. Security implications: Requires tenant.admin permission.';

revoke all on function public.rpc_assign_permission_to_role(uuid, text, text) from public;
grant execute on function public.rpc_assign_permission_to_role(uuid, text, text) to authenticated;


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

create or replace function public.rpc_create_work_order(
  p_tenant_id uuid,
  p_title text,
  p_description text default null,
  p_priority text default 'medium',
  p_assigned_to uuid default null,
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
  v_work_order_id uuid;
  v_initial_status text;
begin
  perform util.check_rate_limit('work_order_create', null, 10, 1, auth.uid(), p_tenant_id);
  
  v_user_id := authz.rpc_setup(p_tenant_id, 'workorder.create');

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
    assigned_to,
    location_id,
    asset_id,
    due_date,
    status
  )
  values (
    p_tenant_id,
    p_title,
    p_description,
    p_priority,
    p_assigned_to,
    p_location_id,
    p_asset_id,
    p_due_date,
    v_initial_status
  )
  returning id into v_work_order_id;

  return v_work_order_id;
end;
$$;

comment on function public.rpc_create_work_order(uuid, text, text, text, uuid, uuid, uuid, timestamptz) is 
  'Creates a new work order for the current tenant context. Requires workorder.create permission. Validates priority exists in catalog, automatically assigns default status from workflow catalogs based on context (e.g., assigned status if assigned_to is provided). Validates that referenced assets and locations belong to the same tenant. Rate limited to 10 work orders per minute per user. Returns the UUID of the created work order. Side effects: Creates work order record. Security implications: Requires workorder.create permission and tenant membership.';

revoke all on function public.rpc_create_work_order(uuid, text, text, text, uuid, uuid, uuid, timestamptz) from public;
grant execute on function public.rpc_create_work_order(uuid, text, text, text, uuid, uuid, uuid, timestamptz) to authenticated;

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
end;
$$;

comment on function public.rpc_transition_work_order_status(uuid, uuid, text) is 
  'Transitions a work order to a new status using workflow validation. Validates transition exists in catalog, checks user has required permission, evaluates guard conditions, and updates work order. Automatically sets completed_at and completed_by when transitioning to final closed status. Rate limited to 30 transitions per minute per user. Side effects: Updates work order status and completion fields. Security implications: Validates transition rules, permissions, and guard conditions.';

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
  'Completes a work order. Convenience wrapper around rpc_transition_work_order_status that transitions to "completed" status. Requires appropriate permissions for completing work orders (workorder.complete.assigned if assigned to user, workorder.complete.any otherwise). Rate limited to 30 completions per minute per user. Side effects: Updates work order status to completed and sets completion timestamp.';

revoke all on function public.rpc_complete_work_order(uuid, uuid) from public;
grant execute on function public.rpc_complete_work_order(uuid, uuid) to authenticated;

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
  'Creates a new status in the tenant status catalog. Requires tenant.admin permission. Validates category is one of: open, closed, final. Rate limited to 20 status creations per minute per user. Returns the UUID of the created status. Side effects: Creates status catalog entry. Security implications: Requires tenant.admin permission.';

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
  'Creates a new status transition rule in the tenant workflow. Requires tenant.admin permission. Validates that both from and to statuses exist in the status catalog. Can optionally require specific permission and guard conditions. Rate limited to 20 transition creations per minute per user. Returns the UUID of the created transition. Side effects: Creates status transition rule. Security implications: Requires tenant.admin permission.';

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
  'Creates a new priority in the tenant priority catalog. Requires tenant.admin permission. Weight parameter determines sorting (lower = higher priority). Rate limited to 20 priority creations per minute per user. Returns the UUID of the created priority. Side effects: Creates priority catalog entry. Security implications: Requires tenant.admin permission.';

revoke all on function public.rpc_create_priority(uuid, text, text, text, integer, integer, text) from public;
grant execute on function public.rpc_create_priority(uuid, text, text, text, integer, integer, text) to authenticated;

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

create or replace view public.v_work_orders as
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
  wo.due_date, 
  wo.completed_at, 
  wo.completed_by, 
  wo.created_at, 
  wo.updated_at
from app.work_orders wo
where wo.tenant_id = authz.get_current_tenant_id();

comment on view public.v_work_orders is 
  'Work orders view scoped to the current tenant context. Clients must set tenant context via rpc_set_tenant_context. Underlying table RLS still applies. Used by frontend to list and display work orders.';

create or replace view public.v_assets as
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
  'Assets view scoped to the current tenant context. Clients must set tenant context via rpc_set_tenant_context. Underlying table RLS still applies. Used by frontend to list and display assets.';

create or replace view public.v_locations as
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
  'Locations view scoped to the current tenant context. Clients must set tenant context via rpc_set_tenant_context. Underlying table RLS still applies. Used by frontend to list and display locations.';

create or replace view public.v_tenants as
select
  t.id,
  t.name,
  t.slug,
  t.created_at
from app.tenants t
where exists (
  select 1
  from app.tenant_memberships tm
  where tm.tenant_id = t.id
    and tm.user_id = auth.uid()
);

comment on view public.v_tenants is 
  'Tenants the current user belongs to (via tenant_memberships). Used for tenant selection in UI. RLS on underlying tables ensures users only see tenants they are members of.';

create or replace view public.v_tenant_roles as
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
  'Tenant roles view scoped to the current tenant context. Clients must set tenant context via rpc_set_tenant_context. RLS on underlying table enforces tenant isolation. Used by frontend to display and manage roles.';

create or replace view public.v_user_tenant_roles as
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
  'Current user role assignments across tenants. Client can filter by tenant_id as needed. RLS on underlying tables ensures users only see their own role assignments. Used by frontend to display user roles and permissions.';

create or replace view public.v_permissions as
select
  id,
  key,
  name,
  category,
  description,
  created_at
from cfg.permissions;

comment on view public.v_permissions is 
  'Global permission catalog (no tenant filter needed as permissions are global). All authenticated users can see all permissions. Used by frontend to display available permissions when managing roles.';

create or replace view public.v_role_permissions as
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
  'Role-permission mappings view. Clients must set tenant context via rpc_set_tenant_context. Join of tenant_roles, tenant_role_permissions, and permissions tables. RLS on underlying tables enforces tenant isolation. Used by frontend to display and manage role permissions.';

create or replace view public.v_departments as
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
  'Departments view scoped to the current tenant context. Clients must set tenant context via rpc_set_tenant_context. Underlying table RLS still applies. Used by frontend to list and display departments.';

