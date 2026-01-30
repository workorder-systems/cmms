-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Adds instant dashboard views for open work orders, overdue work orders, MTTR metrics, and status breakdowns.
-- 
-- Views created:
-- - v_dashboard_open_work_orders: Active work orders ordered by priority
-- - v_dashboard_overdue_work_orders: Overdue work orders with days overdue
-- - v_dashboard_mttr_metrics: Mean Time To Repair statistics (last 90 days)
-- - v_dashboard_metrics: Combined dashboard metrics (single row)
-- - v_dashboard_work_orders_by_status: Status breakdown with counts
--
-- Indexes added:
-- - work_orders_tenant_status_completed_idx: Optimizes MTTR queries filtering by tenant, status, and completed_at

-- ============================================================================
-- Performance indexes for dashboard views
-- ============================================================================

-- Index for MTTR metrics view (tenant + status + completed_at filtering)
create index if not exists work_orders_tenant_status_completed_idx 
  on app.work_orders (tenant_id, status, completed_at desc) 
  where status = 'completed' and completed_at is not null;

-- ============================================================================
-- Dashboard views for open, overdue, and MTTR metrics
-- ============================================================================

-- View: Open work orders (not completed or cancelled)
-- Uses lateral join for better performance on time entry aggregation
create or replace view public.v_dashboard_open_work_orders as
select
  wo.id,
  wo.tenant_id,
  wo.title,
  wo.description,
  wo.status,
  wo.priority,
  wo.assigned_to,
  wo.location_id,
  wo.asset_id,
  wo.due_date,
  wo.created_at,
  wo.updated_at,
  coalesce(te_agg.total_minutes, 0) as total_labor_minutes
from app.work_orders wo
left join lateral (
  select sum(minutes) as total_minutes
  from app.work_order_time_entries
  where work_order_id = wo.id
) te_agg on true
where wo.tenant_id = authz.get_current_tenant_id()
  and wo.status not in ('completed', 'cancelled')
order by 
  case wo.priority
    when 'critical' then 1
    when 'high' then 2
    when 'medium' then 3
    when 'low' then 4
    else 5
  end,
  wo.due_date nulls last,
  wo.created_at desc;

comment on view public.v_dashboard_open_work_orders is 
  'Open work orders (not completed or cancelled) for the current tenant. Includes total_labor_minutes aggregated from time entries. Ordered by priority (critical first), then due date, then creation date. Used for dashboard display of active work orders.';

grant select on public.v_dashboard_open_work_orders to authenticated;
grant select on public.v_dashboard_open_work_orders to anon;

-- View: Overdue work orders
-- Uses lateral join for better performance on time entry aggregation
create or replace view public.v_dashboard_overdue_work_orders as
select
  wo.id,
  wo.tenant_id,
  wo.title,
  wo.description,
  wo.status,
  wo.priority,
  wo.assigned_to,
  wo.location_id,
  wo.asset_id,
  wo.due_date,
  wo.created_at,
  wo.updated_at,
  coalesce(te_agg.total_minutes, 0) as total_labor_minutes,
  extract(epoch from (pg_catalog.now() - wo.due_date)) / 86400 as days_overdue
from app.work_orders wo
left join lateral (
  select sum(minutes) as total_minutes
  from app.work_order_time_entries
  where work_order_id = wo.id
) te_agg on true
where wo.tenant_id = authz.get_current_tenant_id()
  and wo.status not in ('completed', 'cancelled')
  and wo.due_date is not null
  and wo.due_date < pg_catalog.now()
order by 
  wo.due_date asc,
  case wo.priority
    when 'critical' then 1
    when 'high' then 2
    when 'medium' then 3
    when 'low' then 4
    else 5
  end;

comment on view public.v_dashboard_overdue_work_orders is 
  'Overdue work orders (due date in the past, not completed or cancelled) for the current tenant. Includes total_labor_minutes aggregated from time entries and days_overdue calculation. Ordered by due date (oldest first), then priority. Used for dashboard display of overdue work orders.';

grant select on public.v_dashboard_overdue_work_orders to authenticated;
grant select on public.v_dashboard_overdue_work_orders to anon;

-- View: MTTR (Mean Time To Repair) metrics
-- Optimized: Use lateral join for better performance on time entry aggregation
create or replace view public.v_dashboard_mttr_metrics as
select
  wo.tenant_id,
  count(distinct wo.id) as completed_count,
  avg(extract(epoch from (wo.completed_at - wo.created_at)) / 3600) as mttr_hours,
  avg(extract(epoch from (wo.completed_at - wo.created_at)) / 86400) as mttr_days,
  min(extract(epoch from (wo.completed_at - wo.created_at)) / 3600) as min_completion_hours,
  max(extract(epoch from (wo.completed_at - wo.created_at)) / 3600) as max_completion_hours,
  percentile_cont(0.5) within group (order by extract(epoch from (wo.completed_at - wo.created_at)) / 3600) as median_completion_hours,
  avg(te_agg.total_minutes) as avg_labor_minutes,
  sum(te_agg.total_minutes) as total_labor_minutes
from app.work_orders wo
left join lateral (
  select sum(minutes) as total_minutes
  from app.work_order_time_entries
  where work_order_id = wo.id
) te_agg on true
where wo.tenant_id = authz.get_current_tenant_id()
  and wo.status = 'completed'
  and wo.completed_at is not null
  and wo.completed_at >= pg_catalog.now() - pg_catalog.make_interval(days => 90)
group by wo.tenant_id;

comment on view public.v_dashboard_mttr_metrics is 
  'MTTR (Mean Time To Repair) metrics for the current tenant. Calculates average, min, max, and median completion times for completed work orders in the last 90 days. Includes labor time statistics aggregated from time entries. Returns one row per tenant with aggregated metrics.';

grant select on public.v_dashboard_mttr_metrics to authenticated;
grant select on public.v_dashboard_mttr_metrics to anon;

-- View: Combined dashboard metrics (single row per tenant)
-- Optimized with subqueries instead of multiple left joins for better performance
create or replace view public.v_dashboard_metrics as
select
  t.id as tenant_id,
  t.name as tenant_name,
  -- Open work orders count
  (select count(*) 
   from app.work_orders 
   where tenant_id = t.id 
     and status not in ('completed', 'cancelled')
  ) as open_count,
  -- Overdue work orders count
  (select count(*) 
   from app.work_orders 
   where tenant_id = t.id 
     and status not in ('completed', 'cancelled')
     and due_date is not null
     and due_date < pg_catalog.now()
  ) as overdue_count,
  -- Completed work orders count (last 30 days)
  (select count(*) 
   from app.work_orders 
   where tenant_id = t.id 
     and status = 'completed'
     and completed_at >= pg_catalog.now() - pg_catalog.make_interval(days => 30)
  ) as completed_last_30_days,
  -- MTTR (last 90 days)
  (select avg(extract(epoch from (completed_at - created_at)) / 3600)
   from app.work_orders 
   where tenant_id = t.id 
     and status = 'completed'
     and completed_at is not null
     and completed_at >= pg_catalog.now() - pg_catalog.make_interval(days => 90)
  ) as mttr_hours,
  -- Total assets
  (select count(*) from app.assets where tenant_id = t.id) as total_assets,
  -- Active assets
  (select count(*) from app.assets where tenant_id = t.id and status = 'active') as active_assets,
  -- Total locations
  (select count(*) from app.locations where tenant_id = t.id) as total_locations
from app.tenants t
where t.id = authz.get_current_tenant_id();

comment on view public.v_dashboard_metrics is 
  'Combined dashboard metrics for the current tenant. Returns one row with key metrics: open work orders count, overdue count, completed in last 30 days, MTTR (last 90 days), asset counts, and location count. Used for dashboard overview display.';

grant select on public.v_dashboard_metrics to authenticated;
grant select on public.v_dashboard_metrics to anon;

-- View: Work orders by status (for status breakdown)
create or replace view public.v_dashboard_work_orders_by_status as
select
  wo.status,
  count(*) as count,
  count(*) filter (where wo.assigned_to is not null) as assigned_count,
  count(*) filter (where wo.due_date < pg_catalog.now() and wo.status not in ('completed', 'cancelled')) as overdue_count,
  avg(extract(epoch from (wo.completed_at - wo.created_at)) / 3600) filter (where wo.completed_at is not null) as avg_completion_hours,
  min(wo.created_at) as first_created_at,
  max(wo.created_at) as last_created_at
from app.work_orders wo
where wo.tenant_id = authz.get_current_tenant_id()
group by wo.status
order by 
  case wo.status
    when 'draft' then 1
    when 'assigned' then 2
    when 'in_progress' then 3
    when 'completed' then 4
    when 'cancelled' then 5
    else 6
  end;

comment on view public.v_dashboard_work_orders_by_status is 
  'Work orders grouped by status for the current tenant. Provides status breakdown with counts, assignment stats, overdue counts, and completion metrics. Used for dashboard status distribution display.';

grant select on public.v_dashboard_work_orders_by_status to authenticated;
grant select on public.v_dashboard_work_orders_by_status to anon;
