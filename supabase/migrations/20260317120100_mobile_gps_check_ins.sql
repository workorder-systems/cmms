-- SPDX-License-Identifier: AGPL-3.0-or-later
--
-- Mobile-first: optional GPS/location on check-ins, time entries, and work orders.
--
-- Purpose: Add work_order_check_ins table for "technician arrived on site" with optional
--   GPS; add optional latitude/longitude/accuracy to time entries and completed-at
--   coordinates on work orders. All GPS columns nullable so existing behaviour unchanged.
--
-- Affected: app.work_order_check_ins (new), app.work_order_time_entries (new columns),
--   app.work_orders (new columns). RLS and grants for check_ins.

-- ============================================================================
-- 1. app.work_order_check_ins
-- ============================================================================

create table app.work_order_check_ins (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  work_order_id uuid not null references app.work_orders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete set null,
  checked_in_at timestamptz not null default pg_catalog.now(),
  latitude numeric,
  longitude numeric,
  accuracy_metres numeric,
  note text,
  created_at timestamptz not null default pg_catalog.now(),
  constraint work_order_check_ins_note_length_check check (
    note is null or (length(note) >= 1 and length(note) <= 1000)
  ),
  constraint work_order_check_ins_lat_range check (
    latitude is null or (latitude >= -90 and latitude <= 90)
  ),
  constraint work_order_check_ins_lon_range check (
    longitude is null or (longitude >= -180 and longitude <= 180)
  ),
  constraint work_order_check_ins_accuracy_positive check (
    accuracy_metres is null or accuracy_metres >= 0
  )
);

comment on table app.work_order_check_ins is
  'Check-ins when a technician arrives on site for a work order. Optional GPS (latitude, longitude, accuracy_metres) and note. Used for mobile field workflows and location audit.';
comment on column app.work_order_check_ins.user_id is
  'User who checked in (e.g. technician). Must be tenant member.';
comment on column app.work_order_check_ins.checked_in_at is
  'When the check-in occurred. Defaults to now; can be set for backdating.';
comment on column app.work_order_check_ins.latitude is
  'Optional GPS latitude when checked in (e.g. from device). -90 to 90.';
comment on column app.work_order_check_ins.longitude is
  'Optional GPS longitude when checked in. -180 to 180.';
comment on column app.work_order_check_ins.accuracy_metres is
  'Optional position accuracy in metres from device.';
comment on column app.work_order_check_ins.note is
  'Optional note at check-in (e.g. "Arrived at gate").';

create index work_order_check_ins_work_order_idx on app.work_order_check_ins (work_order_id);
create index work_order_check_ins_tenant_work_order_idx on app.work_order_check_ins (tenant_id, work_order_id);
create index work_order_check_ins_tenant_user_idx on app.work_order_check_ins (tenant_id, user_id);
create index work_order_check_ins_checked_in_at_idx on app.work_order_check_ins (checked_in_at desc);
create index work_order_check_ins_tenant_updated_idx on app.work_order_check_ins (tenant_id, created_at desc);

alter table app.work_order_check_ins enable row level security;

create policy work_order_check_ins_select_tenant on app.work_order_check_ins for select to authenticated
  using (authz.is_current_user_tenant_member(tenant_id));
create policy work_order_check_ins_select_anon on app.work_order_check_ins for select to anon
  using (authz.is_current_user_tenant_member(tenant_id));
create policy work_order_check_ins_insert_tenant on app.work_order_check_ins for insert to authenticated
  with check (authz.is_current_user_tenant_member(tenant_id));
create policy work_order_check_ins_insert_anon on app.work_order_check_ins for insert to anon
  with check (false);
create policy work_order_check_ins_update_tenant on app.work_order_check_ins for update to authenticated
  using (authz.is_current_user_tenant_member(tenant_id))
  with check (authz.is_current_user_tenant_member(tenant_id));
create policy work_order_check_ins_update_anon on app.work_order_check_ins for update to anon
  using (false) with check (false);
create policy work_order_check_ins_delete_tenant on app.work_order_check_ins for delete to authenticated
  using (authz.is_current_user_tenant_member(tenant_id));
create policy work_order_check_ins_delete_anon on app.work_order_check_ins for delete to anon
  using (false);

comment on policy work_order_check_ins_select_tenant on app.work_order_check_ins is
  'Authenticated users can view check-ins in tenants they are members of.';
comment on policy work_order_check_ins_insert_tenant on app.work_order_check_ins is
  'Authenticated users can create check-ins in their tenants (e.g. mobile start job).';
comment on policy work_order_check_ins_update_tenant on app.work_order_check_ins is
  'Authenticated users can update check-ins in their tenants.';
comment on policy work_order_check_ins_delete_tenant on app.work_order_check_ins is
  'Authenticated users can delete check-ins in their tenants.';

grant select on app.work_order_check_ins to authenticated, anon;
grant insert, update, delete on app.work_order_check_ins to authenticated;
alter table app.work_order_check_ins force row level security;

-- ============================================================================
-- 2. app.work_order_time_entries: optional GPS columns
-- ============================================================================

alter table app.work_order_time_entries
  add column latitude numeric,
  add column longitude numeric,
  add column accuracy_metres numeric;

comment on column app.work_order_time_entries.latitude is
  'Optional GPS latitude when entry was logged (e.g. from device). -90 to 90.';
comment on column app.work_order_time_entries.longitude is
  'Optional GPS longitude when entry was logged. -180 to 180.';
comment on column app.work_order_time_entries.accuracy_metres is
  'Optional position accuracy in metres from device.';

alter table app.work_order_time_entries
  add constraint work_order_time_entries_lat_range check (
    latitude is null or (latitude >= -90 and latitude <= 90)
  ),
  add constraint work_order_time_entries_lon_range check (
    longitude is null or (longitude >= -180 and longitude <= 180)
  ),
  add constraint work_order_time_entries_accuracy_positive check (
    accuracy_metres is null or accuracy_metres >= 0
  );

-- ============================================================================
-- 3. app.work_orders: optional completed-at GPS
-- ============================================================================

alter table app.work_orders
  add column completed_at_latitude numeric,
  add column completed_at_longitude numeric;

comment on column app.work_orders.completed_at_latitude is
  'Optional GPS latitude when work order was completed (e.g. at site). -90 to 90.';
comment on column app.work_orders.completed_at_longitude is
  'Optional GPS longitude when work order was completed. -180 to 180.';

alter table app.work_orders
  add constraint work_orders_completed_at_lat_range check (
    completed_at_latitude is null or (completed_at_latitude >= -90 and completed_at_latitude <= 90)
  ),
  add constraint work_orders_completed_at_lon_range check (
    completed_at_longitude is null or (completed_at_longitude >= -180 and completed_at_longitude <= 180)
  );
