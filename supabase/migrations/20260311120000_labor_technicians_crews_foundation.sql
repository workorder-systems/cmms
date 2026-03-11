-- SPDX-License-Identifier: AGPL-3.0-or-later
--
-- Labor, Technicians, and Crews – Database Foundation
--
-- Purpose
-- -------
-- Multi-tenant-safe schema for technicians, crews, skills, certifications,
-- availability, shifts, work order assignments, and labor actuals (time/cost).
-- Supports shift and on-call scheduling with conflict detection and capacity views.
--
-- Affected / new objects
-- ----------------------
-- New tables: app.crews, app.technicians, app.crew_members, cfg.skill_catalogs,
-- cfg.certification_catalogs, app.technician_skills, app.technician_certifications,
-- app.availability_patterns, app.availability_overrides, app.shifts,
-- app.shift_templates, app.work_order_assignments.
-- Altered: app.work_order_time_entries (technician_id, hourly_rate_cents, labor_cost_cents).
-- Views: v_work_order_labor_actuals, v_technician_capacity (or RPC).
-- RPCs: rpc_check_shift_conflicts, rpc_generate_shifts_from_templates.
--
-- RLS: All new tables have tenant_id and granular RLS (one policy per role per operation).
-- Anon: using (false) / with check (false) for writes and select where appropriate.

-- ============================================================================
-- 1. Crews (created before technicians so technicians can reference default_crew_id)
-- ============================================================================

create table app.crews (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint crews_name_length_check check (
    length(name) >= 1
    and length(name) <= 255
  ),
  constraint crews_description_length_check check (
    description is null
    or (length(description) >= 1 and length(description) <= 2000)
  )
);

comment on table app.crews is 'Crews or teams within a tenant. Used to group technicians for scheduling and capacity. Lead is set via lead_technician_id after technicians exist.';
comment on column app.crews.tenant_id is 'Tenant that owns this crew.';
comment on column app.crews.name is 'Display name of the crew (e.g. "Day Shift A", "HVAC Team").';
comment on column app.crews.description is 'Optional longer description of the crew.';

create index crews_tenant_idx on app.crews (tenant_id);

create trigger crews_set_updated_at
  before update on app.crews
  for each row
  execute function util.set_updated_at();

alter table app.crews enable row level security;

-- ============================================================================
-- 2. Technicians
-- ============================================================================

create table app.technicians (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  employee_number text,
  default_crew_id uuid references app.crews(id) on delete set null,
  department_id uuid references app.departments(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint technicians_user_tenant_unique unique (tenant_id, user_id),
  constraint technicians_employee_number_length_check check (
    employee_number is null
    or (length(employee_number) >= 1 and length(employee_number) <= 50)
  )
);

comment on table app.technicians is 'Technicians are tenant members with labor-specific attributes. One record per user per tenant. Links to app.profiles via user_id + tenant_id for display.';
comment on column app.technicians.user_id is 'References auth.users(id). Same user may have a profile in this tenant.';
comment on column app.technicians.employee_number is 'Optional internal employee or badge number.';
comment on column app.technicians.default_crew_id is 'Optional default crew for scheduling.';
comment on column app.technicians.department_id is 'Optional department (e.g. Maintenance, Facilities).';
comment on column app.technicians.is_active is 'When false, technician is not considered for scheduling or assignment.';

create index technicians_tenant_idx on app.technicians (tenant_id);
create index technicians_user_tenant_idx on app.technicians (user_id, tenant_id);
create index technicians_default_crew_idx on app.technicians (default_crew_id) where default_crew_id is not null;
create index technicians_department_idx on app.technicians (department_id) where department_id is not null;
create index technicians_is_active_idx on app.technicians (tenant_id, is_active) where is_active = true;

create trigger technicians_set_updated_at
  before update on app.technicians
  for each row
  execute function util.set_updated_at();

alter table app.technicians enable row level security;

-- Add lead_technician_id to crews (after technicians exist)
alter table app.crews
  add column lead_technician_id uuid references app.technicians(id) on delete set null;

comment on column app.crews.lead_technician_id is 'Optional lead technician for this crew.';

create index crews_lead_technician_idx on app.crews (lead_technician_id) where lead_technician_id is not null;

-- ============================================================================
-- 3. Crew members
-- ============================================================================

create table app.crew_members (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  crew_id uuid not null references app.crews(id) on delete cascade,
  technician_id uuid not null references app.technicians(id) on delete cascade,
  role text,
  joined_at timestamptz not null default pg_catalog.now(),
  left_at timestamptz,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint crew_members_crew_technician_unique unique (crew_id, technician_id),
  constraint crew_members_role_length_check check (
    role is null
    or (length(role) >= 1 and length(role) <= 50)
  )
);

comment on table app.crew_members is 'Membership of technicians in crews. left_at null means current member. One active membership per technician per crew.';
comment on column app.crew_members.role is 'Optional role (e.g. lead, member).';
comment on column app.crew_members.left_at is 'When set, membership has ended; used for history.';

create index crew_members_tenant_crew_idx on app.crew_members (tenant_id, crew_id);
create index crew_members_tenant_technician_idx on app.crew_members (tenant_id, technician_id);
create unique index crew_members_current_crew_technician_idx on app.crew_members (crew_id, technician_id)
  where left_at is null;

create trigger crew_members_set_updated_at
  before update on app.crew_members
  for each row
  execute function util.set_updated_at();

alter table app.crew_members enable row level security;

-- ============================================================================
-- 4. Skill and certification catalogs (cfg)
-- ============================================================================

create table cfg.skill_catalogs (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  name text not null,
  code text,
  category text,
  display_order integer not null default 0,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint skill_catalogs_tenant_code_unique unique (tenant_id, code),
  constraint skill_catalogs_name_length_check check (
    length(name) >= 1 and length(name) <= 255
  ),
  constraint skill_catalogs_code_format_check check (
    code is null
    or (length(code) >= 1 and length(code) <= 50 and code ~ '^[a-z0-9_]+$')
  ),
  constraint skill_catalogs_display_order_check check (display_order >= 0)
);

comment on table cfg.skill_catalogs is 'Tenant-scoped catalog of skills (e.g. HVAC, electrical). Used to tag technicians and match work.';
comment on column cfg.skill_catalogs.code is 'Optional machine-readable key. Unique per tenant.';
comment on column cfg.skill_catalogs.category is 'Optional category for grouping (e.g. trade, safety).';
comment on column cfg.skill_catalogs.display_order is 'Order for UI display.';

create index skill_catalogs_tenant_idx on cfg.skill_catalogs (tenant_id);
create unique index skill_catalogs_tenant_code_idx on cfg.skill_catalogs (tenant_id, code) where code is not null;

create trigger skill_catalogs_set_updated_at
  before update on cfg.skill_catalogs
  for each row
  execute function util.set_updated_at();

alter table cfg.skill_catalogs enable row level security;

create table cfg.certification_catalogs (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  name text not null,
  code text,
  expiry_required boolean not null default true,
  validity_days integer,
  display_order integer not null default 0,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint certification_catalogs_tenant_code_unique unique (tenant_id, code),
  constraint certification_catalogs_name_length_check check (
    length(name) >= 1 and length(name) <= 255
  ),
  constraint certification_catalogs_code_format_check check (
    code is null
    or (length(code) >= 1 and length(code) <= 50 and code ~ '^[a-z0-9_]+$')
  ),
  constraint certification_catalogs_validity_days_check check (
    validity_days is null or validity_days > 0
  ),
  constraint certification_catalogs_display_order_check check (display_order >= 0)
);

comment on table cfg.certification_catalogs is 'Tenant-scoped catalog of certifications (e.g. OSHA, EPA). validity_days can drive default expiry from issued_at.';
comment on column cfg.certification_catalogs.expiry_required is 'If true, technician_certifications should have expires_at set.';
comment on column cfg.certification_catalogs.validity_days is 'Default validity in days from issued_at when expiry_required is true.';

create index certification_catalogs_tenant_idx on cfg.certification_catalogs (tenant_id);
create unique index certification_catalogs_tenant_code_idx on cfg.certification_catalogs (tenant_id, code) where code is not null;

create trigger certification_catalogs_set_updated_at
  before update on cfg.certification_catalogs
  for each row
  execute function util.set_updated_at();

alter table cfg.certification_catalogs enable row level security;

-- ============================================================================
-- 5. Technician skills and certifications
-- ============================================================================

create table app.technician_skills (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  technician_id uuid not null references app.technicians(id) on delete cascade,
  skill_id uuid not null references cfg.skill_catalogs(id) on delete cascade,
  proficiency text,
  created_at timestamptz not null default pg_catalog.now(),
  constraint technician_skills_technician_skill_unique unique (technician_id, skill_id),
  constraint technician_skills_proficiency_length_check check (
    proficiency is null
    or (length(proficiency) >= 1 and length(proficiency) <= 50)
  )
);

comment on table app.technician_skills is 'Skills assigned to technicians. One row per technician per skill; proficiency is optional.';
comment on column app.technician_skills.proficiency is 'Optional level (e.g. beginner, expert).';

create index technician_skills_tenant_technician_idx on app.technician_skills (tenant_id, technician_id);
create index technician_skills_skill_idx on app.technician_skills (skill_id);

alter table app.technician_skills enable row level security;

create table app.technician_certifications (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  technician_id uuid not null references app.technicians(id) on delete cascade,
  certification_id uuid not null references cfg.certification_catalogs(id) on delete cascade,
  issued_at date not null,
  expires_at date,
  issued_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now()
);

comment on table app.technician_certifications is 'Certifications held by technicians. expires_at required when certification catalog has expiry_required.';
comment on column app.technician_certifications.issued_by is 'User who recorded or issued the certification.';

create index technician_certifications_tenant_technician_idx on app.technician_certifications (tenant_id, technician_id);
create index technician_certifications_certification_idx on app.technician_certifications (certification_id);
create index technician_certifications_tenant_expires_idx on app.technician_certifications (tenant_id, expires_at)
  where expires_at is not null;

create trigger technician_certifications_set_updated_at
  before update on app.technician_certifications
  for each row
  execute function util.set_updated_at();

alter table app.technician_certifications enable row level security;

-- ============================================================================
-- 6. Availability patterns and overrides
-- ============================================================================

create table app.availability_patterns (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  technician_id uuid not null references app.technicians(id) on delete cascade,
  day_of_week smallint not null,
  start_time time not null,
  end_time time not null,
  timezone text,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint availability_patterns_day_of_week_check check (day_of_week >= 0 and day_of_week <= 6),
  constraint availability_patterns_end_after_start check (end_time > start_time)
);

comment on table app.availability_patterns is 'Recurring weekly availability per technician. day_of_week 0=Sunday, 6=Saturday (extract(dow)).';
comment on column app.availability_patterns.timezone is 'Optional IANA timezone for start_time/end_time interpretation.';

create index availability_patterns_tenant_technician_idx on app.availability_patterns (tenant_id, technician_id);

create trigger availability_patterns_set_updated_at
  before update on app.availability_patterns
  for each row
  execute function util.set_updated_at();

alter table app.availability_patterns enable row level security;

create table app.availability_overrides (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  technician_id uuid not null references app.technicians(id) on delete cascade,
  override_date date not null,
  is_available boolean not null,
  start_time time,
  end_time time,
  reason text,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint availability_overrides_technician_date_unique unique (technician_id, override_date),
  constraint availability_overrides_reason_length_check check (
    reason is null or (length(reason) >= 1 and length(reason) <= 500)
  )
);

comment on table app.availability_overrides is 'Date-specific overrides to availability (e.g. PTO, extra day). Overrides recurring patterns for that date.';
comment on column app.availability_overrides.is_available is 'True = available (or partial via start_time/end_time), false = unavailable.';

create index availability_overrides_tenant_technician_idx on app.availability_overrides (tenant_id, technician_id);
create index availability_overrides_date_idx on app.availability_overrides (override_date);

create trigger availability_overrides_set_updated_at
  before update on app.availability_overrides
  for each row
  execute function util.set_updated_at();

alter table app.availability_overrides enable row level security;

-- ============================================================================
-- 7. Shifts and shift templates
-- ============================================================================

create table app.shifts (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  technician_id uuid references app.technicians(id) on delete cascade,
  crew_id uuid references app.crews(id) on delete set null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  shift_type text not null default 'scheduled',
  label text,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint shifts_end_after_start check (end_at > start_at),
  constraint shifts_shift_type_format_check check (
    shift_type ~ '^[a-z0-9_]+$' and length(shift_type) >= 1 and length(shift_type) <= 50
  ),
  constraint shifts_label_length_check check (
    label is null or (length(label) >= 1 and length(label) <= 255)
  )
);

comment on table app.shifts is 'Scheduled shifts and on-call slots. technician_id is primary; crew_id optional for grouping.';
comment on column app.shifts.shift_type is 'E.g. scheduled, on_call.';
comment on column app.shifts.label is 'Optional label (e.g. "Day shift", "Weekend on-call").';

create index shifts_tenant_technician_idx on app.shifts (tenant_id, technician_id);
create index shifts_tenant_start_end_idx on app.shifts (tenant_id, start_at, end_at);
create index shifts_technician_start_idx on app.shifts (technician_id, start_at) where technician_id is not null;
create index shifts_crew_idx on app.shifts (crew_id) where crew_id is not null;

create trigger shifts_set_updated_at
  before update on app.shifts
  for each row
  execute function util.set_updated_at();

alter table app.shifts enable row level security;

create table app.shift_templates (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  crew_id uuid references app.crews(id) on delete cascade,
  technician_id uuid references app.technicians(id) on delete cascade,
  day_of_week smallint not null,
  start_time time not null,
  end_time time not null,
  shift_type text not null default 'scheduled',
  label text,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint shift_templates_day_of_week_check check (day_of_week >= 0 and day_of_week <= 6),
  constraint shift_templates_end_after_start check (end_time > start_time),
  constraint shift_templates_shift_type_format_check check (
    shift_type ~ '^[a-z0-9_]+$' and length(shift_type) >= 1 and length(shift_type) <= 50
  ),
  constraint shift_templates_label_length_check check (
    label is null or (length(label) >= 1 and length(label) <= 255)
  ),
  constraint shift_templates_crew_or_technician check (
    (crew_id is not null and technician_id is null) or (crew_id is null and technician_id is not null)
  )
);

comment on table app.shift_templates is 'Recurring shift patterns. Either crew_id or technician_id must be set. Used by rpc_generate_shifts_from_templates.';

create index shift_templates_tenant_idx on app.shift_templates (tenant_id);
create index shift_templates_crew_idx on app.shift_templates (crew_id) where crew_id is not null;
create index shift_templates_technician_idx on app.shift_templates (technician_id) where technician_id is not null;

create trigger shift_templates_set_updated_at
  before update on app.shift_templates
  for each row
  execute function util.set_updated_at();

alter table app.shift_templates enable row level security;

-- ============================================================================
-- 8. Work order assignments (multiple assignees per work order)
-- ============================================================================

create table app.work_order_assignments (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  work_order_id uuid not null references app.work_orders(id) on delete cascade,
  technician_id uuid not null references app.technicians(id) on delete cascade,
  assigned_at timestamptz not null default pg_catalog.now(),
  created_at timestamptz not null default pg_catalog.now(),
  constraint work_order_assignments_work_order_technician_unique unique (work_order_id, technician_id)
);

comment on table app.work_order_assignments is 'Technicians assigned to work orders. Complements work_orders.assigned_to (single primary). Enables multiple assignees and capacity views.';

create index work_order_assignments_tenant_work_order_idx on app.work_order_assignments (tenant_id, work_order_id);
create index work_order_assignments_tenant_technician_idx on app.work_order_assignments (tenant_id, technician_id);
create index work_order_assignments_work_order_idx on app.work_order_assignments (work_order_id);

alter table app.work_order_assignments enable row level security;

-- ============================================================================
-- 9. Extend work_order_time_entries for labor actuals (cost, technician link)
-- ============================================================================

alter table app.work_order_time_entries
  add column technician_id uuid references app.technicians(id) on delete set null,
  add column hourly_rate_cents integer,
  add column labor_cost_cents integer;

comment on column app.work_order_time_entries.technician_id is 'Links to labor resource for cost and utilization reporting. When set, should match user_id where a technician exists.';
comment on column app.work_order_time_entries.hourly_rate_cents is 'Optional rate at time of entry for cost calculation.';
comment on column app.work_order_time_entries.labor_cost_cents is 'Optional stored labor cost (e.g. rate * duration).';

alter table app.work_order_time_entries
  add constraint work_order_time_entries_rate_cost_check check (
    (hourly_rate_cents is null or (hourly_rate_cents >= 0 and hourly_rate_cents <= 10000000))
    and (labor_cost_cents is null or (labor_cost_cents >= 0 and labor_cost_cents <= 10000000))
  );

create index work_order_time_entries_technician_idx on app.work_order_time_entries (technician_id)
  where technician_id is not null;

-- ============================================================================
-- 10. Views: labor actuals per work order
-- ============================================================================

create or replace view app.v_work_order_labor_actuals
with (security_invoker = true)
as
select
  te.tenant_id,
  te.work_order_id,
  te.technician_id,
  te.user_id,
  count(*) as entry_count,
  sum(te.minutes) as total_minutes,
  sum(te.labor_cost_cents) as total_labor_cost_cents,
  min(te.entry_date) as first_entry_date,
  max(te.entry_date) as last_entry_date
from
  app.work_order_time_entries te
group by
  te.tenant_id,
  te.work_order_id,
  te.technician_id,
  te.user_id;

comment on view app.v_work_order_labor_actuals is 'Aggregated labor actuals per work order and technician/user. For cost and utilization reporting.';

-- ============================================================================
-- 11. RPC: Check shift conflicts for a technician
-- ============================================================================

create or replace function public.rpc_check_shift_conflicts(
  p_technician_id uuid,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_exclude_shift_id uuid default null
)
returns table (
  id uuid,
  start_at timestamptz,
  end_at timestamptz,
  shift_type text,
  label text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_end_at <= p_start_at then
    return;
  end if;
  return query
  select
    s.id,
    s.start_at,
    s.end_at,
    s.shift_type,
    s.label
  from
    app.shifts s
  where
    s.technician_id = p_technician_id
    and (p_exclude_shift_id is null or s.id <> p_exclude_shift_id)
    and tstzrange(s.start_at, s.end_at) && tstzrange(p_start_at, p_end_at);
end;
$$;

comment on function public.rpc_check_shift_conflicts(uuid, timestamptz, timestamptz, uuid) is
  'Returns overlapping shifts for a technician in the given range. Use p_exclude_shift_id when updating a shift to avoid self-conflict.';

revoke all on function public.rpc_check_shift_conflicts(uuid, timestamptz, timestamptz, uuid) from public;
grant execute on function public.rpc_check_shift_conflicts(uuid, timestamptz, timestamptz, uuid) to authenticated;

-- ============================================================================
-- 12. RPC: Generate shifts from templates for a date range
-- ============================================================================

create or replace function public.rpc_generate_shifts_from_templates(
  p_tenant_id uuid,
  p_start_date date,
  p_end_date date
)
returns table (
  id uuid,
  technician_id uuid,
  crew_id uuid,
  start_at timestamptz,
  end_at timestamptz,
  shift_type text,
  label text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dow smallint;
  v_date date;
  v_start_ts timestamptz;
  v_end_ts timestamptz;
  v_technician_id uuid;
  v_crew_id uuid;
  v_shift_type text;
  v_label text;
  v_start_time time;
  v_end_time time;
  v_id uuid;
begin
  if not authz.is_current_user_tenant_member(p_tenant_id) then
    raise exception using message = 'Unauthorized: not a member of this tenant', errcode = '42501';
  end if;
  if p_end_date < p_start_date then
    raise exception using message = 'p_end_date must be >= p_start_date', errcode = '22000';
  end if;

  for v_date in select generate_series(p_start_date, p_end_date, '1 day'::interval)::date
  loop
    v_dow := extract(dow from v_date)::smallint;

    for v_technician_id, v_crew_id, v_shift_type, v_label, v_start_time, v_end_time in
      select
        st.technician_id,
        st.crew_id,
        st.shift_type,
        st.label,
        st.start_time,
        st.end_time
      from
        app.shift_templates st
      where
        st.tenant_id = p_tenant_id
        and st.day_of_week = v_dow
    loop
      v_start_ts := (v_date + v_start_time)::timestamptz;
      v_end_ts := (v_date + v_end_time)::timestamptz;
      if v_technician_id is not null then
        insert into app.shifts (tenant_id, technician_id, start_at, end_at, shift_type, label)
        values (p_tenant_id, v_technician_id, v_start_ts, v_end_ts, v_shift_type, v_label)
        returning app.shifts.id into v_id;
      else
        insert into app.shifts (tenant_id, crew_id, start_at, end_at, shift_type, label)
        values (p_tenant_id, v_crew_id, v_start_ts, v_end_ts, v_shift_type, v_label)
        returning app.shifts.id into v_id;
      end if;
      id := v_id;
      technician_id := v_technician_id;
      crew_id := v_crew_id;
      start_at := v_start_ts;
      end_at := v_end_ts;
      shift_type := v_shift_type;
      label := v_label;
      return next;
    end loop;
  end loop;
  return;
end;
$$;

comment on function public.rpc_generate_shifts_from_templates(uuid, date, date) is
  'Generates shift rows from shift_templates for the given tenant and date range. Returns the created shifts.';
revoke all on function public.rpc_generate_shifts_from_templates(uuid, date, date) from public;
grant execute on function public.rpc_generate_shifts_from_templates(uuid, date, date) to authenticated;

-- ============================================================================
-- 13. View: Technician capacity (scheduled minutes per technician per day)
-- ============================================================================

create or replace view app.v_technician_capacity
with (security_invoker = true)
as
select
  s.tenant_id,
  s.technician_id,
  (s.start_at at time zone 'utc')::date as shift_date,
  count(*) as shift_count,
  sum(extract(epoch from (s.end_at - s.start_at)) / 60)::bigint as scheduled_minutes
from
  app.shifts s
where
  s.technician_id is not null
group by
  s.tenant_id,
  s.technician_id,
  (s.start_at at time zone 'utc')::date;

comment on view app.v_technician_capacity is 'Scheduled shift capacity per technician per day (UTC date). For utilization comparison with logged time.';

-- ============================================================================
-- 14. RLS policies and grants (all new tables)
-- ============================================================================

-- app.crews
create policy crews_select_tenant on app.crews for select to authenticated using (authz.is_current_user_tenant_member(tenant_id));
create policy crews_insert_tenant on app.crews for insert to authenticated with check (authz.is_current_user_tenant_member(tenant_id));
create policy crews_update_tenant on app.crews for update to authenticated using (authz.is_current_user_tenant_member(tenant_id)) with check (authz.is_current_user_tenant_member(tenant_id));
create policy crews_delete_tenant on app.crews for delete to authenticated using (authz.is_current_user_tenant_member(tenant_id));
create policy crews_select_anon on app.crews for select to anon using (false);
create policy crews_insert_anon on app.crews for insert to anon with check (false);
create policy crews_update_anon on app.crews for update to anon using (false) with check (false);
create policy crews_delete_anon on app.crews for delete to anon using (false);

-- app.technicians
create policy technicians_select_tenant on app.technicians for select to authenticated using (authz.is_current_user_tenant_member(tenant_id));
create policy technicians_insert_tenant on app.technicians for insert to authenticated with check (authz.is_current_user_tenant_member(tenant_id));
create policy technicians_update_tenant on app.technicians for update to authenticated using (authz.is_current_user_tenant_member(tenant_id)) with check (authz.is_current_user_tenant_member(tenant_id));
create policy technicians_delete_tenant on app.technicians for delete to authenticated using (authz.is_current_user_tenant_member(tenant_id));
create policy technicians_select_anon on app.technicians for select to anon using (false);
create policy technicians_insert_anon on app.technicians for insert to anon with check (false);
create policy technicians_update_anon on app.technicians for update to anon using (false) with check (false);
create policy technicians_delete_anon on app.technicians for delete to anon using (false);

-- app.crew_members
create policy crew_members_select_tenant on app.crew_members for select to authenticated using (authz.is_current_user_tenant_member(tenant_id));
create policy crew_members_insert_tenant on app.crew_members for insert to authenticated with check (authz.is_current_user_tenant_member(tenant_id));
create policy crew_members_update_tenant on app.crew_members for update to authenticated using (authz.is_current_user_tenant_member(tenant_id)) with check (authz.is_current_user_tenant_member(tenant_id));
create policy crew_members_delete_tenant on app.crew_members for delete to authenticated using (authz.is_current_user_tenant_member(tenant_id));
create policy crew_members_select_anon on app.crew_members for select to anon using (false);
create policy crew_members_insert_anon on app.crew_members for insert to anon with check (false);
create policy crew_members_update_anon on app.crew_members for update to anon using (false) with check (false);
create policy crew_members_delete_anon on app.crew_members for delete to anon using (false);

-- cfg.skill_catalogs
create policy skill_catalogs_select_tenant on cfg.skill_catalogs for select to authenticated using (authz.is_current_user_tenant_member(tenant_id));
create policy skill_catalogs_insert_tenant on cfg.skill_catalogs for insert to authenticated with check (authz.is_current_user_tenant_member(tenant_id));
create policy skill_catalogs_update_tenant on cfg.skill_catalogs for update to authenticated using (authz.is_current_user_tenant_member(tenant_id)) with check (authz.is_current_user_tenant_member(tenant_id));
create policy skill_catalogs_delete_tenant on cfg.skill_catalogs for delete to authenticated using (authz.is_current_user_tenant_member(tenant_id));
create policy skill_catalogs_select_anon on cfg.skill_catalogs for select to anon using (false);
create policy skill_catalogs_insert_anon on cfg.skill_catalogs for insert to anon with check (false);
create policy skill_catalogs_update_anon on cfg.skill_catalogs for update to anon using (false) with check (false);
create policy skill_catalogs_delete_anon on cfg.skill_catalogs for delete to anon using (false);

-- cfg.certification_catalogs
create policy certification_catalogs_select_tenant on cfg.certification_catalogs for select to authenticated using (authz.is_current_user_tenant_member(tenant_id));
create policy certification_catalogs_insert_tenant on cfg.certification_catalogs for insert to authenticated with check (authz.is_current_user_tenant_member(tenant_id));
create policy certification_catalogs_update_tenant on cfg.certification_catalogs for update to authenticated using (authz.is_current_user_tenant_member(tenant_id)) with check (authz.is_current_user_tenant_member(tenant_id));
create policy certification_catalogs_delete_tenant on cfg.certification_catalogs for delete to authenticated using (authz.is_current_user_tenant_member(tenant_id));
create policy certification_catalogs_select_anon on cfg.certification_catalogs for select to anon using (false);
create policy certification_catalogs_insert_anon on cfg.certification_catalogs for insert to anon with check (false);
create policy certification_catalogs_update_anon on cfg.certification_catalogs for update to anon using (false) with check (false);
create policy certification_catalogs_delete_anon on cfg.certification_catalogs for delete to anon using (false);

-- app.technician_skills
create policy technician_skills_select_tenant on app.technician_skills for select to authenticated using (authz.is_current_user_tenant_member(tenant_id));
create policy technician_skills_insert_tenant on app.technician_skills for insert to authenticated with check (authz.is_current_user_tenant_member(tenant_id));
create policy technician_skills_update_tenant on app.technician_skills for update to authenticated using (authz.is_current_user_tenant_member(tenant_id)) with check (authz.is_current_user_tenant_member(tenant_id));
create policy technician_skills_delete_tenant on app.technician_skills for delete to authenticated using (authz.is_current_user_tenant_member(tenant_id));
create policy technician_skills_select_anon on app.technician_skills for select to anon using (false);
create policy technician_skills_insert_anon on app.technician_skills for insert to anon with check (false);
create policy technician_skills_update_anon on app.technician_skills for update to anon using (false) with check (false);
create policy technician_skills_delete_anon on app.technician_skills for delete to anon using (false);

-- app.technician_certifications
create policy technician_certifications_select_tenant on app.technician_certifications for select to authenticated using (authz.is_current_user_tenant_member(tenant_id));
create policy technician_certifications_insert_tenant on app.technician_certifications for insert to authenticated with check (authz.is_current_user_tenant_member(tenant_id));
create policy technician_certifications_update_tenant on app.technician_certifications for update to authenticated using (authz.is_current_user_tenant_member(tenant_id)) with check (authz.is_current_user_tenant_member(tenant_id));
create policy technician_certifications_delete_tenant on app.technician_certifications for delete to authenticated using (authz.is_current_user_tenant_member(tenant_id));
create policy technician_certifications_select_anon on app.technician_certifications for select to anon using (false);
create policy technician_certifications_insert_anon on app.technician_certifications for insert to anon with check (false);
create policy technician_certifications_update_anon on app.technician_certifications for update to anon using (false) with check (false);
create policy technician_certifications_delete_anon on app.technician_certifications for delete to anon using (false);

-- app.availability_patterns
create policy availability_patterns_select_tenant on app.availability_patterns for select to authenticated using (authz.is_current_user_tenant_member(tenant_id));
create policy availability_patterns_insert_tenant on app.availability_patterns for insert to authenticated with check (authz.is_current_user_tenant_member(tenant_id));
create policy availability_patterns_update_tenant on app.availability_patterns for update to authenticated using (authz.is_current_user_tenant_member(tenant_id)) with check (authz.is_current_user_tenant_member(tenant_id));
create policy availability_patterns_delete_tenant on app.availability_patterns for delete to authenticated using (authz.is_current_user_tenant_member(tenant_id));
create policy availability_patterns_select_anon on app.availability_patterns for select to anon using (false);
create policy availability_patterns_insert_anon on app.availability_patterns for insert to anon with check (false);
create policy availability_patterns_update_anon on app.availability_patterns for update to anon using (false) with check (false);
create policy availability_patterns_delete_anon on app.availability_patterns for delete to anon using (false);

-- app.availability_overrides
create policy availability_overrides_select_tenant on app.availability_overrides for select to authenticated using (authz.is_current_user_tenant_member(tenant_id));
create policy availability_overrides_insert_tenant on app.availability_overrides for insert to authenticated with check (authz.is_current_user_tenant_member(tenant_id));
create policy availability_overrides_update_tenant on app.availability_overrides for update to authenticated using (authz.is_current_user_tenant_member(tenant_id)) with check (authz.is_current_user_tenant_member(tenant_id));
create policy availability_overrides_delete_tenant on app.availability_overrides for delete to authenticated using (authz.is_current_user_tenant_member(tenant_id));
create policy availability_overrides_select_anon on app.availability_overrides for select to anon using (false);
create policy availability_overrides_insert_anon on app.availability_overrides for insert to anon with check (false);
create policy availability_overrides_update_anon on app.availability_overrides for update to anon using (false) with check (false);
create policy availability_overrides_delete_anon on app.availability_overrides for delete to anon using (false);

-- app.shifts
create policy shifts_select_tenant on app.shifts for select to authenticated using (authz.is_current_user_tenant_member(tenant_id));
create policy shifts_insert_tenant on app.shifts for insert to authenticated with check (authz.is_current_user_tenant_member(tenant_id));
create policy shifts_update_tenant on app.shifts for update to authenticated using (authz.is_current_user_tenant_member(tenant_id)) with check (authz.is_current_user_tenant_member(tenant_id));
create policy shifts_delete_tenant on app.shifts for delete to authenticated using (authz.is_current_user_tenant_member(tenant_id));
create policy shifts_select_anon on app.shifts for select to anon using (false);
create policy shifts_insert_anon on app.shifts for insert to anon with check (false);
create policy shifts_update_anon on app.shifts for update to anon using (false) with check (false);
create policy shifts_delete_anon on app.shifts for delete to anon using (false);

-- app.shift_templates
create policy shift_templates_select_tenant on app.shift_templates for select to authenticated using (authz.is_current_user_tenant_member(tenant_id));
create policy shift_templates_insert_tenant on app.shift_templates for insert to authenticated with check (authz.is_current_user_tenant_member(tenant_id));
create policy shift_templates_update_tenant on app.shift_templates for update to authenticated using (authz.is_current_user_tenant_member(tenant_id)) with check (authz.is_current_user_tenant_member(tenant_id));
create policy shift_templates_delete_tenant on app.shift_templates for delete to authenticated using (authz.is_current_user_tenant_member(tenant_id));
create policy shift_templates_select_anon on app.shift_templates for select to anon using (false);
create policy shift_templates_insert_anon on app.shift_templates for insert to anon with check (false);
create policy shift_templates_update_anon on app.shift_templates for update to anon using (false) with check (false);
create policy shift_templates_delete_anon on app.shift_templates for delete to anon using (false);

-- app.work_order_assignments
create policy work_order_assignments_select_tenant on app.work_order_assignments for select to authenticated using (authz.is_current_user_tenant_member(tenant_id));
create policy work_order_assignments_insert_tenant on app.work_order_assignments for insert to authenticated with check (authz.is_current_user_tenant_member(tenant_id));
create policy work_order_assignments_update_tenant on app.work_order_assignments for update to authenticated using (authz.is_current_user_tenant_member(tenant_id)) with check (authz.is_current_user_tenant_member(tenant_id));
create policy work_order_assignments_delete_tenant on app.work_order_assignments for delete to authenticated using (authz.is_current_user_tenant_member(tenant_id));
create policy work_order_assignments_select_anon on app.work_order_assignments for select to anon using (false);
create policy work_order_assignments_insert_anon on app.work_order_assignments for insert to anon with check (false);
create policy work_order_assignments_update_anon on app.work_order_assignments for update to anon using (false) with check (false);
create policy work_order_assignments_delete_anon on app.work_order_assignments for delete to anon using (false);

-- Grants
grant select on app.crews to authenticated, anon;
grant insert, update, delete on app.crews to authenticated;
grant select on app.technicians to authenticated, anon;
grant insert, update, delete on app.technicians to authenticated;
grant select on app.crew_members to authenticated, anon;
grant insert, update, delete on app.crew_members to authenticated;
grant select on cfg.skill_catalogs to authenticated, anon;
grant insert, update, delete on cfg.skill_catalogs to authenticated;
grant select on cfg.certification_catalogs to authenticated, anon;
grant insert, update, delete on cfg.certification_catalogs to authenticated;
grant select on app.technician_skills to authenticated, anon;
grant insert, update, delete on app.technician_skills to authenticated;
grant select on app.technician_certifications to authenticated, anon;
grant insert, update, delete on app.technician_certifications to authenticated;
grant select on app.availability_patterns to authenticated, anon;
grant insert, update, delete on app.availability_patterns to authenticated;
grant select on app.availability_overrides to authenticated, anon;
grant insert, update, delete on app.availability_overrides to authenticated;
grant select on app.shifts to authenticated, anon;
grant insert, update, delete on app.shifts to authenticated;
grant select on app.shift_templates to authenticated, anon;
grant insert, update, delete on app.shift_templates to authenticated;
grant select on app.work_order_assignments to authenticated, anon;
grant insert, update, delete on app.work_order_assignments to authenticated;
grant select on app.v_work_order_labor_actuals to authenticated, anon;
grant select on app.v_technician_capacity to authenticated, anon;

-- Force RLS on all new tables
alter table app.crews force row level security;
alter table app.technicians force row level security;
alter table app.crew_members force row level security;
alter table cfg.skill_catalogs force row level security;
alter table cfg.certification_catalogs force row level security;
alter table app.technician_skills force row level security;
alter table app.technician_certifications force row level security;
alter table app.availability_patterns force row level security;
alter table app.availability_overrides force row level security;
alter table app.shifts force row level security;
alter table app.shift_templates force row level security;
alter table app.work_order_assignments force row level security;
