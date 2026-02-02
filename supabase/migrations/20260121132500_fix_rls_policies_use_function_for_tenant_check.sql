-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Migration: Fix RLS Policies to Use Function for Tenant Membership Checks
--
-- Problem: Many RLS policies use direct subqueries to app.tenant_memberships, which
-- can cause "permission denied" errors when the subquery tries to evaluate the RLS
-- policy on tenant_memberships itself. With SECURITY INVOKER views, these permission
-- issues are now properly exposed.
--
-- Solution: Replace direct subqueries in RLS policies with calls to
-- authz.is_current_user_tenant_member(), which is SECURITY DEFINER and can bypass
-- RLS on tenant_memberships. This breaks the circular dependency and permission issues.
--
-- We update the most critical policies first (work_orders, assets, locations, departments)
-- as these are causing the most test failures.

-- Simplify tenant_memberships policy to allow users to see their own memberships
-- This is safe because users can only see their own membership records, not others'
drop policy if exists tenant_memberships_select_combined on app.tenant_memberships;

create policy tenant_memberships_select_combined 
  on app.tenant_memberships 
  for select 
  to authenticated 
  using (
    user_id = (select auth.uid())
  );

comment on policy tenant_memberships_select_combined on app.tenant_memberships is 
  'Allows users to see their own tenant memberships. This enables RLS policies on other tables to query tenant_memberships in subqueries without permission errors. Users can only see their own membership records.';

-- Update work_orders RLS policies to use function instead of direct subquery
alter policy work_orders_select_tenant 
  on app.work_orders 
  to authenticated 
  using (authz.is_current_user_tenant_member(tenant_id));

alter policy work_orders_insert_tenant 
  on app.work_orders 
  to authenticated 
  with check (authz.is_current_user_tenant_member(tenant_id));

alter policy work_orders_update_tenant 
  on app.work_orders 
  to authenticated 
  using (authz.is_current_user_tenant_member(tenant_id))
  with check (authz.is_current_user_tenant_member(tenant_id));

alter policy work_orders_delete_tenant 
  on app.work_orders 
  to authenticated 
  using (authz.is_current_user_tenant_member(tenant_id));

-- Update assets RLS policies
alter policy assets_select_tenant 
  on app.assets 
  to authenticated 
  using (authz.is_current_user_tenant_member(tenant_id));

alter policy assets_insert_tenant 
  on app.assets 
  to authenticated 
  with check (authz.is_current_user_tenant_member(tenant_id));

alter policy assets_update_tenant 
  on app.assets 
  to authenticated 
  using (authz.is_current_user_tenant_member(tenant_id))
  with check (authz.is_current_user_tenant_member(tenant_id));

alter policy assets_delete_tenant 
  on app.assets 
  to authenticated 
  using (authz.is_current_user_tenant_member(tenant_id));

-- Update locations RLS policies
alter policy locations_select_tenant 
  on app.locations 
  to authenticated 
  using (authz.is_current_user_tenant_member(tenant_id));

alter policy locations_insert_tenant 
  on app.locations 
  to authenticated 
  with check (authz.is_current_user_tenant_member(tenant_id));

alter policy locations_update_tenant 
  on app.locations 
  to authenticated 
  using (authz.is_current_user_tenant_member(tenant_id))
  with check (authz.is_current_user_tenant_member(tenant_id));

alter policy locations_delete_tenant 
  on app.locations 
  to authenticated 
  using (authz.is_current_user_tenant_member(tenant_id));

-- Update departments RLS policies
alter policy departments_select_tenant 
  on app.departments 
  to authenticated 
  using (authz.is_current_user_tenant_member(tenant_id));

alter policy departments_insert_tenant 
  on app.departments 
  to authenticated 
  with check (authz.is_current_user_tenant_member(tenant_id));

alter policy departments_update_tenant 
  on app.departments 
  to authenticated 
  using (authz.is_current_user_tenant_member(tenant_id))
  with check (authz.is_current_user_tenant_member(tenant_id));

alter policy departments_delete_tenant 
  on app.departments 
  to authenticated 
  using (authz.is_current_user_tenant_member(tenant_id));

-- Update PM schedules RLS policies
alter policy pm_schedules_select_authenticated 
  on app.pm_schedules 
  to authenticated 
  using (authz.is_current_user_tenant_member(tenant_id));

alter policy pm_schedules_insert_authenticated 
  on app.pm_schedules 
  to authenticated 
  with check (authz.is_current_user_tenant_member(tenant_id));

alter policy pm_schedules_update_authenticated 
  on app.pm_schedules 
  to authenticated 
  using (authz.is_current_user_tenant_member(tenant_id))
  with check (authz.is_current_user_tenant_member(tenant_id));

alter policy pm_schedules_delete_authenticated 
  on app.pm_schedules 
  to authenticated 
  using (authz.is_current_user_tenant_member(tenant_id));

-- Update PM history RLS policies
alter policy pm_history_select_authenticated 
  on app.pm_history 
  to authenticated 
  using (authz.is_current_user_tenant_member(tenant_id));

alter policy pm_history_insert_authenticated 
  on app.pm_history 
  to authenticated 
  with check (authz.is_current_user_tenant_member(tenant_id));

-- Update asset_meters RLS policies
alter policy asset_meters_select_authenticated 
  on app.asset_meters 
  to authenticated 
  using (authz.is_current_user_tenant_member(tenant_id));

alter policy asset_meters_insert_authenticated 
  on app.asset_meters 
  to authenticated 
  with check (authz.is_current_user_tenant_member(tenant_id));

alter policy asset_meters_update_authenticated 
  on app.asset_meters 
  to authenticated 
  using (authz.is_current_user_tenant_member(tenant_id))
  with check (authz.is_current_user_tenant_member(tenant_id));

alter policy asset_meters_delete_authenticated 
  on app.asset_meters 
  to authenticated 
  using (authz.is_current_user_tenant_member(tenant_id));

-- Update meter_readings RLS policies
alter policy meter_readings_select_authenticated 
  on app.meter_readings 
  to authenticated 
  using (authz.is_current_user_tenant_member(tenant_id));

alter policy meter_readings_insert_authenticated 
  on app.meter_readings 
  to authenticated 
  with check (authz.is_current_user_tenant_member(tenant_id));

alter policy meter_readings_update_authenticated 
  on app.meter_readings 
  to authenticated 
  using (authz.is_current_user_tenant_member(tenant_id))
  with check (authz.is_current_user_tenant_member(tenant_id));

alter policy meter_readings_delete_authenticated 
  on app.meter_readings 
  to authenticated 
  using (authz.is_current_user_tenant_member(tenant_id));

-- Update pm_templates RLS policies (note: these also check permissions, so we keep that)
alter policy pm_templates_select_authenticated 
  on cfg.pm_templates 
  to authenticated 
  using (authz.is_current_user_tenant_member(tenant_id));

alter policy pm_templates_insert_authenticated 
  on cfg.pm_templates 
  to authenticated 
  with check (
    authz.is_current_user_tenant_member(tenant_id)
    and authz.has_permission(auth.uid(), tenant_id, 'tenant.admin')
  );

alter policy pm_templates_update_authenticated 
  on cfg.pm_templates 
  to authenticated 
  using (
    authz.is_current_user_tenant_member(tenant_id)
    and authz.has_permission(auth.uid(), tenant_id, 'tenant.admin')
  )
  with check (
    authz.is_current_user_tenant_member(tenant_id)
    and authz.has_permission(auth.uid(), tenant_id, 'tenant.admin')
  );

alter policy pm_templates_delete_authenticated 
  on cfg.pm_templates 
  to authenticated 
  using (
    authz.is_current_user_tenant_member(tenant_id)
    and authz.has_permission(auth.uid(), tenant_id, 'tenant.admin')
  );

-- Update pm_template_checklist_items RLS policies
-- These use a nested subquery pattern, so we need to use a different approach
-- We'll use EXISTS with the function call
alter policy pm_template_checklist_items_select_authenticated 
  on cfg.pm_template_checklist_items 
  to authenticated 
  using (
    exists (
      select 1
      from cfg.pm_templates pt
      where pt.id = pm_template_checklist_items.template_id
        and authz.is_current_user_tenant_member(pt.tenant_id)
    )
  );

alter policy pm_template_checklist_items_insert_authenticated 
  on cfg.pm_template_checklist_items 
  to authenticated 
  with check (
    exists (
      select 1
      from cfg.pm_templates pt
      where pt.id = pm_template_checklist_items.template_id
        and authz.is_current_user_tenant_member(pt.tenant_id)
    )
  );

alter policy pm_template_checklist_items_update_authenticated 
  on cfg.pm_template_checklist_items 
  to authenticated 
  using (
    exists (
      select 1
      from cfg.pm_templates pt
      where pt.id = pm_template_checklist_items.template_id
        and authz.is_current_user_tenant_member(pt.tenant_id)
    )
  )
  with check (
    exists (
      select 1
      from cfg.pm_templates pt
      where pt.id = pm_template_checklist_items.template_id
        and authz.is_current_user_tenant_member(pt.tenant_id)
    )
  );

alter policy pm_template_checklist_items_delete_authenticated 
  on cfg.pm_template_checklist_items 
  to authenticated 
  using (
    exists (
      select 1
      from cfg.pm_templates pt
      where pt.id = pm_template_checklist_items.template_id
        and authz.is_current_user_tenant_member(pt.tenant_id)
    )
  );

-- Update tenants RLS policy
alter policy tenants_select_for_members 
  on app.tenants 
  to authenticated 
  using (authz.is_current_user_tenant_member(id));

-- Update v_tenants view to use function instead of direct subquery
-- This avoids permission issues when the view queries tenant_memberships
create or replace view public.v_tenants as
select
  t.id,
  t.name,
  t.slug,
  t.created_at
from app.tenants t
where authz.is_current_user_tenant_member(t.id);

comment on view public.v_tenants is 
  'Tenants the current user belongs to (via tenant_memberships). Uses authz.is_current_user_tenant_member() function (SECURITY DEFINER) to check membership, avoiding permission issues. RLS on underlying tables ensures users only see tenants they are members of. Anonymous users can query but will receive empty results.';
