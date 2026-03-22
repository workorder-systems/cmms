-- SPDX-License-Identifier: AGPL-3.0-or-later
--
-- Parts and inventory foundation: parts catalog, suppliers, inventory locations/bins,
-- stock levels, transactions, reservations, and part usage linked to work orders.
--
-- Purpose
-- -------
-- Model parts, suppliers (tenant-scoped), stock locations/bins, on-hand quantities,
-- re-order rules on parts, inventory transactions, part reservations and usage for work orders.
-- Cross-tenant constraints enforced via tenant_id and triggers.
--
-- Affected / new objects
-- ----------------------
-- New tables: app.suppliers, app.parts, app.inventory_locations, app.stock_levels,
-- app.inventory_transactions, app.part_reservations, app.part_usage.
-- New permissions in cfg.permissions for part.*, supplier.*, inventory.reservation.*.
-- RLS and triggers on all new tables.
--
-- RLS: Granular policies (one per operation per role: authenticated, anon).
-- Anon: select/insert/update/delete using (false) / with check (false).

-- ============================================================================
-- 1. New permissions (parts, suppliers, inventory reservations)
-- ============================================================================

insert into cfg.permissions (key, name, category, description) values
  ('part.create', 'Create Parts', 'part', 'Allows creating new parts in the catalog'),
  ('part.view', 'View Parts', 'part', 'Allows viewing parts and stock levels'),
  ('part.edit', 'Edit Parts', 'part', 'Allows editing part details'),
  ('part.delete', 'Delete Parts', 'part', 'Allows deleting parts'),
  ('supplier.create', 'Create Suppliers', 'supplier', 'Allows creating new suppliers'),
  ('supplier.view', 'View Suppliers', 'supplier', 'Allows viewing suppliers'),
  ('supplier.edit', 'Edit Suppliers', 'supplier', 'Allows editing supplier details'),
  ('supplier.delete', 'Delete Suppliers', 'supplier', 'Allows deleting suppliers'),
  ('inventory.reservation.create', 'Create Part Reservations', 'inventory', 'Allows reserving parts for work orders'),
  ('inventory.reservation.release', 'Release Part Reservations', 'inventory', 'Allows releasing part reservations'),
  ('inventory.usage.record', 'Record Part Usage', 'inventory', 'Allows recording parts issued to work orders');

-- ============================================================================
-- 2. app.suppliers
-- ============================================================================

create table app.suppliers (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  name text not null,
  code text,
  external_id text,
  contact_name text,
  email text,
  phone text,
  address_line text,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint suppliers_name_length_check check (
    length(name) >= 1
    and length(name) <= 255
  ),
  constraint suppliers_code_length_check check (
    code is null
    or (length(code) >= 1 and length(code) <= 50)
  )
);

comment on table app.suppliers is 'Suppliers for purchasing. Tenant-scoped; external_id for ERP sync.';
comment on column app.suppliers.tenant_id is 'Tenant that owns this supplier.';
comment on column app.suppliers.code is 'Short code unique per tenant when set. Used for display and sync.';
comment on column app.suppliers.external_id is 'External system id for ERP sync.';
comment on column app.suppliers.contact_name is 'Primary contact name.';
comment on column app.suppliers.email is 'Contact or general email.';
comment on column app.suppliers.phone is 'Contact phone.';
comment on column app.suppliers.address_line is 'Single-line address.';

create unique index suppliers_tenant_code_unique_idx
  on app.suppliers (tenant_id, code)
  where code is not null;

create index suppliers_tenant_idx on app.suppliers (tenant_id);
create index suppliers_external_id_idx on app.suppliers (tenant_id, external_id)
  where external_id is not null;

create trigger suppliers_set_updated_at
  before update on app.suppliers
  for each row
  execute function util.set_updated_at();

alter table app.suppliers enable row level security;

-- ============================================================================
-- 3. app.parts
-- ============================================================================

create table app.parts (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  part_number text not null,
  name text,
  description text,
  unit text not null default 'each',
  preferred_supplier_id uuid references app.suppliers(id) on delete set null,
  external_id text,
  reorder_point numeric(18, 4),
  min_quantity numeric(18, 4),
  max_quantity numeric(18, 4),
  lead_time_days integer,
  is_active boolean not null default true,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint parts_part_number_length_check check (
    length(part_number) >= 1
    and length(part_number) <= 100
  ),
  constraint parts_lead_time_days_check check (
    lead_time_days is null
    or (lead_time_days >= 0 and lead_time_days <= 3650)
  ),
  constraint parts_reorder_positive_check check (
    (reorder_point is null or reorder_point >= 0)
    and (min_quantity is null or min_quantity >= 0)
    and (max_quantity is null or max_quantity >= 0)
  )
);

comment on table app.parts is 'Parts catalog. Tenant-scoped; part_number unique per tenant. Re-order fields and preferred_supplier support purchasing.';
comment on column app.parts.part_number is 'Unique identifier per tenant (e.g. SKU, item number).';
comment on column app.parts.unit is 'Unit of measure: each, box, meter, etc.';
comment on column app.parts.preferred_supplier_id is 'Default supplier for reorders. Must belong to same tenant.';
comment on column app.parts.external_id is 'External system id for ERP sync.';
comment on column app.parts.reorder_point is 'Trigger reorder when total on-hand falls at or below this.';
comment on column app.parts.min_quantity is 'Minimum stock level for reporting.';
comment on column app.parts.max_quantity is 'Maximum stock level / order-up-to.';
comment on column app.parts.lead_time_days is 'Expected lead time in days from order to receipt.';
comment on column app.parts.is_active is 'When false, part is hidden from active catalog but preserved for history.';

create unique index parts_tenant_part_number_unique_idx
  on app.parts (tenant_id, part_number);

create index parts_tenant_idx on app.parts (tenant_id);
create index parts_preferred_supplier_idx on app.parts (preferred_supplier_id)
  where preferred_supplier_id is not null;
create index parts_tenant_active_idx on app.parts (tenant_id, is_active)
  where is_active = true;
create index parts_external_id_idx on app.parts (tenant_id, external_id)
  where external_id is not null;
create index parts_fts_idx on app.parts using gin (
  to_tsvector('english', coalesce(part_number, '') || ' ' || coalesce(name, '') || ' ' || coalesce(description, ''))
);

create trigger parts_set_updated_at
  before update on app.parts
  for each row
  execute function util.set_updated_at();

-- Validate preferred_supplier belongs to same tenant
create or replace function util.validate_part_supplier_tenant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_supplier_tenant_id uuid;
begin
  if new.preferred_supplier_id is null then
    return new;
  end if;
  select tenant_id into v_supplier_tenant_id
  from app.suppliers
  where id = new.preferred_supplier_id;
  if v_supplier_tenant_id is null then
    raise exception using message = 'Supplier not found', errcode = '23503';
  end if;
  if v_supplier_tenant_id != new.tenant_id then
    raise exception using message = 'Preferred supplier must belong to the same tenant', errcode = '23503';
  end if;
  return new;
end;
$$;

comment on function util.validate_part_supplier_tenant() is 'Ensures part preferred_supplier_id belongs to the same tenant.';

revoke all on function util.validate_part_supplier_tenant() from public;
grant execute on function util.validate_part_supplier_tenant() to postgres;

create trigger parts_validate_supplier_tenant
  before insert or update on app.parts
  for each row
  execute function util.validate_part_supplier_tenant();

alter table app.parts enable row level security;

-- ============================================================================
-- 4. app.inventory_locations (warehouse → aisle → shelf → bin hierarchy)
-- ============================================================================

create table app.inventory_locations (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  parent_id uuid references app.inventory_locations(id) on delete cascade,
  location_id uuid references app.locations(id) on delete set null,
  name text not null,
  code text,
  type text not null,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint inventory_locations_name_length_check check (
    length(name) >= 1
    and length(name) <= 255
  ),
  constraint inventory_locations_code_length_check check (
    code is null
    or (length(code) >= 1 and length(code) <= 50)
  ),
  constraint inventory_locations_type_check check (
    type in ('warehouse', 'aisle', 'shelf', 'bin')
  )
);

comment on table app.inventory_locations is 'Hierarchy of stock locations: warehouse, aisle, shelf, bin. Optional location_id ties to app.locations for facility placement.';
comment on column app.inventory_locations.parent_id is 'Parent location in hierarchy. Null for top-level (e.g. warehouse).';
comment on column app.inventory_locations.location_id is 'Optional link to facility location (e.g. storeroom at a site).';
comment on column app.inventory_locations.code is 'Short code unique per tenant when set.';
comment on column app.inventory_locations.type is 'Level in hierarchy: warehouse, aisle, shelf, bin. Stock levels are held at bin level.';

create unique index inventory_locations_tenant_code_unique_idx
  on app.inventory_locations (tenant_id, code)
  where code is not null;

create index inventory_locations_tenant_idx on app.inventory_locations (tenant_id);
create index inventory_locations_parent_idx on app.inventory_locations (parent_id)
  where parent_id is not null;
create index inventory_locations_location_idx on app.inventory_locations (location_id)
  where location_id is not null;
create index inventory_locations_tenant_type_idx on app.inventory_locations (tenant_id, type);

create trigger inventory_locations_set_updated_at
  before update on app.inventory_locations
  for each row
  execute function util.set_updated_at();

-- Set tenant_id from parent or from app.locations and validate same tenant
create or replace function util.inventory_locations_set_tenant_and_validate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_parent_tenant_id uuid;
  v_location_tenant_id uuid;
begin
  if new.parent_id is not null then
    select tenant_id into v_parent_tenant_id
    from app.inventory_locations
    where id = new.parent_id;
    if v_parent_tenant_id is null then
      raise exception using message = 'Parent inventory location not found', errcode = '23503';
    end if;
    new.tenant_id := v_parent_tenant_id;
  end if;
  if new.location_id is not null then
    select tenant_id into v_location_tenant_id
    from app.locations
    where id = new.location_id;
    if v_location_tenant_id is null then
      raise exception using message = 'Location not found', errcode = '23503';
    end if;
    if new.tenant_id is not null and new.tenant_id != v_location_tenant_id then
      raise exception using message = 'Location must belong to the same tenant as inventory location', errcode = '23514';
    end if;
    if new.tenant_id is null then
      new.tenant_id := v_location_tenant_id;
    end if;
  end if;
  /* Root-level insert without location_id must supply tenant_id explicitly */
  if new.tenant_id is null then
    raise exception using message = 'tenant_id must be set (via parent_id, location_id, or insert value)', errcode = '23502';
  end if;
  return new;
end;
$$;

comment on function util.inventory_locations_set_tenant_and_validate() is 'Sets tenant_id from parent or location and validates same tenant.';

revoke all on function util.inventory_locations_set_tenant_and_validate() from public;
grant execute on function util.inventory_locations_set_tenant_and_validate() to postgres;

create trigger inventory_locations_tenant_validate
  before insert or update on app.inventory_locations
  for each row
  execute function util.inventory_locations_set_tenant_and_validate();

alter table app.inventory_locations enable row level security;

-- ============================================================================
-- 5. app.stock_levels (quantity on hand per part per bin)
-- ============================================================================

create table app.stock_levels (
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  part_id uuid not null references app.parts(id) on delete cascade,
  inventory_location_id uuid not null references app.inventory_locations(id) on delete cascade,
  quantity numeric(18, 4) not null default 0,
  updated_at timestamptz not null default pg_catalog.now(),
  primary key (part_id, inventory_location_id),
  constraint stock_levels_quantity_non_negative check (quantity >= 0)
);

comment on table app.stock_levels is 'On-hand quantity per part per inventory location (bin level). tenant_id denormalized for RLS.';
comment on column app.stock_levels.tenant_id is 'Denormalized from part for RLS; must match part.tenant_id.';
comment on column app.stock_levels.quantity is 'Quantity on hand in this bin.';

create index stock_levels_tenant_idx on app.stock_levels (tenant_id);
create index stock_levels_part_idx on app.stock_levels (part_id);
create index stock_levels_inventory_location_idx on app.stock_levels (inventory_location_id);
create index stock_levels_tenant_part_idx on app.stock_levels (tenant_id, part_id);

create trigger stock_levels_set_updated_at
  before update on app.stock_levels
  for each row
  execute function util.set_updated_at();

-- Ensure inventory_location is type 'bin' and tenant matches part
create or replace function util.stock_levels_validate_bin_and_tenant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_part_tenant_id uuid;
  v_loc_tenant_id uuid;
  v_loc_type text;
begin
  select tenant_id into v_part_tenant_id
  from app.parts
  where id = new.part_id;
  if v_part_tenant_id is null then
    raise exception using message = 'Part not found', errcode = '23503';
  end if;
  select tenant_id, type into v_loc_tenant_id, v_loc_type
  from app.inventory_locations
  where id = new.inventory_location_id;
  if v_loc_tenant_id is null then
    raise exception using message = 'Inventory location not found', errcode = '23503';
  end if;
  if v_loc_type != 'bin' then
    raise exception using message = 'Stock levels must be at bin level (inventory_location type must be bin)', errcode = '23514';
  end if;
  if v_part_tenant_id != v_loc_tenant_id then
    raise exception using message = 'Part and inventory location must belong to the same tenant', errcode = '23514';
  end if;
  new.tenant_id := v_part_tenant_id;
  return new;
end;
$$;

comment on function util.stock_levels_validate_bin_and_tenant() is 'Validates inventory_location is a bin and part/location same tenant; sets tenant_id from part.';

revoke all on function util.stock_levels_validate_bin_and_tenant() from public;
grant execute on function util.stock_levels_validate_bin_and_tenant() to postgres;

create trigger stock_levels_validate_bin_tenant
  before insert or update on app.stock_levels
  for each row
  execute function util.stock_levels_validate_bin_and_tenant();

alter table app.stock_levels enable row level security;

-- ============================================================================
-- 6. app.inventory_transactions (audit trail of movements)
-- ============================================================================

create table app.inventory_transactions (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  part_id uuid not null references app.parts(id) on delete cascade,
  from_inventory_location_id uuid references app.inventory_locations(id) on delete set null,
  to_inventory_location_id uuid references app.inventory_locations(id) on delete set null,
  quantity numeric(18, 4) not null,
  transaction_type text not null,
  reference_type text,
  reference_id uuid,
  occurred_at timestamptz not null default pg_catalog.now(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default pg_catalog.now(),
  constraint inventory_transactions_quantity_non_zero check (quantity != 0),
  constraint inventory_transactions_type_check check (
    transaction_type in ('receipt', 'issue', 'transfer', 'adjustment')
  ),
  constraint inventory_transactions_reference_type_check check (
    reference_type is null
    or reference_type in ('work_order', 'purchase_receipt', 'manual', 'adjustment')
  )
);

comment on table app.inventory_transactions is 'Audit trail of inventory movements. quantity positive = in, negative = out. reference_type/reference_id link to work order, PO receipt, etc.';
comment on column app.inventory_transactions.quantity is 'Positive for receipt/in, negative for issue/out.';
comment on column app.inventory_transactions.transaction_type is 'receipt, issue, transfer, adjustment.';
comment on column app.inventory_transactions.reference_type is 'Source: work_order, purchase_receipt, manual, adjustment.';
comment on column app.inventory_transactions.reference_id is 'UUID of related entity (e.g. work_order_id).';

create index inventory_transactions_tenant_idx on app.inventory_transactions (tenant_id);
create index inventory_transactions_part_idx on app.inventory_transactions (part_id);
create index inventory_transactions_reference_idx on app.inventory_transactions (reference_type, reference_id)
  where reference_type is not null;
create index inventory_transactions_occurred_at_idx on app.inventory_transactions (tenant_id, occurred_at desc);
create index inventory_transactions_from_loc_idx on app.inventory_transactions (from_inventory_location_id)
  where from_inventory_location_id is not null;
create index inventory_transactions_to_loc_idx on app.inventory_transactions (to_inventory_location_id)
  where to_inventory_location_id is not null;

alter table app.inventory_transactions enable row level security;

-- ============================================================================
-- 7. app.part_reservations (reserve parts for work orders)
-- ============================================================================

create table app.part_reservations (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  work_order_id uuid not null references app.work_orders(id) on delete cascade,
  part_id uuid not null references app.parts(id) on delete cascade,
  inventory_location_id uuid references app.inventory_locations(id) on delete set null,
  quantity numeric(18, 4) not null,
  status text not null default 'reserved',
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint part_reservations_quantity_positive check (quantity > 0),
  constraint part_reservations_status_check check (
    status in ('reserved', 'issued', 'released', 'cancelled')
  )
);

comment on table app.part_reservations is 'Reservations of parts for work orders. status: reserved, issued, released, cancelled.';
comment on column app.part_reservations.inventory_location_id is 'Optional bin to reserve from.';
comment on column app.part_reservations.status is 'reserved = held; issued = consumed; released/cancelled = no longer needed.';

create index part_reservations_tenant_idx on app.part_reservations (tenant_id);
create index part_reservations_work_order_idx on app.part_reservations (work_order_id);
create index part_reservations_part_idx on app.part_reservations (part_id);
create index part_reservations_status_idx on app.part_reservations (tenant_id, status);

create trigger part_reservations_set_updated_at
  before update on app.part_reservations
  for each row
  execute function util.set_updated_at();

-- Validate work_order and part same tenant; optional inventory_location same tenant
create or replace function util.part_reservations_validate_tenant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_wo_tenant_id uuid;
  v_part_tenant_id uuid;
  v_loc_tenant_id uuid;
begin
  select tenant_id into v_wo_tenant_id from app.work_orders where id = new.work_order_id;
  if v_wo_tenant_id is null then
    raise exception using message = 'Work order not found', errcode = '23503';
  end if;
  select tenant_id into v_part_tenant_id from app.parts where id = new.part_id;
  if v_part_tenant_id is null then
    raise exception using message = 'Part not found', errcode = '23503';
  end if;
  if v_wo_tenant_id != v_part_tenant_id or v_wo_tenant_id != new.tenant_id then
    raise exception using message = 'Work order, part, and reservation must belong to the same tenant', errcode = '23514';
  end if;
  if new.inventory_location_id is not null then
    select tenant_id into v_loc_tenant_id from app.inventory_locations where id = new.inventory_location_id;
    if v_loc_tenant_id is null then
      raise exception using message = 'Inventory location not found', errcode = '23503';
    end if;
    if v_loc_tenant_id != new.tenant_id then
      raise exception using message = 'Inventory location must belong to the same tenant', errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function util.part_reservations_validate_tenant() from public;
grant execute on function util.part_reservations_validate_tenant() to postgres;

create trigger part_reservations_validate_tenant_trigger
  before insert or update on app.part_reservations
  for each row
  execute function util.part_reservations_validate_tenant();

alter table app.part_reservations enable row level security;

-- ============================================================================
-- 8. app.part_usage (parts consumed on work orders)
-- ============================================================================

create table app.part_usage (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  work_order_id uuid not null references app.work_orders(id) on delete cascade,
  part_id uuid not null references app.parts(id) on delete cascade,
  inventory_location_id uuid references app.inventory_locations(id) on delete set null,
  quantity_used numeric(18, 4) not null,
  used_at timestamptz not null default pg_catalog.now(),
  used_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default pg_catalog.now(),
  constraint part_usage_quantity_positive check (quantity_used > 0)
);

comment on table app.part_usage is 'Parts issued/consumed on work orders. Links part consumption to work order and optional bin.';
comment on column app.part_usage.quantity_used is 'Quantity consumed.';
comment on column app.part_usage.used_by is 'User who recorded the usage.';

create index part_usage_tenant_idx on app.part_usage (tenant_id);
create index part_usage_work_order_idx on app.part_usage (work_order_id);
create index part_usage_part_idx on app.part_usage (part_id);

create or replace function util.part_usage_validate_tenant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_wo_tenant_id uuid;
  v_part_tenant_id uuid;
begin
  select tenant_id into v_wo_tenant_id from app.work_orders where id = new.work_order_id;
  if v_wo_tenant_id is null then
    raise exception using message = 'Work order not found', errcode = '23503';
  end if;
  select tenant_id into v_part_tenant_id from app.parts where id = new.part_id;
  if v_part_tenant_id is null then
    raise exception using message = 'Part not found', errcode = '23503';
  end if;
  if v_wo_tenant_id != v_part_tenant_id or v_wo_tenant_id != new.tenant_id then
    raise exception using message = 'Work order, part, and usage must belong to the same tenant', errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function util.part_usage_validate_tenant() from public;
grant execute on function util.part_usage_validate_tenant() to postgres;

create trigger part_usage_validate_tenant_trigger
  before insert or update on app.part_usage
  for each row
  execute function util.part_usage_validate_tenant();

alter table app.part_usage enable row level security;

-- ============================================================================
-- 9. RLS policies: suppliers
-- ============================================================================

create policy suppliers_select_tenant on app.suppliers for select to authenticated using (authz.is_current_user_tenant_member(tenant_id));
create policy suppliers_insert_tenant on app.suppliers for insert to authenticated with check (authz.is_current_user_tenant_member(tenant_id));
create policy suppliers_update_tenant on app.suppliers for update to authenticated using (authz.is_current_user_tenant_member(tenant_id)) with check (authz.is_current_user_tenant_member(tenant_id));
create policy suppliers_delete_tenant on app.suppliers for delete to authenticated using (authz.is_current_user_tenant_member(tenant_id));
create policy suppliers_select_anon on app.suppliers for select to anon using (false);
create policy suppliers_insert_anon on app.suppliers for insert to anon with check (false);
create policy suppliers_update_anon on app.suppliers for update to anon using (false) with check (false);
create policy suppliers_delete_anon on app.suppliers for delete to anon using (false);

grant select on app.suppliers to authenticated, anon;
grant insert, update, delete on app.suppliers to authenticated;
alter table app.suppliers force row level security;

-- ============================================================================
-- 10. RLS policies: parts
-- ============================================================================

create policy parts_select_tenant on app.parts for select to authenticated using (authz.is_current_user_tenant_member(tenant_id));
create policy parts_insert_tenant on app.parts for insert to authenticated with check (authz.is_current_user_tenant_member(tenant_id));
create policy parts_update_tenant on app.parts for update to authenticated using (authz.is_current_user_tenant_member(tenant_id)) with check (authz.is_current_user_tenant_member(tenant_id));
create policy parts_delete_tenant on app.parts for delete to authenticated using (authz.is_current_user_tenant_member(tenant_id));
create policy parts_select_anon on app.parts for select to anon using (false);
create policy parts_insert_anon on app.parts for insert to anon with check (false);
create policy parts_update_anon on app.parts for update to anon using (false) with check (false);
create policy parts_delete_anon on app.parts for delete to anon using (false);

grant select on app.parts to authenticated, anon;
grant insert, update, delete on app.parts to authenticated;
alter table app.parts force row level security;

-- ============================================================================
-- 11. RLS policies: inventory_locations
-- ============================================================================

create policy inventory_locations_select_tenant on app.inventory_locations for select to authenticated using (authz.is_current_user_tenant_member(tenant_id));
create policy inventory_locations_insert_tenant on app.inventory_locations for insert to authenticated with check (authz.is_current_user_tenant_member(tenant_id));
create policy inventory_locations_update_tenant on app.inventory_locations for update to authenticated using (authz.is_current_user_tenant_member(tenant_id)) with check (authz.is_current_user_tenant_member(tenant_id));
create policy inventory_locations_delete_tenant on app.inventory_locations for delete to authenticated using (authz.is_current_user_tenant_member(tenant_id));
create policy inventory_locations_select_anon on app.inventory_locations for select to anon using (false);
create policy inventory_locations_insert_anon on app.inventory_locations for insert to anon with check (false);
create policy inventory_locations_update_anon on app.inventory_locations for update to anon using (false) with check (false);
create policy inventory_locations_delete_anon on app.inventory_locations for delete to anon using (false);

grant select on app.inventory_locations to authenticated, anon;
grant insert, update, delete on app.inventory_locations to authenticated;
alter table app.inventory_locations force row level security;

-- ============================================================================
-- 12. RLS policies: stock_levels
-- ============================================================================

create policy stock_levels_select_tenant on app.stock_levels for select to authenticated using (authz.is_current_user_tenant_member(tenant_id));
create policy stock_levels_insert_tenant on app.stock_levels for insert to authenticated with check (authz.is_current_user_tenant_member(tenant_id));
create policy stock_levels_update_tenant on app.stock_levels for update to authenticated using (authz.is_current_user_tenant_member(tenant_id)) with check (authz.is_current_user_tenant_member(tenant_id));
create policy stock_levels_delete_tenant on app.stock_levels for delete to authenticated using (authz.is_current_user_tenant_member(tenant_id));
create policy stock_levels_select_anon on app.stock_levels for select to anon using (false);
create policy stock_levels_insert_anon on app.stock_levels for insert to anon with check (false);
create policy stock_levels_update_anon on app.stock_levels for update to anon using (false) with check (false);
create policy stock_levels_delete_anon on app.stock_levels for delete to anon using (false);

grant select on app.stock_levels to authenticated, anon;
grant insert, update, delete on app.stock_levels to authenticated;
alter table app.stock_levels force row level security;

-- ============================================================================
-- 13. RLS policies: inventory_transactions
-- ============================================================================

create policy inventory_transactions_select_tenant on app.inventory_transactions for select to authenticated using (authz.is_current_user_tenant_member(tenant_id));
create policy inventory_transactions_insert_tenant on app.inventory_transactions for insert to authenticated with check (authz.is_current_user_tenant_member(tenant_id));
create policy inventory_transactions_update_tenant on app.inventory_transactions for update to authenticated using (authz.is_current_user_tenant_member(tenant_id)) with check (authz.is_current_user_tenant_member(tenant_id));
create policy inventory_transactions_delete_tenant on app.inventory_transactions for delete to authenticated using (authz.is_current_user_tenant_member(tenant_id));
create policy inventory_transactions_select_anon on app.inventory_transactions for select to anon using (false);
create policy inventory_transactions_insert_anon on app.inventory_transactions for insert to anon with check (false);
create policy inventory_transactions_update_anon on app.inventory_transactions for update to anon using (false) with check (false);
create policy inventory_transactions_delete_anon on app.inventory_transactions for delete to anon using (false);

grant select on app.inventory_transactions to authenticated, anon;
grant insert, update, delete on app.inventory_transactions to authenticated;
alter table app.inventory_transactions force row level security;

-- ============================================================================
-- 14. RLS policies: part_reservations
-- ============================================================================

create policy part_reservations_select_tenant on app.part_reservations for select to authenticated using (authz.is_current_user_tenant_member(tenant_id));
create policy part_reservations_insert_tenant on app.part_reservations for insert to authenticated with check (authz.is_current_user_tenant_member(tenant_id));
create policy part_reservations_update_tenant on app.part_reservations for update to authenticated using (authz.is_current_user_tenant_member(tenant_id)) with check (authz.is_current_user_tenant_member(tenant_id));
create policy part_reservations_delete_tenant on app.part_reservations for delete to authenticated using (authz.is_current_user_tenant_member(tenant_id));
create policy part_reservations_select_anon on app.part_reservations for select to anon using (false);
create policy part_reservations_insert_anon on app.part_reservations for insert to anon with check (false);
create policy part_reservations_update_anon on app.part_reservations for update to anon using (false) with check (false);
create policy part_reservations_delete_anon on app.part_reservations for delete to anon using (false);

grant select on app.part_reservations to authenticated, anon;
grant insert, update, delete on app.part_reservations to authenticated;
alter table app.part_reservations force row level security;

-- ============================================================================
-- 15. RLS policies: part_usage
-- ============================================================================

create policy part_usage_select_tenant on app.part_usage for select to authenticated using (authz.is_current_user_tenant_member(tenant_id));
create policy part_usage_insert_tenant on app.part_usage for insert to authenticated with check (authz.is_current_user_tenant_member(tenant_id));
create policy part_usage_update_tenant on app.part_usage for update to authenticated using (authz.is_current_user_tenant_member(tenant_id)) with check (authz.is_current_user_tenant_member(tenant_id));
create policy part_usage_delete_tenant on app.part_usage for delete to authenticated using (authz.is_current_user_tenant_member(tenant_id));
create policy part_usage_select_anon on app.part_usage for select to anon using (false);
create policy part_usage_insert_anon on app.part_usage for insert to anon with check (false);
create policy part_usage_update_anon on app.part_usage for update to anon using (false) with check (false);
create policy part_usage_delete_anon on app.part_usage for delete to anon using (false);

grant select on app.part_usage to authenticated, anon;
grant insert, update, delete on app.part_usage to authenticated;
alter table app.part_usage force row level security;
