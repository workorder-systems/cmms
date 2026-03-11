-- SPDX-License-Identifier: AGPL-3.0-or-later
--
-- Asset lifecycle and true cost of ownership: lifecycle fields on assets,
-- cost aggregation (parts, vendor), project dimension, roll-up views and RPCs.
--
-- Purpose: Track asset lifecycle (commissioning, EOL, replacement, warranty/contract),
-- roll up costs by asset, location, department, and project; support lifecycle and
-- cost reporting with RLS and tenant isolation consistent with existing models.
--
-- Affected: app.assets (new columns), cfg.create_default_asset_statuses,
--   app.work_order_parts (new), app.work_order_vendor_costs (new), app.projects (new),
--   app.work_orders (project_id), app and public views, RPCs.

-- ============================================================================
-- 1. Asset lifecycle and planning columns
-- ============================================================================

alter table app.assets
  add column commissioned_at timestamptz,
  add column end_of_life_estimate date,
  add column decommissioned_at timestamptz,
  add column replaced_by_asset_id uuid references app.assets(id) on delete set null,
  add column replacement_of_asset_id uuid references app.assets(id) on delete set null,
  add column warranty_expires_at date,
  add column service_contract_expires_at date,
  add column planned_replacement_date date;

comment on column app.assets.commissioned_at is 'When the asset was commissioned or placed into service.';
comment on column app.assets.end_of_life_estimate is 'Estimated end-of-life date for replacement planning.';
comment on column app.assets.decommissioned_at is 'When the asset was decommissioned.';
comment on column app.assets.replaced_by_asset_id is 'Asset that replaced this one (this asset is retired).';
comment on column app.assets.replacement_of_asset_id is 'Asset that this one replaced (this asset is the replacement).';
comment on column app.assets.warranty_expires_at is 'Warranty expiration date.';
comment on column app.assets.service_contract_expires_at is 'Service or maintenance contract expiration date.';
comment on column app.assets.planned_replacement_date is 'Planned date for replacement (capital planning).';

-- Prevent self-reference on replacement links
alter table app.assets
  add constraint assets_replaced_by_not_self check (replaced_by_asset_id is null or replaced_by_asset_id != id),
  add constraint assets_replacement_of_not_self check (replacement_of_asset_id is null or replacement_of_asset_id != id);

-- Indexes for lifecycle and planning reporting
create index assets_tenant_eol_idx on app.assets (tenant_id, end_of_life_estimate) where end_of_life_estimate is not null;
create index assets_tenant_warranty_idx on app.assets (tenant_id, warranty_expires_at) where warranty_expires_at is not null;
create index assets_replaced_by_idx on app.assets (replaced_by_asset_id) where replaced_by_asset_id is not null;
create index assets_replacement_of_idx on app.assets (replacement_of_asset_id) where replacement_of_asset_id is not null;

-- Ensure replacement assets belong to same tenant
create or replace function util.validate_asset_replacement_tenant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_other_tenant_id uuid;
begin
  if new.replaced_by_asset_id is not null then
    select tenant_id into v_other_tenant_id from app.assets where id = new.replaced_by_asset_id;
    if v_other_tenant_id is not null and v_other_tenant_id != new.tenant_id then
      raise exception using message = 'replaced_by_asset must belong to the same tenant', errcode = '23503';
    end if;
  end if;
  if new.replacement_of_asset_id is not null then
    select tenant_id into v_other_tenant_id from app.assets where id = new.replacement_of_asset_id;
    if v_other_tenant_id is not null and v_other_tenant_id != new.tenant_id then
      raise exception using message = 'replacement_of_asset must belong to the same tenant', errcode = '23503';
    end if;
  end if;
  return new;
end;
$$;

comment on function util.validate_asset_replacement_tenant() is 'Validates that replacement asset references belong to the same tenant.';

revoke all on function util.validate_asset_replacement_tenant() from public;
grant execute on function util.validate_asset_replacement_tenant() to postgres;

create trigger assets_validate_replacement_tenant
  before insert or update on app.assets
  for each row
  execute function util.validate_asset_replacement_tenant();

-- ============================================================================
-- 2. Default asset statuses: add lifecycle status keys
-- ============================================================================

create or replace function cfg.create_default_asset_statuses(
  p_tenant_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into cfg.status_catalogs (tenant_id, entity_type, key, name, category, display_order, is_system, is_final, color)
  values
    (p_tenant_id, 'asset', 'active', 'Active', 'open', 1, true, false, '#22c55e'),
    (p_tenant_id, 'asset', 'inactive', 'Inactive', 'closed', 2, true, false, '#94a3b8'),
    (p_tenant_id, 'asset', 'retired', 'Retired', 'final', 3, true, true, '#64748b'),
    (p_tenant_id, 'asset', 'commissioning', 'Commissioning', 'open', 4, true, false, '#eab308'),
    (p_tenant_id, 'asset', 'in_service', 'In Service', 'open', 5, true, false, '#22c55e'),
    (p_tenant_id, 'asset', 'decommissioned', 'Decommissioned', 'final', 6, true, true, '#64748b'),
    (p_tenant_id, 'asset', 'replaced', 'Replaced', 'final', 7, true, true, '#94a3b8')
  on conflict do nothing;
end;
$$;

comment on function cfg.create_default_asset_statuses(uuid) is
  'Creates default asset statuses (active, inactive, retired, commissioning, in_service, decommissioned, replaced) for a new tenant. Includes hex colors for UI badges. System statuses cannot be deleted. Called automatically during tenant creation.';

-- ============================================================================
-- 3. app.work_order_parts (parts/materials cost)
-- ============================================================================

create table app.work_order_parts (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  work_order_id uuid not null references app.work_orders(id) on delete cascade,
  description text,
  part_number text,
  quantity numeric not null,
  unit_cost_cents integer not null,
  total_cost_cents integer not null,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint work_order_parts_quantity_check check (quantity > 0),
  constraint work_order_parts_unit_cost_check check (unit_cost_cents >= 0 and unit_cost_cents <= 10000000),
  constraint work_order_parts_total_cost_check check (total_cost_cents >= 0 and total_cost_cents <= 10000000)
);

comment on table app.work_order_parts is 'Parts and materials cost lines for work orders. Used for cost roll-up and true cost of ownership reporting.';
comment on column app.work_order_parts.total_cost_cents is 'Total cost for this line (quantity * unit_cost_cents or override).';

create index work_order_parts_work_order_idx on app.work_order_parts (work_order_id);
create index work_order_parts_tenant_work_order_idx on app.work_order_parts (tenant_id, work_order_id);

create trigger work_order_parts_set_updated_at
  before update on app.work_order_parts
  for each row
  execute function util.set_updated_at();

-- Tenant must match work order
create or replace function util.validate_work_order_parts_tenant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_wo_tenant_id uuid;
begin
  select tenant_id into v_wo_tenant_id from app.work_orders where id = new.work_order_id;
  if v_wo_tenant_id is null then
    raise exception using message = 'work order not found', errcode = '23503';
  end if;
  if v_wo_tenant_id != new.tenant_id then
    raise exception using message = 'work_order_parts.tenant_id must match work order tenant', errcode = '23503';
  end if;
  return new;
end;
$$;

revoke all on function util.validate_work_order_parts_tenant() from public;
grant execute on function util.validate_work_order_parts_tenant() to postgres;

create trigger work_order_parts_validate_tenant
  before insert or update on app.work_order_parts
  for each row
  execute function util.validate_work_order_parts_tenant();

alter table app.work_order_parts enable row level security;

create policy work_order_parts_select_tenant on app.work_order_parts for select to authenticated
  using (authz.is_current_user_tenant_member(tenant_id));
create policy work_order_parts_select_anon on app.work_order_parts for select to anon
  using (authz.is_current_user_tenant_member(tenant_id));
create policy work_order_parts_insert_tenant on app.work_order_parts for insert to authenticated
  with check (authz.is_current_user_tenant_member(tenant_id));
create policy work_order_parts_insert_anon on app.work_order_parts for insert to anon with check (false);
create policy work_order_parts_update_tenant on app.work_order_parts for update to authenticated
  using (authz.is_current_user_tenant_member(tenant_id)) with check (authz.is_current_user_tenant_member(tenant_id));
create policy work_order_parts_update_anon on app.work_order_parts for update to anon using (false) with check (false);
create policy work_order_parts_delete_tenant on app.work_order_parts for delete to authenticated
  using (authz.is_current_user_tenant_member(tenant_id));
create policy work_order_parts_delete_anon on app.work_order_parts for delete to anon using (false);

comment on policy work_order_parts_select_tenant on app.work_order_parts is 'Allows authenticated users to view parts in tenants they are members of.';
comment on policy work_order_parts_insert_tenant on app.work_order_parts is 'Allows authenticated users to create parts in tenants they are members of.';
comment on policy work_order_parts_update_tenant on app.work_order_parts is 'Allows authenticated users to update parts in tenants they are members of.';
comment on policy work_order_parts_delete_tenant on app.work_order_parts is 'Allows authenticated users to delete parts in tenants they are members of.';

grant select on app.work_order_parts to authenticated, anon;
grant insert, update, delete on app.work_order_parts to authenticated;
alter table app.work_order_parts force row level security;

-- ============================================================================
-- 4. app.work_order_vendor_costs (vendor/external cost)
-- ============================================================================

create table app.work_order_vendor_costs (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  work_order_id uuid not null references app.work_orders(id) on delete cascade,
  description text,
  amount_cents integer not null,
  vendor_name text,
  invoice_reference text,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint work_order_vendor_costs_amount_check check (amount_cents >= 0 and amount_cents <= 10000000)
);

comment on table app.work_order_vendor_costs is 'Vendor and external costs for work orders. Used for cost roll-up and true cost of ownership reporting.';

create index work_order_vendor_costs_work_order_idx on app.work_order_vendor_costs (work_order_id);
create index work_order_vendor_costs_tenant_work_order_idx on app.work_order_vendor_costs (tenant_id, work_order_id);

create trigger work_order_vendor_costs_set_updated_at
  before update on app.work_order_vendor_costs
  for each row
  execute function util.set_updated_at();

create or replace function util.validate_work_order_vendor_costs_tenant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_wo_tenant_id uuid;
begin
  select tenant_id into v_wo_tenant_id from app.work_orders where id = new.work_order_id;
  if v_wo_tenant_id is null then
    raise exception using message = 'work order not found', errcode = '23503';
  end if;
  if v_wo_tenant_id != new.tenant_id then
    raise exception using message = 'work_order_vendor_costs.tenant_id must match work order tenant', errcode = '23503';
  end if;
  return new;
end;
$$;

revoke all on function util.validate_work_order_vendor_costs_tenant() from public;
grant execute on function util.validate_work_order_vendor_costs_tenant() to postgres;

create trigger work_order_vendor_costs_validate_tenant
  before insert or update on app.work_order_vendor_costs
  for each row
  execute function util.validate_work_order_vendor_costs_tenant();

alter table app.work_order_vendor_costs enable row level security;

create policy work_order_vendor_costs_select_tenant on app.work_order_vendor_costs for select to authenticated
  using (authz.is_current_user_tenant_member(tenant_id));
create policy work_order_vendor_costs_select_anon on app.work_order_vendor_costs for select to anon
  using (authz.is_current_user_tenant_member(tenant_id));
create policy work_order_vendor_costs_insert_tenant on app.work_order_vendor_costs for insert to authenticated
  with check (authz.is_current_user_tenant_member(tenant_id));
create policy work_order_vendor_costs_insert_anon on app.work_order_vendor_costs for insert to anon with check (false);
create policy work_order_vendor_costs_update_tenant on app.work_order_vendor_costs for update to authenticated
  using (authz.is_current_user_tenant_member(tenant_id)) with check (authz.is_current_user_tenant_member(tenant_id));
create policy work_order_vendor_costs_update_anon on app.work_order_vendor_costs for update to anon using (false) with check (false);
create policy work_order_vendor_costs_delete_tenant on app.work_order_vendor_costs for delete to authenticated
  using (authz.is_current_user_tenant_member(tenant_id));
create policy work_order_vendor_costs_delete_anon on app.work_order_vendor_costs for delete to anon using (false);

comment on policy work_order_vendor_costs_select_tenant on app.work_order_vendor_costs is 'Allows authenticated users to view vendor costs in tenants they are members of.';
comment on policy work_order_vendor_costs_insert_tenant on app.work_order_vendor_costs is 'Allows authenticated users to create vendor costs in tenants they are members of.';
comment on policy work_order_vendor_costs_update_tenant on app.work_order_vendor_costs is 'Allows authenticated users to update vendor costs in tenants they are members of.';
comment on policy work_order_vendor_costs_delete_tenant on app.work_order_vendor_costs is 'Allows authenticated users to delete vendor costs in tenants they are members of.';

grant select on app.work_order_vendor_costs to authenticated, anon;
grant insert, update, delete on app.work_order_vendor_costs to authenticated;
alter table app.work_order_vendor_costs force row level security;

-- ============================================================================
-- 5. app.projects (project dimension for cost roll-up)
-- ============================================================================

create table app.projects (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  name text not null,
  code text,
  description text,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint projects_name_length_check check (length(name) >= 1 and length(name) <= 255),
  constraint projects_code_format_check check (
    code is null or (length(code) >= 1 and length(code) <= 50 and code ~ '^[a-zA-Z0-9_-]+$')
  )
);

create unique index projects_tenant_code_unique_idx on app.projects (tenant_id, code) where code is not null;
create index projects_tenant_idx on app.projects (tenant_id);

comment on table app.projects is 'Projects for grouping work orders. Enables cost roll-up by project and capital planning.';

create trigger projects_set_updated_at
  before update on app.projects
  for each row
  execute function util.set_updated_at();

alter table app.projects enable row level security;

create policy projects_select_tenant on app.projects for select to authenticated
  using (authz.is_current_user_tenant_member(tenant_id));
create policy projects_select_anon on app.projects for select to anon
  using (authz.is_current_user_tenant_member(tenant_id));
create policy projects_insert_tenant on app.projects for insert to authenticated
  with check (authz.is_current_user_tenant_member(tenant_id));
create policy projects_insert_anon on app.projects for insert to anon with check (false);
create policy projects_update_tenant on app.projects for update to authenticated
  using (authz.is_current_user_tenant_member(tenant_id)) with check (authz.is_current_user_tenant_member(tenant_id));
create policy projects_update_anon on app.projects for update to anon using (false) with check (false);
create policy projects_delete_tenant on app.projects for delete to authenticated
  using (authz.is_current_user_tenant_member(tenant_id));
create policy projects_delete_anon on app.projects for delete to anon using (false);

comment on policy projects_select_tenant on app.projects is 'Allows authenticated users to view projects in tenants they are members of.';
comment on policy projects_insert_tenant on app.projects is 'Allows authenticated users to create projects in tenants they are members of.';
comment on policy projects_update_tenant on app.projects is 'Allows authenticated users to update projects in tenants they are members of.';
comment on policy projects_delete_tenant on app.projects is 'Allows authenticated users to delete projects in tenants they are members of.';

grant select on app.projects to authenticated, anon;
grant insert, update, delete on app.projects to authenticated;
alter table app.projects force row level security;

-- ============================================================================
-- 6. work_orders.project_id and tenant validation
-- ============================================================================

alter table app.work_orders
  add column project_id uuid references app.projects(id) on delete set null;

comment on column app.work_orders.project_id is 'Optional project for grouping work orders. Used for cost roll-up by project.';

create index work_orders_project_id_idx on app.work_orders (tenant_id, project_id) where project_id is not null;

create or replace function util.validate_work_order_project_tenant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project_tenant_id uuid;
begin
  if new.project_id is not null then
    select tenant_id into v_project_tenant_id from app.projects where id = new.project_id;
    perform util.validate_tenant_match(new.tenant_id, v_project_tenant_id, 'Project');
  end if;
  return new;
end;
$$;

revoke all on function util.validate_work_order_project_tenant() from public;
grant execute on function util.validate_work_order_project_tenant() to postgres;

create trigger work_orders_validate_project_tenant
  before insert or update on app.work_orders
  for each row
  execute function util.validate_work_order_project_tenant();

-- ============================================================================
-- 7. Views: work order costs, asset/location/department/project roll-ups, lifecycle alerts
-- ============================================================================

-- Per-work-order cost (labor from time entries, parts, vendor)
create or replace view app.v_work_order_costs
with (security_invoker = true)
as
select
  wo.id as work_order_id,
  wo.tenant_id,
  coalesce(lab.total_labor_cost_cents, 0) as labor_cents,
  coalesce(pt.parts_cents, 0) as parts_cents,
  coalesce(vc.vendor_cents, 0) as vendor_cents,
  coalesce(lab.total_labor_cost_cents, 0) + coalesce(pt.parts_cents, 0) + coalesce(vc.vendor_cents, 0) as total_cents
from app.work_orders wo
left join lateral (
  select sum(total_labor_cost_cents) as total_labor_cost_cents
  from app.v_work_order_labor_actuals la
  where la.work_order_id = wo.id and la.tenant_id = wo.tenant_id
) lab on true
left join lateral (
  select sum(total_cost_cents) as parts_cents
  from app.work_order_parts p
  where p.work_order_id = wo.id and p.tenant_id = wo.tenant_id
) pt on true
left join lateral (
  select sum(amount_cents) as vendor_cents
  from app.work_order_vendor_costs v
  where v.work_order_id = wo.id and v.tenant_id = wo.tenant_id
) vc on true;

comment on view app.v_work_order_costs is 'Cost per work order: labor (from time entries), parts, vendor. For roll-up and TCO reporting.';

-- Roll-up by asset (work orders linked to asset)
create or replace view app.v_asset_costs
with (security_invoker = true)
as
select
  wo.asset_id,
  wo.tenant_id,
  sum(c.labor_cents) as labor_cents,
  sum(c.parts_cents) as parts_cents,
  sum(c.vendor_cents) as vendor_cents,
  sum(c.total_cents) as total_cents,
  count(wo.id) as work_order_count
from app.work_orders wo
join app.v_work_order_costs c on c.work_order_id = wo.id and c.tenant_id = wo.tenant_id
where wo.asset_id is not null
group by wo.tenant_id, wo.asset_id;

comment on view app.v_asset_costs is 'Cost roll-up by asset. Labor from time entries; parts and vendor from work_order_parts and work_order_vendor_costs.';

-- Roll-up by location (work order location_id)
create or replace view app.v_location_costs
with (security_invoker = true)
as
select
  wo.location_id,
  wo.tenant_id,
  sum(c.labor_cents) as labor_cents,
  sum(c.parts_cents) as parts_cents,
  sum(c.vendor_cents) as vendor_cents,
  sum(c.total_cents) as total_cents,
  count(wo.id) as work_order_count
from app.work_orders wo
join app.v_work_order_costs c on c.work_order_id = wo.id and c.tenant_id = wo.tenant_id
where wo.location_id is not null
group by wo.tenant_id, wo.location_id;

comment on view app.v_location_costs is 'Cost roll-up by work order location.';

-- Roll-up by department (via asset)
create or replace view app.v_department_costs
with (security_invoker = true)
as
select
  a.department_id,
  wo.tenant_id,
  sum(c.labor_cents) as labor_cents,
  sum(c.parts_cents) as parts_cents,
  sum(c.vendor_cents) as vendor_cents,
  sum(c.total_cents) as total_cents,
  count(wo.id) as work_order_count
from app.work_orders wo
join app.assets a on a.id = wo.asset_id and a.tenant_id = wo.tenant_id
join app.v_work_order_costs c on c.work_order_id = wo.id and c.tenant_id = wo.tenant_id
where a.department_id is not null
group by wo.tenant_id, a.department_id;

comment on view app.v_department_costs is 'Cost roll-up by asset department. Work orders without an asset or asset without department are excluded.';

-- Roll-up by project
create or replace view app.v_project_costs
with (security_invoker = true)
as
select
  wo.project_id,
  wo.tenant_id,
  sum(c.labor_cents) as labor_cents,
  sum(c.parts_cents) as parts_cents,
  sum(c.vendor_cents) as vendor_cents,
  sum(c.total_cents) as total_cents,
  count(wo.id) as work_order_count
from app.work_orders wo
join app.v_work_order_costs c on c.work_order_id = wo.id and c.tenant_id = wo.tenant_id
where wo.project_id is not null
group by wo.tenant_id, wo.project_id;

comment on view app.v_project_costs is 'Cost roll-up by project.';

-- Lifecycle alerts: warranty, EOL, contract, planned replacement (next 365 days by default in view)
create or replace view app.v_asset_lifecycle_alerts
with (security_invoker = true)
as
select
  a.id as asset_id,
  a.tenant_id,
  'warranty_expiring' as alert_type,
  a.warranty_expires_at as reference_date,
  (a.warranty_expires_at - current_date)::integer as days_until
from app.assets a
where a.tenant_id is not null and a.warranty_expires_at is not null
  and a.warranty_expires_at between current_date and current_date + 365
union all
select
  a.id,
  a.tenant_id,
  'eol_approaching',
  a.end_of_life_estimate,
  (a.end_of_life_estimate - current_date)::integer
from app.assets a
where a.tenant_id is not null and a.end_of_life_estimate is not null
  and a.end_of_life_estimate between current_date and current_date + 365
union all
select
  a.id,
  a.tenant_id,
  'contract_expiring',
  a.service_contract_expires_at,
  (a.service_contract_expires_at - current_date)::integer
from app.assets a
where a.tenant_id is not null and a.service_contract_expires_at is not null
  and a.service_contract_expires_at between current_date and current_date + 365
union all
select
  a.id,
  a.tenant_id,
  'planned_replacement_due',
  a.planned_replacement_date,
  (a.planned_replacement_date - current_date)::integer
from app.assets a
where a.tenant_id is not null and a.planned_replacement_date is not null
  and a.planned_replacement_date between current_date and current_date + 365;

comment on view app.v_asset_lifecycle_alerts is 'Assets with upcoming lifecycle events (warranty, EOL, contract, planned replacement) within the next 365 days.';

-- ============================================================================
-- 8. Public views: extend v_assets, add tenant-scoped cost and lifecycle views
-- ============================================================================

-- Add new lifecycle columns at the end so create or replace view is valid (existing columns unchanged).
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
  a.updated_at,
  a.commissioned_at,
  a.end_of_life_estimate,
  a.decommissioned_at,
  a.replaced_by_asset_id,
  a.replacement_of_asset_id,
  a.warranty_expires_at,
  a.service_contract_expires_at,
  a.planned_replacement_date
from app.assets a
where a.tenant_id = authz.get_current_tenant_id();

comment on view public.v_assets is
  'Assets view scoped to the current tenant context. Includes lifecycle and planning fields. Uses SECURITY INVOKER. Set tenant context via rpc_set_tenant_context.';

grant select on public.v_assets to authenticated;
grant select on public.v_assets to anon;

-- Public cost and lifecycle views (tenant-scoped)
create or replace view public.v_work_order_costs
with (security_invoker = true)
as
select wc.*
from app.v_work_order_costs wc
where wc.tenant_id = authz.get_current_tenant_id();

comment on view public.v_work_order_costs is 'Work order costs for the current tenant. Labor from time entries; parts and vendor from cost tables.';

grant select on public.v_work_order_costs to authenticated, anon;

create or replace view public.v_asset_costs
with (security_invoker = true)
as
select ac.*
from app.v_asset_costs ac
where ac.tenant_id = authz.get_current_tenant_id();

comment on view public.v_asset_costs is 'Cost roll-up by asset for the current tenant.';

grant select on public.v_asset_costs to authenticated, anon;

create or replace view public.v_location_costs
with (security_invoker = true)
as
select lc.*
from app.v_location_costs lc
where lc.tenant_id = authz.get_current_tenant_id();

comment on view public.v_location_costs is 'Cost roll-up by location for the current tenant.';

grant select on public.v_location_costs to authenticated, anon;

create or replace view public.v_department_costs
with (security_invoker = true)
as
select dc.*
from app.v_department_costs dc
where dc.tenant_id = authz.get_current_tenant_id();

comment on view public.v_department_costs is 'Cost roll-up by department for the current tenant.';

grant select on public.v_department_costs to authenticated, anon;

create or replace view public.v_project_costs
with (security_invoker = true)
as
select pc.*
from app.v_project_costs pc
where pc.tenant_id = authz.get_current_tenant_id();

comment on view public.v_project_costs is 'Cost roll-up by project for the current tenant.';

grant select on public.v_project_costs to authenticated, anon;

create or replace view public.v_asset_lifecycle_alerts
with (security_invoker = true)
as
select al.*
from app.v_asset_lifecycle_alerts al
where al.tenant_id = authz.get_current_tenant_id();

comment on view public.v_asset_lifecycle_alerts is 'Asset lifecycle alerts (warranty, EOL, contract, replacement) for the current tenant.';

grant select on public.v_asset_lifecycle_alerts to authenticated, anon;

-- Public projects view
create or replace view public.v_projects
with (security_invoker = true)
as
select p.id, p.tenant_id, p.name, p.code, p.description, p.created_at, p.updated_at
from app.projects p
where p.tenant_id = authz.get_current_tenant_id();

comment on view public.v_projects is 'Projects for the current tenant.';

grant select on public.v_projects to authenticated, anon;

-- ============================================================================
-- 9. RPCs: cost roll-up, lifecycle alerts, asset TCO
-- ============================================================================

create or replace function public.rpc_cost_rollup(
  p_tenant_id uuid,
  p_group_by text,
  p_from_date date default null,
  p_to_date date default null
)
returns table (
  group_key uuid,
  group_name text,
  labor_cents bigint,
  parts_cents bigint,
  vendor_cents bigint,
  total_cents bigint,
  work_order_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform authz.rpc_setup(p_tenant_id, null);
  if p_group_by not in ('asset', 'location', 'department', 'project') then
    raise exception using message = 'p_group_by must be one of: asset, location, department, project', errcode = '22P02';
  end if;

  if p_group_by = 'asset' then
    return query
    select
      wo.asset_id as group_key,
      a.name as group_name,
      sum(c.labor_cents)::bigint,
      sum(c.parts_cents)::bigint,
      sum(c.vendor_cents)::bigint,
      sum(c.total_cents)::bigint,
      count(wo.id)::bigint
    from app.work_orders wo
    join app.v_work_order_costs c on c.work_order_id = wo.id and c.tenant_id = wo.tenant_id
    join app.assets a on a.id = wo.asset_id and a.tenant_id = wo.tenant_id
    where wo.tenant_id = p_tenant_id and wo.asset_id is not null
      and (p_from_date is null or wo.completed_at::date >= p_from_date)
      and (p_to_date is null or wo.completed_at::date <= p_to_date)
    group by wo.tenant_id, wo.asset_id, a.name;
  elsif p_group_by = 'location' then
    return query
    select
      wo.location_id as group_key,
      l.name as group_name,
      sum(c.labor_cents)::bigint,
      sum(c.parts_cents)::bigint,
      sum(c.vendor_cents)::bigint,
      sum(c.total_cents)::bigint,
      count(wo.id)::bigint
    from app.work_orders wo
    join app.v_work_order_costs c on c.work_order_id = wo.id and c.tenant_id = wo.tenant_id
    join app.locations l on l.id = wo.location_id and l.tenant_id = wo.tenant_id
    where wo.tenant_id = p_tenant_id and wo.location_id is not null
      and (p_from_date is null or wo.completed_at::date >= p_from_date)
      and (p_to_date is null or wo.completed_at::date <= p_to_date)
    group by wo.tenant_id, wo.location_id, l.name;
  elsif p_group_by = 'department' then
    return query
    select
      a.department_id as group_key,
      d.name as group_name,
      sum(c.labor_cents)::bigint,
      sum(c.parts_cents)::bigint,
      sum(c.vendor_cents)::bigint,
      sum(c.total_cents)::bigint,
      count(wo.id)::bigint
    from app.work_orders wo
    join app.assets a on a.id = wo.asset_id and a.tenant_id = wo.tenant_id and a.department_id is not null
    join app.v_work_order_costs c on c.work_order_id = wo.id and c.tenant_id = wo.tenant_id
    join app.departments d on d.id = a.department_id and d.tenant_id = wo.tenant_id
    where wo.tenant_id = p_tenant_id
      and (p_from_date is null or wo.completed_at::date >= p_from_date)
      and (p_to_date is null or wo.completed_at::date <= p_to_date)
    group by wo.tenant_id, a.department_id, d.name;
  else
    -- project
    return query
    select
      wo.project_id as group_key,
      p.name as group_name,
      sum(c.labor_cents)::bigint,
      sum(c.parts_cents)::bigint,
      sum(c.vendor_cents)::bigint,
      sum(c.total_cents)::bigint,
      count(wo.id)::bigint
    from app.work_orders wo
    join app.v_work_order_costs c on c.work_order_id = wo.id and c.tenant_id = wo.tenant_id
    join app.projects p on p.id = wo.project_id and p.tenant_id = wo.tenant_id
    where wo.tenant_id = p_tenant_id and wo.project_id is not null
      and (p_from_date is null or wo.completed_at::date >= p_from_date)
      and (p_to_date is null or wo.completed_at::date <= p_to_date)
    group by wo.tenant_id, wo.project_id, p.name;
  end if;
end;
$$;

comment on function public.rpc_cost_rollup(uuid, text, date, date) is
  'Returns cost roll-up by asset, location, department, or project for the tenant. Optional date filter on work order completed_at.';

revoke all on function public.rpc_cost_rollup(uuid, text, date, date) from public;
grant execute on function public.rpc_cost_rollup(uuid, text, date, date) to authenticated;
grant execute on function public.rpc_cost_rollup(uuid, text, date, date) to anon;

-- Lifecycle alerts RPC with configurable days ahead
create or replace function public.rpc_asset_lifecycle_alerts(
  p_tenant_id uuid,
  p_days_ahead integer default 365
)
returns table (
  asset_id uuid,
  alert_type text,
  reference_date date,
  days_until integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform authz.rpc_setup(p_tenant_id, null);
  return query
  select
    al.asset_id,
    al.alert_type,
    al.reference_date,
    al.days_until
  from app.v_asset_lifecycle_alerts al
  where al.tenant_id = p_tenant_id
    and al.days_until >= 0
    and al.days_until <= p_days_ahead;
end;
$$;

comment on function public.rpc_asset_lifecycle_alerts(uuid, integer) is
  'Returns asset lifecycle alerts (warranty, EOL, contract, planned replacement) within the next p_days_ahead days.';

revoke all on function public.rpc_asset_lifecycle_alerts(uuid, integer) from public;
grant execute on function public.rpc_asset_lifecycle_alerts(uuid, integer) to authenticated;
grant execute on function public.rpc_asset_lifecycle_alerts(uuid, integer) to anon;

-- Asset total cost of ownership (single asset, optional date range)
create or replace function public.rpc_asset_total_cost_of_ownership(
  p_tenant_id uuid,
  p_asset_id uuid,
  p_from_date date default null,
  p_to_date date default null
)
returns table (
  labor_cents bigint,
  parts_cents bigint,
  vendor_cents bigint,
  total_cents bigint,
  work_order_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform authz.rpc_setup(p_tenant_id, null);
  return query
  select
    coalesce(sum(c.labor_cents), 0)::bigint,
    coalesce(sum(c.parts_cents), 0)::bigint,
    coalesce(sum(c.vendor_cents), 0)::bigint,
    coalesce(sum(c.total_cents), 0)::bigint,
    count(wo.id)::bigint
  from app.work_orders wo
  join app.v_work_order_costs c on c.work_order_id = wo.id and c.tenant_id = wo.tenant_id
  where wo.tenant_id = p_tenant_id
    and wo.asset_id = p_asset_id
    and (p_from_date is null or wo.completed_at::date >= p_from_date)
    and (p_to_date is null or wo.completed_at::date <= p_to_date);
end;
$$;

comment on function public.rpc_asset_total_cost_of_ownership(uuid, uuid, date, date) is
  'Returns total cost of ownership for one asset (labor, parts, vendor) and work order count. Optional date filter on completed_at.';

revoke all on function public.rpc_asset_total_cost_of_ownership(uuid, uuid, date, date) from public;
grant execute on function public.rpc_asset_total_cost_of_ownership(uuid, uuid, date, date) to authenticated;
grant execute on function public.rpc_asset_total_cost_of_ownership(uuid, uuid, date, date) to anon;

-- ============================================================================
-- 10. Grants for app schema cost/lifecycle views
-- ============================================================================

grant select on app.v_work_order_costs to authenticated, anon;
grant select on app.v_asset_costs to authenticated, anon;
grant select on app.v_location_costs to authenticated, anon;
grant select on app.v_department_costs to authenticated, anon;
grant select on app.v_project_costs to authenticated, anon;
grant select on app.v_asset_lifecycle_alerts to authenticated, anon;
