-- 20260210160000_16_lint_hardening.sql
--
-- Purpose
-- -------
-- Address selected Supabase database linter warnings:
-- - Ensure function util.build_full_name has an explicit, immutable search_path.
-- - Reduce per-row auth() evaluation in RLS policies by wrapping auth.uid()
--   calls in SELECT expressions, as recommended in Supabase docs.
--
-- Notes
-- -----
-- - This migration is conservative and does NOT move the pgvector extension
--   out of public or change access to analytics materialized views; those are
--   intentional, documented design choices for this project.

set check_function_bodies = off;

-- ============================================================================
-- util.build_full_name: pin search_path for security and predictability
-- ============================================================================
-- This function does not reference any tables or custom functions, but we
-- still fix search_path to avoid surprises if a caller mutates search_path.

create or replace function util.build_full_name(
  p_first_name text,
  p_last_name text
)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_first_name is null and p_last_name is null then null
    when p_first_name is null then trim(p_last_name)
    when p_last_name is null then trim(p_first_name)
    else trim(p_first_name) || ' ' || trim(p_last_name)
  end;
$$;

comment on function util.build_full_name(text, text) is
  'Intelligently concatenates first_name and last_name into full_name. Handles nulls gracefully: returns single name if one is null, null if both are null, or properly formatted "First Last" if both exist. Trims whitespace. search_path is fixed for predictable behaviour.';

-- ============================================================================
-- RLS policies: wrap auth.uid() in SELECT for better initplan behaviour
-- ============================================================================
-- Supabase recommends wrapping auth.<function>() calls in SELECT to avoid
-- them being re-evaluated per row. Here we update policies flagged by the
-- auth_rls_initplan lint. We drop and recreate the affected policies with
-- identical semantics but using (select auth.uid()).

-- ----------------------------------------------------------------------------
-- app.work_order_time_entries
-- ----------------------------------------------------------------------------

drop policy if exists work_order_time_entries_delete_tenant on app.work_order_time_entries;

create policy work_order_time_entries_delete_tenant 
  on app.work_order_time_entries 
  for delete 
  to authenticated 
  using (
    authz.is_current_user_tenant_member(tenant_id)
    and (
      created_by = (select auth.uid())
      or authz.is_admin_or_manager((select auth.uid()), tenant_id)
    )
  );

drop policy if exists work_order_time_entries_update_tenant on app.work_order_time_entries;

create policy work_order_time_entries_update_tenant 
  on app.work_order_time_entries 
  for update 
  to authenticated 
  using (
    authz.is_current_user_tenant_member(tenant_id)
    and (
      created_by = (select auth.uid())
      or authz.is_admin_or_manager((select auth.uid()), tenant_id)
    )
  )
  with check (authz.is_current_user_tenant_member(tenant_id));

-- ----------------------------------------------------------------------------
-- app.work_order_attachments
-- ----------------------------------------------------------------------------

drop policy if exists work_order_attachments_delete_tenant on app.work_order_attachments;

create policy work_order_attachments_delete_tenant 
  on app.work_order_attachments 
  for delete 
  to authenticated 
  using (
    authz.is_current_user_tenant_member(tenant_id)
    and (
      created_by = (select auth.uid())
      or authz.is_admin_or_manager((select auth.uid()), tenant_id)
    )
  );

drop policy if exists work_order_attachments_update_tenant on app.work_order_attachments;

create policy work_order_attachments_update_tenant 
  on app.work_order_attachments 
  for update 
  to authenticated 
  using (
    authz.is_current_user_tenant_member(tenant_id)
    and (
      created_by = (select auth.uid())
      or authz.is_admin_or_manager((select auth.uid()), tenant_id)
    )
  )
  with check (authz.is_current_user_tenant_member(tenant_id));

-- ----------------------------------------------------------------------------
-- cfg.pm_templates
-- ----------------------------------------------------------------------------

drop policy if exists pm_templates_insert_authenticated on cfg.pm_templates;

create policy pm_templates_insert_authenticated
  on cfg.pm_templates
  for insert
  to authenticated
  with check (
    authz.is_current_user_tenant_member(tenant_id)
    and authz.has_permission((select auth.uid()), tenant_id, 'tenant.admin')
  );

drop policy if exists pm_templates_update_authenticated on cfg.pm_templates;

create policy pm_templates_update_authenticated
  on cfg.pm_templates
  for update
  to authenticated
  using (
    authz.is_current_user_tenant_member(tenant_id)
    and authz.has_permission((select auth.uid()), tenant_id, 'tenant.admin')
  )
  with check (
    authz.is_current_user_tenant_member(tenant_id)
    and authz.has_permission((select auth.uid()), tenant_id, 'tenant.admin')
  );

drop policy if exists pm_templates_delete_authenticated on cfg.pm_templates;

create policy pm_templates_delete_authenticated
  on cfg.pm_templates
  for delete
  to authenticated
  using (
    authz.is_current_user_tenant_member(tenant_id)
    and authz.has_permission((select auth.uid()), tenant_id, 'tenant.admin')
  );

-- ----------------------------------------------------------------------------
-- cfg.audit_retention_configs
-- ----------------------------------------------------------------------------

drop policy if exists audit_retention_configs_select_authenticated on cfg.audit_retention_configs;

create policy audit_retention_configs_select_authenticated
  on cfg.audit_retention_configs
  for select
  to authenticated
  using (
    authz.is_tenant_member((select auth.uid()), tenant_id)
    and authz.has_permission((select auth.uid()), tenant_id, 'tenant.admin')
  );

drop policy if exists audit_retention_configs_insert_authenticated on cfg.audit_retention_configs;

create policy audit_retention_configs_insert_authenticated
  on cfg.audit_retention_configs
  for insert
  to authenticated
  with check (
    authz.is_tenant_member((select auth.uid()), tenant_id)
    and authz.has_permission((select auth.uid()), tenant_id, 'tenant.admin')
  );

drop policy if exists audit_retention_configs_update_authenticated on cfg.audit_retention_configs;

create policy audit_retention_configs_update_authenticated
  on cfg.audit_retention_configs
  for update
  to authenticated
  using (
    authz.is_tenant_member((select auth.uid()), tenant_id)
    and authz.has_permission((select auth.uid()), tenant_id, 'tenant.admin')
  )
  with check (
    authz.is_tenant_member((select auth.uid()), tenant_id)
    and authz.has_permission((select auth.uid()), tenant_id, 'tenant.admin')
  );

drop policy if exists audit_retention_configs_delete_authenticated on cfg.audit_retention_configs;

create policy audit_retention_configs_delete_authenticated
  on cfg.audit_retention_configs
  for delete
  to authenticated
  using (
    authz.is_tenant_member((select auth.uid()), tenant_id)
    and authz.has_permission((select auth.uid()), tenant_id, 'tenant.admin')
  );

-- ----------------------------------------------------------------------------
-- int.plugin_installations
-- ----------------------------------------------------------------------------

drop policy if exists plugin_installations_select_authenticated on int.plugin_installations;

create policy plugin_installations_select_authenticated
  on int.plugin_installations
  for select
  to authenticated
  using (
    authz.is_tenant_member((select auth.uid()), tenant_id)
    and authz.has_permission((select auth.uid()), tenant_id, 'tenant.admin')
  );

drop policy if exists plugin_installations_insert_authenticated on int.plugin_installations;

create policy plugin_installations_insert_authenticated
  on int.plugin_installations
  for insert
  to authenticated
  with check (
    authz.is_tenant_member((select auth.uid()), tenant_id)
    and authz.has_permission((select auth.uid()), tenant_id, 'tenant.admin')
  );

drop policy if exists plugin_installations_update_authenticated on int.plugin_installations;

create policy plugin_installations_update_authenticated
  on int.plugin_installations
  for update
  to authenticated
  using (
    authz.is_tenant_member((select auth.uid()), tenant_id)
    and authz.has_permission((select auth.uid()), tenant_id, 'tenant.admin')
  )
  with check (
    authz.is_tenant_member((select auth.uid()), tenant_id)
    and authz.has_permission((select auth.uid()), tenant_id, 'tenant.admin')
  );

drop policy if exists plugin_installations_delete_authenticated on int.plugin_installations;

create policy plugin_installations_delete_authenticated
  on int.plugin_installations
  for delete
  to authenticated
  using (
    authz.is_tenant_member((select auth.uid()), tenant_id)
    and authz.has_permission((select auth.uid()), tenant_id, 'tenant.admin')
  );

