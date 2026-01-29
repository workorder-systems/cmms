-- SPDX-License-Identifier: AGPL-3.0-or-later
/*
  migration: 20260129133000_public_api_naming
  purpose: align public view naming with ADR 0010 conventions
  affected:
    - public.v_work_orders_summary
    - public.v_assets_summary
    - public.v_locations_summary
    - public.v_tenants_overview
    - deprecate: v_work_order_summary, v_asset_summary, v_location_summary, v_tenant_overview
*/

create or replace view public.v_work_orders_summary as
select *
from public.mv_work_order_summary
where tenant_id = authz.get_current_tenant_id();

comment on view public.v_work_orders_summary is
  'Tenant-scoped work orders summary. Plural naming per ADR 0010. Filters materialized view by tenant.';

create or replace view public.v_assets_summary as
select *
from public.mv_asset_summary
where tenant_id = authz.get_current_tenant_id();

comment on view public.v_assets_summary is
  'Tenant-scoped assets summary. Plural naming per ADR 0010. Filters materialized view by tenant.';

create or replace view public.v_locations_summary as
select *
from public.mv_location_summary
where tenant_id = authz.get_current_tenant_id();

comment on view public.v_locations_summary is
  'Tenant-scoped locations summary. Plural naming per ADR 0010. Filters materialized view by tenant.';

create or replace view public.v_tenants_overview as
select *
from public.mv_tenant_overview
where tenant_id = authz.get_current_tenant_id()
  and exists (
    select 1
    from app.tenant_memberships
    where tenant_id = mv_tenant_overview.tenant_id
      and user_id = (select auth.uid())
  );

comment on view public.v_tenants_overview is
  'Tenant overview for current tenant. Plural naming per ADR 0010. Only accessible to tenant members.';

comment on view public.v_work_order_summary is
  'Deprecated. Use public.v_work_orders_summary instead (plural naming per ADR 0010).';

comment on view public.v_asset_summary is
  'Deprecated. Use public.v_assets_summary instead (plural naming per ADR 0010).';

comment on view public.v_location_summary is
  'Deprecated. Use public.v_locations_summary instead (plural naming per ADR 0010).';

comment on view public.v_tenant_overview is
  'Deprecated. Use public.v_tenants_overview instead (plural naming per ADR 0010).';
