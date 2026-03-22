/*
 * migration: 20260326102000_supplier_contracts_and_vendor_metric_views.sql
 *
 * purpose: supplier contracts, optional rates, vendor spend and primary-supplier WO metrics views.
 */

-- ============================================================================
-- 1. supplier_contracts + supplier_contract_rates
-- ============================================================================

create table app.supplier_contracts (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  supplier_id uuid not null references app.suppliers(id) on delete cascade,
  contract_number text,
  effective_start date not null,
  effective_end date,
  terms text,
  is_active boolean not null default true,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint supplier_contracts_number_length_check check (
    contract_number is null
    or (length(trim(contract_number)) >= 1 and length(trim(contract_number)) <= 100)
  ),
  constraint supplier_contracts_effective_check check (
    effective_end is null or effective_end >= effective_start
  )
);

comment on table app.supplier_contracts is
  'Commercial agreement between tenant and supplier (contractor). Optional rates on child table.';

create index supplier_contracts_tenant_supplier_idx on app.supplier_contracts (tenant_id, supplier_id);
create index supplier_contracts_tenant_active_idx on app.supplier_contracts (tenant_id, is_active) where is_active = true;

create trigger supplier_contracts_set_updated_at
  before update on app.supplier_contracts
  for each row
  execute function util.set_updated_at();

create or replace function util.validate_supplier_contracts_supplier_tenant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_supplier_tenant uuid;
begin
  select tenant_id into v_supplier_tenant from app.suppliers where id = new.supplier_id;
  if v_supplier_tenant is null or v_supplier_tenant <> new.tenant_id then
    raise exception using message = 'supplier must belong to same tenant as contract', errcode = '23503';
  end if;
  return new;
end;
$$;

revoke all on function util.validate_supplier_contracts_supplier_tenant() from public;
grant execute on function util.validate_supplier_contracts_supplier_tenant() to postgres;

create trigger supplier_contracts_validate_supplier_tenant
  before insert or update on app.supplier_contracts
  for each row
  execute function util.validate_supplier_contracts_supplier_tenant();

alter table app.supplier_contracts enable row level security;

create policy supplier_contracts_select_tenant on app.supplier_contracts
  for select to authenticated
  using (authz.is_current_user_tenant_member(tenant_id));

create policy supplier_contracts_select_anon on app.supplier_contracts
  for select to anon
  using (false);

create policy supplier_contracts_insert_tenant on app.supplier_contracts
  for insert to authenticated
  with check (false);

create policy supplier_contracts_insert_anon on app.supplier_contracts
  for insert to anon
  with check (false);

create policy supplier_contracts_update_tenant on app.supplier_contracts
  for update to authenticated
  using (false)
  with check (false);

create policy supplier_contracts_update_anon on app.supplier_contracts
  for update to anon
  using (false)
  with check (false);

create policy supplier_contracts_delete_tenant on app.supplier_contracts
  for delete to authenticated
  using (false);

create policy supplier_contracts_delete_anon on app.supplier_contracts
  for delete to anon
  using (false);

grant select on app.supplier_contracts to authenticated, anon;
alter table app.supplier_contracts force row level security;

create table app.supplier_contract_rates (
  id bigint generated always as identity primary key,
  contract_id uuid not null references app.supplier_contracts(id) on delete cascade,
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  rate_type text not null,
  amount_cents integer not null,
  uom text,
  created_at timestamptz not null default pg_catalog.now(),
  constraint supplier_contract_rates_amount_check check (amount_cents >= 0),
  constraint supplier_contract_rates_type_length_check check (
    length(trim(rate_type)) >= 1 and length(trim(rate_type)) <= 80
  )
);

comment on table app.supplier_contract_rates is
  'Rate lines for a supplier contract (e.g. hourly labor, trip charge).';

create index supplier_contract_rates_contract_idx on app.supplier_contract_rates (contract_id);
create index supplier_contract_rates_tenant_idx on app.supplier_contract_rates (tenant_id);

create or replace function util.validate_supplier_contract_rates_contract_tenant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row_tenant uuid;
begin
  select tenant_id into v_row_tenant from app.supplier_contracts where id = new.contract_id;
  if v_row_tenant is null or v_row_tenant <> new.tenant_id then
    raise exception using message = 'contract tenant must match rate row tenant_id', errcode = '23503';
  end if;
  return new;
end;
$$;

revoke all on function util.validate_supplier_contract_rates_contract_tenant() from public;
grant execute on function util.validate_supplier_contract_rates_contract_tenant() to postgres;

create trigger supplier_contract_rates_validate_contract_tenant
  before insert or update on app.supplier_contract_rates
  for each row
  execute function util.validate_supplier_contract_rates_contract_tenant();

alter table app.supplier_contract_rates enable row level security;

create policy supplier_contract_rates_select_tenant on app.supplier_contract_rates
  for select to authenticated
  using (authz.is_current_user_tenant_member(tenant_id));

create policy supplier_contract_rates_select_anon on app.supplier_contract_rates
  for select to anon
  using (false);

create policy supplier_contract_rates_insert_tenant on app.supplier_contract_rates
  for insert to authenticated
  with check (false);

create policy supplier_contract_rates_insert_anon on app.supplier_contract_rates
  for insert to anon
  with check (false);

create policy supplier_contract_rates_update_tenant on app.supplier_contract_rates
  for update to authenticated
  using (false)
  with check (false);

create policy supplier_contract_rates_update_anon on app.supplier_contract_rates
  for update to anon
  using (false)
  with check (false);

create policy supplier_contract_rates_delete_tenant on app.supplier_contract_rates
  for delete to authenticated
  using (false);

create policy supplier_contract_rates_delete_anon on app.supplier_contract_rates
  for delete to anon
  using (false);

grant select on app.supplier_contract_rates to authenticated, anon;
alter table app.supplier_contract_rates force row level security;

-- ============================================================================
-- 2. RPCs (supplier.edit)
-- ============================================================================

create or replace function public.rpc_create_supplier_contract(
  p_tenant_id uuid,
  p_supplier_id uuid,
  p_effective_start date,
  p_effective_end date default null,
  p_contract_number text default null,
  p_terms text default null,
  p_is_active boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform util.check_rate_limit('supplier_contract_create', null, 30, 1, auth.uid(), p_tenant_id);
  perform authz.rpc_setup(p_tenant_id, 'supplier.edit');

  insert into app.supplier_contracts (
    tenant_id,
    supplier_id,
    contract_number,
    effective_start,
    effective_end,
    terms,
    is_active
  )
  values (
    p_tenant_id,
    p_supplier_id,
    nullif(trim(p_contract_number), ''),
    p_effective_start,
    p_effective_end,
    p_terms,
    coalesce(p_is_active, true)
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.rpc_create_supplier_contract(uuid, uuid, date, date, text, text, boolean) from public;
grant execute on function public.rpc_create_supplier_contract(uuid, uuid, date, date, text, text, boolean) to authenticated;

create or replace function public.rpc_update_supplier_contract(
  p_tenant_id uuid,
  p_contract_id uuid,
  p_contract_number text default null,
  p_effective_start date default null,
  p_effective_end date default null,
  p_terms text default null,
  p_is_active boolean default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row_tenant uuid;
begin
  perform util.check_rate_limit('supplier_contract_update', null, 30, 1, auth.uid(), p_tenant_id);
  perform authz.rpc_setup(p_tenant_id, 'supplier.edit');

  select tenant_id into v_row_tenant from app.supplier_contracts where id = p_contract_id;
  if v_row_tenant is null or v_row_tenant <> p_tenant_id then
    raise exception using message = 'Contract not found or wrong tenant', errcode = 'P0001';
  end if;

  update app.supplier_contracts
  set
    contract_number = case when p_contract_number is not null then nullif(trim(p_contract_number), '') else contract_number end,
    effective_start = coalesce(p_effective_start, effective_start),
    effective_end = coalesce(p_effective_end, effective_end),
    terms = coalesce(p_terms, terms),
    is_active = coalesce(p_is_active, is_active),
    updated_at = pg_catalog.now()
  where id = p_contract_id;
end;
$$;

revoke all on function public.rpc_update_supplier_contract(uuid, uuid, text, date, date, text, boolean) from public;
grant execute on function public.rpc_update_supplier_contract(uuid, uuid, text, date, date, text, boolean) to authenticated;

create or replace function public.rpc_add_supplier_contract_rate(
  p_tenant_id uuid,
  p_contract_id uuid,
  p_rate_type text,
  p_amount_cents integer,
  p_uom text default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
  v_row_tenant uuid;
begin
  perform util.check_rate_limit('supplier_contract_rate_add', null, 60, 1, auth.uid(), p_tenant_id);
  perform authz.rpc_setup(p_tenant_id, 'supplier.edit');

  select tenant_id into v_row_tenant from app.supplier_contracts where id = p_contract_id;
  if v_row_tenant is null or v_row_tenant <> p_tenant_id then
    raise exception using message = 'Contract not found or wrong tenant', errcode = 'P0001';
  end if;

  if p_rate_type is null or length(trim(p_rate_type)) < 1 then
    raise exception using message = 'rate_type is required', errcode = '23514';
  end if;

  insert into app.supplier_contract_rates (contract_id, tenant_id, rate_type, amount_cents, uom)
  values (p_contract_id, p_tenant_id, trim(p_rate_type), p_amount_cents, nullif(trim(p_uom), ''))
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.rpc_add_supplier_contract_rate(uuid, uuid, text, integer, text) from public;
grant execute on function public.rpc_add_supplier_contract_rate(uuid, uuid, text, integer, text) to authenticated;

-- ============================================================================
-- 3. Public read views
-- ============================================================================

create or replace view public.v_supplier_contracts
with (security_invoker = true)
as
select
  c.id,
  c.tenant_id,
  c.supplier_id,
  c.contract_number,
  c.effective_start,
  c.effective_end,
  c.terms,
  c.is_active,
  c.created_at,
  c.updated_at
from app.supplier_contracts c
where c.tenant_id = authz.get_current_tenant_id();

comment on view public.v_supplier_contracts is
  'Supplier contracts for the current tenant.';

grant select on public.v_supplier_contracts to authenticated, anon;

create or replace view public.v_supplier_contract_rates
with (security_invoker = true)
as
select
  r.id,
  r.contract_id,
  r.tenant_id,
  r.rate_type,
  r.amount_cents,
  r.uom,
  r.created_at
from app.supplier_contract_rates r
where r.tenant_id = authz.get_current_tenant_id();

comment on view public.v_supplier_contract_rates is
  'Contract rate lines for the current tenant.';

grant select on public.v_supplier_contract_rates to authenticated, anon;

create or replace view public.v_vendor_spend_by_supplier
with (security_invoker = true)
as
select
  vc.tenant_id,
  vc.supplier_id,
  coalesce(s.name, 'unknown'::text) as supplier_name,
  sum(vc.amount_cents)::bigint as total_amount_cents,
  count(*)::bigint as cost_line_count
from app.work_order_vendor_costs vc
left join app.suppliers s on s.id = vc.supplier_id
where vc.tenant_id = authz.get_current_tenant_id()
  and vc.supplier_id is not null
group by vc.tenant_id, vc.supplier_id, s.name;

comment on view public.v_vendor_spend_by_supplier is
  'Aggregated vendor cost lines by linked supplier for the current tenant.';

grant select on public.v_vendor_spend_by_supplier to authenticated, anon;

create or replace view public.v_work_order_counts_by_primary_supplier
with (security_invoker = true)
as
select
  wo.tenant_id,
  wo.primary_supplier_id as supplier_id,
  coalesce(s.name, 'unknown'::text) as supplier_name,
  count(*)::bigint as work_order_count,
  count(*) filter (where sc.is_final)::bigint as final_status_count,
  count(*) filter (where not sc.is_final)::bigint as non_final_status_count
from app.work_orders wo
left join app.suppliers s on s.id = wo.primary_supplier_id
join cfg.status_catalogs sc
  on sc.tenant_id = wo.tenant_id
  and sc.entity_type = 'work_order'
  and sc.key = wo.status
where wo.tenant_id = authz.get_current_tenant_id()
  and wo.primary_supplier_id is not null
group by wo.tenant_id, wo.primary_supplier_id, s.name;

comment on view public.v_work_order_counts_by_primary_supplier is
  'Work order counts grouped by primary external supplier (contractor assignment).';

grant select on public.v_work_order_counts_by_primary_supplier to authenticated, anon;
