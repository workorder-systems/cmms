-- SPDX-License-Identifier: AGPL-3.0-or-later
--
-- Work orders: supplier labor/parts flags, vendor cost FK, request portal,
-- work order SLA rules and timestamps, RLS for requestor-scoped WO visibility,
-- default requestor role, SLA recompute + acknowledge RPCs, vendor cost RPCs,
-- assign work order RPC, public views.
--
-- Rollback: non-trivial (drops columns, policies); restore from prior migration snapshot if needed.

-- ============================================================================
-- 1. Permissions
-- ============================================================================

insert into cfg.permissions (key, name, category, description) values
  ('workorder.request.create', 'Create Work Order Requests', 'workorder', 'Submit work orders as a requestor (portal)'),
  ('workorder.request.view.own', 'View Own Work Order Requests', 'workorder', 'View work orders the user requested'),
  ('workorder.request.view.any', 'View All Work Order Requests', 'workorder', 'View all work orders in tenant (coordinator)'),
  ('workorder.acknowledge', 'Acknowledge Work Order SLA', 'workorder', 'Acknowledge work order for SLA response tracking'),
  ('workorder.vendor_cost.manage', 'Manage Work Order Vendor Costs', 'workorder', 'Create or update vendor cost lines on work orders'),
  ('tenant.sla.manage', 'Manage SLA Rules', 'tenant', 'Create and edit work order SLA rules for the tenant')
on conflict (key) do nothing;

-- ============================================================================
-- 2. Suppliers: parts/labor capabilities and contractor metadata
-- ============================================================================

alter table app.suppliers
  add column supplies_parts boolean not null default true,
  add column supplies_labor boolean not null default false,
  add column tax_id text,
  add column insurance_expires_at date;

comment on column app.suppliers.supplies_parts is 'Supplier provides parts or materials (purchasing, POs).';
comment on column app.suppliers.supplies_labor is 'Supplier provides labor or field services (contractors).';
comment on column app.suppliers.tax_id is 'Optional tax or VAT identifier.';
comment on column app.suppliers.insurance_expires_at is 'Optional insurance certificate expiry for contractors.';

-- ============================================================================
-- 3. Work order vendor costs: link to supplier
-- ============================================================================

alter table app.work_order_vendor_costs
  add column supplier_id uuid references app.suppliers(id) on delete set null;

create index work_order_vendor_costs_supplier_idx
  on app.work_order_vendor_costs (tenant_id, supplier_id)
  where supplier_id is not null;

comment on column app.work_order_vendor_costs.supplier_id is 'Optional link to tenant supplier; vendor_name remains for display and legacy imports.';

-- Backfill supplier_id where name matches uniquely per tenant
update app.work_order_vendor_costs w
set supplier_id = s.id
from app.suppliers s
where w.tenant_id = s.tenant_id
  and w.supplier_id is null
  and w.vendor_name is not null
  and length(trim(w.vendor_name)) >= 1
  and lower(trim(w.vendor_name)) = lower(trim(s.name));

create or replace function util.validate_work_order_vendor_costs_supplier()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_supplier_tenant_id uuid;
begin
  if new.supplier_id is null then
    return new;
  end if;
  select tenant_id into v_supplier_tenant_id
  from app.suppliers
  where id = new.supplier_id;
  if v_supplier_tenant_id is null then
    raise exception using message = 'supplier not found', errcode = '23503';
  end if;
  if v_supplier_tenant_id != new.tenant_id then
    raise exception using message = 'supplier tenant must match work_order_vendor_costs.tenant_id', errcode = '23503';
  end if;
  return new;
end;
$$;

comment on function util.validate_work_order_vendor_costs_supplier() is
  'Ensures supplier_id references a supplier in the same tenant as the cost row.';

revoke all on function util.validate_work_order_vendor_costs_supplier() from public;
grant execute on function util.validate_work_order_vendor_costs_supplier() to postgres;

create trigger work_order_vendor_costs_validate_supplier
  before insert or update on app.work_order_vendor_costs
  for each row
  execute function util.validate_work_order_vendor_costs_supplier();

-- ============================================================================
-- 4. Work orders: requestor, primary contractor, SLA fields
-- ============================================================================

alter table app.work_orders
  add column requested_by uuid references auth.users(id) on delete set null,
  add column primary_supplier_id uuid references app.suppliers(id) on delete set null,
  add column acknowledged_at timestamptz,
  add column sla_response_due_at timestamptz,
  add column sla_resolution_due_at timestamptz,
  add column sla_response_breached_at timestamptz,
  add column sla_resolution_breached_at timestamptz;

comment on column app.work_orders.requested_by is 'End user who submitted the request (portal); null for staff-created WOs.';
comment on column app.work_orders.primary_supplier_id is 'Primary external contractor/vendor for this work order.';
comment on column app.work_orders.acknowledged_at is 'When response SLA was satisfied (explicit ack or entering acknowledging status).';
comment on column app.work_orders.sla_response_due_at is 'Deadline for first response (from SLA rules).';
comment on column app.work_orders.sla_resolution_due_at is 'Deadline for resolution (from SLA rules).';

create index work_orders_tenant_requested_by_idx
  on app.work_orders (tenant_id, requested_by, created_at desc)
  where requested_by is not null;

create index work_orders_tenant_sla_response_due_idx
  on app.work_orders (tenant_id, sla_response_due_at)
  where sla_response_due_at is not null and status not in ('completed', 'cancelled');

create or replace function util.validate_work_order_primary_supplier_tenant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_supplier_tenant_id uuid;
begin
  if new.primary_supplier_id is null then
    return new;
  end if;
  select tenant_id into v_supplier_tenant_id
  from app.suppliers
  where id = new.primary_supplier_id;
  if v_supplier_tenant_id is null or v_supplier_tenant_id != new.tenant_id then
    raise exception using message = 'primary_supplier must belong to the same tenant', errcode = '23503';
  end if;
  return new;
end;
$$;

revoke all on function util.validate_work_order_primary_supplier_tenant() from public;
grant execute on function util.validate_work_order_primary_supplier_tenant() to postgres;

create trigger work_orders_validate_primary_supplier_tenant
  before insert or update on app.work_orders
  for each row
  execute function util.validate_work_order_primary_supplier_tenant();

-- ============================================================================
-- 5. Status catalog: SLA acknowledgment flag
-- ============================================================================

alter table cfg.status_catalogs
  add column sla_acknowledges_response boolean not null default false;

comment on column cfg.status_catalogs.sla_acknowledges_response is
  'When transitioning to this status, set work_orders.acknowledged_at if still null (stops response SLA clock).';

update cfg.status_catalogs
set sla_acknowledges_response = true
where entity_type = 'work_order'
  and key in ('assigned', 'in_progress');

-- ============================================================================
-- 6. cfg.work_order_sla_rules
-- ============================================================================

create table cfg.work_order_sla_rules (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  priority_key text not null,
  maintenance_type_key text,
  response_interval interval not null,
  resolution_interval interval not null,
  is_active boolean not null default true,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint work_order_sla_rules_response_positive check (response_interval > interval '0'),
  constraint work_order_sla_rules_resolution_positive check (resolution_interval > interval '0'),
  constraint work_order_sla_rules_priority_format_check check (
    priority_key ~ '^[a-z0-9_]+$'
    and length(priority_key) >= 1
    and length(priority_key) <= 50
  )
);

comment on table cfg.work_order_sla_rules is
  'Per-tenant SLA targets for work orders by priority; optional maintenance_type_key overrides generic rule for same priority.';

create index work_order_sla_rules_tenant_idx
  on cfg.work_order_sla_rules (tenant_id, is_active);

create unique index work_order_sla_rules_tenant_priority_generic_unique_idx
  on cfg.work_order_sla_rules (tenant_id, priority_key)
  where maintenance_type_key is null and is_active = true;

create unique index work_order_sla_rules_tenant_priority_mt_unique_idx
  on cfg.work_order_sla_rules (tenant_id, priority_key, maintenance_type_key)
  where maintenance_type_key is not null and is_active = true;

create trigger work_order_sla_rules_set_updated_at
  before update on cfg.work_order_sla_rules
  for each row
  execute function util.set_updated_at();

alter table cfg.work_order_sla_rules enable row level security;

create policy work_order_sla_rules_select_tenant on cfg.work_order_sla_rules
  for select to authenticated
  using (authz.is_current_user_tenant_member(tenant_id));

create policy work_order_sla_rules_select_anon on cfg.work_order_sla_rules
  for select to anon
  using (authz.is_current_user_tenant_member(tenant_id));

create policy work_order_sla_rules_insert_tenant on cfg.work_order_sla_rules
  for insert to authenticated
  with check (
    authz.is_current_user_tenant_member(tenant_id)
    and authz.has_current_user_permission(tenant_id, 'tenant.sla.manage')
  );

create policy work_order_sla_rules_insert_anon on cfg.work_order_sla_rules
  for insert to anon
  with check (false);

create policy work_order_sla_rules_update_tenant on cfg.work_order_sla_rules
  for update to authenticated
  using (
    authz.is_current_user_tenant_member(tenant_id)
    and authz.has_current_user_permission(tenant_id, 'tenant.sla.manage')
  )
  with check (
    authz.is_current_user_tenant_member(tenant_id)
    and authz.has_current_user_permission(tenant_id, 'tenant.sla.manage')
  );

create policy work_order_sla_rules_update_anon on cfg.work_order_sla_rules
  for update to anon
  using (false)
  with check (false);

create policy work_order_sla_rules_delete_tenant on cfg.work_order_sla_rules
  for delete to authenticated
  using (
    authz.is_current_user_tenant_member(tenant_id)
    and authz.has_current_user_permission(tenant_id, 'tenant.sla.manage')
  );

create policy work_order_sla_rules_delete_anon on cfg.work_order_sla_rules
  for delete to anon
  using (false);

comment on policy work_order_sla_rules_select_tenant on cfg.work_order_sla_rules is
  'Tenant members may read SLA rules.';

comment on policy work_order_sla_rules_insert_tenant on cfg.work_order_sla_rules is
  'Users with tenant.sla.manage may create SLA rules.';

alter table cfg.work_order_sla_rules force row level security;

grant select on cfg.work_order_sla_rules to authenticated, anon;
grant insert, update, delete on cfg.work_order_sla_rules to authenticated;

-- ============================================================================
-- 7. ABAC: requestor may only pick locations/assets in scope (if scoped)
-- ============================================================================

create or replace function authz.user_has_no_location_scopes(
  p_user_id uuid,
  p_tenant_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1
    from app.membership_scopes ms
    where ms.user_id = p_user_id
      and ms.tenant_id = p_tenant_id
      and ms.scope_type = 'location'
  );
$$;

comment on function authz.user_has_no_location_scopes(uuid, uuid) is
  'True if the user has no location ABAC rows for the tenant (full-tenant access).';

revoke all on function authz.user_has_no_location_scopes(uuid, uuid) from public;
grant execute on function authz.user_has_no_location_scopes(uuid, uuid) to authenticated;
grant execute on function authz.user_has_no_location_scopes(uuid, uuid) to anon;

create or replace function authz.user_can_request_work_order_at_locations(
  p_user_id uuid,
  p_tenant_id uuid,
  p_location_id uuid,
  p_asset_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_effective_location_id uuid;
  v_asset_location_id uuid;
  v_asset_tenant_id uuid;
begin
  if not authz.is_tenant_member(p_user_id, p_tenant_id) then
    return false;
  end if;

  if authz.user_has_no_location_scopes(p_user_id, p_tenant_id) then
    return true;
  end if;

  v_effective_location_id := p_location_id;

  if p_asset_id is not null then
    select location_id, tenant_id
    into v_asset_location_id, v_asset_tenant_id
    from app.assets
    where id = p_asset_id;
    if v_asset_tenant_id is null or v_asset_tenant_id != p_tenant_id then
      return false;
    end if;
    if v_effective_location_id is null then
      v_effective_location_id := v_asset_location_id;
    elsif v_asset_location_id is not null and v_asset_location_id != v_effective_location_id then
      return false;
    end if;
  end if;

  if v_effective_location_id is null then
    return true;
  end if;

  return authz.has_location_scope(p_user_id, p_tenant_id, v_effective_location_id);
end;
$$;

comment on function authz.user_can_request_work_order_at_locations(uuid, uuid, uuid, uuid) is
  'Whether a user may create a portal request for the given location/asset per location ABAC scopes.';

revoke all on function authz.user_can_request_work_order_at_locations(uuid, uuid, uuid, uuid) from public;
grant execute on function authz.user_can_request_work_order_at_locations(uuid, uuid, uuid, uuid) to authenticated;
grant execute on function authz.user_can_request_work_order_at_locations(uuid, uuid, uuid, uuid) to anon;

-- ============================================================================
-- 8. Work order RLS: requestor-scoped visibility
-- ============================================================================

drop policy if exists work_orders_select_tenant on app.work_orders;
drop policy if exists work_orders_insert_tenant on app.work_orders;
drop policy if exists work_orders_update_tenant on app.work_orders;

create policy work_orders_select_tenant
  on app.work_orders
  for select
  to authenticated
  using (
    authz.is_current_user_tenant_member(tenant_id)
    and (
      authz.has_current_user_permission(tenant_id, 'workorder.view')
      or authz.has_current_user_permission(tenant_id, 'workorder.request.view.any')
      or (
        requested_by is not null
        and requested_by = auth.uid()
        and authz.has_current_user_permission(tenant_id, 'workorder.request.view.own')
      )
    )
  );

create policy work_orders_insert_tenant
  on app.work_orders
  for insert
  to authenticated
  with check (
    authz.is_current_user_tenant_member(tenant_id)
    and (
      authz.has_current_user_permission(tenant_id, 'workorder.create')
      or authz.has_current_user_permission(tenant_id, 'workorder.request.create')
    )
  );

create policy work_orders_update_tenant
  on app.work_orders
  for update
  to authenticated
  using (
    authz.is_current_user_tenant_member(tenant_id)
    and authz.has_current_user_permission(tenant_id, 'workorder.edit')
  )
  with check (
    authz.is_current_user_tenant_member(tenant_id)
    and authz.has_current_user_permission(tenant_id, 'workorder.edit')
  );

comment on policy work_orders_select_tenant on app.work_orders is
  'Members see WOs if they have workorder.view, workorder.request.view.any, or own request rows with workorder.request.view.own.';

comment on policy work_orders_insert_tenant on app.work_orders is
  'Insert allowed with workorder.create or workorder.request.create.';

comment on policy work_orders_update_tenant on app.work_orders is
  'Updates require workorder.edit (use RPCs for requestor flows).';

-- ============================================================================
-- 9. Default work order statuses include SLA acknowledgment flags
-- ============================================================================

create or replace function cfg.create_default_work_order_statuses(
  p_tenant_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into cfg.status_catalogs (
    tenant_id, entity_type, key, name, category, display_order, is_system, is_final, color, sla_acknowledges_response
  )
  values
    (p_tenant_id, 'work_order', 'draft', 'Draft', 'open', 1, true, false, '#94a3b8', false),
    (p_tenant_id, 'work_order', 'assigned', 'Assigned', 'open', 2, true, false, '#3b82f6', true),
    (p_tenant_id, 'work_order', 'in_progress', 'In Progress', 'open', 3, true, false, '#f59e0b', true),
    (p_tenant_id, 'work_order', 'completed', 'Completed', 'closed', 4, true, true, '#22c55e', false),
    (p_tenant_id, 'work_order', 'cancelled', 'Cancelled', 'closed', 5, true, true, '#64748b', false);

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
  'Default work order statuses with SLA acknowledgment on assigned and in_progress.';

-- ============================================================================
-- 10. Default SLA rules for new tenants
-- ============================================================================

create or replace function cfg.seed_default_work_order_sla_rules(
  p_tenant_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into cfg.work_order_sla_rules (
    tenant_id, priority_key, maintenance_type_key, response_interval, resolution_interval, is_active
  )
  values
    (p_tenant_id, 'critical', null, interval '4 hours', interval '24 hours', true),
    (p_tenant_id, 'high', null, interval '8 hours', interval '72 hours', true),
    (p_tenant_id, 'medium', null, interval '24 hours', interval '5 days', true),
    (p_tenant_id, 'low', null, interval '48 hours', interval '14 days', true);
end;
$$;

comment on function cfg.seed_default_work_order_sla_rules(uuid) is
  'Inserts default SLA intervals per work order priority for a tenant.';

revoke all on function cfg.seed_default_work_order_sla_rules(uuid) from public;
grant execute on function cfg.seed_default_work_order_sla_rules(uuid) to postgres;

-- ============================================================================
-- 11. Default tenant roles: requestor + seed SLA rules
-- ============================================================================

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
  select v_admin_role_id, id
  from cfg.permissions;

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
    'location.view'
  );

  insert into cfg.tenant_role_permissions (tenant_role_id, permission_id)
  select v_manager_role_id, id
  from cfg.permissions
  where key like 'workorder.%'
     or key like 'asset.%'
     or key like 'location.%';

  insert into cfg.tenant_role_permissions (tenant_role_id, permission_id)
  select v_requestor_role_id, id
  from cfg.permissions
  where key in (
    'workorder.request.create',
    'workorder.request.view.own',
    'asset.view',
    'location.view'
  );

  perform cfg.create_default_work_order_statuses(p_tenant_id);
  perform cfg.create_default_work_order_priorities(p_tenant_id);
  perform cfg.create_default_asset_statuses(p_tenant_id);
  perform cfg.create_default_maintenance_types(p_tenant_id);
  perform cfg.seed_default_work_order_sla_rules(p_tenant_id);
end;
$$;

comment on function cfg.create_default_tenant_roles(uuid) is
  'Default roles including requestor (portal) and default SLA rules per tenant.';

-- Backfill requestor role for existing tenants (idempotent per tenant)
insert into cfg.tenant_roles (tenant_id, key, name, is_default, is_system)
select t.id, 'requestor', 'Requestor', false, true
from app.tenants t
where not exists (
  select 1
  from cfg.tenant_roles tr
  where tr.tenant_id = t.id
    and tr.key = 'requestor'
);

insert into cfg.tenant_role_permissions (tenant_role_id, permission_id)
select tr.id, p.id
from cfg.tenant_roles tr
cross join cfg.permissions p
where tr.key = 'requestor'
  and p.key in (
    'workorder.request.create',
    'workorder.request.view.own',
    'asset.view',
    'location.view'
  )
  and not exists (
    select 1
    from cfg.tenant_role_permissions x
    where x.tenant_role_id = tr.id
      and x.permission_id = p.id
  );

-- Seed SLA rules for tenants that have none
insert into cfg.work_order_sla_rules (
  tenant_id, priority_key, maintenance_type_key, response_interval, resolution_interval, is_active
)
select t.id, v.priority_key, null, v.response_interval, v.resolution_interval, true
from app.tenants t
cross join (
  values
    ('critical'::text, interval '4 hours', interval '24 hours'),
    ('high', interval '8 hours', interval '72 hours'),
    ('medium', interval '24 hours', interval '5 days'),
    ('low', interval '48 hours', interval '14 days')
) as v(priority_key, response_interval, resolution_interval)
where not exists (
  select 1
  from cfg.work_order_sla_rules r
  where r.tenant_id = t.id
    and r.priority_key = v.priority_key
    and r.maintenance_type_key is null
);

-- Grant tenant.sla.manage to existing admin roles (admin has all perms already via future tenants;
-- for existing DBs, admin role already has all permissions if created before new perms — re-sync admin)
insert into cfg.tenant_role_permissions (tenant_role_id, permission_id)
select tr.id, p.id
from cfg.tenant_roles tr
cross join cfg.permissions p
where tr.key = 'admin'
  and not exists (
    select 1
    from cfg.tenant_role_permissions x
    where x.tenant_role_id = tr.id
      and x.permission_id = p.id
  );

-- ============================================================================
-- 12. SLA recompute (internal)
-- ============================================================================

create or replace function app.recompute_work_order_sla(
  p_work_order_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_wo app.work_orders%rowtype;
  v_maint text;
  v_resp interval;
  v_res interval;
begin
  select * into v_wo
  from app.work_orders
  where id = p_work_order_id;

  if not found then
    return;
  end if;

  if v_wo.status in ('completed', 'cancelled') then
    return;
  end if;

  v_maint := v_wo.maintenance_type;

  select r.response_interval, r.resolution_interval
  into v_resp, v_res
  from cfg.work_order_sla_rules r
  where r.tenant_id = v_wo.tenant_id
    and r.is_active = true
    and r.priority_key = v_wo.priority
    and r.maintenance_type_key is not distinct from v_maint
  limit 1;

  if v_resp is null then
    select r.response_interval, r.resolution_interval
    into v_resp, v_res
    from cfg.work_order_sla_rules r
    where r.tenant_id = v_wo.tenant_id
      and r.is_active = true
      and r.priority_key = v_wo.priority
      and r.maintenance_type_key is null
    limit 1;
  end if;

  if v_resp is null then
    update app.work_orders
    set
      sla_response_due_at = null,
      sla_resolution_due_at = null
    where id = p_work_order_id;
    return;
  end if;

  update app.work_orders
  set
    sla_response_due_at = v_wo.created_at + v_resp,
    sla_resolution_due_at = v_wo.created_at + v_res
  where id = p_work_order_id;
end;
$$;

comment on function app.recompute_work_order_sla(uuid) is
  'Sets SLA due timestamps from active cfg.work_order_sla_rules (maintenance-specific rule wins).';

revoke all on function app.recompute_work_order_sla(uuid) from public;
grant execute on function app.recompute_work_order_sla(uuid) to postgres;

create or replace function app.work_orders_recompute_sla_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app.recompute_work_order_sla(new.id);
  return new;
end;
$$;

revoke all on function app.work_orders_recompute_sla_trigger() from public;
grant execute on function app.work_orders_recompute_sla_trigger() to postgres;

create trigger work_orders_recompute_sla
  after insert or update of priority, maintenance_type, created_at
  on app.work_orders
  for each row
  execute function app.work_orders_recompute_sla_trigger();

-- ============================================================================
-- 13. rpc_create_work_order: recompute SLA after insert
-- ============================================================================

drop function if exists public.rpc_create_work_order(uuid, text, text, text, text, uuid, uuid, uuid, timestamptz, uuid, uuid);

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
  p_pm_schedule_id uuid default null,
  p_project_id uuid default null
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
  v_project_tenant_id uuid;
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

  if p_project_id is not null then
    select tenant_id into v_project_tenant_id from app.projects where id = p_project_id;
    if not found then
      raise exception using
        message = format('Project %s not found', p_project_id),
        errcode = 'P0001';
    end if;
    perform util.validate_tenant_match(p_tenant_id, v_project_tenant_id, 'Project');
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
    pm_schedule_id,
    project_id
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
    p_pm_schedule_id,
    p_project_id
  )
  returning id into v_work_order_id;

  return v_work_order_id;
end;
$$;

comment on function public.rpc_create_work_order(uuid, text, text, text, text, uuid, uuid, uuid, timestamptz, uuid, uuid) is
  'Creates a work order; SLA due dates are set by trigger from cfg.work_order_sla_rules.';

revoke all on function public.rpc_create_work_order(uuid, text, text, text, text, uuid, uuid, uuid, timestamptz, uuid, uuid) from public;
grant execute on function public.rpc_create_work_order(uuid, text, text, text, text, uuid, uuid, uuid, timestamptz, uuid, uuid) to authenticated;

-- ============================================================================
-- 14. rpc_transition_work_order_status: SLA acknowledgment on status
-- ============================================================================

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
  v_sla_ack boolean;
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

  select category, is_final, coalesce(sla_acknowledges_response, false)
  into v_to_status_category, v_to_status_final, v_sla_ack
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
    end,
    acknowledged_at = case
      when v_sla_ack and acknowledged_at is null then pg_catalog.now()
      else acknowledged_at
    end
  where id = p_work_order_id
    and tenant_id = p_tenant_id;
end;
$$;

comment on function public.rpc_transition_work_order_status(uuid, uuid, text) is
  'Transitions work order status; may set acknowledged_at when target status acknowledges SLA response.';

revoke all on function public.rpc_transition_work_order_status(uuid, uuid, text) from public;
grant execute on function public.rpc_transition_work_order_status(uuid, uuid, text) to authenticated;

-- ============================================================================
-- 15. rpc_acknowledge_work_order
-- ============================================================================

create or replace function public.rpc_acknowledge_work_order(
  p_tenant_id uuid,
  p_work_order_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  perform util.check_rate_limit('work_order_acknowledge', null, 60, 1, auth.uid(), p_tenant_id);

  v_user_id := authz.rpc_setup(p_tenant_id, 'workorder.acknowledge');

  update app.work_orders
  set acknowledged_at = coalesce(acknowledged_at, pg_catalog.now())
  where id = p_work_order_id
    and tenant_id = p_tenant_id;

  if not found then
    raise exception using message = 'Work order not found', errcode = 'P0001';
  end if;
end;
$$;

comment on function public.rpc_acknowledge_work_order(uuid, uuid) is
  'Sets acknowledged_at for SLA response tracking. Requires workorder.acknowledge.';

revoke all on function public.rpc_acknowledge_work_order(uuid, uuid) from public;
grant execute on function public.rpc_acknowledge_work_order(uuid, uuid) to authenticated;

-- ============================================================================
-- 16. rpc_create_work_order_request (portal)
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
  v_work_order_id uuid;
  v_initial_status text;
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
    if not found or v_asset_tenant_id != p_tenant_id then
      raise exception using message = 'Asset not found or wrong tenant', errcode = '23503';
    end if;
  end if;

  if p_location_id is not null then
    select tenant_id into v_loc_tenant_id from app.locations where id = p_location_id;
    if not found or v_loc_tenant_id != p_tenant_id then
      raise exception using message = 'Location not found or wrong tenant', errcode = '23503';
    end if;
  end if;

  v_initial_status := cfg.get_default_status(
    p_tenant_id,
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
    p_tenant_id,
    p_title,
    p_description,
    p_priority,
    p_maintenance_type,
    null,
    p_location_id,
    p_asset_id,
    p_due_date,
    v_initial_status,
    v_user_id
  )
  returning id into v_work_order_id;

  return v_work_order_id;
end;
$$;

comment on function public.rpc_create_work_order_request(uuid, text, text, text, text, uuid, uuid, timestamptz) is
  'Portal: create a work order with requested_by = caller. Respects location ABAC scopes.';

revoke all on function public.rpc_create_work_order_request(uuid, text, text, text, text, uuid, uuid, timestamptz) from public;
grant execute on function public.rpc_create_work_order_request(uuid, text, text, text, text, uuid, uuid, timestamptz) to authenticated;

-- ============================================================================
-- 17. Vendor cost + primary supplier RPCs
-- ============================================================================

create or replace function public.rpc_upsert_work_order_vendor_cost(
  p_tenant_id uuid,
  p_work_order_id uuid,
  p_vendor_cost_id uuid default null,
  p_amount_cents integer default null,
  p_description text default null,
  p_vendor_name text default null,
  p_invoice_reference text default null,
  p_supplier_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_wo_tenant_id uuid;
  v_id uuid;
begin
  perform util.check_rate_limit('work_order_vendor_cost_upsert', null, 30, 1, auth.uid(), p_tenant_id);

  v_user_id := authz.rpc_setup(p_tenant_id, 'workorder.vendor_cost.manage');

  select tenant_id into v_wo_tenant_id
  from app.work_orders
  where id = p_work_order_id;

  if not found or v_wo_tenant_id != p_tenant_id then
    raise exception using message = 'Work order not found or wrong tenant', errcode = 'P0001';
  end if;

  if p_vendor_cost_id is null then
    if p_amount_cents is null then
      raise exception using message = 'amount_cents required for new vendor cost line', errcode = '23514';
    end if;
    insert into app.work_order_vendor_costs (
      tenant_id, work_order_id, description, amount_cents, vendor_name, invoice_reference, supplier_id
    )
    values (
      p_tenant_id,
      p_work_order_id,
      p_description,
      p_amount_cents,
      p_vendor_name,
      p_invoice_reference,
      p_supplier_id
    )
    returning id into v_id;
    return v_id;
  end if;

  update app.work_order_vendor_costs
  set
    description = coalesce(p_description, description),
    amount_cents = coalesce(p_amount_cents, amount_cents),
    vendor_name = case when p_vendor_name is not null then p_vendor_name else vendor_name end,
    invoice_reference = case when p_invoice_reference is not null then p_invoice_reference else invoice_reference end,
    supplier_id = coalesce(p_supplier_id, supplier_id),
    updated_at = pg_catalog.now()
  where id = p_vendor_cost_id
    and tenant_id = p_tenant_id
    and work_order_id = p_work_order_id
  returning id into v_id;

  if v_id is null then
    raise exception using message = 'Vendor cost line not found', errcode = 'P0001';
  end if;

  return v_id;
end;
$$;

comment on function public.rpc_upsert_work_order_vendor_cost(uuid, uuid, uuid, integer, text, text, text, uuid) is
  'Insert or update a work order vendor cost line. Requires workorder.vendor_cost.manage.';

revoke all on function public.rpc_upsert_work_order_vendor_cost(uuid, uuid, uuid, integer, text, text, text, uuid) from public;
grant execute on function public.rpc_upsert_work_order_vendor_cost(uuid, uuid, uuid, integer, text, text, text, uuid) to authenticated;

create or replace function public.rpc_set_work_order_primary_supplier(
  p_tenant_id uuid,
  p_work_order_id uuid,
  p_primary_supplier_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform authz.rpc_setup(p_tenant_id, 'workorder.edit');

  update app.work_orders
  set primary_supplier_id = p_primary_supplier_id
  where id = p_work_order_id
    and tenant_id = p_tenant_id;

  if not found then
    raise exception using message = 'Work order not found', errcode = 'P0001';
  end if;
end;
$$;

comment on function public.rpc_set_work_order_primary_supplier(uuid, uuid, uuid) is
  'Sets primary contractor supplier on a work order. Requires workorder.edit.';

revoke all on function public.rpc_set_work_order_primary_supplier(uuid, uuid, uuid) from public;
grant execute on function public.rpc_set_work_order_primary_supplier(uuid, uuid, uuid) to authenticated;

-- ============================================================================
-- 18. rpc_assign_work_order
-- ============================================================================

create or replace function public.rpc_assign_work_order(
  p_tenant_id uuid,
  p_work_order_id uuid,
  p_assigned_to uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform util.check_rate_limit('work_order_assign', null, 30, 1, auth.uid(), p_tenant_id);

  perform authz.rpc_setup(p_tenant_id, 'workorder.assign');

  update app.work_orders
  set assigned_to = p_assigned_to
  where id = p_work_order_id
    and tenant_id = p_tenant_id;

  if not found then
    raise exception using message = 'Work order not found', errcode = 'P0001';
  end if;
end;
$$;

comment on function public.rpc_assign_work_order(uuid, uuid, uuid) is
  'Assigns a work order to a user. Requires workorder.assign.';

revoke all on function public.rpc_assign_work_order(uuid, uuid, uuid) from public;
grant execute on function public.rpc_assign_work_order(uuid, uuid, uuid) to authenticated;

-- ============================================================================
-- 19. Extend supplier RPCs (capabilities + tax/insurance)
-- ============================================================================

drop function if exists public.rpc_create_supplier(uuid, text, text, text, text, text, text, text);

create or replace function public.rpc_create_supplier(
  p_tenant_id uuid,
  p_name text,
  p_code text default null,
  p_external_id text default null,
  p_contact_name text default null,
  p_email text default null,
  p_phone text default null,
  p_address_line text default null,
  p_supplies_parts boolean default true,
  p_supplies_labor boolean default false,
  p_tax_id text default null,
  p_insurance_expires_at date default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_supplier_id uuid;
begin
  perform authz.rpc_setup(p_tenant_id, 'supplier.create');
  if p_name is null or length(trim(p_name)) < 1 then
    raise exception using message = 'name is required', errcode = '23514';
  end if;
  insert into app.suppliers (
    tenant_id, name, code, external_id, contact_name, email, phone, address_line,
    supplies_parts, supplies_labor, tax_id, insurance_expires_at
  )
  values (
    p_tenant_id, trim(p_name), nullif(trim(p_code), ''), nullif(trim(p_external_id), ''),
    nullif(trim(p_contact_name), ''), nullif(trim(p_email), ''), nullif(trim(p_phone), ''),
    nullif(trim(p_address_line), ''),
    coalesce(p_supplies_parts, true),
    coalesce(p_supplies_labor, false),
    nullif(trim(p_tax_id), ''),
    p_insurance_expires_at
  )
  returning id into v_supplier_id;
  return v_supplier_id;
end;
$$;

revoke all on function public.rpc_create_supplier(uuid, text, text, text, text, text, text, text, boolean, boolean, text, date) from public;
grant execute on function public.rpc_create_supplier(uuid, text, text, text, text, text, text, text, boolean, boolean, text, date) to authenticated;

drop function if exists public.rpc_update_supplier(uuid, uuid, text, text, text, text, text, text, text);

create or replace function public.rpc_update_supplier(
  p_tenant_id uuid,
  p_supplier_id uuid,
  p_name text default null,
  p_code text default null,
  p_external_id text default null,
  p_contact_name text default null,
  p_email text default null,
  p_phone text default null,
  p_address_line text default null,
  p_supplies_parts boolean default null,
  p_supplies_labor boolean default null,
  p_tax_id text default null,
  p_insurance_expires_at date default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_supplier_tenant_id uuid;
begin
  perform authz.rpc_setup(p_tenant_id, 'supplier.edit');
  select tenant_id into v_supplier_tenant_id from app.suppliers where id = p_supplier_id;
  if v_supplier_tenant_id is null or v_supplier_tenant_id != p_tenant_id then
    raise exception using message = 'Supplier not found or wrong tenant', errcode = '23503';
  end if;
  update app.suppliers
  set
    name = coalesce(nullif(trim(p_name), ''), name),
    code = case when p_code is not null then nullif(trim(p_code), '') else code end,
    external_id = case when p_external_id is not null then nullif(trim(p_external_id), '') else external_id end,
    contact_name = coalesce(p_contact_name, contact_name),
    email = coalesce(p_email, email),
    phone = coalesce(p_phone, phone),
    address_line = coalesce(p_address_line, address_line),
    supplies_parts = coalesce(p_supplies_parts, supplies_parts),
    supplies_labor = coalesce(p_supplies_labor, supplies_labor),
    tax_id = case when p_tax_id is not null then nullif(trim(p_tax_id), '') else tax_id end,
    insurance_expires_at = coalesce(p_insurance_expires_at, insurance_expires_at),
    updated_at = pg_catalog.now()
  where id = p_supplier_id;
end;
$$;

revoke all on function public.rpc_update_supplier(uuid, uuid, text, text, text, text, text, text, text, boolean, boolean, text, date) from public;
grant execute on function public.rpc_update_supplier(uuid, uuid, text, text, text, text, text, text, text, boolean, boolean, text, date) to authenticated;

-- ============================================================================
-- 20. rpc_manage_work_order_sla_rule (tenant admin)
-- ============================================================================

create or replace function public.rpc_upsert_work_order_sla_rule(
  p_tenant_id uuid,
  p_priority_key text,
  p_maintenance_type_key text default null,
  p_response_interval interval default null,
  p_resolution_interval interval default null,
  p_is_active boolean default true,
  p_rule_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform authz.rpc_setup(p_tenant_id, 'tenant.sla.manage');

  if not exists (
    select 1
    from cfg.priority_catalogs
    where tenant_id = p_tenant_id
      and entity_type = 'work_order'
      and key = p_priority_key
  ) then
    raise exception using message = 'Invalid priority for tenant', errcode = '23503';
  end if;

  if p_maintenance_type_key is not null then
    if not exists (
      select 1
      from cfg.maintenance_type_catalogs
      where tenant_id = p_tenant_id
        and entity_type = 'work_order'
        and key = p_maintenance_type_key
    ) then
      raise exception using message = 'Invalid maintenance type for tenant', errcode = '23503';
    end if;
  end if;

  if p_rule_id is null then
    if p_response_interval is null or p_resolution_interval is null then
      raise exception using message = 'response_interval and resolution_interval required', errcode = '23514';
    end if;
    insert into cfg.work_order_sla_rules (
      tenant_id, priority_key, maintenance_type_key, response_interval, resolution_interval, is_active
    )
    values (
      p_tenant_id, p_priority_key, nullif(trim(p_maintenance_type_key), ''),
      p_response_interval, p_resolution_interval, coalesce(p_is_active, true)
    )
    returning id into v_id;
    return v_id;
  end if;

  update cfg.work_order_sla_rules
  set
    response_interval = coalesce(p_response_interval, response_interval),
    resolution_interval = coalesce(p_resolution_interval, resolution_interval),
    is_active = coalesce(p_is_active, is_active),
    updated_at = pg_catalog.now()
  where id = p_rule_id
    and tenant_id = p_tenant_id
  returning id into v_id;

  if v_id is null then
    raise exception using message = 'SLA rule not found', errcode = 'P0001';
  end if;

  return v_id;
end;
$$;

revoke all on function public.rpc_upsert_work_order_sla_rule(uuid, text, text, interval, interval, boolean, uuid) from public;
grant execute on function public.rpc_upsert_work_order_sla_rule(uuid, text, text, interval, interval, boolean, uuid) to authenticated;

-- ============================================================================
-- 21. Public views: v_work_orders, v_my_work_order_requests, v_work_order_sla_status
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
  p_assigned.full_name as assigned_to_name,
  wo.location_id,
  wo.asset_id,
  wo.pm_schedule_id,
  wo.due_date,
  wo.completed_at,
  wo.completed_by,
  p_completed.full_name as completed_by_name,
  wo.cause,
  wo.resolution,
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
  ) as total_labor_minutes,
  wo.project_id,
  wo.requested_by,
  wo.primary_supplier_id,
  wo.acknowledged_at,
  wo.sla_response_due_at,
  wo.sla_resolution_due_at,
  wo.sla_response_breached_at,
  wo.sla_resolution_breached_at
from app.work_orders wo
left join app.profiles p_assigned
  on p_assigned.user_id = wo.assigned_to
  and p_assigned.tenant_id = wo.tenant_id
left join app.profiles p_completed
  on p_completed.user_id = wo.completed_by
  and p_completed.tenant_id = wo.tenant_id
where wo.tenant_id = authz.get_current_tenant_id();

comment on view public.v_work_orders is
  'Work orders for current tenant including portal and SLA columns.';

create or replace view public.v_my_work_order_requests
with (security_invoker = true)
as
select
  wo.id,
  wo.tenant_id,
  wo.title,
  wo.status,
  wo.priority,
  wo.created_at,
  wo.due_date,
  wo.location_id,
  wo.asset_id
from app.work_orders wo
where wo.tenant_id = authz.get_current_tenant_id()
  and wo.requested_by = auth.uid()
  and authz.has_current_user_permission(wo.tenant_id, 'workorder.request.view.own');

comment on view public.v_my_work_order_requests is
  'Work orders requested by the current user (portal).';

grant select on public.v_my_work_order_requests to authenticated;
grant select on public.v_my_work_order_requests to anon;

create or replace view public.v_work_order_sla_status
with (security_invoker = true)
as
select
  wo.id as work_order_id,
  wo.tenant_id,
  wo.status,
  wo.priority,
  wo.acknowledged_at,
  wo.sla_response_due_at,
  wo.sla_resolution_due_at,
  wo.sla_response_breached_at,
  wo.sla_resolution_breached_at,
  case
    when wo.sla_response_due_at is null then null
    when wo.acknowledged_at is not null then false
    else wo.sla_response_breached_at is not null
      or (pg_catalog.now() > wo.sla_response_due_at)
  end as response_sla_breached,
  case
    when wo.sla_resolution_due_at is null then null
    when wo.status in ('completed', 'cancelled') then false
    else wo.sla_resolution_breached_at is not null
      or (pg_catalog.now() > wo.sla_resolution_due_at)
  end as resolution_sla_breached
from app.work_orders wo
where wo.tenant_id = authz.get_current_tenant_id();

comment on view public.v_work_order_sla_status is
  'SLA breach flags derived from due timestamps and acknowledgment.';

grant select on public.v_work_order_sla_status to authenticated;
grant select on public.v_work_order_sla_status to anon;

-- Manager role: SLA rule management (workorder.* already covers vendor cost + acknowledge)
insert into cfg.tenant_role_permissions (tenant_role_id, permission_id)
select tr.id, p.id
from cfg.tenant_roles tr
cross join cfg.permissions p
where tr.key = 'manager'
  and p.key = 'tenant.sla.manage'
  and not exists (
    select 1
    from cfg.tenant_role_permissions x
    where x.tenant_role_id = tr.id
      and x.permission_id = p.id
  );
