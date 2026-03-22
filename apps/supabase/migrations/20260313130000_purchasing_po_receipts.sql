-- SPDX-License-Identifier: AGPL-3.0-or-later
--
-- Purchasing: purchase requisitions, purchase orders, receipts, invoice references.
-- Builds on parts_inventory_foundation (app.parts, app.suppliers).
--
-- Purpose
-- -------
-- Basic purchasing data structures for ERP integration: requisitions, POs, receipt lines,
-- and invoice reference columns on POs. RLS and tenant isolation on all tables.
-- Views and RPCs for parts/stock and purchasing (ERP hooks).
--
-- Affected / new objects
-- ----------------------
-- New tables: app.purchase_requisitions, app.purchase_requisition_lines,
-- app.purchase_orders, app.purchase_order_lines, app.purchase_receipts,
-- app.purchase_receipt_lines.
-- New permissions: purchase_requisition.*, purchase_order.*
-- Views: app.v_parts_with_stock, app.v_stock_by_location, app.v_open_requisitions,
-- app.v_open_purchase_orders, app.v_purchase_order_receipt_status.
-- RPCs: rpc_reserve_parts, rpc_issue_parts_to_work_order, rpc_receive_purchase_order,
-- rpc_create_purchase_order, rpc_create_part, rpc_update_part, rpc_create_supplier, rpc_update_supplier.
--
-- RLS: Granular policies per operation per role (authenticated, anon).

-- ============================================================================
-- 1. New permissions (purchasing)
-- ============================================================================

insert into cfg.permissions (key, name, category, description) values
  ('purchase_requisition.create', 'Create Purchase Requisitions', 'purchase', 'Allows creating purchase requisitions'),
  ('purchase_requisition.view', 'View Purchase Requisitions', 'purchase', 'Allows viewing requisitions'),
  ('purchase_requisition.edit', 'Edit Purchase Requisitions', 'purchase', 'Allows editing requisitions'),
  ('purchase_order.create', 'Create Purchase Orders', 'purchase', 'Allows creating purchase orders'),
  ('purchase_order.view', 'View Purchase Orders', 'purchase', 'Allows viewing purchase orders'),
  ('purchase_order.edit', 'Edit Purchase Orders', 'purchase', 'Allows editing purchase orders'),
  ('purchase_order.receive', 'Receive Purchase Orders', 'purchase', 'Allows receiving PO shipments and updating stock');

-- ============================================================================
-- 2. app.purchase_requisitions
-- ============================================================================

create table app.purchase_requisitions (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  status text not null default 'draft',
  requested_by uuid references auth.users(id) on delete set null,
  requested_at timestamptz not null default pg_catalog.now(),
  due_date date,
  notes text,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint purchase_requisitions_status_check check (
    status in ('draft', 'submitted', 'approved', 'rejected', 'ordered')
  )
);

comment on table app.purchase_requisitions is 'Purchase requisitions. status: draft, submitted, approved, rejected, ordered.';
comment on column app.purchase_requisitions.requested_by is 'User who created or submitted the requisition.';
comment on column app.purchase_requisitions.approved_by is 'User who approved (when status = approved).';

create index purchase_requisitions_tenant_idx on app.purchase_requisitions (tenant_id);
create index purchase_requisitions_tenant_status_idx on app.purchase_requisitions (tenant_id, status);
create index purchase_requisitions_requested_at_idx on app.purchase_requisitions (tenant_id, requested_at desc);

create trigger purchase_requisitions_set_updated_at
  before update on app.purchase_requisitions
  for each row
  execute function util.set_updated_at();

alter table app.purchase_requisitions enable row level security;

-- ============================================================================
-- 3. app.purchase_requisition_lines
-- ============================================================================

create table app.purchase_requisition_lines (
  id uuid primary key default extensions.gen_random_uuid(),
  purchase_requisition_id uuid not null references app.purchase_requisitions(id) on delete cascade,
  part_id uuid not null references app.parts(id) on delete cascade,
  quantity numeric(18, 4) not null,
  estimated_unit_cost numeric(18, 4),
  notes text,
  created_at timestamptz not null default pg_catalog.now(),
  constraint purchase_requisition_lines_quantity_positive check (quantity > 0)
);

comment on table app.purchase_requisition_lines is 'Line items on a purchase requisition.';

create index purchase_requisition_lines_requisition_idx on app.purchase_requisition_lines (purchase_requisition_id);
create index purchase_requisition_lines_part_idx on app.purchase_requisition_lines (part_id);

alter table app.purchase_requisition_lines enable row level security;

-- ============================================================================
-- 4. app.purchase_orders (invoice ref columns on PO)
-- ============================================================================

create table app.purchase_orders (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  supplier_id uuid not null references app.suppliers(id) on delete restrict,
  status text not null default 'draft',
  order_number text not null,
  order_date date not null default (current_date),
  expected_delivery_date date,
  external_id text,
  notes text,
  invoice_number text,
  invoice_date date,
  external_invoice_id text,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint purchase_orders_status_check check (
    status in ('draft', 'sent', 'partially_received', 'received', 'closed', 'cancelled')
  )
);

comment on table app.purchase_orders is 'Purchase orders to suppliers. order_number unique per tenant. external_id for ERP sync; invoice fields for AP reference.';
comment on column app.purchase_orders.order_number is 'Tenant-unique PO number (e.g. PO-2024-001).';
comment on column app.purchase_orders.external_id is 'External system id for ERP sync.';
comment on column app.purchase_orders.invoice_number is 'Vendor invoice number when matched.';
comment on column app.purchase_orders.external_invoice_id is 'External AP/invoice id for ERP sync.';

create unique index purchase_orders_tenant_order_number_unique_idx
  on app.purchase_orders (tenant_id, order_number);

create index purchase_orders_tenant_idx on app.purchase_orders (tenant_id);
create index purchase_orders_supplier_idx on app.purchase_orders (supplier_id);
create index purchase_orders_tenant_status_idx on app.purchase_orders (tenant_id, status);
create index purchase_orders_external_id_idx on app.purchase_orders (tenant_id, external_id)
  where external_id is not null;

create trigger purchase_orders_set_updated_at
  before update on app.purchase_orders
  for each row
  execute function util.set_updated_at();

-- Validate supplier same tenant
create or replace function util.purchase_orders_validate_supplier_tenant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_supplier_tenant_id uuid;
begin
  select tenant_id into v_supplier_tenant_id from app.suppliers where id = new.supplier_id;
  if v_supplier_tenant_id is null then
    raise exception using message = 'Supplier not found', errcode = '23503';
  end if;
  if v_supplier_tenant_id != new.tenant_id then
    raise exception using message = 'Supplier must belong to the same tenant', errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function util.purchase_orders_validate_supplier_tenant() from public;
grant execute on function util.purchase_orders_validate_supplier_tenant() to postgres;

create trigger purchase_orders_validate_supplier_tenant_trigger
  before insert or update on app.purchase_orders
  for each row
  execute function util.purchase_orders_validate_supplier_tenant();

alter table app.purchase_orders enable row level security;

-- ============================================================================
-- 5. app.purchase_order_lines
-- ============================================================================

create table app.purchase_order_lines (
  id uuid primary key default extensions.gen_random_uuid(),
  purchase_order_id uuid not null references app.purchase_orders(id) on delete cascade,
  part_id uuid not null references app.parts(id) on delete cascade,
  quantity_ordered numeric(18, 4) not null,
  unit_price numeric(18, 4),
  quantity_received numeric(18, 4) not null default 0,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint purchase_order_lines_quantity_ordered_positive check (quantity_ordered > 0),
  constraint purchase_order_lines_quantity_received_non_negative check (quantity_received >= 0),
  constraint purchase_order_lines_received_not_exceed_ordered check (quantity_received <= quantity_ordered)
);

comment on table app.purchase_order_lines is 'Line items on a purchase order. quantity_received updated by receipts.';

create index purchase_order_lines_po_idx on app.purchase_order_lines (purchase_order_id);
create index purchase_order_lines_part_idx on app.purchase_order_lines (part_id);

create trigger purchase_order_lines_set_updated_at
  before update on app.purchase_order_lines
  for each row
  execute function util.set_updated_at();

alter table app.purchase_order_lines enable row level security;

-- ============================================================================
-- 6. app.purchase_receipts
-- ============================================================================

create table app.purchase_receipts (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  purchase_order_id uuid not null references app.purchase_orders(id) on delete cascade,
  received_at timestamptz not null default pg_catalog.now(),
  received_by uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default pg_catalog.now()
);

comment on table app.purchase_receipts is 'Receipt of goods against a purchase order.';

create index purchase_receipts_tenant_idx on app.purchase_receipts (tenant_id);
create index purchase_receipts_po_idx on app.purchase_receipts (purchase_order_id);

alter table app.purchase_receipts enable row level security;

-- ============================================================================
-- 7. app.purchase_receipt_lines
-- ============================================================================

create table app.purchase_receipt_lines (
  id uuid primary key default extensions.gen_random_uuid(),
  purchase_receipt_id uuid not null references app.purchase_receipts(id) on delete cascade,
  purchase_order_line_id uuid not null references app.purchase_order_lines(id) on delete cascade,
  quantity_received numeric(18, 4) not null,
  to_inventory_location_id uuid references app.inventory_locations(id) on delete set null,
  created_at timestamptz not null default pg_catalog.now(),
  constraint purchase_receipt_lines_quantity_positive check (quantity_received > 0)
);

comment on table app.purchase_receipt_lines is 'Per-line receipt quantities. to_inventory_location_id = put-away bin.';

create index purchase_receipt_lines_receipt_idx on app.purchase_receipt_lines (purchase_receipt_id);
create index purchase_receipt_lines_po_line_idx on app.purchase_receipt_lines (purchase_order_line_id);
create index purchase_receipt_lines_to_location_idx on app.purchase_receipt_lines (to_inventory_location_id)
  where to_inventory_location_id is not null;

alter table app.purchase_receipt_lines enable row level security;

-- ============================================================================
-- 8. RLS: purchase_requisitions
-- ============================================================================

create policy purchase_requisitions_select_tenant on app.purchase_requisitions for select to authenticated using (authz.is_current_user_tenant_member(tenant_id));
create policy purchase_requisitions_insert_tenant on app.purchase_requisitions for insert to authenticated with check (authz.is_current_user_tenant_member(tenant_id));
create policy purchase_requisitions_update_tenant on app.purchase_requisitions for update to authenticated using (authz.is_current_user_tenant_member(tenant_id)) with check (authz.is_current_user_tenant_member(tenant_id));
create policy purchase_requisitions_delete_tenant on app.purchase_requisitions for delete to authenticated using (authz.is_current_user_tenant_member(tenant_id));
create policy purchase_requisitions_select_anon on app.purchase_requisitions for select to anon using (false);
create policy purchase_requisitions_insert_anon on app.purchase_requisitions for insert to anon with check (false);
create policy purchase_requisitions_update_anon on app.purchase_requisitions for update to anon using (false) with check (false);
create policy purchase_requisitions_delete_anon on app.purchase_requisitions for delete to anon using (false);

grant select on app.purchase_requisitions to authenticated, anon;
grant insert, update, delete on app.purchase_requisitions to authenticated;
alter table app.purchase_requisitions force row level security;

-- ============================================================================
-- 9. RLS: purchase_requisition_lines (via parent tenant)
-- ============================================================================

create policy purchase_requisition_lines_select_tenant on app.purchase_requisition_lines for select to authenticated
  using (
    exists (
      select 1 from app.purchase_requisitions pr
      where pr.id = purchase_requisition_id
      and authz.is_current_user_tenant_member(pr.tenant_id)
    )
  );
create policy purchase_requisition_lines_insert_tenant on app.purchase_requisition_lines for insert to authenticated
  with check (
    exists (
      select 1 from app.purchase_requisitions pr
      where pr.id = purchase_requisition_id
      and authz.is_current_user_tenant_member(pr.tenant_id)
    )
  );
create policy purchase_requisition_lines_update_tenant on app.purchase_requisition_lines for update to authenticated
  using (
    exists (
      select 1 from app.purchase_requisitions pr
      where pr.id = purchase_requisition_id
      and authz.is_current_user_tenant_member(pr.tenant_id)
    )
  )
  with check (
    exists (
      select 1 from app.purchase_requisitions pr
      where pr.id = purchase_requisition_id
      and authz.is_current_user_tenant_member(pr.tenant_id)
    )
  );
create policy purchase_requisition_lines_delete_tenant on app.purchase_requisition_lines for delete to authenticated
  using (
    exists (
      select 1 from app.purchase_requisitions pr
      where pr.id = purchase_requisition_id
      and authz.is_current_user_tenant_member(pr.tenant_id)
    )
  );
create policy purchase_requisition_lines_select_anon on app.purchase_requisition_lines for select to anon using (false);
create policy purchase_requisition_lines_insert_anon on app.purchase_requisition_lines for insert to anon with check (false);
create policy purchase_requisition_lines_update_anon on app.purchase_requisition_lines for update to anon using (false) with check (false);
create policy purchase_requisition_lines_delete_anon on app.purchase_requisition_lines for delete to anon using (false);

grant select on app.purchase_requisition_lines to authenticated, anon;
grant insert, update, delete on app.purchase_requisition_lines to authenticated;
alter table app.purchase_requisition_lines force row level security;

-- ============================================================================
-- 10. RLS: purchase_orders
-- ============================================================================

create policy purchase_orders_select_tenant on app.purchase_orders for select to authenticated using (authz.is_current_user_tenant_member(tenant_id));
create policy purchase_orders_insert_tenant on app.purchase_orders for insert to authenticated with check (authz.is_current_user_tenant_member(tenant_id));
create policy purchase_orders_update_tenant on app.purchase_orders for update to authenticated using (authz.is_current_user_tenant_member(tenant_id)) with check (authz.is_current_user_tenant_member(tenant_id));
create policy purchase_orders_delete_tenant on app.purchase_orders for delete to authenticated using (authz.is_current_user_tenant_member(tenant_id));
create policy purchase_orders_select_anon on app.purchase_orders for select to anon using (false);
create policy purchase_orders_insert_anon on app.purchase_orders for insert to anon with check (false);
create policy purchase_orders_update_anon on app.purchase_orders for update to anon using (false) with check (false);
create policy purchase_orders_delete_anon on app.purchase_orders for delete to anon using (false);

grant select on app.purchase_orders to authenticated, anon;
grant insert, update, delete on app.purchase_orders to authenticated;
alter table app.purchase_orders force row level security;

-- ============================================================================
-- 11. RLS: purchase_order_lines
-- ============================================================================

create policy purchase_order_lines_select_tenant on app.purchase_order_lines for select to authenticated
  using (
    exists (
      select 1 from app.purchase_orders po
      where po.id = purchase_order_id
      and authz.is_current_user_tenant_member(po.tenant_id)
    )
  );
create policy purchase_order_lines_insert_tenant on app.purchase_order_lines for insert to authenticated
  with check (
    exists (
      select 1 from app.purchase_orders po
      where po.id = purchase_order_id
      and authz.is_current_user_tenant_member(po.tenant_id)
    )
  );
create policy purchase_order_lines_update_tenant on app.purchase_order_lines for update to authenticated
  using (
    exists (
      select 1 from app.purchase_orders po
      where po.id = purchase_order_id
      and authz.is_current_user_tenant_member(po.tenant_id)
    )
  )
  with check (
    exists (
      select 1 from app.purchase_orders po
      where po.id = purchase_order_id
      and authz.is_current_user_tenant_member(po.tenant_id)
    )
  );
create policy purchase_order_lines_delete_tenant on app.purchase_order_lines for delete to authenticated
  using (
    exists (
      select 1 from app.purchase_orders po
      where po.id = purchase_order_id
      and authz.is_current_user_tenant_member(po.tenant_id)
    )
  );
create policy purchase_order_lines_select_anon on app.purchase_order_lines for select to anon using (false);
create policy purchase_order_lines_insert_anon on app.purchase_order_lines for insert to anon with check (false);
create policy purchase_order_lines_update_anon on app.purchase_order_lines for update to anon using (false) with check (false);
create policy purchase_order_lines_delete_anon on app.purchase_order_lines for delete to anon using (false);

grant select on app.purchase_order_lines to authenticated, anon;
grant insert, update, delete on app.purchase_order_lines to authenticated;
alter table app.purchase_order_lines force row level security;

-- ============================================================================
-- 12. RLS: purchase_receipts
-- ============================================================================

create policy purchase_receipts_select_tenant on app.purchase_receipts for select to authenticated using (authz.is_current_user_tenant_member(tenant_id));
create policy purchase_receipts_insert_tenant on app.purchase_receipts for insert to authenticated with check (authz.is_current_user_tenant_member(tenant_id));
create policy purchase_receipts_update_tenant on app.purchase_receipts for update to authenticated using (authz.is_current_user_tenant_member(tenant_id)) with check (authz.is_current_user_tenant_member(tenant_id));
create policy purchase_receipts_delete_tenant on app.purchase_receipts for delete to authenticated using (authz.is_current_user_tenant_member(tenant_id));
create policy purchase_receipts_select_anon on app.purchase_receipts for select to anon using (false);
create policy purchase_receipts_insert_anon on app.purchase_receipts for insert to anon with check (false);
create policy purchase_receipts_update_anon on app.purchase_receipts for update to anon using (false) with check (false);
create policy purchase_receipts_delete_anon on app.purchase_receipts for delete to anon using (false);

grant select on app.purchase_receipts to authenticated, anon;
grant insert, update, delete on app.purchase_receipts to authenticated;
alter table app.purchase_receipts force row level security;

-- ============================================================================
-- 13. RLS: purchase_receipt_lines
-- ============================================================================

create policy purchase_receipt_lines_select_tenant on app.purchase_receipt_lines for select to authenticated
  using (
    exists (
      select 1 from app.purchase_receipts rec
      join app.purchase_orders po on po.id = rec.purchase_order_id
      where rec.id = purchase_receipt_id
      and authz.is_current_user_tenant_member(po.tenant_id)
    )
  );
create policy purchase_receipt_lines_insert_tenant on app.purchase_receipt_lines for insert to authenticated
  with check (
    exists (
      select 1 from app.purchase_receipts rec
      join app.purchase_orders po on po.id = rec.purchase_order_id
      where rec.id = purchase_receipt_id
      and authz.is_current_user_tenant_member(po.tenant_id)
    )
  );
create policy purchase_receipt_lines_update_tenant on app.purchase_receipt_lines for update to authenticated
  using (
    exists (
      select 1 from app.purchase_receipts rec
      join app.purchase_orders po on po.id = rec.purchase_order_id
      where rec.id = purchase_receipt_id
      and authz.is_current_user_tenant_member(po.tenant_id)
    )
  )
  with check (
    exists (
      select 1 from app.purchase_receipts rec
      join app.purchase_orders po on po.id = rec.purchase_order_id
      where rec.id = purchase_receipt_id
      and authz.is_current_user_tenant_member(po.tenant_id)
    )
  );
create policy purchase_receipt_lines_delete_tenant on app.purchase_receipt_lines for delete to authenticated
  using (
    exists (
      select 1 from app.purchase_receipts rec
      join app.purchase_orders po on po.id = rec.purchase_order_id
      where rec.id = purchase_receipt_id
      and authz.is_current_user_tenant_member(po.tenant_id)
    )
  );
create policy purchase_receipt_lines_select_anon on app.purchase_receipt_lines for select to anon using (false);
create policy purchase_receipt_lines_insert_anon on app.purchase_receipt_lines for insert to anon with check (false);
create policy purchase_receipt_lines_update_anon on app.purchase_receipt_lines for update to anon using (false) with check (false);
create policy purchase_receipt_lines_delete_anon on app.purchase_receipt_lines for delete to anon using (false);

grant select on app.purchase_receipt_lines to authenticated, anon;
grant insert, update, delete on app.purchase_receipt_lines to authenticated;
alter table app.purchase_receipt_lines force row level security;

-- ============================================================================
-- 14. Views: parts with aggregated stock, stock by location
-- ============================================================================

create or replace view app.v_parts_with_stock
with (security_invoker = true)
as
select
  p.id,
  p.tenant_id,
  p.part_number,
  p.name,
  p.description,
  p.unit,
  p.preferred_supplier_id,
  p.external_id,
  p.reorder_point,
  p.min_quantity,
  p.max_quantity,
  p.lead_time_days,
  p.is_active,
  p.created_at,
  p.updated_at,
  coalesce(stock.on_hand, 0) as total_on_hand,
  coalesce(res.reserved, 0) as total_reserved,
  (coalesce(stock.on_hand, 0) - coalesce(res.reserved, 0)) as available
from
  app.parts p
left join (
  select part_id, sum(quantity) as on_hand
  from app.stock_levels
  group by part_id
) stock on stock.part_id = p.id
left join (
  select part_id, sum(quantity) as reserved
  from app.part_reservations
  where status = 'reserved'
  group by part_id
) res on res.part_id = p.id;

comment on view app.v_parts_with_stock is 'Parts with aggregated total on-hand, total reserved, and available (on_hand - reserved).';

create or replace view app.v_stock_by_location
with (security_invoker = true)
as
select
  sl.tenant_id,
  sl.part_id,
  sl.inventory_location_id,
  sl.quantity,
  sl.updated_at,
  p.part_number,
  p.name as part_name,
  p.unit,
  il.name as location_name,
  il.code as location_code,
  il.type as location_type
from
  app.stock_levels sl
join app.parts p on p.id = sl.part_id
join app.inventory_locations il on il.id = sl.inventory_location_id;

comment on view app.v_stock_by_location is 'Stock levels by part and inventory location (bin) with part and location names.';

-- ============================================================================
-- 15. Views: open requisitions, open POs, PO receipt status
-- ============================================================================

create or replace view app.v_open_requisitions
with (security_invoker = true)
as
select
  pr.id,
  pr.tenant_id,
  pr.status,
  pr.requested_by,
  pr.requested_at,
  pr.due_date,
  pr.notes,
  pr.approved_by,
  pr.approved_at,
  pr.created_at,
  pr.updated_at
from
  app.purchase_requisitions pr
where
  pr.status in ('draft', 'submitted', 'approved');

comment on view app.v_open_requisitions is 'Requisitions not yet ordered or rejected. Filter by tenant_id in client.';

create or replace view app.v_open_purchase_orders
with (security_invoker = true)
as
select
  po.id,
  po.tenant_id,
  po.supplier_id,
  po.status,
  po.order_number,
  po.order_date,
  po.expected_delivery_date,
  po.external_id,
  po.notes,
  po.invoice_number,
  po.invoice_date,
  po.external_invoice_id,
  po.created_at,
  po.updated_at,
  s.name as supplier_name,
  s.code as supplier_code
from
  app.purchase_orders po
join app.suppliers s on s.id = po.supplier_id
where
  po.status in ('draft', 'sent', 'partially_received');

comment on view app.v_open_purchase_orders is 'Purchase orders not fully received or closed. Filter by tenant_id in client.';

create or replace view app.v_purchase_order_receipt_status
with (security_invoker = true)
as
select
  po.id as purchase_order_id,
  po.tenant_id,
  po.order_number,
  po.status as po_status,
  pol.id as purchase_order_line_id,
  pol.part_id,
  pol.quantity_ordered,
  pol.quantity_received,
  (pol.quantity_ordered - pol.quantity_received) as quantity_balance,
  p.part_number,
  p.name as part_name
from
  app.purchase_orders po
join app.purchase_order_lines pol on pol.purchase_order_id = po.id
join app.parts p on p.id = pol.part_id;

comment on view app.v_purchase_order_receipt_status is 'PO lines with quantity_ordered, quantity_received, and balance for receipt entry.';

grant select on app.v_parts_with_stock to authenticated, anon;
grant select on app.v_stock_by_location to authenticated, anon;
grant select on app.v_open_requisitions to authenticated, anon;
grant select on app.v_open_purchase_orders to authenticated, anon;
grant select on app.v_purchase_order_receipt_status to authenticated, anon;

-- ============================================================================
-- 16. RPC: rpc_reserve_parts
-- ============================================================================

create or replace function public.rpc_reserve_parts(
  p_tenant_id uuid,
  p_work_order_id uuid,
  p_part_id uuid,
  p_quantity numeric,
  p_inventory_location_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reservation_id uuid;
  v_user_id uuid;
begin
  v_user_id := authz.rpc_setup(p_tenant_id, 'inventory.reservation.create');
  if p_quantity is null or p_quantity <= 0 then
    raise exception using message = 'Quantity must be positive', errcode = '23514';
  end if;
  insert into app.part_reservations (tenant_id, work_order_id, part_id, inventory_location_id, quantity, status)
  values (p_tenant_id, p_work_order_id, p_part_id, p_inventory_location_id, p_quantity, 'reserved')
  returning id into v_reservation_id;
  return v_reservation_id;
end;
$$;

comment on function public.rpc_reserve_parts(uuid, uuid, uuid, numeric, uuid) is
  'Reserves parts for a work order. Requires inventory.reservation.create. Returns reservation id.';

revoke all on function public.rpc_reserve_parts(uuid, uuid, uuid, numeric, uuid) from public;
grant execute on function public.rpc_reserve_parts(uuid, uuid, uuid, numeric, uuid) to authenticated;

-- ============================================================================
-- 17. RPC: rpc_issue_parts_to_work_order
-- ============================================================================

create or replace function public.rpc_issue_parts_to_work_order(
  p_tenant_id uuid,
  p_work_order_id uuid,
  p_part_id uuid,
  p_quantity numeric,
  p_inventory_location_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_usage_id uuid;
  v_available numeric;
  v_wo_tenant_id uuid;
  v_part_tenant_id uuid;
begin
  v_user_id := authz.rpc_setup(p_tenant_id, 'inventory.usage.record');
  if p_quantity is null or p_quantity <= 0 then
    raise exception using message = 'Quantity must be positive', errcode = '23514';
  end if;
  select tenant_id into v_wo_tenant_id from app.work_orders where id = p_work_order_id;
  if v_wo_tenant_id is null or v_wo_tenant_id != p_tenant_id then
    raise exception using message = 'Work order not found or wrong tenant', errcode = '23503';
  end if;
  select tenant_id into v_part_tenant_id from app.parts where id = p_part_id;
  if v_part_tenant_id is null or v_part_tenant_id != p_tenant_id then
    raise exception using message = 'Part not found or wrong tenant', errcode = '23503';
  end if;
  if p_inventory_location_id is not null then
    select coalesce(sum(sl.quantity), 0) into v_available
    from app.stock_levels sl
    where sl.part_id = p_part_id and sl.inventory_location_id = p_inventory_location_id;
    if v_available < p_quantity then
      raise exception using message = format('Insufficient stock at location: have %s, need %s', v_available, p_quantity), errcode = '23514';
    end if;
    update app.stock_levels
    set quantity = quantity - p_quantity, updated_at = pg_catalog.now()
    where part_id = p_part_id and inventory_location_id = p_inventory_location_id;
  else
    select coalesce(sum(sl.quantity), 0) into v_available
    from app.stock_levels sl
    where sl.part_id = p_part_id;
    if v_available < p_quantity then
      raise exception using message = format('Insufficient total stock: have %s, need %s', v_available, p_quantity), errcode = '23514';
    end if;
    /* Deduct from one bin that has >= p_quantity (pick by oldest updated_at) */
    update app.stock_levels sl
    set quantity = sl.quantity - p_quantity, updated_at = pg_catalog.now()
    from (
      select part_id, inventory_location_id
      from app.stock_levels
      where part_id = p_part_id and quantity >= p_quantity
      order by updated_at
      limit 1
    ) one
    where sl.part_id = one.part_id and sl.inventory_location_id = one.inventory_location_id;
    if not found then
      raise exception using message = format('No single bin has sufficient quantity (%s). Specify inventory_location_id or split issue.', p_quantity), errcode = '23514';
    end if;
  end if;
  insert into app.inventory_transactions (tenant_id, part_id, from_inventory_location_id, to_inventory_location_id, quantity, transaction_type, reference_type, reference_id, created_by)
  values (p_tenant_id, p_part_id, p_inventory_location_id, null, -p_quantity, 'issue', 'work_order', p_work_order_id, v_user_id);
  insert into app.part_usage (tenant_id, work_order_id, part_id, inventory_location_id, quantity_used, used_at, used_by)
  values (p_tenant_id, p_work_order_id, p_part_id, p_inventory_location_id, p_quantity, pg_catalog.now(), v_user_id)
  returning id into v_usage_id;
  /* Optionally mark one matching reservation as issued (same work order, part, quantity) */
  update app.part_reservations pr
  set status = 'issued', updated_at = pg_catalog.now()
  where pr.work_order_id = p_work_order_id and pr.part_id = p_part_id and pr.status = 'reserved'
  and (p_inventory_location_id is null or pr.inventory_location_id = p_inventory_location_id)
  and pr.id = (
    select id from app.part_reservations
    where work_order_id = p_work_order_id and part_id = p_part_id and status = 'reserved'
    and (p_inventory_location_id is null or inventory_location_id = p_inventory_location_id)
    order by created_at
    limit 1
  );
  return v_usage_id;
end;
$$;

comment on function public.rpc_issue_parts_to_work_order(uuid, uuid, uuid, numeric, uuid) is
  'Issues parts to a work order: decrements stock, creates transaction and part_usage, optionally releases reservation. Requires inventory.usage.record.';

revoke all on function public.rpc_issue_parts_to_work_order(uuid, uuid, uuid, numeric, uuid) from public;
grant execute on function public.rpc_issue_parts_to_work_order(uuid, uuid, uuid, numeric, uuid) to authenticated;

-- ============================================================================
-- 18. RPC: rpc_receive_purchase_order
-- ============================================================================

create or replace function public.rpc_receive_purchase_order(
  p_tenant_id uuid,
  p_po_id uuid,
  p_lines jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_po_tenant_id uuid;
  v_receipt_id uuid;
  v_line jsonb;
  v_po_line_id uuid;
  v_qty numeric;
  v_to_location_id uuid;
  v_part_id uuid;
  v_prev_received numeric;
begin
  v_user_id := authz.rpc_setup(p_tenant_id, 'purchase_order.receive');
  select tenant_id into v_po_tenant_id from app.purchase_orders where id = p_po_id;
  if v_po_tenant_id is null or v_po_tenant_id != p_tenant_id then
    raise exception using message = 'Purchase order not found or wrong tenant', errcode = '23503';
  end if;
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception using message = 'p_lines must be a non-empty array of { purchase_order_line_id, quantity_received, to_inventory_location_id? }', errcode = '23514';
  end if;
  insert into app.purchase_receipts (tenant_id, purchase_order_id, received_at, received_by)
  values (p_tenant_id, p_po_id, pg_catalog.now(), v_user_id)
  returning id into v_receipt_id;
  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    v_po_line_id := (v_line->>'purchase_order_line_id')::uuid;
    v_qty := (v_line->>'quantity_received')::numeric;
    v_to_location_id := (v_line->>'to_inventory_location_id')::uuid;
    if v_po_line_id is null or v_qty is null or v_qty <= 0 then
      raise exception using message = 'Each line must have purchase_order_line_id and positive quantity_received', errcode = '23514';
    end if;
    select pol.part_id, pol.quantity_received into v_part_id, v_prev_received
    from app.purchase_order_lines pol
    where pol.id = v_po_line_id and pol.purchase_order_id = p_po_id;
    if v_part_id is null then
      raise exception using message = 'Purchase order line not found or wrong PO', errcode = '23503';
    end if;
    if v_prev_received + v_qty > (select quantity_ordered from app.purchase_order_lines where id = v_po_line_id) then
      raise exception using message = format('Receipt would exceed ordered quantity for line %s', v_po_line_id), errcode = '23514';
    end if;
    insert into app.purchase_receipt_lines (purchase_receipt_id, purchase_order_line_id, quantity_received, to_inventory_location_id)
    values (v_receipt_id, v_po_line_id, v_qty, v_to_location_id);
    update app.purchase_order_lines
    set quantity_received = quantity_received + v_qty, updated_at = pg_catalog.now()
    where id = v_po_line_id;
    if v_to_location_id is not null then
      insert into app.stock_levels (tenant_id, part_id, inventory_location_id, quantity)
      values (p_tenant_id, v_part_id, v_to_location_id, v_qty)
      on conflict (part_id, inventory_location_id) do update
      set quantity = app.stock_levels.quantity + excluded.quantity, updated_at = pg_catalog.now();
    end if;
    insert into app.inventory_transactions (tenant_id, part_id, from_inventory_location_id, to_inventory_location_id, quantity, transaction_type, reference_type, reference_id, created_by)
    values (p_tenant_id, v_part_id, null, v_to_location_id, v_qty, 'receipt', 'purchase_receipt', v_receipt_id, v_user_id);
  end loop;
  update app.purchase_orders po
  set status = case
    when (select bool_and(pol.quantity_received >= pol.quantity_ordered) from app.purchase_order_lines pol where pol.purchase_order_id = po.id) then 'received'
    else 'partially_received'
  end,
  updated_at = pg_catalog.now()
  where po.id = p_po_id;
  return v_receipt_id;
end;
$$;

comment on function public.rpc_receive_purchase_order(uuid, uuid, jsonb) is
  'Creates a purchase receipt and receipt lines; updates PO line quantity_received and stock_levels. p_lines: [{ purchase_order_line_id, quantity_received, to_inventory_location_id? }]. Requires purchase_order.receive.';

revoke all on function public.rpc_receive_purchase_order(uuid, uuid, jsonb) from public;
grant execute on function public.rpc_receive_purchase_order(uuid, uuid, jsonb) to authenticated;

-- ============================================================================
-- 19. RPC: rpc_create_purchase_order
-- ============================================================================

create or replace function public.rpc_create_purchase_order(
  p_tenant_id uuid,
  p_supplier_id uuid,
  p_order_number text,
  p_order_date date default null,
  p_expected_delivery_date date default null,
  p_external_id text default null,
  p_notes text default null,
  p_lines jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_po_id uuid;
  v_line jsonb;
begin
  v_user_id := authz.rpc_setup(p_tenant_id, 'purchase_order.create');
  if p_order_number is null or trim(p_order_number) = '' then
    raise exception using message = 'order_number is required', errcode = '23514';
  end if;
  insert into app.purchase_orders (tenant_id, supplier_id, order_number, order_date, expected_delivery_date, external_id, notes)
  values (p_tenant_id, p_supplier_id, trim(p_order_number), coalesce(p_order_date, current_date), p_expected_delivery_date, nullif(trim(p_external_id), ''), p_notes)
  returning id into v_po_id;
  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    insert into app.purchase_order_lines (purchase_order_id, part_id, quantity_ordered, unit_price)
    values (
      v_po_id,
      (v_line->>'part_id')::uuid,
      (v_line->>'quantity_ordered')::numeric,
      (v_line->>'unit_price')::numeric
    );
  end loop;
  return v_po_id;
end;
$$;

comment on function public.rpc_create_purchase_order(uuid, uuid, text, date, date, text, text, jsonb) is
  'Creates a purchase order and optional lines. p_lines: [{ part_id, quantity_ordered, unit_price? }]. external_id for ERP sync. Requires purchase_order.create.';

revoke all on function public.rpc_create_purchase_order(uuid, uuid, text, date, date, text, text, jsonb) from public;
grant execute on function public.rpc_create_purchase_order(uuid, uuid, text, date, date, text, text, jsonb) to authenticated;

-- ============================================================================
-- 20. RPC: rpc_create_part
-- ============================================================================

create or replace function public.rpc_create_part(
  p_tenant_id uuid,
  p_part_number text,
  p_name text default null,
  p_description text default null,
  p_unit text default 'each',
  p_preferred_supplier_id uuid default null,
  p_external_id text default null,
  p_reorder_point numeric default null,
  p_min_quantity numeric default null,
  p_max_quantity numeric default null,
  p_lead_time_days integer default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_part_id uuid;
begin
  perform authz.rpc_setup(p_tenant_id, 'part.create');
  if p_part_number is null or length(trim(p_part_number)) < 1 then
    raise exception using message = 'part_number is required', errcode = '23514';
  end if;
  insert into app.parts (tenant_id, part_number, name, description, unit, preferred_supplier_id, external_id, reorder_point, min_quantity, max_quantity, lead_time_days)
  values (p_tenant_id, trim(p_part_number), nullif(trim(p_name), ''), p_description, coalesce(nullif(trim(p_unit), ''), 'each'), p_preferred_supplier_id, nullif(trim(p_external_id), ''), p_reorder_point, p_min_quantity, p_max_quantity, p_lead_time_days)
  returning id into v_part_id;
  return v_part_id;
end;
$$;

comment on function public.rpc_create_part(uuid, text, text, text, text, uuid, text, numeric, numeric, numeric, integer) is
  'Creates a part. part_number unique per tenant. external_id for ERP sync. Requires part.create.';

revoke all on function public.rpc_create_part(uuid, text, text, text, text, uuid, text, numeric, numeric, numeric, integer) from public;
grant execute on function public.rpc_create_part(uuid, text, text, text, text, uuid, text, numeric, numeric, numeric, integer) to authenticated;

-- ============================================================================
-- 21. RPC: rpc_update_part
-- ============================================================================

create or replace function public.rpc_update_part(
  p_tenant_id uuid,
  p_part_id uuid,
  p_part_number text default null,
  p_name text default null,
  p_description text default null,
  p_unit text default null,
  p_preferred_supplier_id uuid default null,
  p_external_id text default null,
  p_reorder_point numeric default null,
  p_min_quantity numeric default null,
  p_max_quantity numeric default null,
  p_lead_time_days integer default null,
  p_is_active boolean default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_part_tenant_id uuid;
begin
  perform authz.rpc_setup(p_tenant_id, 'part.edit');
  select tenant_id into v_part_tenant_id from app.parts where id = p_part_id;
  if v_part_tenant_id is null or v_part_tenant_id != p_tenant_id then
    raise exception using message = 'Part not found or wrong tenant', errcode = '23503';
  end if;
  update app.parts
  set
    part_number = coalesce(nullif(trim(p_part_number), ''), part_number),
    name = coalesce(p_name, name),
    description = coalesce(p_description, description),
    unit = coalesce(nullif(trim(p_unit), ''), unit),
    preferred_supplier_id = coalesce(p_preferred_supplier_id, preferred_supplier_id),
    external_id = case when p_external_id is not null then nullif(trim(p_external_id), '') else external_id end,
    reorder_point = coalesce(p_reorder_point, reorder_point),
    min_quantity = coalesce(p_min_quantity, min_quantity),
    max_quantity = coalesce(p_max_quantity, max_quantity),
    lead_time_days = coalesce(p_lead_time_days, lead_time_days),
    is_active = coalesce(p_is_active, is_active),
    updated_at = pg_catalog.now()
  where id = p_part_id;
end;
$$;

comment on function public.rpc_update_part(uuid, uuid, text, text, text, text, uuid, text, numeric, numeric, numeric, integer, boolean) is
  'Updates a part. Only provided fields are updated. Requires part.edit.';

revoke all on function public.rpc_update_part(uuid, uuid, text, text, text, text, uuid, text, numeric, numeric, numeric, integer, boolean) from public;
grant execute on function public.rpc_update_part(uuid, uuid, text, text, text, text, uuid, text, numeric, numeric, numeric, integer, boolean) to authenticated;

-- ============================================================================
-- 22. RPC: rpc_create_supplier
-- ============================================================================

create or replace function public.rpc_create_supplier(
  p_tenant_id uuid,
  p_name text,
  p_code text default null,
  p_external_id text default null,
  p_contact_name text default null,
  p_email text default null,
  p_phone text default null,
  p_address_line text default null
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
  insert into app.suppliers (tenant_id, name, code, external_id, contact_name, email, phone, address_line)
  values (p_tenant_id, trim(p_name), nullif(trim(p_code), ''), nullif(trim(p_external_id), ''), nullif(trim(p_contact_name), ''), nullif(trim(p_email), ''), nullif(trim(p_phone), ''), nullif(trim(p_address_line), ''))
  returning id into v_supplier_id;
  return v_supplier_id;
end;
$$;

comment on function public.rpc_create_supplier(uuid, text, text, text, text, text, text, text) is
  'Creates a supplier. code unique per tenant when set. external_id for ERP sync. Requires supplier.create.';

revoke all on function public.rpc_create_supplier(uuid, text, text, text, text, text, text, text) from public;
grant execute on function public.rpc_create_supplier(uuid, text, text, text, text, text, text, text) to authenticated;

-- ============================================================================
-- 23. RPC: rpc_update_supplier
-- ============================================================================

create or replace function public.rpc_update_supplier(
  p_tenant_id uuid,
  p_supplier_id uuid,
  p_name text default null,
  p_code text default null,
  p_external_id text default null,
  p_contact_name text default null,
  p_email text default null,
  p_phone text default null,
  p_address_line text default null
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
    updated_at = pg_catalog.now()
  where id = p_supplier_id;
end;
$$;

comment on function public.rpc_update_supplier(uuid, uuid, text, text, text, text, text, text, text) is
  'Updates a supplier. Only provided fields are updated. Requires supplier.edit.';

revoke all on function public.rpc_update_supplier(uuid, uuid, text, text, text, text, text, text, text) from public;
grant execute on function public.rpc_update_supplier(uuid, uuid, text, text, text, text, text, text, text) to authenticated;
