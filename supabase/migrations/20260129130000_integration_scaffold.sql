-- SPDX-License-Identifier: AGPL-3.0-or-later
/*
  migration: 20260129130000_integration_scaffold
  purpose: introduce integration/plugin catalog and tenant installation state
  affected:
    - int.plugins
    - int.plugin_installations
    - public.v_plugins
    - public.v_plugin_installations
    - public.rpc_install_plugin
    - public.rpc_update_plugin_installation
    - public.rpc_uninstall_plugin
  notes:
    - secrets and tokens are stored externally; only opaque secret_ref is stored
*/

create table if not exists int.plugins (
  id uuid primary key default extensions.gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  is_integration boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint plugins_key_format_check check (
    key ~ '^[a-z0-9_]+$'
    and length(key) >= 2
    and length(key) <= 80
  )
);

comment on table int.plugins is
  'Catalog of available plugins and integrations. Entries are managed by core system code, not tenant users. Integrations are plugins that connect to external systems.';
comment on column int.plugins.key is
  'Stable identifier for the plugin/integration (lowercase snake_case). Used by RPCs and external runtimes.';
comment on column int.plugins.is_integration is
  'Marks whether the plugin connects to an external system. Integrations are a plugin subtype.';
comment on column int.plugins.is_active is
  'Controls whether the plugin is available for installation. Inactive plugins cannot be installed.';

create trigger plugins_set_updated_at
  before update on int.plugins
  for each row
  execute function util.set_updated_at();

create table if not exists int.plugin_installations (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  plugin_id uuid not null references int.plugins(id) on delete cascade,
  status text not null default 'installed' check (status in ('installed', 'disabled', 'uninstalled')),
  secret_ref text,
  config jsonb,
  installed_by uuid references auth.users(id) on delete set null,
  installed_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint plugin_installations_tenant_plugin_unique unique (tenant_id, plugin_id)
);

comment on table int.plugin_installations is
  'Tenant installation state for plugins and integrations. Stores configuration metadata and references to external secrets.';
comment on column int.plugin_installations.secret_ref is
  'Opaque reference to external secrets storage. Secrets and tokens must never be stored in Postgres.';
comment on column int.plugin_installations.config is
  'Non-secret configuration metadata for the plugin installation (jsonb).';
comment on column int.plugin_installations.status is
  'Lifecycle state for the installation: installed, disabled, or uninstalled.';

create index if not exists plugin_installations_tenant_idx
  on int.plugin_installations (tenant_id, status);

create index if not exists plugin_installations_plugin_idx
  on int.plugin_installations (plugin_id);

create trigger plugin_installations_set_updated_at
  before update on int.plugin_installations
  for each row
  execute function util.set_updated_at();

alter table int.plugins enable row level security;
alter table int.plugin_installations enable row level security;

-- Plugins: read-only for authenticated users. No direct writes from clients.
create policy plugins_select_authenticated
  on int.plugins
  for select
  to authenticated
  using (true);

create policy plugins_select_anon
  on int.plugins
  for select
  to anon
  using (false);

create policy plugins_insert_authenticated
  on int.plugins
  for insert
  to authenticated
  with check (false);

create policy plugins_insert_anon
  on int.plugins
  for insert
  to anon
  with check (false);

create policy plugins_update_authenticated
  on int.plugins
  for update
  to authenticated
  using (false)
  with check (false);

create policy plugins_update_anon
  on int.plugins
  for update
  to anon
  using (false)
  with check (false);

create policy plugins_delete_authenticated
  on int.plugins
  for delete
  to authenticated
  using (false);

create policy plugins_delete_anon
  on int.plugins
  for delete
  to anon
  using (false);

-- Plugin installations: tenant scoped; admin-managed.
create policy plugin_installations_select_authenticated
  on int.plugin_installations
  for select
  to authenticated
  using (
    authz.is_tenant_member(auth.uid(), tenant_id)
  );

create policy plugin_installations_select_anon
  on int.plugin_installations
  for select
  to anon
  using (false);

create policy plugin_installations_insert_authenticated
  on int.plugin_installations
  for insert
  to authenticated
  with check (
    authz.is_tenant_member(auth.uid(), tenant_id)
    and authz.has_permission(auth.uid(), tenant_id, 'tenant.admin')
  );

create policy plugin_installations_insert_anon
  on int.plugin_installations
  for insert
  to anon
  with check (false);

create policy plugin_installations_update_authenticated
  on int.plugin_installations
  for update
  to authenticated
  using (
    authz.is_tenant_member(auth.uid(), tenant_id)
    and authz.has_permission(auth.uid(), tenant_id, 'tenant.admin')
  )
  with check (
    authz.is_tenant_member(auth.uid(), tenant_id)
    and authz.has_permission(auth.uid(), tenant_id, 'tenant.admin')
  );

create policy plugin_installations_update_anon
  on int.plugin_installations
  for update
  to anon
  using (false)
  with check (false);

create policy plugin_installations_delete_authenticated
  on int.plugin_installations
  for delete
  to authenticated
  using (
    authz.is_tenant_member(auth.uid(), tenant_id)
    and authz.has_permission(auth.uid(), tenant_id, 'tenant.admin')
  );

create policy plugin_installations_delete_anon
  on int.plugin_installations
  for delete
  to anon
  using (false);

create trigger plugins_audit_changes
  after insert or update or delete on int.plugins
  for each row execute function audit.log_entity_change();

create trigger plugin_installations_audit_changes
  after insert or update or delete on int.plugin_installations
  for each row execute function audit.log_entity_change();

create or replace view public.v_plugins as
select
  id,
  key,
  name,
  description,
  is_integration,
  is_active,
  created_at,
  updated_at
from int.plugins
where is_active = true;

comment on view public.v_plugins is
  'Public catalog of active plugins and integrations. Read-only view for client discovery.';

create or replace view public.v_plugin_installations as
select
  pi.id,
  pi.tenant_id,
  pi.plugin_id,
  p.key as plugin_key,
  p.name as plugin_name,
  p.is_integration,
  pi.status,
  pi.secret_ref,
  pi.config,
  pi.installed_by,
  pi.installed_at,
  pi.updated_at
from int.plugin_installations pi
join int.plugins p on p.id = pi.plugin_id
where pi.tenant_id = authz.get_current_tenant_id();

comment on view public.v_plugin_installations is
  'Tenant-scoped plugin installation status for the current tenant context. Includes plugin metadata and configuration references.';

create or replace function public.rpc_install_plugin(
  p_tenant_id uuid,
  p_plugin_key text,
  p_secret_ref text default null,
  p_config jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_plugin_id uuid;
  v_installation_id uuid;
begin
  v_user_id := authz.rpc_setup(p_tenant_id, 'tenant.admin');

  perform util.check_rate_limit('plugin_install', null, 10, 1, v_user_id, p_tenant_id);

  if p_secret_ref is not null and length(pg_catalog.btrim(p_secret_ref)) = 0 then
    raise exception using
      message = 'Secret reference must be non-empty when provided',
      errcode = '23514';
  end if;

  select id into v_plugin_id
  from int.plugins
  where key = p_plugin_key
    and is_active = true;

  if v_plugin_id is null then
    raise exception using
      message = format('Plugin %s not found or inactive', p_plugin_key),
      errcode = 'P0001';
  end if;

  insert into int.plugin_installations (
    tenant_id,
    plugin_id,
    status,
    secret_ref,
    config,
    installed_by
  )
  values (
    p_tenant_id,
    v_plugin_id,
    'installed',
    p_secret_ref,
    p_config,
    v_user_id
  )
  on conflict (tenant_id, plugin_id)
  do update set
    status = 'installed',
    secret_ref = excluded.secret_ref,
    config = excluded.config,
    installed_by = v_user_id,
    updated_at = pg_catalog.now()
  returning id into v_installation_id;

  return v_installation_id;
end;
$$;

comment on function public.rpc_install_plugin(uuid, text, text, jsonb) is
  'Installs or re-installs a plugin for a tenant. Requires tenant.admin permission. Stores only secret_ref (opaque reference) and non-secret config. Returns installation id.';

revoke all on function public.rpc_install_plugin(uuid, text, text, jsonb) from public;
grant execute on function public.rpc_install_plugin(uuid, text, text, jsonb) to authenticated;

create or replace function public.rpc_update_plugin_installation(
  p_tenant_id uuid,
  p_installation_id uuid,
  p_status text default null,
  p_secret_ref text default null,
  p_config jsonb default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_installation_tenant_id uuid;
begin
  v_user_id := authz.rpc_setup(p_tenant_id, 'tenant.admin');

  perform util.check_rate_limit('plugin_update', null, 20, 1, v_user_id, p_tenant_id);

  if p_secret_ref is not null and length(pg_catalog.btrim(p_secret_ref)) = 0 then
    raise exception using
      message = 'Secret reference must be non-empty when provided',
      errcode = '23514';
  end if;

  if p_status is not null and p_status not in ('installed', 'disabled', 'uninstalled') then
    raise exception using
      message = format('Invalid plugin installation status: %s', p_status),
      errcode = '23514';
  end if;

  select tenant_id into v_installation_tenant_id
  from int.plugin_installations
  where id = p_installation_id;

  if v_installation_tenant_id is null then
    raise exception using
      message = 'Plugin installation not found',
      errcode = 'P0001';
  end if;

  if v_installation_tenant_id != p_tenant_id then
    raise exception using
      message = 'Unauthorized: Plugin installation does not belong to this tenant',
      errcode = '42501';
  end if;

  update int.plugin_installations
  set
    status = coalesce(p_status, status),
    secret_ref = coalesce(p_secret_ref, secret_ref),
    config = coalesce(p_config, config),
    updated_at = pg_catalog.now()
  where id = p_installation_id;
end;
$$;

comment on function public.rpc_update_plugin_installation(uuid, uuid, text, text, jsonb) is
  'Updates plugin installation status/config for a tenant. Requires tenant.admin permission. Only stores secret_ref (opaque reference).';

revoke all on function public.rpc_update_plugin_installation(uuid, uuid, text, text, jsonb) from public;
grant execute on function public.rpc_update_plugin_installation(uuid, uuid, text, text, jsonb) to authenticated;

create or replace function public.rpc_uninstall_plugin(
  p_tenant_id uuid,
  p_installation_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_installation_tenant_id uuid;
begin
  v_user_id := authz.rpc_setup(p_tenant_id, 'tenant.admin');

  perform util.check_rate_limit('plugin_uninstall', null, 10, 1, v_user_id, p_tenant_id);

  select tenant_id into v_installation_tenant_id
  from int.plugin_installations
  where id = p_installation_id;

  if v_installation_tenant_id is null then
    raise exception using
      message = 'Plugin installation not found',
      errcode = 'P0001';
  end if;

  if v_installation_tenant_id != p_tenant_id then
    raise exception using
      message = 'Unauthorized: Plugin installation does not belong to this tenant',
      errcode = '42501';
  end if;

  delete from int.plugin_installations
  where id = p_installation_id;
end;
$$;

comment on function public.rpc_uninstall_plugin(uuid, uuid) is
  'Uninstalls a plugin for a tenant by deleting the installation record. Requires tenant.admin permission. Deletions are audited in audit.entity_changes.';

revoke all on function public.rpc_uninstall_plugin(uuid, uuid) from public;
grant execute on function public.rpc_uninstall_plugin(uuid, uuid) to authenticated;
