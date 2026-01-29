-- SPDX-License-Identifier: AGPL-3.0-or-later
/*
  migration: 20260129132000_audit_retention
  purpose: add audit retention configuration, access view, and purge utility
  affected:
    - cfg.audit_retention_configs
    - public.v_audit_permission_changes
    - util.purge_audit_records
  notes:
    - default retention is 24 months unless overridden per tenant
    - purge runs via scheduled job (postgres-only execution)
*/

create table if not exists cfg.audit_retention_configs (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  retention_months integer not null default 24,
  is_active boolean not null default true,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint audit_retention_configs_tenant_unique unique (tenant_id),
  constraint audit_retention_configs_months_check check (
    retention_months >= 1
    and retention_months <= 120
  )
);

comment on table cfg.audit_retention_configs is
  'Tenant-specific audit retention configuration. Overrides the default retention window (24 months) when active.';
comment on column cfg.audit_retention_configs.retention_months is
  'Retention window in months for audit logs. Minimum 1, maximum 120.';
comment on column cfg.audit_retention_configs.is_active is
  'If true, this config overrides the default retention window.';

create index if not exists audit_retention_configs_tenant_idx
  on cfg.audit_retention_configs (tenant_id, is_active);

create trigger audit_retention_configs_set_updated_at
  before update on cfg.audit_retention_configs
  for each row
  execute function util.set_updated_at();

alter table cfg.audit_retention_configs enable row level security;

create policy audit_retention_configs_select_authenticated
  on cfg.audit_retention_configs
  for select
  to authenticated
  using (
    authz.is_tenant_member(auth.uid(), tenant_id)
    and authz.has_permission(auth.uid(), tenant_id, 'tenant.admin')
  );

create policy audit_retention_configs_select_anon
  on cfg.audit_retention_configs
  for select
  to anon
  using (false);

create policy audit_retention_configs_insert_authenticated
  on cfg.audit_retention_configs
  for insert
  to authenticated
  with check (
    authz.is_tenant_member(auth.uid(), tenant_id)
    and authz.has_permission(auth.uid(), tenant_id, 'tenant.admin')
  );

create policy audit_retention_configs_insert_anon
  on cfg.audit_retention_configs
  for insert
  to anon
  with check (false);

create policy audit_retention_configs_update_authenticated
  on cfg.audit_retention_configs
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

create policy audit_retention_configs_update_anon
  on cfg.audit_retention_configs
  for update
  to anon
  using (false)
  with check (false);

create policy audit_retention_configs_delete_authenticated
  on cfg.audit_retention_configs
  for delete
  to authenticated
  using (
    authz.is_tenant_member(auth.uid(), tenant_id)
    and authz.has_permission(auth.uid(), tenant_id, 'tenant.admin')
  );

create policy audit_retention_configs_delete_anon
  on cfg.audit_retention_configs
  for delete
  to anon
  using (false);

create or replace view public.v_audit_permission_changes as
select
  id,
  tenant_id,
  user_id,
  target_user_id,
  change_type,
  role_id,
  permission_id,
  permission_key,
  role_key,
  changed_by,
  created_at
from audit.permission_changes
where tenant_id = authz.get_current_tenant_id()
  and exists (
    select 1
    from app.user_tenant_roles utr
    join cfg.tenant_roles tr on utr.tenant_role_id = tr.id
    where utr.user_id = auth.uid()
      and utr.tenant_id = audit.permission_changes.tenant_id
      and tr.key = 'admin'
  );

comment on view public.v_audit_permission_changes is
  'Tenant-scoped permission audit log view. Only accessible to tenant admins. Returns permission change events for current tenant context.';

create or replace function util.purge_audit_records(
  p_tenant_id uuid,
  p_retention_months integer default null,
  p_dry_run boolean default false
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_retention_months integer;
  v_cutoff timestamptz;
  v_entity_count integer;
  v_permission_count integer;
begin
  if p_retention_months is not null then
    v_retention_months := p_retention_months;
  else
    select retention_months
    into v_retention_months
    from cfg.audit_retention_configs
    where tenant_id = p_tenant_id
      and is_active = true;
  end if;

  if v_retention_months is null then
    v_retention_months := 24;
  end if;

  if v_retention_months < 1 then
    raise exception using
      message = 'Retention months must be at least 1',
      errcode = '23514';
  end if;

  v_cutoff := pg_catalog.now() - pg_catalog.make_interval(months => v_retention_months);

  if p_dry_run then
    select count(*)
    into v_entity_count
    from audit.entity_changes
    where tenant_id = p_tenant_id
      and created_at < v_cutoff;

    select count(*)
    into v_permission_count
    from audit.permission_changes
    where tenant_id = p_tenant_id
      and created_at < v_cutoff;

    return v_entity_count + v_permission_count;
  end if;

  delete from audit.entity_changes
  where tenant_id = p_tenant_id
    and created_at < v_cutoff;
  get diagnostics v_entity_count = row_count;

  delete from audit.permission_changes
  where tenant_id = p_tenant_id
    and created_at < v_cutoff;
  get diagnostics v_permission_count = row_count;

  return v_entity_count + v_permission_count;
end;
$$;

comment on function util.purge_audit_records(uuid, integer, boolean) is
  'Purges audit records older than retention window for a tenant. Uses tenant-specific retention config when present; defaults to 24 months. Dry-run returns the count without deleting. Intended for scheduled jobs.';

revoke all on function util.purge_audit_records(uuid, integer, boolean) from public;
grant execute on function util.purge_audit_records(uuid, integer, boolean) to postgres;
