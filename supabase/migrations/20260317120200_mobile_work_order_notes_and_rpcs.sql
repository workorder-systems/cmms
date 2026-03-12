-- SPDX-License-Identifier: AGPL-3.0-or-later
--
-- Mobile-first: work order notes table and RPCs for start/stop job, add note, register attachment.
--
-- Purpose: Add app.work_order_notes for technician notes; RPCs rpc_start_work_order,
--   rpc_stop_work_order, rpc_add_work_order_note, rpc_register_work_order_attachment.
--   Extend rpc_log_work_order_time with optional GPS. All RPCs use existing authz and rate limits.
--
-- Affected: app.work_order_notes (new), public.rpc_log_work_order_time (extend),
--   public.rpc_start_work_order (new), public.rpc_stop_work_order (new),
--   public.rpc_add_work_order_note (new), public.rpc_register_work_order_attachment (new).

-- ============================================================================
-- 1. app.work_order_notes
-- ============================================================================

create table app.work_order_notes (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  work_order_id uuid not null references app.work_orders(id) on delete cascade,
  body text not null,
  created_by uuid not null references auth.users(id) on delete set null,
  created_at timestamptz not null default pg_catalog.now(),
  latitude numeric,
  longitude numeric,
  constraint work_order_notes_body_length_check check (
    length(body) >= 1 and length(body) <= 10000
  ),
  constraint work_order_notes_lat_range check (
    latitude is null or (latitude >= -90 and latitude <= 90)
  ),
  constraint work_order_notes_lon_range check (
    longitude is null or (longitude >= -180 and longitude <= 180)
  )
);

comment on table app.work_order_notes is
  'Notes or comments on work orders (e.g. from technicians in the field). Optional GPS when note was taken.';
comment on column app.work_order_notes.body is
  'Note content. 1-10000 characters.';
comment on column app.work_order_notes.latitude is
  'Optional GPS latitude when note was created (e.g. from device).';
comment on column app.work_order_notes.longitude is
  'Optional GPS longitude when note was created.';

create index work_order_notes_work_order_idx on app.work_order_notes (work_order_id);
create index work_order_notes_tenant_work_order_idx on app.work_order_notes (tenant_id, work_order_id);
create index work_order_notes_created_at_idx on app.work_order_notes (created_at desc);

alter table app.work_order_notes enable row level security;

create policy work_order_notes_select_tenant on app.work_order_notes for select to authenticated
  using (authz.is_current_user_tenant_member(tenant_id));
create policy work_order_notes_select_anon on app.work_order_notes for select to anon
  using (authz.is_current_user_tenant_member(tenant_id));
create policy work_order_notes_insert_tenant on app.work_order_notes for insert to authenticated
  with check (authz.is_current_user_tenant_member(tenant_id));
create policy work_order_notes_insert_anon on app.work_order_notes for insert to anon
  with check (false);
create policy work_order_notes_update_tenant on app.work_order_notes for update to authenticated
  using (authz.is_current_user_tenant_member(tenant_id))
  with check (authz.is_current_user_tenant_member(tenant_id));
create policy work_order_notes_update_anon on app.work_order_notes for update to anon
  using (false) with check (false);
create policy work_order_notes_delete_tenant on app.work_order_notes for delete to authenticated
  using (authz.is_current_user_tenant_member(tenant_id));
create policy work_order_notes_delete_anon on app.work_order_notes for delete to anon
  using (false);

comment on policy work_order_notes_select_tenant on app.work_order_notes is
  'Authenticated users can view notes in tenants they are members of.';
comment on policy work_order_notes_insert_tenant on app.work_order_notes is
  'Authenticated users can create notes in their tenants (assigned or workorder.edit).';

grant select on app.work_order_notes to authenticated, anon;
grant insert, update, delete on app.work_order_notes to authenticated;
alter table app.work_order_notes force row level security;

-- ============================================================================
-- 2. Extend rpc_log_work_order_time with optional GPS
-- ============================================================================

drop function if exists public.rpc_log_work_order_time(uuid, uuid, integer, date, uuid, text);

create or replace function public.rpc_log_work_order_time(
  p_tenant_id uuid,
  p_work_order_id uuid,
  p_minutes integer,
  p_entry_date date default null,
  p_user_id uuid default null,
  p_description text default null,
  p_latitude numeric default null,
  p_longitude numeric default null,
  p_accuracy_metres numeric default null
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

  select tenant_id into v_work_order_tenant_id
  from app.work_orders
  where id = p_work_order_id;

  if not found or v_work_order_tenant_id != p_tenant_id then
    raise exception using
      message = format('Work order %s not found or does not belong to tenant', p_work_order_id),
      errcode = 'P0001';
  end if;

  v_target_user_id := coalesce(p_user_id, v_user_id);

  if not authz.is_tenant_member(v_target_user_id, p_tenant_id) then
    raise exception using
      message = format('User %s is not a member of tenant %s', v_target_user_id, p_tenant_id),
      errcode = '23503';
  end if;

  if v_target_user_id != v_user_id then
    perform authz.validate_permission(v_user_id, p_tenant_id, 'workorder.edit');
  end if;

  insert into app.work_order_time_entries (
    tenant_id,
    work_order_id,
    user_id,
    entry_date,
    minutes,
    description,
    created_by,
    latitude,
    longitude,
    accuracy_metres
  )
  values (
    p_tenant_id,
    p_work_order_id,
    v_target_user_id,
    coalesce(p_entry_date, current_date),
    p_minutes,
    p_description,
    v_user_id,
    p_latitude,
    p_longitude,
    p_accuracy_metres
  )
  returning id into v_time_entry_id;

  return v_time_entry_id;
end;
$$;

comment on function public.rpc_log_work_order_time(uuid, uuid, integer, date, uuid, text, numeric, numeric, numeric) is
  'Logs time spent on a work order. Optional GPS (latitude, longitude, accuracy_metres) from device. Returns the UUID of the created time entry. Rate limited.';

revoke all on function public.rpc_log_work_order_time(uuid, uuid, integer, date, uuid, text, numeric, numeric, numeric) from public;
grant execute on function public.rpc_log_work_order_time(uuid, uuid, integer, date, uuid, text, numeric, numeric, numeric) to authenticated;

-- ============================================================================
-- 3. rpc_add_work_order_note
-- ============================================================================

create or replace function public.rpc_add_work_order_note(
  p_tenant_id uuid,
  p_work_order_id uuid,
  p_body text,
  p_latitude numeric default null,
  p_longitude numeric default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_note_id uuid;
  v_work_order_tenant_id uuid;
  v_work_order_assigned_to uuid;
begin
  perform util.check_rate_limit('work_order_note_create', null, 60, 1, auth.uid(), p_tenant_id);

  v_user_id := authz.rpc_setup(p_tenant_id);

  select tenant_id, assigned_to into v_work_order_tenant_id, v_work_order_assigned_to
  from app.work_orders
  where id = p_work_order_id;

  if not found or v_work_order_tenant_id != p_tenant_id then
    raise exception using
      message = format('Work order %s not found or does not belong to tenant', p_work_order_id),
      errcode = 'P0001';
  end if;

  if v_work_order_assigned_to is distinct from v_user_id then
    perform authz.validate_permission(v_user_id, p_tenant_id, 'workorder.edit');
  end if;

  insert into app.work_order_notes (tenant_id, work_order_id, body, created_by, latitude, longitude)
  values (p_tenant_id, p_work_order_id, p_body, v_user_id, p_latitude, p_longitude)
  returning id into v_note_id;

  return v_note_id;
end;
$$;

comment on function public.rpc_add_work_order_note(uuid, uuid, text, numeric, numeric) is
  'Adds a note to a work order. Requires tenant membership; if not assigned to work order, requires workorder.edit. Optional GPS. Rate limited to 60 per minute. Returns note id.';

revoke all on function public.rpc_add_work_order_note(uuid, uuid, text, numeric, numeric) from public;
grant execute on function public.rpc_add_work_order_note(uuid, uuid, text, numeric, numeric) to authenticated;

-- ============================================================================
-- 4. rpc_start_work_order
-- ============================================================================

create or replace function public.rpc_start_work_order(
  p_tenant_id uuid,
  p_work_order_id uuid,
  p_latitude numeric default null,
  p_longitude numeric default null,
  p_accuracy_metres numeric default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_check_in_id uuid;
  v_work_order_tenant_id uuid;
  v_work_order_assigned_to uuid;
begin
  v_user_id := authz.rpc_setup(p_tenant_id);

  select tenant_id, assigned_to into v_work_order_tenant_id, v_work_order_assigned_to
  from app.work_orders
  where id = p_work_order_id;

  if not found or v_work_order_tenant_id != p_tenant_id then
    raise exception using
      message = format('Work order %s not found or does not belong to tenant', p_work_order_id),
      errcode = 'P0001';
  end if;

  if v_work_order_assigned_to is distinct from v_user_id then
    perform authz.validate_permission(v_user_id, p_tenant_id, 'workorder.edit');
  end if;

  perform public.rpc_transition_work_order_status(p_tenant_id, p_work_order_id, 'in_progress');

  insert into app.work_order_check_ins (tenant_id, work_order_id, user_id, latitude, longitude, accuracy_metres)
  values (p_tenant_id, p_work_order_id, v_user_id, p_latitude, p_longitude, p_accuracy_metres)
  returning id into v_check_in_id;

  return v_check_in_id;
end;
$$;

comment on function public.rpc_start_work_order(uuid, uuid, numeric, numeric, numeric) is
  'Starts a work order: transitions to in_progress and creates a check-in record. Optional GPS. Requires assigned or workorder.edit. Returns check-in id.';

revoke all on function public.rpc_start_work_order(uuid, uuid, numeric, numeric, numeric) from public;
grant execute on function public.rpc_start_work_order(uuid, uuid, numeric, numeric, numeric) to authenticated;

-- ============================================================================
-- 5. rpc_stop_work_order
-- ============================================================================

create or replace function public.rpc_stop_work_order(
  p_tenant_id uuid,
  p_work_order_id uuid,
  p_complete boolean default true,
  p_minutes integer default null,
  p_note text default null,
  p_latitude numeric default null,
  p_longitude numeric default null,
  p_accuracy_metres numeric default null,
  p_cause text default null,
  p_resolution text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_work_order_tenant_id uuid;
  v_work_order_assigned_to uuid;
begin
  v_user_id := authz.rpc_setup(p_tenant_id);

  select tenant_id, assigned_to into v_work_order_tenant_id, v_work_order_assigned_to
  from app.work_orders
  where id = p_work_order_id;

  if not found or v_work_order_tenant_id != p_tenant_id then
    raise exception using
      message = format('Work order %s not found or does not belong to tenant', p_work_order_id),
      errcode = 'P0001';
  end if;

  if v_work_order_assigned_to is distinct from v_user_id then
    perform authz.validate_permission(v_user_id, p_tenant_id, 'workorder.edit');
  end if;

  if p_minutes is not null then
    perform public.rpc_log_work_order_time(
      p_tenant_id,
      p_work_order_id,
      p_minutes,
      current_date,
      v_user_id,
      null,
      p_latitude,
      p_longitude,
      p_accuracy_metres
    );
  end if;

  if p_note is not null and length(trim(p_note)) > 0 then
    perform public.rpc_add_work_order_note(p_tenant_id, p_work_order_id, trim(p_note), p_latitude, p_longitude);
  end if;

  if p_complete then
    perform public.rpc_complete_work_order(p_tenant_id, p_work_order_id, p_cause, p_resolution);
    if p_latitude is not null or p_longitude is not null then
      update app.work_orders
      set
        completed_at_latitude = coalesce(p_latitude, completed_at_latitude),
        completed_at_longitude = coalesce(p_longitude, completed_at_longitude)
      where id = p_work_order_id and tenant_id = p_tenant_id;
    end if;
  end if;
end;
$$;

comment on function public.rpc_stop_work_order(uuid, uuid, boolean, integer, text, numeric, numeric, numeric, text, text) is
  'Stops work on a work order: optionally logs time (with GPS), adds a note, and/or completes the work order with optional cause/resolution and completed-at GPS. Requires assigned or workorder.edit.';

revoke all on function public.rpc_stop_work_order(uuid, uuid, boolean, integer, text, numeric, numeric, numeric, text, text) from public;
grant execute on function public.rpc_stop_work_order(uuid, uuid, boolean, integer, text, numeric, numeric, numeric, text, text) to authenticated;

-- ============================================================================
-- 6. rpc_register_work_order_attachment
-- ============================================================================

create or replace function public.rpc_register_work_order_attachment(
  p_tenant_id uuid,
  p_work_order_id uuid,
  p_file_id uuid,
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
  v_file_tenant_id uuid;
begin
  perform util.check_rate_limit('attachment_create', null, 20, 1, auth.uid(), p_tenant_id);

  v_user_id := authz.rpc_setup(p_tenant_id);

  select tenant_id, assigned_to into v_work_order_tenant_id, v_work_order_assigned_to
  from app.work_orders
  where id = p_work_order_id;

  if not found or v_work_order_tenant_id != p_tenant_id then
    raise exception using
      message = format('Work order %s not found or does not belong to tenant', p_work_order_id),
      errcode = 'P0001';
  end if;

  select tenant_id into v_file_tenant_id
  from app.files
  where id = p_file_id;

  if not found or v_file_tenant_id != p_tenant_id then
    raise exception using
      message = format('File %s not found or does not belong to tenant', p_file_id),
      errcode = 'P0001';
  end if;

  if v_work_order_assigned_to is distinct from v_user_id then
    perform authz.validate_permission(v_user_id, p_tenant_id, 'workorder.edit');
  end if;

  insert into app.work_order_attachments (tenant_id, work_order_id, file_id, label, kind, created_by)
  values (p_tenant_id, p_work_order_id, p_file_id, p_label, p_kind, v_user_id)
  returning id into v_attachment_id;

  return v_attachment_id;
end;
$$;

comment on function public.rpc_register_work_order_attachment(uuid, uuid, uuid, text, text) is
  'Registers an existing file (e.g. uploaded to Storage first) as a work order attachment. Validates file and work order belong to tenant. Requires assigned or workorder.edit. Rate limited to 20 per minute. Returns attachment id.';

revoke all on function public.rpc_register_work_order_attachment(uuid, uuid, uuid, text, text) from public;
grant execute on function public.rpc_register_work_order_attachment(uuid, uuid, uuid, text, text) to authenticated;
