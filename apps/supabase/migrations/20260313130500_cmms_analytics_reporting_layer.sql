-- SPDX-License-Identifier: AGPL-3.0-or-later
--
-- CMMS Analytics Reporting Layer
--
-- Purpose: Provide a clean analytics layer (reporting schema) for core CMMS KPIs:
-- dimension/fact views, KPI views, RLS-aware and tenant/site/department slicing.
-- Enables export to BI tools and data warehouses. No dashboards; data structures only.
--
-- Affected: New schema reporting; dimension views, fact views, KPI views, dim_time table.
-- All views filter by authz.get_current_tenant_id() and use security_invoker = true.

-- ============================================================================
-- 1. Create reporting schema
-- ============================================================================

create schema if not exists reporting;

comment on schema reporting is 'Analytics layer for CMMS: dimension and fact views, KPI views. Tenant-scoped via get_current_tenant_id(). For BI and warehouse export.';

-- ============================================================================
-- 2. Helper: location to site_id (for use in dimensions/facts)
-- ============================================================================

create or replace view reporting.v_location_site
with (security_invoker = true)
as
with recursive loc_with_site as (
  select
    id,
    tenant_id,
    parent_location_id,
    location_type,
    name,
    case when location_type = 'site' then id else null end as site_id
  from app.locations
  where parent_location_id is null
    and tenant_id = authz.get_current_tenant_id()
  union all
  select
    l.id,
    l.tenant_id,
    l.parent_location_id,
    l.location_type,
    l.name,
    case when l.location_type = 'site' then l.id else p.site_id end
  from app.locations l
  join loc_with_site p on l.parent_location_id = p.id
  where l.tenant_id = authz.get_current_tenant_id()
)
select
  l.id as location_id,
  l.tenant_id,
  l.site_id,
  site_loc.name as site_name
from loc_with_site l
left join app.locations site_loc on site_loc.id = l.site_id and site_loc.tenant_id = l.tenant_id;

comment on view reporting.v_location_site is 'Maps location_id to site_id and site_name for the current tenant. Used by reporting dimensions and facts for site slicing.';

-- ============================================================================
-- 3. Dimension views
-- ============================================================================

create or replace view reporting.dim_tenant
with (security_invoker = true)
as
select
  t.id as tenant_id,
  t.name as tenant_name,
  t.slug
from app.tenants t
where t.id = authz.get_current_tenant_id();

comment on view reporting.dim_tenant is 'Dimension: one row per tenant (current context only). Grain: tenant.';

create or replace view reporting.dim_location
with (security_invoker = true)
as
select
  l.id as location_id,
  l.tenant_id,
  l.name as location_name,
  l.location_type,
  l.code,
  l.parent_location_id,
  ls.site_id,
  ls.site_name
from app.locations l
left join reporting.v_location_site ls on ls.location_id = l.id and ls.tenant_id = l.tenant_id
where l.tenant_id = authz.get_current_tenant_id();

comment on view reporting.dim_location is 'Dimension: one row per location. Includes site_id and site_name for site slicing.';

create or replace view reporting.dim_department
with (security_invoker = true)
as
select
  d.id as department_id,
  d.tenant_id,
  d.name as department_name,
  d.code as department_code
from app.departments d
where d.tenant_id = authz.get_current_tenant_id();

comment on view reporting.dim_department is 'Dimension: one row per department.';

create or replace view reporting.dim_asset
with (security_invoker = true)
as
select
  a.id as asset_id,
  a.tenant_id,
  a.name as asset_name,
  a.asset_number,
  a.location_id,
  a.department_id,
  a.status as asset_status,
  ls.site_id,
  ls.site_name
from app.assets a
left join reporting.v_location_site ls on ls.location_id = a.location_id and ls.tenant_id = a.tenant_id
where a.tenant_id = authz.get_current_tenant_id();

comment on view reporting.dim_asset is 'Dimension: one row per asset. Includes site_id via location for site slicing.';

-- Time dimension: bounded date table (e.g. 5 years back, 1 year forward)
create table reporting.dim_time (
  date date primary key,
  year smallint not null,
  quarter smallint not null,
  month smallint not null,
  week smallint not null,
  day_of_week smallint not null,
  is_weekend boolean not null,
  year_month text not null,
  year_week text not null
);

comment on table reporting.dim_time is 'Dimension: one row per date. Bounded range for slicing by period. Populated once.';

-- Populate dim_time (e.g. 2020-01-01 to 2031-12-31)
insert into reporting.dim_time (date, year, quarter, month, week, day_of_week, is_weekend, year_month, year_week)
select
  d::date,
  extract(year from d)::smallint,
  extract(quarter from d)::smallint,
  extract(month from d)::smallint,
  extract(week from d)::smallint,
  extract(dow from d)::smallint,
  extract(dow from d) in (0, 6),
  to_char(d, 'YYYY-MM'),
  to_char(d, 'IYYY-IW')
from generate_series(
  '2020-01-01'::date,
  '2031-12-31'::date,
  '1 day'::interval
) as d
on conflict (date) do nothing;

-- ============================================================================
-- 4. Fact views
-- ============================================================================

create or replace view reporting.fact_work_orders
with (security_invoker = true)
as
select
  wo.id as work_order_id,
  wo.tenant_id,
  wo.location_id,
  wo.asset_id,
  a.department_id,
  coalesce(
    loc_site_wo.site_id,
    loc_site_asset.site_id
  ) as site_id,
  wo.created_at,
  wo.completed_at,
  (wo.created_at::date) as created_date,
  (wo.completed_at::date) as completed_date,
  wo.status,
  wo.priority,
  wo.maintenance_type,
  wo.pm_schedule_id,
  wo.project_id,
  extract(epoch from (wo.completed_at - wo.created_at)) / 3600.0 as duration_hours,
  coalesce(te_agg.total_minutes, 0) as total_labor_minutes,
  coalesce(c.labor_cents, 0) as total_labor_cost_cents,
  coalesce(c.parts_cents, 0) as total_parts_cost_cents,
  coalesce(c.vendor_cents, 0) as total_vendor_cost_cents
from app.work_orders wo
left join app.assets a on a.id = wo.asset_id and a.tenant_id = wo.tenant_id
left join reporting.v_location_site loc_site_wo on loc_site_wo.location_id = wo.location_id and loc_site_wo.tenant_id = wo.tenant_id
left join reporting.v_location_site loc_site_asset on loc_site_asset.location_id = a.location_id and loc_site_asset.tenant_id = wo.tenant_id and wo.asset_id is not null
left join lateral (
  select sum(te.minutes) as total_minutes
  from app.work_order_time_entries te
  where te.work_order_id = wo.id and te.tenant_id = wo.tenant_id
) te_agg on true
left join app.v_work_order_costs c on c.work_order_id = wo.id and c.tenant_id = wo.tenant_id
where wo.tenant_id = authz.get_current_tenant_id();

comment on view reporting.fact_work_orders is 'Fact: one row per work order. Measures: duration_hours, total_labor_minutes, parts/vendor/labor cost. Slice by site_id, department_id, created_date.';

create or replace view reporting.fact_labor
with (security_invoker = true)
as
select
  te.id as time_entry_id,
  te.work_order_id,
  te.tenant_id,
  te.technician_id,
  te.user_id,
  te.entry_date,
  te.minutes,
  te.labor_cost_cents,
  wo.location_id,
  wo.asset_id,
  a.department_id,
  coalesce(
    loc_site_wo.site_id,
    loc_site_asset.site_id
  ) as site_id
from app.work_order_time_entries te
join app.work_orders wo on wo.id = te.work_order_id and wo.tenant_id = te.tenant_id
left join app.assets a on a.id = wo.asset_id and a.tenant_id = wo.tenant_id
left join reporting.v_location_site loc_site_wo on loc_site_wo.location_id = wo.location_id and loc_site_wo.tenant_id = wo.tenant_id
left join reporting.v_location_site loc_site_asset on loc_site_asset.location_id = a.location_id and loc_site_asset.tenant_id = wo.tenant_id and wo.asset_id is not null
where te.tenant_id = authz.get_current_tenant_id();

comment on view reporting.fact_labor is 'Fact: one row per time entry. Measures: minutes, labor_cost_cents. Slice by work_order, technician, entry_date, site_id.';

create or replace view reporting.fact_parts
with (security_invoker = true)
as
select
  p.id as work_order_parts_id,
  p.work_order_id,
  p.tenant_id,
  (wo.created_at::date) as entry_date,
  p.quantity,
  p.unit_cost_cents,
  p.total_cost_cents,
  wo.location_id,
  wo.asset_id,
  a.department_id,
  coalesce(
    loc_site_wo.site_id,
    loc_site_asset.site_id
  ) as site_id
from app.work_order_parts p
join app.work_orders wo on wo.id = p.work_order_id and wo.tenant_id = p.tenant_id
left join app.assets a on a.id = wo.asset_id and a.tenant_id = wo.tenant_id
left join reporting.v_location_site loc_site_wo on loc_site_wo.location_id = wo.location_id and loc_site_wo.tenant_id = wo.tenant_id
left join reporting.v_location_site loc_site_asset on loc_site_asset.location_id = a.location_id and loc_site_asset.tenant_id = wo.tenant_id and wo.asset_id is not null
where p.tenant_id = authz.get_current_tenant_id();

comment on view reporting.fact_parts is 'Fact: one row per work order part line. Measures: quantity, unit_cost_cents, total_cost_cents. Slice by work_order, entry_date, site_id.';

create or replace view reporting.fact_downtime_incidents
with (security_invoker = true)
as
select
  wo.id as work_order_id,
  wo.tenant_id,
  wo.asset_id,
  wo.location_id,
  coalesce(
    loc_site_wo.site_id,
    loc_site_asset.site_id
  ) as site_id,
  wo.created_at,
  wo.completed_at,
  extract(epoch from (wo.completed_at - wo.created_at)) / 3600.0 as duration_hours,
  coalesce(te_agg.total_minutes, 0) as total_labor_minutes
from app.work_orders wo
left join app.assets a on a.id = wo.asset_id and a.tenant_id = wo.tenant_id
left join reporting.v_location_site loc_site_wo on loc_site_wo.location_id = wo.location_id and loc_site_wo.tenant_id = wo.tenant_id
left join reporting.v_location_site loc_site_asset on loc_site_asset.location_id = a.location_id and loc_site_asset.tenant_id = wo.tenant_id and wo.asset_id is not null
left join lateral (
  select sum(te.minutes) as total_minutes
  from app.work_order_time_entries te
  where te.work_order_id = wo.id and te.tenant_id = wo.tenant_id
) te_agg on true
where wo.tenant_id = authz.get_current_tenant_id()
  and wo.status = 'completed'
  and wo.completed_at is not null
  and (wo.maintenance_type = 'reactive' or wo.maintenance_type is null);

comment on view reporting.fact_downtime_incidents is 'Fact: one row per incident (reactive completed work order). Measures: duration_hours, total_labor_minutes. For MTBF.';

create or replace view reporting.fact_pm_compliance
with (security_invoker = true)
as
select
  ph.id as pm_history_id,
  ph.tenant_id,
  ph.pm_schedule_id,
  ps.asset_id,
  loc_site.site_id,
  ph.scheduled_date,
  ph.completed_date,
  (ph.completed_date is not null and ph.completed_date::date <= ph.scheduled_date::date + 7) as on_time,
  ph.actual_hours,
  ph.cost
from app.pm_history ph
join app.pm_schedules ps on ps.id = ph.pm_schedule_id and ps.tenant_id = ph.tenant_id
left join app.assets a on a.id = ps.asset_id and a.tenant_id = ph.tenant_id
left join reporting.v_location_site loc_site on loc_site.location_id = a.location_id and loc_site.tenant_id = ph.tenant_id
where ph.tenant_id = authz.get_current_tenant_id();

comment on view reporting.fact_pm_compliance is 'Fact: one row per PM execution. on_time: completed within 7 days of scheduled_date. Slice by asset, site, period.';

-- ============================================================================
-- 5. KPI views
-- ============================================================================

create or replace view reporting.kpi_mttr
with (security_invoker = true)
as
select
  f.tenant_id,
  f.site_id,
  f.asset_id,
  f.department_id,
  date_trunc('month', f.completed_date)::date as period_month,
  count(*) as completed_count,
  avg(f.duration_hours) as mttr_hours,
  avg(f.duration_hours) / 24.0 as mttr_days,
  sum(f.total_labor_minutes) as total_labor_minutes
from reporting.fact_work_orders f
where f.status = 'completed'
  and f.completed_at is not null
  and f.completed_date >= (current_date - 365)
group by f.tenant_id, f.site_id, f.asset_id, f.department_id, date_trunc('month', f.completed_date);

comment on view reporting.kpi_mttr is 'KPI: MTTR (mean time to repair) by tenant, site, asset, department, month. Last 365 days.';

create or replace view reporting.kpi_mtbf
with (security_invoker = true)
as
with ordered as (
  select
    work_order_id,
    tenant_id,
    asset_id,
    site_id,
    completed_at,
    lag(completed_at) over (partition by asset_id order by completed_at) as prev_completed_at,
    extract(epoch from (completed_at - lag(completed_at) over (partition by asset_id order by completed_at))) / 3600.0 as hours_between_failures
  from reporting.fact_downtime_incidents
  where asset_id is not null
),
filtered as (
  select asset_id, site_id, tenant_id, hours_between_failures
  from ordered
  where prev_completed_at is not null and hours_between_failures > 0
)
select
  tenant_id,
  site_id,
  asset_id,
  count(*) as failure_count,
  avg(hours_between_failures) as mtbf_hours,
  avg(hours_between_failures) / 24.0 as mtbf_days
from filtered
group by tenant_id, site_id, asset_id;

comment on view reporting.kpi_mtbf is 'KPI: MTBF (mean time between failures) per asset/site. Derived from fact_downtime_incidents.';

create or replace view reporting.kpi_pm_compliance
with (security_invoker = true)
as
select
  tenant_id,
  site_id,
  asset_id,
  date_trunc('month', scheduled_date)::date as period_month,
  count(*) as total_scheduled,
  count(*) filter (where completed_date is not null) as completed_count,
  count(*) filter (where on_time) as on_time_count,
  case when count(*) filter (where completed_date is not null) > 0
    then 100.0 * count(*) filter (where on_time) / nullif(count(*) filter (where completed_date is not null), 0)
    else null
  end as on_time_pct
from reporting.fact_pm_compliance
group by tenant_id, site_id, asset_id, date_trunc('month', scheduled_date);

comment on view reporting.kpi_pm_compliance is 'KPI: PM compliance (on-time %) by tenant, site, asset, month.';

create or replace view reporting.kpi_utilization
with (security_invoker = true)
as
select
  cap.tenant_id,
  cap.technician_id,
  cap.shift_date as period_date,
  cap.scheduled_minutes,
  coalesce(act.actual_minutes, 0) as actual_minutes,
  case when cap.scheduled_minutes > 0
    then 100.0 * coalesce(act.actual_minutes, 0) / cap.scheduled_minutes
    else null
  end as utilization_pct
from app.v_technician_capacity cap
left join (
  select
    te.tenant_id,
    te.technician_id,
    te.entry_date,
    sum(te.minutes) as actual_minutes
  from app.work_order_time_entries te
  where te.technician_id is not null
  group by te.tenant_id, te.technician_id, te.entry_date
) act on act.tenant_id = cap.tenant_id and act.technician_id = cap.technician_id and act.entry_date = cap.shift_date
where cap.tenant_id = authz.get_current_tenant_id();

comment on view reporting.kpi_utilization is 'KPI: Technician utilization (actual minutes / scheduled minutes) by technician and day.';

create or replace view reporting.kpi_backlog
with (security_invoker = true)
as
select
  f.tenant_id,
  f.site_id,
  f.department_id,
  f.priority,
  count(*) as open_count,
  count(*) filter (where wo.due_date is not null and wo.due_date < now()) as overdue_count
from reporting.fact_work_orders f
join app.work_orders wo on wo.id = f.work_order_id and wo.tenant_id = f.tenant_id
where f.status not in ('completed', 'cancelled')
group by f.tenant_id, f.site_id, f.department_id, f.priority;

comment on view reporting.kpi_backlog is 'KPI: Open and overdue work order counts by tenant, site, department, priority.';

-- ============================================================================
-- 6. Grants and RLS
-- ============================================================================

grant usage on schema reporting to authenticated;
grant usage on schema reporting to anon;

grant select on reporting.v_location_site to authenticated, anon;
grant select on reporting.dim_tenant to authenticated, anon;
grant select on reporting.dim_location to authenticated, anon;
grant select on reporting.dim_department to authenticated, anon;
grant select on reporting.dim_asset to authenticated, anon;
grant select on reporting.dim_time to authenticated, anon;
grant select on reporting.fact_work_orders to authenticated, anon;
grant select on reporting.fact_labor to authenticated, anon;
grant select on reporting.fact_parts to authenticated, anon;
grant select on reporting.fact_downtime_incidents to authenticated, anon;
grant select on reporting.fact_pm_compliance to authenticated, anon;
grant select on reporting.kpi_mttr to authenticated, anon;
grant select on reporting.kpi_mtbf to authenticated, anon;
grant select on reporting.kpi_pm_compliance to authenticated, anon;
grant select on reporting.kpi_utilization to authenticated, anon;
grant select on reporting.kpi_backlog to authenticated, anon;

alter table reporting.dim_time enable row level security;

create policy dim_time_select_authenticated on reporting.dim_time for select to authenticated using (true);
create policy dim_time_select_anon on reporting.dim_time for select to anon using (true);

comment on policy dim_time_select_authenticated on reporting.dim_time is 'Time dimension is not tenant-specific; allow read for all authenticated.';
comment on policy dim_time_select_anon on reporting.dim_time is 'Time dimension is not tenant-specific; allow read for anon.';

-- ============================================================================
-- 7. Optional: analytics metadata for BI discovery
-- ============================================================================

create or replace function reporting.get_analytics_metadata()
returns table (
  object_schema text,
  object_name text,
  object_kind text,
  description text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    n.nspname::text as object_schema,
    c.relname::text as object_name,
    case c.relkind when 'v' then 'view' when 'r' then 'table' else 'other' end as object_kind,
    coalesce(pg_catalog.obj_description(c.oid), '') as description
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'reporting'
    and c.relkind in ('v', 'r')
  order by c.relname;
$$;

comment on function reporting.get_analytics_metadata() is 'Returns reporting schema objects (views and tables) with descriptions for BI tool discovery.';

revoke all on function reporting.get_analytics_metadata() from public;
grant execute on function reporting.get_analytics_metadata() to authenticated;
grant execute on function reporting.get_analytics_metadata() to anon;
