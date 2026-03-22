-- SPDX-License-Identifier: AGPL-3.0-or-later

-- ============================================================================
-- Status Catalogs
-- ============================================================================

create table cfg.status_catalogs (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  entity_type text not null,
  key text not null,
  name text not null,
  category text not null,
  display_order integer not null,
  color text,
  icon text,
  is_system boolean not null default false,
  is_final boolean not null default false,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint status_catalogs_unique unique (tenant_id, entity_type, key),
  constraint status_catalogs_entity_type_check check (
    entity_type ~ '^[a-z][a-z0-9_]*$'
  ),
  constraint status_catalogs_category_check check (
    category in ('open', 'closed', 'final')
  ),
  constraint status_catalogs_key_format_check check (
    key ~ '^[a-z0-9_]+$' 
    and length(key) >= 1 
    and length(key) <= 50
  ),
  constraint status_catalogs_display_order_check check (
    display_order >= 0
  )
);

comment on table cfg.status_catalogs is 
  'Tenant-configurable status definitions. Each tenant can define custom statuses for different entity types (work_order, asset, etc.). Enables vertical scaling where different tenants can have different workflow configurations. System statuses cannot be deleted and are created automatically for new tenants.';

comment on column cfg.status_catalogs.entity_type is 
  'Entity type this status applies to (e.g., work_order, asset, invoice). Enables vertical scaling where different entity types have different status workflows.';

comment on column cfg.status_catalogs.key is 
  'Status key (e.g., draft, assigned, completed). Unique within tenant and entity type. Used programmatically for status references.';

comment on column cfg.status_catalogs.category is 
  'Status category: open (active/in-progress), closed (completed/cancelled), final (terminal state with no outgoing transitions).';

comment on column cfg.status_catalogs.is_final is 
  'If true, this is a terminal state - no transitions allowed out of this status. Final statuses typically represent completed or cancelled states.';

comment on column cfg.status_catalogs.is_system is 
  'If true, this is a system status that cannot be deleted (e.g., default statuses created automatically).';

create index status_catalogs_tenant_entity_idx 
  on cfg.status_catalogs (tenant_id, entity_type);

create index status_catalogs_display_idx 
  on cfg.status_catalogs (tenant_id, entity_type, display_order, category);

create index status_catalogs_covering_idx 
  on cfg.status_catalogs (tenant_id, entity_type, display_order) 
  include (key, name, category, color, icon, is_final);

create trigger status_catalogs_set_updated_at 
  before update on cfg.status_catalogs 
  for each row 
  execute function util.set_updated_at();

alter table cfg.status_catalogs enable row level security;

create policy status_catalogs_select_tenant 
  on cfg.status_catalogs 
  for select 
  to authenticated 
  using (authz.is_current_user_tenant_member(tenant_id));

create policy status_catalogs_select_anon 
  on cfg.status_catalogs 
  for select 
  to anon 
  using (authz.is_current_user_tenant_member(tenant_id));

comment on policy status_catalogs_select_tenant on cfg.status_catalogs is 
  'Allows authenticated users to view status catalogs in tenants they are members of.';

comment on policy status_catalogs_select_anon on cfg.status_catalogs is 
  'Allows anonymous users to view status catalogs in tenants they are members of (via tenant context).';

-- ============================================================================
-- Status Transitions
-- ============================================================================

create table cfg.status_transitions (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  entity_type text not null,
  from_status_key text not null,
  to_status_key text not null,
  required_permission text,
  guard_condition jsonb,
  is_system boolean not null default false,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint status_transitions_unique unique (tenant_id, entity_type, from_status_key, to_status_key),
  constraint status_transitions_from_fk foreign key (tenant_id, entity_type, from_status_key)
    references cfg.status_catalogs(tenant_id, entity_type, key) on delete cascade,
  constraint status_transitions_to_fk foreign key (tenant_id, entity_type, to_status_key)
    references cfg.status_catalogs(tenant_id, entity_type, key) on delete cascade
);

comment on table cfg.status_transitions is 
  'Defines valid status transitions with rules. Enables workflow state machines per tenant and entity type. Each transition can require specific permissions and guard conditions that must be met before the transition is allowed.';

comment on column cfg.status_transitions.from_status_key is 
  'Source status for the transition. Must exist in status_catalogs for the same tenant and entity_type.';

comment on column cfg.status_transitions.to_status_key is 
  'Target status for the transition. Must exist in status_catalogs for the same tenant and entity_type.';

comment on column cfg.status_transitions.required_permission is 
  'Permission required to perform this transition (e.g., workorder.edit, workorder.complete.assigned). Null means no special permission needed beyond basic access.';

comment on column cfg.status_transitions.guard_condition is 
  'JSONB guard conditions that must be met (e.g., {"assigned_to": "not_null"}). Null means no guard conditions. Guard conditions are evaluated against entity data before allowing transition.';

create index status_transitions_tenant_entity_from_idx 
  on cfg.status_transitions (tenant_id, entity_type, from_status_key);

create index status_transitions_to_status_idx 
  on cfg.status_transitions (tenant_id, entity_type, to_status_key);

create index status_transitions_lookup_idx 
  on cfg.status_transitions (tenant_id, entity_type, from_status_key, to_status_key);

create index status_transitions_guard_condition_gin_idx 
  on cfg.status_transitions using gin (guard_condition) 
  where guard_condition is not null;

create trigger status_transitions_set_updated_at 
  before update on cfg.status_transitions 
  for each row 
  execute function util.set_updated_at();

alter table cfg.status_transitions enable row level security;

create policy status_transitions_select_tenant 
  on cfg.status_transitions 
  for select 
  to authenticated 
  using (authz.is_current_user_tenant_member(tenant_id));

create policy status_transitions_select_anon 
  on cfg.status_transitions 
  for select 
  to anon 
  using (authz.is_current_user_tenant_member(tenant_id));

comment on policy status_transitions_select_tenant on cfg.status_transitions is 
  'Allows authenticated users to view status transitions in tenants they are members of.';

comment on policy status_transitions_select_anon on cfg.status_transitions is 
  'Allows anonymous users to view status transitions in tenants they are members of (via tenant context).';

-- ============================================================================
-- Priority Catalogs
-- ============================================================================

create table cfg.priority_catalogs (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  entity_type text not null,
  key text not null,
  name text not null,
  weight integer not null,
  display_order integer not null,
  color text,
  is_system boolean not null default false,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint priority_catalogs_unique unique (tenant_id, entity_type, key),
  constraint priority_catalogs_key_format_check check (
    key ~ '^[a-z0-9_]+$' 
    and length(key) >= 1 
    and length(key) <= 50
  ),
  constraint priority_catalogs_display_order_check check (
    display_order >= 0
  ),
  constraint priority_catalogs_weight_check check (
    weight >= 0
  )
);

comment on table cfg.priority_catalogs is 
  'Tenant-configurable priority definitions. Each tenant can define custom priority levels for different entity types. Priorities have numeric weights for sorting (lower = higher priority).';

comment on column cfg.priority_catalogs.key is 
  'Priority key (e.g., low, medium, high, critical). Unique within tenant and entity type. Used programmatically for priority references.';

comment on column cfg.priority_catalogs.weight is 
  'Numeric weight for sorting. Lower values = higher priority. Used for ordering queries and displaying priorities in correct order.';

create index priority_catalogs_tenant_entity_idx 
  on cfg.priority_catalogs (tenant_id, entity_type);

create index priority_catalogs_display_order_idx 
  on cfg.priority_catalogs (tenant_id, entity_type, display_order);

create trigger priority_catalogs_set_updated_at 
  before update on cfg.priority_catalogs 
  for each row 
  execute function util.set_updated_at();

alter table cfg.priority_catalogs enable row level security;

create policy priority_catalogs_select_tenant 
  on cfg.priority_catalogs 
  for select 
  to authenticated 
  using (authz.is_current_user_tenant_member(tenant_id));

create policy priority_catalogs_select_anon 
  on cfg.priority_catalogs 
  for select 
  to anon 
  using (authz.is_current_user_tenant_member(tenant_id));

comment on policy priority_catalogs_select_tenant on cfg.priority_catalogs is 
  'Allows authenticated users to view priority catalogs in tenants they are members of.';

comment on policy priority_catalogs_select_anon on cfg.priority_catalogs is 
  'Allows anonymous users to view priority catalogs in tenants they are members of (via tenant context).';

-- ============================================================================
-- Workflow Validation Functions
-- ============================================================================

create function cfg.validate_status_transition(
  p_tenant_id uuid,
  p_entity_type text,
  p_from_status_key text,
  p_to_status_key text,
  p_user_id uuid,
  p_entity_data jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_transition_exists boolean;
  v_has_permission boolean;
  v_required_permission text;
  v_guard_condition jsonb;
  v_guard_passed boolean;
begin
  select exists (
    select 1
    from cfg.status_transitions
    where tenant_id = p_tenant_id
      and entity_type = p_entity_type
      and from_status_key = p_from_status_key
      and to_status_key = p_to_status_key
  ) into v_transition_exists;

  if not v_transition_exists then
    return false;
  end if;

  select required_permission, guard_condition
  into v_required_permission, v_guard_condition
  from cfg.status_transitions
  where tenant_id = p_tenant_id
    and entity_type = p_entity_type
    and from_status_key = p_from_status_key
    and to_status_key = p_to_status_key;

  if v_required_permission is not null then
    v_has_permission := authz.has_permission(p_user_id, p_tenant_id, v_required_permission);
    if not v_has_permission then
      return false;
    end if;
  end if;

  v_guard_passed := cfg.evaluate_guard_condition(v_guard_condition, p_entity_data);
  if not v_guard_passed then
    return false;
  end if;

  return true;
end;
$$;

comment on function cfg.validate_status_transition(uuid, text, text, text, uuid, jsonb) is 
  'Validates if a status transition is allowed. Checks if transition exists in catalog, verifies user has required permission, and evaluates guard conditions against entity data. Returns true if transition is allowed, false otherwise. Used by RPC functions before performing status transitions. Security implications: Requires tenant membership and specific permissions.';

revoke all on function cfg.validate_status_transition(uuid, text, text, text, uuid, jsonb) from public;
grant execute on function cfg.validate_status_transition(uuid, text, text, text, uuid, jsonb) to authenticated;

create function cfg.evaluate_guard_condition(
  p_guard_condition jsonb, 
  p_entity_data jsonb
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_field_name text;
  v_condition_value jsonb;
  v_field_value jsonb;
begin
  if p_guard_condition is null then
    return true;
  end if;

  for v_field_name, v_condition_value in 
    select * from pg_catalog.jsonb_each(p_guard_condition)
  loop
    v_field_value := p_entity_data->v_field_name;

    if pg_catalog.jsonb_typeof(v_condition_value) = 'string' then
      if v_condition_value::text = '"not_null"' then
        if v_field_value is null or v_field_value = 'null'::jsonb or v_field_value::text = '"null"' then
          return false;
        end if;
      elsif v_condition_value::text = '"null"' then
        if v_field_value is not null and v_field_value::text != '"null"' then
          return false;
        end if;
      end if;
    elsif pg_catalog.jsonb_typeof(v_condition_value) = 'object' then
      if v_condition_value ? 'equals' and v_field_value is distinct from v_condition_value->'equals' then
        return false;
      end if;
      if v_condition_value ? 'in' and not (v_field_value = any(select pg_catalog.jsonb_array_elements(v_condition_value->'in'))) then
        return false;
      end if;
      if v_condition_value ? 'not_in' and v_field_value = any(select pg_catalog.jsonb_array_elements(v_condition_value->'not_in')) then
        return false;
      end if;
    end if;
  end loop;

  return true;
end;
$$;

comment on function cfg.evaluate_guard_condition(jsonb, jsonb) is 
  'Evaluates guard conditions against entity data. Supports multiple condition types: not_null (field must be present and non-null), null (field must be null), equals (field must equal specific value), in (field must be in array of values), not_in (field must not be in array). Extensible for future condition types. Returns true if all guard conditions pass, false otherwise. Used by validate_status_transition to enforce workflow rules.';

revoke all on function cfg.evaluate_guard_condition(jsonb, jsonb) from public;
grant execute on function cfg.evaluate_guard_condition(jsonb, jsonb) to authenticated;

create function cfg.get_default_status(
  p_tenant_id uuid, 
  p_entity_type text, 
  p_context jsonb default '{}'::jsonb
)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_status_key text;
begin
  if p_context ? 'assigned_to' and p_context->>'assigned_to' is not null then
    select key into v_status_key
    from cfg.status_catalogs
    where tenant_id = p_tenant_id 
      and entity_type = p_entity_type 
      and key = 'assigned'
    limit 1;
    
    if v_status_key is not null then
      return v_status_key;
    end if;
  end if;

  select key into v_status_key
  from cfg.status_catalogs
  where tenant_id = p_tenant_id 
    and entity_type = p_entity_type 
    and key = 'draft'
  limit 1;
  
  if v_status_key is not null then
    return v_status_key;
  end if;

  select key into v_status_key
  from cfg.status_catalogs
  where tenant_id = p_tenant_id 
    and entity_type = p_entity_type
  order by display_order asc
  limit 1;
  
  return v_status_key;
end;
$$;

comment on function cfg.get_default_status(uuid, text, jsonb) is 
  'Returns default status key based on context. If context contains assigned_to field, tries to return "assigned" status. Otherwise tries "draft" status. Falls back to first status by display_order if preferred statuses not found. Used by RPC functions when creating new entities to assign appropriate initial status.';

revoke all on function cfg.get_default_status(uuid, text, jsonb) from public;
grant execute on function cfg.get_default_status(uuid, text, jsonb) to authenticated;

create function cfg.get_valid_next_statuses(
  p_tenant_id uuid,
  p_entity_type text,
  p_current_status_key text,
  p_user_id uuid,
  p_entity_data jsonb default '{}'::jsonb
)
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_valid_statuses text[];
  v_user_permissions text[];
begin
  select array_agg(distinct p.key)
  into v_user_permissions
  from unnest(authz.get_user_tenant_roles(p_user_id, p_tenant_id)) as role_id
  join cfg.tenant_role_permissions trp on trp.tenant_role_id = role_id
  join cfg.permissions p on trp.permission_id = p.id;

  select array_agg(st.to_status_key)
  into v_valid_statuses
  from cfg.status_transitions st
  where st.tenant_id = p_tenant_id
    and st.entity_type = p_entity_type
    and st.from_status_key = p_current_status_key
    and (
      st.required_permission is null
      or st.required_permission = any(coalesce(v_user_permissions, array[]::text[]))
    )
    and cfg.evaluate_guard_condition(st.guard_condition, p_entity_data);

  return coalesce(v_valid_statuses, array[]::text[]);
end;
$$;

comment on function cfg.get_valid_next_statuses(uuid, text, text, uuid, jsonb) is 
  'Returns array of valid next status keys that can be transitioned to from the current status. Considers user permissions and guard conditions. Used by frontend to show available status transitions. Returns empty array if no valid transitions exist.';

revoke all on function cfg.get_valid_next_statuses(uuid, text, text, uuid, jsonb) from public;
grant execute on function cfg.get_valid_next_statuses(uuid, text, text, uuid, jsonb) to authenticated;

create function cfg.get_status_metadata(
  p_tenant_id uuid,
  p_entity_type text,
  p_status_key text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_metadata jsonb;
begin
  select pg_catalog.jsonb_build_object(
    'id', id,
    'key', key,
    'name', name,
    'category', category,
    'display_order', display_order,
    'color', color,
    'icon', icon,
    'is_final', is_final,
    'is_system', is_system
  )
  into v_metadata
  from cfg.status_catalogs
  where tenant_id = p_tenant_id
    and entity_type = p_entity_type
    and key = p_status_key;
  
  return v_metadata;
end;
$$;

comment on function cfg.get_status_metadata(uuid, text, text) is 
  'Returns status metadata as JSONB object containing category, is_final flag, display properties (color, icon, display_order), and system flag. Used for displaying status information in UI and determining workflow behavior. Returns null if status not found.';

revoke all on function cfg.get_status_metadata(uuid, text, text) from public;
grant execute on function cfg.get_status_metadata(uuid, text, text) to authenticated;

-- ============================================================================
-- Status/Priority Validation Functions
-- ============================================================================

create function util.validate_entity_status(
  p_entity_type text,
  p_tenant_id uuid,
  p_status_key text,
  p_priority_key text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from cfg.status_catalogs
    where tenant_id = p_tenant_id
      and entity_type = p_entity_type
      and key = p_status_key
  ) then
    raise exception using
      message = format('Invalid %s status: %s. Status must exist in tenant status catalog.', p_entity_type, p_status_key),
      errcode = '23503';
  end if;

  if p_priority_key is not null then
    if not exists (
      select 1
      from cfg.priority_catalogs
      where tenant_id = p_tenant_id
        and entity_type = p_entity_type
        and key = p_priority_key
    ) then
      raise exception using
        message = format('Invalid %s priority: %s. Priority must exist in tenant priority catalog.', p_entity_type, p_priority_key),
        errcode = '23503';
    end if;
  end if;
end;
$$;

comment on function util.validate_entity_status(text, uuid, text, text) is 
  'Validates entity status and optional priority against workflow catalogs. Raises exception if status or priority does not exist in tenant catalogs. Used by trigger functions to enforce workflow catalog constraints.';

revoke all on function util.validate_entity_status(text, uuid, text, text) from public;
grant execute on function util.validate_entity_status(text, uuid, text, text) to postgres;

create function util.validate_asset_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform util.validate_entity_status('asset', new.tenant_id, new.status);
  return new;
end;
$$;

comment on function util.validate_asset_status() is 
  'Trigger function for assets table that validates status against workflow catalogs. Called before insert/update on app.assets.';

revoke all on function util.validate_asset_status() from public;
grant execute on function util.validate_asset_status() to postgres;

create trigger assets_validate_status 
  before insert or update on app.assets 
  for each row 
  execute function util.validate_asset_status();

create function util.validate_work_order_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform util.validate_entity_status('work_order', new.tenant_id, new.status, new.priority);
  return new;
end;
$$;

comment on function util.validate_work_order_status() is 
  'Trigger function for work_orders table that validates status and priority against workflow catalogs. Called before insert/update on app.work_orders.';

revoke all on function util.validate_work_order_status() from public;
grant execute on function util.validate_work_order_status() to postgres;

create trigger work_orders_validate_status_priority 
  before insert or update on app.work_orders 
  for each row 
  execute function util.validate_work_order_status();

-- ============================================================================
-- Default Workflow Creation Functions
-- ============================================================================

create function cfg.create_default_work_order_statuses(
  p_tenant_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into cfg.status_catalogs (tenant_id, entity_type, key, name, category, display_order, is_system, is_final)
  values
    (p_tenant_id, 'work_order', 'draft', 'Draft', 'open', 1, true, false),
    (p_tenant_id, 'work_order', 'assigned', 'Assigned', 'open', 2, true, false),
    (p_tenant_id, 'work_order', 'in_progress', 'In Progress', 'open', 3, true, false),
    (p_tenant_id, 'work_order', 'completed', 'Completed', 'closed', 4, true, true),
    (p_tenant_id, 'work_order', 'cancelled', 'Cancelled', 'closed', 5, true, true);

  insert into cfg.status_transitions (tenant_id, entity_type, from_status_key, to_status_key, required_permission, is_system)
  values
    (p_tenant_id, 'work_order', 'draft', 'assigned', 'workorder.assign', true),
    (p_tenant_id, 'work_order', 'assigned', 'in_progress', 'workorder.edit', true),
    (p_tenant_id, 'work_order', 'in_progress', 'completed', 'workorder.complete.assigned', true),
    (p_tenant_id, 'work_order', 'assigned', 'completed', 'workorder.complete.any', true),
    (p_tenant_id, 'work_order', 'draft', 'cancelled', 'workorder.cancel', true),
    (p_tenant_id, 'work_order', 'assigned', 'cancelled', 'workorder.cancel', true),
    (p_tenant_id, 'work_order', 'in_progress', 'cancelled', 'workorder.cancel', true);
end;
$$;

comment on function cfg.create_default_work_order_statuses(uuid) is 
  'Creates default work order statuses (draft, assigned, in_progress, completed, cancelled) and their transitions for a new tenant. Provides sensible defaults for new tenants. System statuses cannot be deleted. Called automatically during tenant creation.';

revoke all on function cfg.create_default_work_order_statuses(uuid) from public;
grant execute on function cfg.create_default_work_order_statuses(uuid) to authenticated;

create function cfg.create_default_work_order_priorities(
  p_tenant_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into cfg.priority_catalogs (tenant_id, entity_type, key, name, weight, display_order, is_system)
  values
    (p_tenant_id, 'work_order', 'low', 'Low', 40, 1, true),
    (p_tenant_id, 'work_order', 'medium', 'Medium', 30, 2, true),
    (p_tenant_id, 'work_order', 'high', 'High', 20, 3, true),
    (p_tenant_id, 'work_order', 'critical', 'Critical', 10, 4, true);
end;
$$;

comment on function cfg.create_default_work_order_priorities(uuid) is 
  'Creates default work order priorities (low, medium, high, critical) for a new tenant. Priorities have numeric weights for sorting (lower = higher priority). Provides sensible defaults. Called automatically during tenant creation.';

revoke all on function cfg.create_default_work_order_priorities(uuid) from public;
grant execute on function cfg.create_default_work_order_priorities(uuid) to authenticated;

create function cfg.create_default_asset_statuses(
  p_tenant_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into cfg.status_catalogs (tenant_id, entity_type, key, name, category, display_order, is_system, is_final)
  values
    (p_tenant_id, 'asset', 'active', 'Active', 'open', 1, true, false),
    (p_tenant_id, 'asset', 'inactive', 'Inactive', 'closed', 2, true, false),
    (p_tenant_id, 'asset', 'retired', 'Retired', 'final', 3, true, true);
end;
$$;

comment on function cfg.create_default_asset_statuses(uuid) is 
  'Creates default asset statuses (active, inactive, retired) for a new tenant. Provides sensible defaults. System statuses cannot be deleted. Called automatically during tenant creation.';

revoke all on function cfg.create_default_asset_statuses(uuid) from public;
grant execute on function cfg.create_default_asset_statuses(uuid) to authenticated;

-- Note: cfg.create_default_tenant_roles is defined in migration 05_work_order_extensions.sql
-- to include manager and technician roles, and maintenance types

-- ============================================================================
-- Grants for Underlying Tables (needed for SECURITY INVOKER views in migration 07)
-- ============================================================================

grant select on cfg.status_catalogs to authenticated;
grant select on cfg.status_catalogs to anon;

grant select on cfg.status_transitions to authenticated;
grant select on cfg.status_transitions to anon;

grant select on cfg.priority_catalogs to authenticated;
grant select on cfg.priority_catalogs to anon;

-- ============================================================================
-- Force RLS on Workflow Tables
-- ============================================================================

alter table cfg.status_catalogs force row level security;
alter table cfg.status_transitions force row level security;
alter table cfg.priority_catalogs force row level security;
