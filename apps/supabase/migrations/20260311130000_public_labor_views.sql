-- SPDX-License-Identifier: AGPL-3.0-or-later
--
-- Public API views for labor, technicians, and crews.
-- Exposes app/cfg tables and app labor views as public views with tenant filtering
-- so SDK and PostgREST clients can read them. Set tenant context before querying.
--
-- Views: v_technicians, v_crews, v_crew_members, v_skill_catalogs, v_certification_catalogs,
-- v_technician_skills, v_technician_certifications, v_availability_patterns, v_availability_overrides,
-- v_shifts, v_shift_templates, v_work_order_assignments, v_work_order_labor_actuals, v_technician_capacity.

-- ============================================================================
-- Technicians
-- ============================================================================

create or replace view public.v_technicians
with (security_invoker = true)
as
select
  t.id,
  t.tenant_id,
  t.user_id,
  t.employee_number,
  t.default_crew_id,
  t.department_id,
  t.is_active,
  t.created_at,
  t.updated_at
from app.technicians t
where t.tenant_id = authz.get_current_tenant_id();

comment on view public.v_technicians is
  'Technicians for the current tenant. Set tenant context via rpc_set_tenant_context.';

grant select on public.v_technicians to authenticated;
grant select on public.v_technicians to anon;

-- ============================================================================
-- Crews
-- ============================================================================

create or replace view public.v_crews
with (security_invoker = true)
as
select
  c.id,
  c.tenant_id,
  c.name,
  c.description,
  c.lead_technician_id,
  c.created_at,
  c.updated_at
from app.crews c
where c.tenant_id = authz.get_current_tenant_id();

comment on view public.v_crews is
  'Crews for the current tenant. Set tenant context via rpc_set_tenant_context.';

grant select on public.v_crews to authenticated;
grant select on public.v_crews to anon;

-- ============================================================================
-- Crew members
-- ============================================================================

create or replace view public.v_crew_members
with (security_invoker = true)
as
select
  cm.id,
  cm.tenant_id,
  cm.crew_id,
  cm.technician_id,
  cm.role,
  cm.joined_at,
  cm.left_at,
  cm.created_at,
  cm.updated_at
from app.crew_members cm
where cm.tenant_id = authz.get_current_tenant_id();

comment on view public.v_crew_members is
  'Crew memberships for the current tenant. Set tenant context via rpc_set_tenant_context.';

grant select on public.v_crew_members to authenticated;
grant select on public.v_crew_members to anon;

-- ============================================================================
-- Skill and certification catalogs
-- ============================================================================

create or replace view public.v_skill_catalogs
with (security_invoker = true)
as
select
  s.id,
  s.tenant_id,
  s.name,
  s.code,
  s.category,
  s.display_order,
  s.created_at,
  s.updated_at
from cfg.skill_catalogs s
where s.tenant_id = authz.get_current_tenant_id();

comment on view public.v_skill_catalogs is
  'Skill catalog for the current tenant. Set tenant context via rpc_set_tenant_context.';

grant select on public.v_skill_catalogs to authenticated;
grant select on public.v_skill_catalogs to anon;

create or replace view public.v_certification_catalogs
with (security_invoker = true)
as
select
  c.id,
  c.tenant_id,
  c.name,
  c.code,
  c.expiry_required,
  c.validity_days,
  c.display_order,
  c.created_at,
  c.updated_at
from cfg.certification_catalogs c
where c.tenant_id = authz.get_current_tenant_id();

comment on view public.v_certification_catalogs is
  'Certification catalog for the current tenant. Set tenant context via rpc_set_tenant_context.';

grant select on public.v_certification_catalogs to authenticated;
grant select on public.v_certification_catalogs to anon;

-- ============================================================================
-- Technician skills and certifications
-- ============================================================================

create or replace view public.v_technician_skills
with (security_invoker = true)
as
select
  ts.id,
  ts.tenant_id,
  ts.technician_id,
  ts.skill_id,
  ts.proficiency,
  ts.created_at
from app.technician_skills ts
where ts.tenant_id = authz.get_current_tenant_id();

comment on view public.v_technician_skills is
  'Technician skills for the current tenant. Set tenant context via rpc_set_tenant_context.';

grant select on public.v_technician_skills to authenticated;
grant select on public.v_technician_skills to anon;

create or replace view public.v_technician_certifications
with (security_invoker = true)
as
select
  tc.id,
  tc.tenant_id,
  tc.technician_id,
  tc.certification_id,
  tc.issued_at,
  tc.expires_at,
  tc.issued_by,
  tc.created_at,
  tc.updated_at
from app.technician_certifications tc
where tc.tenant_id = authz.get_current_tenant_id();

comment on view public.v_technician_certifications is
  'Technician certifications for the current tenant. Set tenant context via rpc_set_tenant_context.';

grant select on public.v_technician_certifications to authenticated;
grant select on public.v_technician_certifications to anon;

-- ============================================================================
-- Availability
-- ============================================================================

create or replace view public.v_availability_patterns
with (security_invoker = true)
as
select
  ap.id,
  ap.tenant_id,
  ap.technician_id,
  ap.day_of_week,
  ap.start_time,
  ap.end_time,
  ap.timezone,
  ap.created_at,
  ap.updated_at
from app.availability_patterns ap
where ap.tenant_id = authz.get_current_tenant_id();

comment on view public.v_availability_patterns is
  'Recurring availability patterns for the current tenant. Set tenant context via rpc_set_tenant_context.';

grant select on public.v_availability_patterns to authenticated;
grant select on public.v_availability_patterns to anon;

create or replace view public.v_availability_overrides
with (security_invoker = true)
as
select
  ao.id,
  ao.tenant_id,
  ao.technician_id,
  ao.override_date,
  ao.is_available,
  ao.start_time,
  ao.end_time,
  ao.reason,
  ao.created_at,
  ao.updated_at
from app.availability_overrides ao
where ao.tenant_id = authz.get_current_tenant_id();

comment on view public.v_availability_overrides is
  'Availability overrides for the current tenant. Set tenant context via rpc_set_tenant_context.';

grant select on public.v_availability_overrides to authenticated;
grant select on public.v_availability_overrides to anon;

-- ============================================================================
-- Shifts and shift templates
-- ============================================================================

create or replace view public.v_shifts
with (security_invoker = true)
as
select
  s.id,
  s.tenant_id,
  s.technician_id,
  s.crew_id,
  s.start_at,
  s.end_at,
  s.shift_type,
  s.label,
  s.created_at,
  s.updated_at
from app.shifts s
where s.tenant_id = authz.get_current_tenant_id();

comment on view public.v_shifts is
  'Shifts for the current tenant. Set tenant context via rpc_set_tenant_context.';

grant select on public.v_shifts to authenticated;
grant select on public.v_shifts to anon;

create or replace view public.v_shift_templates
with (security_invoker = true)
as
select
  st.id,
  st.tenant_id,
  st.crew_id,
  st.technician_id,
  st.day_of_week,
  st.start_time,
  st.end_time,
  st.shift_type,
  st.label,
  st.created_at,
  st.updated_at
from app.shift_templates st
where st.tenant_id = authz.get_current_tenant_id();

comment on view public.v_shift_templates is
  'Shift templates for the current tenant. Set tenant context via rpc_set_tenant_context.';

grant select on public.v_shift_templates to authenticated;
grant select on public.v_shift_templates to anon;

-- ============================================================================
-- Work order assignments
-- ============================================================================

create or replace view public.v_work_order_assignments
with (security_invoker = true)
as
select
  wa.id,
  wa.tenant_id,
  wa.work_order_id,
  wa.technician_id,
  wa.assigned_at,
  wa.created_at
from app.work_order_assignments wa
where wa.tenant_id = authz.get_current_tenant_id();

comment on view public.v_work_order_assignments is
  'Work order assignments for the current tenant. Set tenant context via rpc_set_tenant_context.';

grant select on public.v_work_order_assignments to authenticated;
grant select on public.v_work_order_assignments to anon;

-- ============================================================================
-- Labor actuals and capacity (aggregated views)
-- ============================================================================

create or replace view public.v_work_order_labor_actuals
with (security_invoker = true)
as
select
  la.tenant_id,
  la.work_order_id,
  la.technician_id,
  la.user_id,
  la.entry_count,
  la.total_minutes,
  la.total_labor_cost_cents,
  la.first_entry_date,
  la.last_entry_date
from app.v_work_order_labor_actuals la
where la.tenant_id = authz.get_current_tenant_id();

comment on view public.v_work_order_labor_actuals is
  'Aggregated labor actuals per work order and technician for the current tenant. For cost and utilization reporting.';

grant select on public.v_work_order_labor_actuals to authenticated;
grant select on public.v_work_order_labor_actuals to anon;

create or replace view public.v_technician_capacity
with (security_invoker = true)
as
select
  cap.tenant_id,
  cap.technician_id,
  cap.shift_date,
  cap.shift_count,
  cap.scheduled_minutes
from app.v_technician_capacity cap
where cap.tenant_id = authz.get_current_tenant_id();

comment on view public.v_technician_capacity is
  'Scheduled shift capacity per technician per day for the current tenant. For utilization comparison.';

grant select on public.v_technician_capacity to authenticated;
grant select on public.v_technician_capacity to anon;
