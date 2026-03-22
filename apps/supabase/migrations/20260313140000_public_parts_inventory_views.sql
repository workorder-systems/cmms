-- SPDX-License-Identifier: AGPL-3.0-or-later
--
-- Public views for parts, inventory, and purchasing so the SDK (public schema)
-- can query them. All views use security_invoker so RLS applies on underlying app data.
--
-- Purpose: Expose app.v_parts_with_stock, app.v_stock_by_location, app.suppliers,
-- app.parts, app.inventory_locations, app.stock_levels, part_reservations, part_usage,
-- and purchasing views as public.v_* for client/SDK use.
--
-- Affected: New public views only; no app schema changes.

-- ============================================================================
-- 1. Parts and stock (from app views / tables)
-- ============================================================================

create or replace view public.v_parts_with_stock
with (security_invoker = true)
as
select * from app.v_parts_with_stock;

comment on view public.v_parts_with_stock is 'Parts with total on-hand, reserved, and available. Tenant-scoped via RLS.';

create or replace view public.v_stock_by_location
with (security_invoker = true)
as
select * from app.v_stock_by_location;

comment on view public.v_stock_by_location is 'Stock levels by part and bin with part/location names. Tenant-scoped via RLS.';

create or replace view public.v_parts
with (security_invoker = true)
as
select
  id,
  tenant_id,
  part_number,
  name,
  description,
  unit,
  preferred_supplier_id,
  external_id,
  reorder_point,
  min_quantity,
  max_quantity,
  lead_time_days,
  is_active,
  created_at,
  updated_at
from app.parts;

comment on view public.v_parts is 'Parts catalog. Tenant-scoped via RLS.';

create or replace view public.v_suppliers
with (security_invoker = true)
as
select
  id,
  tenant_id,
  name,
  code,
  external_id,
  contact_name,
  email,
  phone,
  address_line,
  created_at,
  updated_at
from app.suppliers;

comment on view public.v_suppliers is 'Suppliers. Tenant-scoped via RLS.';

create or replace view public.v_inventory_locations
with (security_invoker = true)
as
select
  id,
  tenant_id,
  parent_id,
  location_id,
  name,
  code,
  type,
  created_at,
  updated_at
from app.inventory_locations;

comment on view public.v_inventory_locations is 'Inventory location hierarchy (warehouse, aisle, shelf, bin). Tenant-scoped via RLS.';

create or replace view public.v_stock_levels
with (security_invoker = true)
as
select
  tenant_id,
  part_id,
  inventory_location_id,
  quantity,
  updated_at
from app.stock_levels;

comment on view public.v_stock_levels is 'On-hand quantity per part per bin. Tenant-scoped via RLS.';

create or replace view public.v_part_reservations
with (security_invoker = true)
as
select
  id,
  tenant_id,
  work_order_id,
  part_id,
  inventory_location_id,
  quantity,
  status,
  created_at,
  updated_at
from app.part_reservations;

comment on view public.v_part_reservations is 'Part reservations for work orders. Tenant-scoped via RLS.';

create or replace view public.v_part_usage
with (security_invoker = true)
as
select
  id,
  tenant_id,
  work_order_id,
  part_id,
  inventory_location_id,
  quantity_used,
  used_at,
  used_by,
  created_at
from app.part_usage;

comment on view public.v_part_usage is 'Parts consumed on work orders. Tenant-scoped via RLS.';

-- ============================================================================
-- 2. Purchasing (from app views)
-- ============================================================================

create or replace view public.v_open_requisitions
with (security_invoker = true)
as
select * from app.v_open_requisitions;

comment on view public.v_open_requisitions is 'Purchase requisitions not yet ordered or rejected. Tenant-scoped via RLS.';

create or replace view public.v_open_purchase_orders
with (security_invoker = true)
as
select * from app.v_open_purchase_orders;

comment on view public.v_open_purchase_orders is 'Purchase orders not fully received or closed. Tenant-scoped via RLS.';

create or replace view public.v_purchase_order_receipt_status
with (security_invoker = true)
as
select * from app.v_purchase_order_receipt_status;

comment on view public.v_purchase_order_receipt_status is 'PO lines with quantity ordered, received, and balance. Tenant-scoped via RLS.';

-- ============================================================================
-- 3. Grants
-- ============================================================================

grant select on public.v_parts_with_stock to authenticated, anon;
grant select on public.v_stock_by_location to authenticated, anon;
grant select on public.v_parts to authenticated, anon;
grant select on public.v_suppliers to authenticated, anon;
grant select on public.v_inventory_locations to authenticated, anon;
grant select on public.v_stock_levels to authenticated, anon;
grant select on public.v_part_reservations to authenticated, anon;
grant select on public.v_part_usage to authenticated, anon;
grant select on public.v_open_requisitions to authenticated, anon;
grant select on public.v_open_purchase_orders to authenticated, anon;
grant select on public.v_purchase_order_receipt_status to authenticated, anon;
