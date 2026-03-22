-- SPDX-License-Identifier: AGPL-3.0-or-later
--
-- Assets: warranties (multi-row), sync assets.warranty_expires_at, lifecycle alerts view,
-- asset downtime events + reason catalog, reporting availability view.

insert into cfg.permissions (key, name, category, description) values
  ('asset.warranty.manage', 'Manage Asset Warranties', 'asset', 'Create and edit warranty records on assets'),
  ('downtime.record', 'Record Asset Downtime', 'downtime', 'Create and close downtime events'),
  ('downtime.view', 'View Asset Downtime', 'downtime', 'View downtime history and availability')
on conflict (key) do nothing;

insert into cfg.tenant_role_permissions (tenant_role_id, permission_id)
select tr.id, p.id
from cfg.tenant_roles tr
cross join cfg.permissions p
where tr.key = 'admin'
  and p.key in ('asset.warranty.manage', 'downtime.record', 'downtime.view')
  and not exists (
    select 1 from cfg.tenant_role_permissions x
    where x.tenant_role_id = tr.id and x.permission_id = p.id
  );

insert into cfg.tenant_role_permissions (tenant_role_id, permission_id)
select tr.id, p.id
from cfg.tenant_roles tr
cross join cfg.permissions p
where tr.key = 'manager'
  and p.key in ('asset.warranty.manage', 'downtime.record', 'downtime.view')
  and not exists (
    select 1 from cfg.tenant_role_permissions x
    where x.tenant_role_id = tr.id and x.permission_id = p.id
  );

insert into cfg.tenant_role_permissions (tenant_role_id, permission_id)
select tr.id, p.id
from cfg.tenant_roles tr
cross join cfg.permissions p
where tr.key = 'technician'
  and p.key in ('downtime.record', 'downtime.view')
  and not exists (
    select 1 from cfg.tenant_role_permissions x
    where x.tenant_role_id = tr.id and x.permission_id = p.id
  );

-- ============================================================================
-- cfg.downtime_reasons
-- ============================================================================

create table cfg.downtime_reasons (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  key text not null,
  name text not null,
  display_order integer not null default 0,
  is_system boolean not null default false,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint downtime_reasons_unique unique (tenant_id, key),
  constraint downtime_reasons_key_format check (
    key ~ '^[a-z0-9_]+$' and length(key) between 1 and 50
  )
);

create trigger downtime_reasons_set_updated_at
  before update on cfg.downtime_reasons
  for each row
  execute function util.set_updated_at();

alter table cfg.downtime_reasons enable row level security;

create policy downtime_reasons_select_auth on cfg.downtime_reasons for select to authenticated
  using (authz.is_current_user_tenant_member(tenant_id));
create policy downtime_reasons_select_anon on cfg.downtime_reasons for select to anon
  using (authz.is_current_user_tenant_member(tenant_id));
create policy downtime_reasons_insert_auth on cfg.downtime_reasons for insert to authenticated
  with check (
    authz.is_current_user_tenant_member(tenant_id)
    and authz.has_current_user_permission(tenant_id, 'tenant.admin')
  );
create policy downtime_reasons_insert_anon on cfg.downtime_reasons for insert to anon with check (false);
create policy downtime_reasons_update_auth on cfg.downtime_reasons for update to authenticated
  using (
    authz.is_current_user_tenant_member(tenant_id)
    and authz.has_current_user_permission(tenant_id, 'tenant.admin')
  )
  with check (
    authz.is_current_user_tenant_member(tenant_id)
    and authz.has_current_user_permission(tenant_id, 'tenant.admin')
  );
create policy downtime_reasons_update_anon on cfg.downtime_reasons for update to anon using (false) with check (false);
create policy downtime_reasons_delete_auth on cfg.downtime_reasons for delete to authenticated
  using (
    authz.is_current_user_tenant_member(tenant_id)
    and authz.has_current_user_permission(tenant_id, 'tenant.admin')
  );
create policy downtime_reasons_delete_anon on cfg.downtime_reasons for delete to anon using (false);

alter table cfg.downtime_reasons force row level security;
grant select on cfg.downtime_reasons to authenticated, anon;
grant insert, update, delete on cfg.downtime_reasons to authenticated;

-- ============================================================================
-- app.asset_warranties
-- ============================================================================

create table app.asset_warranties (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  asset_id uuid not null references app.assets(id) on delete cascade,
  supplier_id uuid references app.suppliers(id) on delete set null,
  warranty_type text not null default 'standard',
  starts_on date,
  expires_on date not null,
  coverage_summary text,
  external_reference text,
  is_active boolean not null default true,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint asset_warranties_type_check check (
    warranty_type ~ '^[a-z0-9_]+$' and length(warranty_type) between 1 and 50
  )
);

comment on table app.asset_warranties is
  'Multiple warranty records per asset; assets.warranty_expires_at is the max active expires_on.';

create index asset_warranties_asset_idx on app.asset_warranties (tenant_id, asset_id);
create index asset_warranties_expires_idx on app.asset_warranties (tenant_id, expires_on) where is_active = true;

create trigger asset_warranties_set_updated_at
  before update on app.asset_warranties
  for each row
  execute function util.set_updated_at();

create or replace function util.validate_asset_warranties_tenant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_asset_tenant uuid;
  v_supplier_tenant uuid;
begin
  select tenant_id into v_asset_tenant from app.assets where id = new.asset_id;
  if v_asset_tenant is null or v_asset_tenant != new.tenant_id then
    raise exception using message = 'asset tenant mismatch', errcode = '23503';
  end if;
  if new.supplier_id is not null then
    select tenant_id into v_supplier_tenant from app.suppliers where id = new.supplier_id;
    if v_supplier_tenant is null or v_supplier_tenant != new.tenant_id then
      raise exception using message = 'supplier tenant mismatch', errcode = '23503';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function util.validate_asset_warranties_tenant() from public;
grant execute on function util.validate_asset_warranties_tenant() to postgres;

create trigger asset_warranties_validate_tenant
  before insert or update on app.asset_warranties
  for each row
  execute function util.validate_asset_warranties_tenant();

alter table app.asset_warranties enable row level security;

create policy asset_warranties_select_auth on app.asset_warranties for select to authenticated
  using (authz.is_current_user_tenant_member(tenant_id));
create policy asset_warranties_select_anon on app.asset_warranties for select to anon
  using (authz.is_current_user_tenant_member(tenant_id));
create policy asset_warranties_insert_auth on app.asset_warranties for insert to authenticated
  with check (
    authz.is_current_user_tenant_member(tenant_id)
    and authz.has_current_user_permission(tenant_id, 'asset.warranty.manage')
  );
create policy asset_warranties_insert_anon on app.asset_warranties for insert to anon with check (false);
create policy asset_warranties_update_auth on app.asset_warranties for update to authenticated
  using (
    authz.is_current_user_tenant_member(tenant_id)
    and authz.has_current_user_permission(tenant_id, 'asset.warranty.manage')
  )
  with check (
    authz.is_current_user_tenant_member(tenant_id)
    and authz.has_current_user_permission(tenant_id, 'asset.warranty.manage')
  );
create policy asset_warranties_update_anon on app.asset_warranties for update to anon using (false) with check (false);
create policy asset_warranties_delete_auth on app.asset_warranties for delete to authenticated
  using (
    authz.is_current_user_tenant_member(tenant_id)
    and authz.has_current_user_permission(tenant_id, 'asset.warranty.manage')
  );
create policy asset_warranties_delete_anon on app.asset_warranties for delete to anon using (false);

alter table app.asset_warranties force row level security;
grant select, insert, update, delete on app.asset_warranties to authenticated;

create or replace function app.sync_asset_warranty_expires_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_asset uuid;
  v_max date;
begin
  v_asset := coalesce(new.asset_id, old.asset_id);
  select max(w.expires_on) into v_max
  from app.asset_warranties w
  where w.asset_id = v_asset
    and w.is_active = true;

  update app.assets
  set warranty_expires_at = v_max
  where id = v_asset;
  return null;
end;
$$;

revoke all on function app.sync_asset_warranty_expires_at() from public;
grant execute on function app.sync_asset_warranty_expires_at() to postgres;

create trigger asset_warranties_sync_asset_expiry
  after insert or update or delete on app.asset_warranties
  for each row
  execute function app.sync_asset_warranty_expires_at();

-- ============================================================================
-- app.asset_downtime_events
-- ============================================================================

create table app.asset_downtime_events (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  asset_id uuid not null references app.assets(id) on delete cascade,
  reason_key text not null,
  started_at timestamptz not null default pg_catalog.now(),
  ended_at timestamptz,
  linked_work_order_id uuid references app.work_orders(id) on delete set null,
  recorded_by uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint asset_downtime_ended_after_started check (
    ended_at is null or ended_at >= started_at
  ),
  constraint asset_downtime_reason_key_format check (
    reason_key ~ '^[a-z0-9_]+$' and length(reason_key) between 1 and 50
  )
);

create index asset_downtime_asset_started_idx on app.asset_downtime_events (tenant_id, asset_id, started_at desc);
create index asset_downtime_open_idx on app.asset_downtime_events (tenant_id, asset_id)
  where ended_at is null;

create trigger asset_downtime_events_set_updated_at
  before update on app.asset_downtime_events
  for each row
  execute function util.set_updated_at();

create or replace function util.validate_asset_downtime_tenant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_asset_tenant uuid;
  v_wo_tenant uuid;
begin
  select tenant_id into v_asset_tenant from app.assets where id = new.asset_id;
  if v_asset_tenant is null or v_asset_tenant != new.tenant_id then
    raise exception using message = 'asset tenant mismatch', errcode = '23503';
  end if;
  if new.linked_work_order_id is not null then
    select tenant_id into v_wo_tenant from app.work_orders where id = new.linked_work_order_id;
    if v_wo_tenant is null or v_wo_tenant != new.tenant_id then
      raise exception using message = 'work order tenant mismatch', errcode = '23503';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function util.validate_asset_downtime_tenant() from public;
grant execute on function util.validate_asset_downtime_tenant() to postgres;

create trigger asset_downtime_events_validate_tenant
  before insert or update on app.asset_downtime_events
  for each row
  execute function util.validate_asset_downtime_tenant();

alter table app.asset_downtime_events enable row level security;

create policy asset_downtime_select_auth on app.asset_downtime_events for select to authenticated
  using (
    authz.is_current_user_tenant_member(tenant_id)
    and authz.has_current_user_permission(tenant_id, 'downtime.view')
  );
create policy asset_downtime_select_anon on app.asset_downtime_events for select to anon using (false);
create policy asset_downtime_insert_auth on app.asset_downtime_events for insert to authenticated
  with check (
    authz.is_current_user_tenant_member(tenant_id)
    and authz.has_current_user_permission(tenant_id, 'downtime.record')
  );
create policy asset_downtime_insert_anon on app.asset_downtime_events for insert to anon with check (false);
create policy asset_downtime_update_auth on app.asset_downtime_events for update to authenticated
  using (
    authz.is_current_user_tenant_member(tenant_id)
    and authz.has_current_user_permission(tenant_id, 'downtime.record')
  )
  with check (
    authz.is_current_user_tenant_member(tenant_id)
    and authz.has_current_user_permission(tenant_id, 'downtime.record')
  );
create policy asset_downtime_update_anon on app.asset_downtime_events for update to anon using (false) with check (false);
create policy asset_downtime_delete_auth on app.asset_downtime_events for delete to authenticated
  using (
    authz.is_current_user_tenant_member(tenant_id)
    and authz.has_current_user_permission(tenant_id, 'downtime.record')
  );
create policy asset_downtime_delete_anon on app.asset_downtime_events for delete to anon using (false);

alter table app.asset_downtime_events force row level security;
grant select, insert, update, delete on app.asset_downtime_events to authenticated;

-- ============================================================================
-- Replace lifecycle alerts: warranties + legacy assets.warranty_expires_at
-- ============================================================================

create or replace view app.v_asset_lifecycle_alerts
with (security_invoker = true)
as
select
  a.id as asset_id,
  a.tenant_id,
  'warranty_expiring'::text as alert_type,
  coalesce(w.expires_on, a.warranty_expires_at) as reference_date,
  (coalesce(w.expires_on, a.warranty_expires_at) - current_date)::integer as days_until
from app.assets a
left join lateral (
  select w2.expires_on
  from app.asset_warranties w2
  where w2.asset_id = a.id
    and w2.tenant_id = a.tenant_id
    and w2.is_active = true
    and w2.expires_on between current_date and current_date + 365
  order by w2.expires_on asc
  limit 1
) w on true
where a.tenant_id is not null
  and coalesce(w.expires_on, a.warranty_expires_at) is not null
  and coalesce(w.expires_on, a.warranty_expires_at) between current_date and current_date + 365
union all
select
  a.id,
  a.tenant_id,
  'eol_approaching',
  a.end_of_life_estimate,
  (a.end_of_life_estimate - current_date)::integer
from app.assets a
where a.tenant_id is not null
  and a.end_of_life_estimate is not null
  and a.end_of_life_estimate between current_date and current_date + 365
union all
select
  a.id,
  a.tenant_id,
  'contract_expiring',
  a.service_contract_expires_at,
  (a.service_contract_expires_at - current_date)::integer
from app.assets a
where a.tenant_id is not null
  and a.service_contract_expires_at is not null
  and a.service_contract_expires_at between current_date and current_date + 365
union all
select
  a.id,
  a.tenant_id,
  'planned_replacement_due',
  a.planned_replacement_date,
  (a.planned_replacement_date - current_date)::integer
from app.assets a
where a.tenant_id is not null
  and a.planned_replacement_date is not null
  and a.planned_replacement_date between current_date and current_date + 365;

comment on view app.v_asset_lifecycle_alerts is
  'Lifecycle alerts; warranty uses earliest expiring active asset_warranties row or assets.warranty_expires_at.';

-- public wrapper if exists — refresh definition
create or replace view public.v_asset_lifecycle_alerts
with (security_invoker = true)
as
select *
from app.v_asset_lifecycle_alerts
where tenant_id = authz.get_current_tenant_id();

grant select on public.v_asset_lifecycle_alerts to authenticated, anon;

-- ============================================================================
-- Reporting: simple monthly downtime minutes per asset
-- ============================================================================

create or replace view reporting.v_asset_downtime_monthly
with (security_invoker = true)
as
select
  d.tenant_id,
  d.asset_id,
  date_trunc('month', d.started_at)::date as month_start,
  sum(
    extract(epoch from (
      coalesce(d.ended_at, pg_catalog.now()) - d.started_at
    )) / 60.0
  )::numeric as downtime_minutes
from app.asset_downtime_events d
where d.tenant_id = authz.get_current_tenant_id()
group by d.tenant_id, d.asset_id, date_trunc('month', d.started_at);

comment on view reporting.v_asset_downtime_monthly is
  'Aggregated downtime minutes per asset per calendar month for the current tenant.';

grant select on reporting.v_asset_downtime_monthly to authenticated, anon;

-- ============================================================================
-- RPCs
-- ============================================================================

create or replace function public.rpc_upsert_asset_warranty(
  p_tenant_id uuid,
  p_asset_id uuid,
  p_warranty_id uuid default null,
  p_expires_on date default null,
  p_starts_on date default null,
  p_warranty_type text default 'standard',
  p_supplier_id uuid default null,
  p_coverage_summary text default null,
  p_external_reference text default null,
  p_is_active boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_asset_tenant uuid;
begin
  perform authz.rpc_setup(p_tenant_id, 'asset.warranty.manage');

  select tenant_id into v_asset_tenant from app.assets where id = p_asset_id;
  if not found or v_asset_tenant != p_tenant_id then
    raise exception using message = 'Asset not found', errcode = 'P0001';
  end if;

  if p_warranty_id is null then
    if p_expires_on is null then
      raise exception using message = 'expires_on required', errcode = '23514';
    end if;
    insert into app.asset_warranties (
      tenant_id, asset_id, supplier_id, warranty_type, starts_on, expires_on,
      coverage_summary, external_reference, is_active
    )
    values (
      p_tenant_id, p_asset_id, p_supplier_id, coalesce(nullif(trim(p_warranty_type), ''), 'standard'),
      p_starts_on, p_expires_on, p_coverage_summary, p_external_reference, coalesce(p_is_active, true)
    )
    returning id into v_id;
    return v_id;
  end if;

  update app.asset_warranties
  set
    supplier_id = coalesce(p_supplier_id, supplier_id),
    warranty_type = coalesce(nullif(trim(p_warranty_type), ''), warranty_type),
    starts_on = coalesce(p_starts_on, starts_on),
    expires_on = coalesce(p_expires_on, expires_on),
    coverage_summary = coalesce(p_coverage_summary, coverage_summary),
    external_reference = coalesce(p_external_reference, external_reference),
    is_active = coalesce(p_is_active, is_active),
    updated_at = pg_catalog.now()
  where id = p_warranty_id
    and tenant_id = p_tenant_id
    and asset_id = p_asset_id
  returning id into v_id;

  if v_id is null then
    raise exception using message = 'Warranty not found', errcode = 'P0001';
  end if;

  return v_id;
end;
$$;

revoke all on function public.rpc_upsert_asset_warranty(uuid, uuid, uuid, date, date, text, uuid, text, text, boolean) from public;
grant execute on function public.rpc_upsert_asset_warranty(uuid, uuid, uuid, date, date, text, uuid, text, text, boolean) to authenticated;

create or replace function public.rpc_record_asset_downtime(
  p_tenant_id uuid,
  p_asset_id uuid,
  p_reason_key text,
  p_started_at timestamptz default null,
  p_ended_at timestamptz default null,
  p_linked_work_order_id uuid default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_uid uuid := auth.uid();
begin
  perform authz.rpc_setup(p_tenant_id, 'downtime.record');

  insert into app.asset_downtime_events (
    tenant_id, asset_id, reason_key, started_at, ended_at, linked_work_order_id, recorded_by, notes
  )
  values (
    p_tenant_id,
    p_asset_id,
    trim(p_reason_key),
    coalesce(p_started_at, pg_catalog.now()),
    p_ended_at,
    p_linked_work_order_id,
    v_uid,
    p_notes
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.rpc_record_asset_downtime(uuid, uuid, text, timestamptz, timestamptz, uuid, text) from public;
grant execute on function public.rpc_record_asset_downtime(uuid, uuid, text, timestamptz, timestamptz, uuid, text) to authenticated;

create or replace function cfg.create_default_downtime_reasons(
  p_tenant_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into cfg.downtime_reasons (tenant_id, key, name, display_order, is_system)
  values
    (p_tenant_id, 'breakdown', 'Breakdown', 1, true),
    (p_tenant_id, 'planned_maintenance', 'Planned maintenance', 2, true),
    (p_tenant_id, 'no_demand', 'No demand / idle', 3, true),
    (p_tenant_id, 'other', 'Other', 4, true)
  on conflict (tenant_id, key) do nothing;
end;
$$;

revoke all on function cfg.create_default_downtime_reasons(uuid) from public;
grant execute on function cfg.create_default_downtime_reasons(uuid) to postgres;

-- Seed downtime reasons for existing tenants
insert into cfg.downtime_reasons (tenant_id, key, name, display_order, is_system)
select t.id, v.key, v.name, v.ord, true
from app.tenants t
cross join (
  values
    ('breakdown'::text, 'Breakdown'::text, 1),
    ('planned_maintenance', 'Planned maintenance', 2),
    ('no_demand', 'No demand / idle', 3),
    ('other', 'Other', 4)
) as v(key, name, ord)
where not exists (
  select 1 from cfg.downtime_reasons dr
  where dr.tenant_id = t.id and dr.key = v.key
);

-- Hook into tenant creation
create or replace function cfg.create_default_tenant_roles(
  p_tenant_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_role_id uuid;
  v_member_role_id uuid;
  v_technician_role_id uuid;
  v_manager_role_id uuid;
  v_requestor_role_id uuid;
begin
  insert into cfg.tenant_roles (tenant_id, key, name, is_default, is_system)
  values (p_tenant_id, 'admin', 'Administrator', false, true)
  returning id into v_admin_role_id;

  insert into cfg.tenant_roles (tenant_id, key, name, is_default, is_system)
  values (p_tenant_id, 'member', 'Member', true, true)
  returning id into v_member_role_id;

  insert into cfg.tenant_roles (tenant_id, key, name, is_default, is_system)
  values (p_tenant_id, 'technician', 'Technician', false, true)
  returning id into v_technician_role_id;

  insert into cfg.tenant_roles (tenant_id, key, name, is_default, is_system)
  values (p_tenant_id, 'manager', 'Manager', false, true)
  returning id into v_manager_role_id;

  insert into cfg.tenant_roles (tenant_id, key, name, is_default, is_system)
  values (p_tenant_id, 'requestor', 'Requestor', false, true)
  returning id into v_requestor_role_id;

  insert into cfg.tenant_role_permissions (tenant_role_id, permission_id)
  select v_admin_role_id, id
  from cfg.permissions;

  insert into cfg.tenant_role_permissions (tenant_role_id, permission_id)
  select v_member_role_id, id
  from cfg.permissions
  where key like '%.view';

  insert into cfg.tenant_role_permissions (tenant_role_id, permission_id)
  select v_technician_role_id, id
  from cfg.permissions
  where key in (
    'workorder.view',
    'workorder.complete.assigned',
    'asset.view',
    'location.view',
    'downtime.record',
    'downtime.view',
    'notification.read',
    'notification.preference.manage'
  );

  insert into cfg.tenant_role_permissions (tenant_role_id, permission_id)
  select v_manager_role_id, id
  from cfg.permissions
  where key like 'workorder.%'
     or key like 'asset.%'
     or key like 'location.%'
     or key like 'downtime.%';

  insert into cfg.tenant_role_permissions (tenant_role_id, permission_id)
  select v_requestor_role_id, id
  from cfg.permissions
  where key in (
    'workorder.request.create',
    'workorder.request.view.own',
    'asset.view',
    'location.view',
    'notification.read',
    'notification.preference.manage'
  );

  perform cfg.create_default_work_order_statuses(p_tenant_id);
  perform cfg.create_default_work_order_priorities(p_tenant_id);
  perform cfg.create_default_asset_statuses(p_tenant_id);
  perform cfg.create_default_maintenance_types(p_tenant_id);
  perform cfg.seed_default_work_order_sla_rules(p_tenant_id);
  perform cfg.create_default_downtime_reasons(p_tenant_id);
end;
$$;
