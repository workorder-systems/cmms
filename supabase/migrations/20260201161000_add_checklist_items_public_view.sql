-- ============================================================================
-- Add Public View for PM Template Checklist Items
-- ============================================================================
-- Purpose: Creates a public view for PM template checklist items following
--          ADR 0001 (public views for reads) and ADR 0010 (v_<resource> naming).
-- 
-- This allows clients to read checklist items via the public API contract
-- instead of accessing cfg schema directly.
-- ============================================================================

-- Create public view for PM template checklist items
-- Follows ADR 0001: public views for reads, ADR 0010: v_<resource> naming
create or replace view public.v_pm_template_checklist_items as
select
  ci.id,
  ci.template_id,
  pt.tenant_id,
  ci.description,
  ci.required,
  ci.display_order,
  ci.created_at
from cfg.pm_template_checklist_items ci
join cfg.pm_templates pt on ci.template_id = pt.id
where pt.tenant_id = authz.get_current_tenant_id()
order by ci.display_order asc;

comment on view public.v_pm_template_checklist_items is
  'PM template checklist items for current tenant. Read-only view following ADR 0001 (public views for reads). Clients must set tenant context via rpc_set_tenant_context. Items are ordered by display_order.';

grant select on public.v_pm_template_checklist_items to authenticated;
grant select on public.v_pm_template_checklist_items to anon;

-- Set security_invoker = false for performance (view runs with owner privileges)
-- This is safe because the WHERE clause filters by tenant_id from authz.get_current_tenant_id()
alter view public.v_pm_template_checklist_items set (security_invoker = false);
