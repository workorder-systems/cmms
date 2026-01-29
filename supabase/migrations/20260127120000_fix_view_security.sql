-- SPDX-License-Identifier: AGPL-3.0-or-later

drop view if exists public.v_tenant_roles;

create view public.v_tenant_roles as
select
  tr.id,
  tr.tenant_id,
  tr.key,
  tr.name,
  tr.is_default,
  tr.is_system,
  tr.created_at,
  tr.updated_at
from cfg.tenant_roles tr
where tr.tenant_id = authz.get_current_tenant_id();

comment on view public.v_tenant_roles is 'Tenant roles scoped to the current tenant context. Clients must set tenant context via rpc_set_tenant_context.';

drop view if exists public.v_role_permissions;

create view public.v_role_permissions as
select
  trp.id,
  trp.tenant_role_id,
  tr.tenant_id,
  tr.key as role_key,
  tr.name as role_name,
  p.id as permission_id,
  p.key as permission_key,
  p.name as permission_name,
  p.category as permission_category,
  trp.granted_at
from cfg.tenant_role_permissions trp
join cfg.tenant_roles tr on trp.tenant_role_id = tr.id
join cfg.permissions p on trp.permission_id = p.id
where tr.tenant_id = authz.get_current_tenant_id();

comment on view public.v_role_permissions is 'Role-permission mappings scoped to the current tenant context. Clients must set tenant context via rpc_set_tenant_context.';

drop view if exists public.v_rls_policy_stats;

revoke all on public.v_tenant_roles from anon;
grant select on public.v_tenant_roles to authenticated;

revoke all on public.v_role_permissions from anon;
grant select on public.v_role_permissions to authenticated;

revoke all on public.v_permissions from anon;
grant select on public.v_permissions to authenticated;
