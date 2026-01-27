-- SPDX-License-Identifier: AGPL-3.0-or-later
create or replace view public.v_rls_policy_stats as
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_catalog.pg_policies
where schemaname in ('app', 'cfg', 'audit')
order by schemaname, tablename, policyname;

comment on view public.v_rls_policy_stats is 
  'Basic view showing RLS policy names and tables for diagnostic purposes.';

begin;

grant usage on schema app to service_role;
grant usage on schema cfg to service_role;

grant select, insert, update, delete on all tables in schema app to service_role;
grant select, insert, update, delete on all tables in schema cfg to service_role;

grant usage, select on all sequences in schema app to service_role;
grant usage, select on all sequences in schema cfg to service_role;

alter default privileges in schema app
grant select, insert, update, delete on tables to service_role;
alter default privileges in schema cfg
grant select, insert, update, delete on tables to service_role;

alter default privileges in schema app
grant usage, select on sequences to service_role;
alter default privileges in schema cfg
grant usage, select on sequences to service_role;

alter table app.tenants force row level security;
alter table app.tenant_memberships force row level security;
alter table app.user_tenant_roles force row level security;
alter table app.locations force row level security;
alter table app.departments force row level security;
alter table app.assets force row level security;
alter table app.work_orders force row level security;

alter view public.v_work_orders set (security_invoker = false);
alter view public.v_assets set (security_invoker = false);
alter view public.v_locations set (security_invoker = false);
alter view public.v_tenants set (security_invoker = false);
alter view public.v_tenant_roles set (security_invoker = false);
alter view public.v_user_tenant_roles set (security_invoker = false);
alter view public.v_permissions set (security_invoker = false);
alter view public.v_role_permissions set (security_invoker = false);
alter view public.v_departments set (security_invoker = false);

commit;
