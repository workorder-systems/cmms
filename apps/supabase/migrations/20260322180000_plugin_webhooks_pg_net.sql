-- SPDX-License-Identifier: AGPL-3.0-or-later
--
-- Migration: Postgres-native plugin webhooks (subscriptions, queue, pg_net, pg_cron, Vault HMAC)
--
-- Purpose
-- -------
-- 1. Enable pg_net and pg_cron for async HTTP and scheduling (no external workers).
-- 2. Enable supabase_vault for resolving signing secrets from plugin_installations.secret_ref (Vault secret name).
-- 3. int.plugin_webhook_subscriptions: allowlisted audit.entity_changes routing per installation.
-- 4. int.plugin_delivery_queue: durable outbound deliveries with idempotent enqueue per (installation, audit row).
-- 5. AFTER INSERT on audit.entity_changes -> enqueue matching subscriptions (default no subscriptions => no noise).
-- 6. public.rpc_process_plugin_deliveries: dispatch pending rows via net.http_post and collect net._http_response.
-- 7. pg_cron job calling rpc_process_plugin_deliveries every minute.
-- 8. public.rpc_plugin_ingest_webhook: anon/authenticated inbound HMAC + allowlisted actions (noop, work_order.create).
-- 9. Admin RPCs for subscriptions; read views for subscriptions and recent deliveries.
--
-- Security
-- --------
-- - Secrets never stored in plugin_installations.config; HMAC uses Vault via secret_ref (unique secret name).
-- - Queue/subscription tables: RLS; clients read via security invoker views; writes via security definer RPCs.
-- - Inbound webhook verifies HMAC over payload jsonb text; rate limited per installation id as synthetic user_id.

-- ============================================================================
-- Extensions
-- ============================================================================

create extension if not exists pg_net;
create extension if not exists pg_cron;
create extension if not exists supabase_vault with schema vault;

-- ============================================================================
-- int.plugin_webhook_subscriptions
-- ============================================================================

create table int.plugin_webhook_subscriptions (
  id uuid primary key default extensions.gen_random_uuid(),
  plugin_installation_id uuid not null references int.plugin_installations(id) on delete cascade,
  table_schema text not null,
  table_name text not null,
  operations text[] not null,
  changed_fields_allowlist text[],
  include_payload boolean not null default false,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint plugin_webhook_subscriptions_operations_nonempty_check check (
    array_length(operations, 1) is not null
    and array_length(operations, 1) >= 1
  ),
  constraint plugin_webhook_subscriptions_operations_values_check check (
    operations <@ array['INSERT', 'UPDATE', 'DELETE']::text[]
  ),
  constraint plugin_webhook_subscriptions_table_schema_name_check check (
    length(pg_catalog.btrim(table_schema)) >= 1
    and length(pg_catalog.btrim(table_name)) >= 1
  ),
  constraint plugin_webhook_subscriptions_installation_table_unique unique (plugin_installation_id, table_schema, table_name)
);

comment on table int.plugin_webhook_subscriptions is
  'Allowlist of audit.entity_changes (schema/name/operations) to forward to a plugin installation webhook. No rows means no outbound events for that installation.';

comment on column int.plugin_webhook_subscriptions.changed_fields_allowlist is
  'For UPDATE only: if set, at least one changed column must appear in this list (overlap with audit.changed_fields). If null, any UPDATE on the table matches.';

comment on column int.plugin_webhook_subscriptions.include_payload is
  'When false, snapshot omits old_data/new_data (metadata + record_id + changed_fields only). When true, includes full audit payloads (PII risk).';

create index plugin_webhook_subscriptions_installation_idx
  on int.plugin_webhook_subscriptions (plugin_installation_id);

create trigger plugin_webhook_subscriptions_set_updated_at
  before update on int.plugin_webhook_subscriptions
  for each row
  execute function util.set_updated_at();

alter table int.plugin_webhook_subscriptions enable row level security;

-- RLS: granular policies per role and operation (migration convention).
create policy plugin_webhook_subscriptions_select_authenticated
  on int.plugin_webhook_subscriptions
  for select
  to authenticated
  using (
    exists (
      select 1
      from int.plugin_installations pi
      where
        pi.id = plugin_webhook_subscriptions.plugin_installation_id
        and authz.has_permission((select auth.uid()), pi.tenant_id, 'tenant.admin')
    )
  );

create policy plugin_webhook_subscriptions_select_anon
  on int.plugin_webhook_subscriptions
  for select
  to anon
  using (false);

create policy plugin_webhook_subscriptions_insert_authenticated
  on int.plugin_webhook_subscriptions
  for insert
  to authenticated
  with check (false);

create policy plugin_webhook_subscriptions_insert_anon
  on int.plugin_webhook_subscriptions
  for insert
  to anon
  with check (false);

create policy plugin_webhook_subscriptions_update_authenticated
  on int.plugin_webhook_subscriptions
  for update
  to authenticated
  using (false)
  with check (false);

create policy plugin_webhook_subscriptions_update_anon
  on int.plugin_webhook_subscriptions
  for update
  to anon
  using (false)
  with check (false);

create policy plugin_webhook_subscriptions_delete_authenticated
  on int.plugin_webhook_subscriptions
  for delete
  to authenticated
  using (false);

create policy plugin_webhook_subscriptions_delete_anon
  on int.plugin_webhook_subscriptions
  for delete
  to anon
  using (false);

grant select on int.plugin_webhook_subscriptions to authenticated;

-- ============================================================================
-- int.plugin_delivery_queue
-- ============================================================================

create table int.plugin_delivery_queue (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  plugin_installation_id uuid not null references int.plugin_installations(id) on delete cascade,
  source_entity_change_id bigint not null references audit.entity_changes(id) on delete cascade,
  event_type text not null,
  payload jsonb not null,
  status text not null default 'pending' check (
    status in ('pending', 'sending', 'delivered', 'failed', 'dead')
  ),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default pg_catalog.now(),
  last_error text,
  net_request_id bigint,
  sent_at timestamptz,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint plugin_delivery_queue_attempts_nonnegative check (attempts >= 0),
  constraint plugin_delivery_queue_installation_audit_unique unique (plugin_installation_id, source_entity_change_id)
);

comment on table int.plugin_delivery_queue is
  'Outbound plugin webhook deliveries driven by audit.entity_changes. Processed by rpc_process_plugin_deliveries via pg_net.';

create index plugin_delivery_queue_status_next_attempt_idx
  on int.plugin_delivery_queue (status, next_attempt_at)
  where status in ('pending', 'failed');

create index plugin_delivery_queue_sending_idx
  on int.plugin_delivery_queue (status, sent_at)
  where status = 'sending';

create index plugin_delivery_queue_tenant_created_idx
  on int.plugin_delivery_queue (tenant_id, created_at desc);

create trigger plugin_delivery_queue_set_updated_at
  before update on int.plugin_delivery_queue
  for each row
  execute function util.set_updated_at();

alter table int.plugin_delivery_queue enable row level security;

create policy plugin_delivery_queue_select_authenticated
  on int.plugin_delivery_queue
  for select
  to authenticated
  using (
    authz.has_permission((select auth.uid()), tenant_id, 'tenant.admin')
  );

create policy plugin_delivery_queue_select_anon
  on int.plugin_delivery_queue
  for select
  to anon
  using (false);

create policy plugin_delivery_queue_insert_authenticated
  on int.plugin_delivery_queue
  for insert
  to authenticated
  with check (false);

create policy plugin_delivery_queue_insert_anon
  on int.plugin_delivery_queue
  for insert
  to anon
  with check (false);

create policy plugin_delivery_queue_update_authenticated
  on int.plugin_delivery_queue
  for update
  to authenticated
  using (false)
  with check (false);

create policy plugin_delivery_queue_update_anon
  on int.plugin_delivery_queue
  for update
  to anon
  using (false)
  with check (false);

create policy plugin_delivery_queue_delete_authenticated
  on int.plugin_delivery_queue
  for delete
  to authenticated
  using (false);

create policy plugin_delivery_queue_delete_anon
  on int.plugin_delivery_queue
  for delete
  to anon
  using (false);

grant select on int.plugin_delivery_queue to authenticated;
grant select on int.plugin_delivery_queue to service_role;

-- ============================================================================
-- Resolve Vault secret for HMAC (secret_ref = vault.secrets.name)
-- ============================================================================

create or replace function int.resolve_installation_signing_secret(p_installation_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_ref text;
  v_secret text;
begin
  select pi.secret_ref
  into v_ref
  from int.plugin_installations pi
  where pi.id = p_installation_id;

  if v_ref is null or length(pg_catalog.btrim(v_ref)) = 0 then
    return null;
  end if;

  select ds.decrypted_secret
  into v_secret
  from vault.decrypted_secrets ds
  where ds.name = v_ref
  limit 1;

  return v_secret;
end;
$$;

comment on function int.resolve_installation_signing_secret(uuid) is
  'Resolves webhook signing material from Vault using plugin_installations.secret_ref as vault.secrets.name. Returns null if unset or missing.';

revoke all on function int.resolve_installation_signing_secret(uuid) from public;
grant execute on function int.resolve_installation_signing_secret(uuid) to postgres;
grant execute on function int.resolve_installation_signing_secret(uuid) to service_role;

-- ============================================================================
-- Enqueue from audit.entity_changes
-- ============================================================================

create or replace function int.enqueue_plugin_events_from_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  s record;
  v_event_type text;
  v_payload jsonb;
  v_snapshot jsonb;
  v_op text;
begin
  if new.tenant_id is null then
    return new;
  end if;

  v_op := new.operation;

  for s in
    select
      sub.id as subscription_id,
      sub.plugin_installation_id,
      sub.include_payload,
      sub.changed_fields_allowlist,
      sub.operations,
      p.key as plugin_key
    from int.plugin_webhook_subscriptions sub
    join int.plugin_installations pi on pi.id = sub.plugin_installation_id
    join int.plugins p on p.id = pi.plugin_id
    where
      pi.tenant_id = new.tenant_id
      and pi.status = 'installed'
      and sub.table_schema = new.table_schema
      and sub.table_name = new.table_name
      and v_op = any(sub.operations)
  loop
    if v_op = 'UPDATE' and s.changed_fields_allowlist is not null then
      if new.changed_fields is null or not (new.changed_fields && s.changed_fields_allowlist) then
        continue;
      end if;
    end if;

    v_event_type := pg_catalog.lower(
      format(
        'entity_change.%s.%s',
        new.table_name,
        pg_catalog.lower(v_op)
      )
    );

    if s.include_payload then
      v_snapshot := pg_catalog.jsonb_build_object(
        'new_data',
        new.new_data,
        'old_data',
        new.old_data
      );
    else
      v_snapshot := pg_catalog.jsonb_build_object(
        'record_id',
        new.record_id,
        'changed_fields',
        new.changed_fields
      );
    end if;

    v_payload := pg_catalog.jsonb_build_object(
      'v',
      1,
      'tenant_id',
      new.tenant_id,
      'installation_id',
      s.plugin_installation_id,
      'plugin_key',
      s.plugin_key,
      'audit',
      pg_catalog.jsonb_build_object(
        'id',
        new.id,
        'table_schema',
        new.table_schema,
        'table_name',
        new.table_name,
        'record_id',
        new.record_id,
        'operation',
        new.operation,
        'changed_fields',
        new.changed_fields
      ),
      'snapshot',
      v_snapshot
    );

    insert into int.plugin_delivery_queue (
      tenant_id,
      plugin_installation_id,
      source_entity_change_id,
      event_type,
      payload,
      status,
      next_attempt_at
    )
    values (
      new.tenant_id,
      s.plugin_installation_id,
      new.id,
      v_event_type,
      v_payload,
      'pending',
      pg_catalog.now()
    )
    on conflict (plugin_installation_id, source_entity_change_id) do nothing;
  end loop;

  return new;
end;
$$;

comment on function int.enqueue_plugin_events_from_audit() is
  'AFTER INSERT on audit.entity_changes: enqueues plugin webhook rows for matching installed subscriptions (idempotent per installation + audit row).';

revoke all on function int.enqueue_plugin_events_from_audit() from public;
grant execute on function int.enqueue_plugin_events_from_audit() to postgres;

create trigger entity_changes_plugin_enqueue_trigger
  after insert on audit.entity_changes
  for each row
  execute function int.enqueue_plugin_events_from_audit();

-- ============================================================================
-- Outbound processor (pg_net + response collection + backoff)
-- ============================================================================

create or replace function public.rpc_process_plugin_deliveries(p_batch_size integer default 25)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_processed integer := 0;
  r record;
  v_url text;
  v_timeout_ms integer;
  v_headers jsonb;
  v_sig text;
  v_secret text;
  v_req_id bigint;
  v_extra_headers jsonb;
  v_backoff interval;
  v_err text;
  v_max_attempts integer := 8;
  v_status_code integer;
  v_resp_content text;
  v_timed_out boolean;
  v_error_msg text;
begin
  if p_batch_size is null or p_batch_size < 1 then
    p_batch_size := 25;
  end if;
  if p_batch_size > 200 then
    p_batch_size := 200;
  end if;

  -- Phase 1: collect HTTP responses for rows in sending
  for r in
    select q.*
    from int.plugin_delivery_queue q
    where
      q.status = 'sending'
      and q.net_request_id is not null
    order by q.sent_at asc nulls last
    limit p_batch_size
    for update
    skip locked
  loop
    v_status_code := null;
    v_resp_content := null;
    v_timed_out := null;
    v_error_msg := null;

    if exists (
      select 1
      from net._http_response x
      where x.id = r.net_request_id
    ) then
      select
        x.status_code,
        x.content,
        x.timed_out,
        x.error_msg
      into v_status_code, v_resp_content, v_timed_out, v_error_msg
      from net._http_response x
      where x.id = r.net_request_id;

      v_processed := v_processed + 1;
      if v_timed_out or v_error_msg is not null then
        v_err := pg_catalog.left(
          coalesce(v_error_msg, 'request error'),
          500
        );
        if r.attempts + 1 >= v_max_attempts then
          update int.plugin_delivery_queue
          set
            status = 'dead',
            attempts = r.attempts + 1,
            last_error = v_err,
            net_request_id = null,
            sent_at = null,
            next_attempt_at = pg_catalog.now()
          where id = r.id;
        else
          v_backoff := (
            power(2::numeric, least(r.attempts + 1, 6))
          ) * pg_catalog.make_interval(mins => 1);
          update int.plugin_delivery_queue
          set
            status = 'pending',
            attempts = r.attempts + 1,
            last_error = v_err,
            net_request_id = null,
            sent_at = null,
            next_attempt_at = pg_catalog.now() + v_backoff
          where id = r.id;
        end if;
      elsif v_status_code >= 200 and v_status_code < 300 then
        update int.plugin_delivery_queue
        set
          status = 'delivered',
          last_error = null,
          net_request_id = null,
          sent_at = null,
          next_attempt_at = pg_catalog.now()
        where id = r.id;
      else
        v_err := pg_catalog.left(
          format(
            'http %s: %s',
            v_status_code,
            coalesce(v_resp_content, '')
          ),
          500
        );
        if r.attempts + 1 >= v_max_attempts then
          update int.plugin_delivery_queue
          set
            status = 'dead',
            attempts = r.attempts + 1,
            last_error = v_err,
            net_request_id = null,
            sent_at = null,
            next_attempt_at = pg_catalog.now()
          where id = r.id;
        else
          v_backoff := (
            power(2::numeric, least(r.attempts + 1, 6))
          ) * pg_catalog.make_interval(mins => 1);
          update int.plugin_delivery_queue
          set
            status = 'pending',
            attempts = r.attempts + 1,
            last_error = v_err,
            net_request_id = null,
            sent_at = null,
            next_attempt_at = pg_catalog.now() + v_backoff
          where id = r.id;
        end if;
      end if;
    elsif r.sent_at is not null and r.sent_at < pg_catalog.now() - pg_catalog.make_interval(mins => 2) then
      v_processed := v_processed + 1;
      v_err := 'response timeout (no net._http_response row)';
      if r.attempts + 1 >= v_max_attempts then
        update int.plugin_delivery_queue
        set
          status = 'dead',
          attempts = r.attempts + 1,
          last_error = v_err,
          net_request_id = null,
          sent_at = null,
          next_attempt_at = pg_catalog.now()
        where id = r.id;
      else
        v_backoff := (
          power(2::numeric, least(r.attempts + 1, 6))
        ) * pg_catalog.make_interval(mins => 1);
        update int.plugin_delivery_queue
        set
          status = 'pending',
          attempts = r.attempts + 1,
          last_error = v_err,
          net_request_id = null,
          sent_at = null,
          next_attempt_at = pg_catalog.now() + v_backoff
        where id = r.id;
      end if;
    end if;
  end loop;

  -- Phase 2: dispatch pending (and failed rows scheduled for retry)
  for r in
    select q.*
    from int.plugin_delivery_queue q
    where
      q.status = 'pending'
      and q.next_attempt_at <= pg_catalog.now()
      and q.attempts < v_max_attempts
    order by q.created_at asc
    limit p_batch_size
    for update
    skip locked
  loop
    v_processed := v_processed + 1;
    select pi.config
    into v_extra_headers
    from int.plugin_installations pi
    where pi.id = r.plugin_installation_id;

    v_url := v_extra_headers->>'webhook_url';
    if v_url is null or length(pg_catalog.btrim(v_url)) = 0 then
      update int.plugin_delivery_queue
      set
        status = 'dead',
        last_error = 'missing webhook_url in plugin installation config',
        next_attempt_at = pg_catalog.now()
      where id = r.id;
      continue;
    end if;

    v_timeout_ms := coalesce((v_extra_headers->>'timeout_ms')::integer, 15000);
    if v_timeout_ms < 1000 then
      v_timeout_ms := 1000;
    end if;
    if v_timeout_ms > 120000 then
      v_timeout_ms := 120000;
    end if;

    v_secret := int.resolve_installation_signing_secret(r.plugin_installation_id);
    v_headers := pg_catalog.jsonb_build_object(
      'Content-Type',
      'application/json',
      'X-Plugin-Delivery-Id',
      r.id::text,
      'X-Plugin-Event-Type',
      r.event_type
    );

    if v_extra_headers ? 'headers' and jsonb_typeof(v_extra_headers->'headers') = 'object' then
      v_headers := v_headers || (v_extra_headers->'headers');
    end if;

    if v_secret is not null then
      v_sig := encode(
        extensions.hmac(
          convert_to(r.payload::text, 'UTF8'),
          convert_to(v_secret, 'UTF8'),
          'sha256'
        ),
        'hex'
      );
      v_headers := v_headers || pg_catalog.jsonb_build_object('X-Plugin-Signature', v_sig);
    end if;

    v_req_id := net.http_post(
      url := v_url,
      body := r.payload,
      headers := v_headers,
      timeout_milliseconds := v_timeout_ms
    );

    update int.plugin_delivery_queue
    set
      status = 'sending',
      net_request_id = v_req_id,
      sent_at = pg_catalog.now(),
      last_error = null
    where id = r.id;
  end loop;

  return v_processed;
end;
$$;

comment on function public.rpc_process_plugin_deliveries(integer) is
  'Processes plugin webhook deliveries: collects pg_net responses for in-flight requests, then dispatches pending rows via net.http_post. Intended for pg_cron and service_role.';

revoke all on function public.rpc_process_plugin_deliveries(integer) from public;
grant execute on function public.rpc_process_plugin_deliveries(integer) to postgres;
grant execute on function public.rpc_process_plugin_deliveries(integer) to service_role;
-- Supabase default privileges may grant EXECUTE to anon/authenticated on new public RPCs; keep processor service-only (SSRF risk).
revoke execute on function public.rpc_process_plugin_deliveries(integer) from anon;
revoke execute on function public.rpc_process_plugin_deliveries(integer) from authenticated;

-- ============================================================================
-- pg_cron schedule
-- ============================================================================

do $cron$
declare
  jid bigint;
begin
  for jid in
    select j.jobid
    from cron.job j
    where j.jobname = 'plugin_webhook_process'
  loop
    perform cron.unschedule(jid);
  end loop;
end
$cron$;

select
  cron.schedule(
    'plugin_webhook_process',
    '* * * * *',
    $$select public.rpc_process_plugin_deliveries(50)$$
  );

-- ============================================================================
-- Inbound webhook: apply allowlisted actions
-- ============================================================================

create or replace function int.plugin_webhook_apply_action(
  p_tenant_id uuid,
  p_action text,
  p_data jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text;
  v_description text;
  v_priority text;
  v_maintenance_type text;
  v_assigned_to uuid;
  v_location_id uuid;
  v_asset_id uuid;
  v_due_date timestamptz;
  v_pm_schedule_id uuid;
  v_project_id uuid;
  v_work_order_id uuid;
  v_initial_status text;
  v_pm_schedule_tenant_id uuid;
  v_pm_schedule_is_active boolean;
  v_project_tenant_id uuid;
begin
  if p_action = 'noop' then
    return pg_catalog.jsonb_build_object('ok', true, 'action', 'noop');
  end if;

  if p_action <> 'work_order.create' then
    raise exception using
      message = format('Unsupported action: %s', p_action),
      errcode = '22023';
  end if;

  v_title := p_data->>'title';
  if v_title is null or length(pg_catalog.btrim(v_title)) = 0 then
    raise exception using
      message = 'work_order.create requires data.title',
      errcode = '23514';
  end if;

  v_description := p_data->>'description';
  v_priority := coalesce(nullif(p_data->>'priority', ''), 'medium');
  v_maintenance_type := nullif(p_data->>'maintenance_type', '');
  v_assigned_to := nullif(p_data->>'assigned_to', '')::uuid;
  v_location_id := nullif(p_data->>'location_id', '')::uuid;
  v_asset_id := nullif(p_data->>'asset_id', '')::uuid;
  v_due_date := nullif(p_data->>'due_date', '')::timestamptz;
  v_pm_schedule_id := nullif(p_data->>'pm_schedule_id', '')::uuid;
  v_project_id := nullif(p_data->>'project_id', '')::uuid;

  if not exists (
    select 1
    from cfg.priority_catalogs pc
    where
      pc.tenant_id = p_tenant_id
      and pc.entity_type = 'work_order'
      and pc.key = v_priority
  ) then
    raise exception using
      message = format('Invalid priority: %s', v_priority),
      errcode = '23503';
  end if;

  if v_maintenance_type is not null then
    if not exists (
      select 1
      from cfg.maintenance_type_catalogs mt
      where
        mt.tenant_id = p_tenant_id
        and mt.entity_type = 'work_order'
        and mt.key = v_maintenance_type
    ) then
      raise exception using
        message = format('Invalid maintenance type: %s', v_maintenance_type),
        errcode = '23503';
      end if;
  end if;

  if v_pm_schedule_id is not null then
    select ps.tenant_id, ps.is_active
    into v_pm_schedule_tenant_id, v_pm_schedule_is_active
    from app.pm_schedules ps
    where ps.id = v_pm_schedule_id;

    if not found then
      raise exception using
        message = format('PM schedule %s not found', v_pm_schedule_id),
        errcode = 'P0001';
    end if;

    if v_pm_schedule_tenant_id <> p_tenant_id then
      raise exception using
        message = 'PM schedule does not belong to tenant',
        errcode = '42501';
    end if;

    if not v_pm_schedule_is_active then
      raise exception using
        message = 'PM schedule is not active',
        errcode = '23503';
    end if;
  end if;

  if v_project_id is not null then
    select pr.tenant_id
    into v_project_tenant_id
    from app.projects pr
    where pr.id = v_project_id;

    if not found then
      raise exception using
        message = format('Project %s not found', v_project_id),
        errcode = 'P0001';
    end if;

    perform util.validate_tenant_match(p_tenant_id, v_project_tenant_id, 'Project');
  end if;

  if v_assigned_to is not null then
    if not authz.is_tenant_member(v_assigned_to, p_tenant_id) then
      raise exception using
        message = 'assigned_to must be a tenant member',
        errcode = '23503';
    end if;
  end if;

  if v_location_id is not null then
    if not exists (
      select 1
      from app.locations loc
      where loc.id = v_location_id and loc.tenant_id = p_tenant_id
    ) then
      raise exception using
        message = 'location_id not found for tenant',
        errcode = '23503';
    end if;
  end if;

  if v_asset_id is not null then
    if not exists (
      select 1
      from app.assets ast
      where ast.id = v_asset_id and ast.tenant_id = p_tenant_id
    ) then
      raise exception using
        message = 'asset_id not found for tenant',
        errcode = '23503';
    end if;
  end if;

  v_initial_status := cfg.get_default_status(
    p_tenant_id,
    'work_order',
    pg_catalog.jsonb_build_object('assigned_to', v_assigned_to)
  );

  insert into app.work_orders (
    tenant_id,
    title,
    description,
    priority,
    maintenance_type,
    assigned_to,
    location_id,
    asset_id,
    due_date,
    status,
    pm_schedule_id,
    project_id
  )
  values (
    p_tenant_id,
    v_title,
    v_description,
    v_priority,
    v_maintenance_type,
    v_assigned_to,
    v_location_id,
    v_asset_id,
    v_due_date,
    v_initial_status,
    v_pm_schedule_id,
    v_project_id
  )
  returning id into v_work_order_id;

  return pg_catalog.jsonb_build_object(
    'ok',
    true,
    'action',
    'work_order.create',
    'work_order_id',
    v_work_order_id
  );
end;
$$;

comment on function int.plugin_webhook_apply_action(uuid, text, jsonb) is
  'Allowlisted side effects for inbound plugin webhooks (security definer; called only after HMAC verification).';

revoke all on function int.plugin_webhook_apply_action(uuid, text, jsonb) from public;
grant execute on function int.plugin_webhook_apply_action(uuid, text, jsonb) to postgres;

create or replace function public.rpc_plugin_ingest_webhook(
  p_plugin_key text,
  p_installation_id uuid,
  p_payload jsonb,
  p_signature text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant_id uuid;
  v_plugin_id uuid;
  v_expected text;
  v_secret text;
  v_action text;
  v_data jsonb;
  v_installed_by uuid;
begin
  if p_plugin_key is null or length(pg_catalog.btrim(p_plugin_key)) = 0 then
    raise exception using
      message = 'p_plugin_key is required',
      errcode = '23514';
  end if;

  if p_installation_id is null then
    raise exception using
      message = 'p_installation_id is required',
      errcode = '23514';
  end if;

  if p_payload is null then
    raise exception using
      message = 'p_payload is required',
      errcode = '23514';
  end if;

  select pi.tenant_id, pi.plugin_id, pi.installed_by
  into v_tenant_id, v_plugin_id, v_installed_by
  from int.plugin_installations pi
  join int.plugins pl on pl.id = pi.plugin_id
  where
    pi.id = p_installation_id
    and pi.status = 'installed'
    and pl.key = p_plugin_key
    and pl.is_active = true;

  if v_tenant_id is null then
    raise exception using
      message = 'Plugin installation not found or inactive',
      errcode = 'P0001';
  end if;

  -- rate_limit_tracking.user_id references auth.users; use installing user when present.
  if v_installed_by is not null then
    perform util.check_rate_limit(
      'plugin_webhook_ingest',
      'ingest',
      120,
      1,
      v_installed_by,
      v_tenant_id
    );
  end if;

  v_secret := int.resolve_installation_signing_secret(p_installation_id);
  if v_secret is null then
    raise exception using
      message = 'Webhook signing secret not configured (secret_ref / Vault)',
      errcode = '28000';
  end if;

  v_expected := encode(
    extensions.hmac(
      convert_to(p_payload::text, 'UTF8'),
      convert_to(v_secret, 'UTF8'),
      'sha256'
    ),
    'hex'
  );

  if v_expected is distinct from pg_catalog.lower(pg_catalog.btrim(coalesce(p_signature, ''))) then
    raise exception using
      message = 'Invalid webhook signature',
      errcode = '42501';
  end if;

  v_action := coalesce(nullif(p_payload->>'action', ''), 'noop');
  v_data := coalesce(p_payload->'data', '{}'::jsonb);

  return int.plugin_webhook_apply_action(v_tenant_id, v_action, v_data);
end;
$$;

comment on function public.rpc_plugin_ingest_webhook(text, uuid, jsonb, text) is
  'Inbound plugin webhook: verifies HMAC-SHA256 hex signature over p_payload::text (UTF-8), rate limits per installation, runs allowlisted actions. Requires Vault secret referenced by installation.secret_ref.';

revoke all on function public.rpc_plugin_ingest_webhook(text, uuid, jsonb, text) from public;
grant execute on function public.rpc_plugin_ingest_webhook(text, uuid, jsonb, text) to anon;
grant execute on function public.rpc_plugin_ingest_webhook(text, uuid, jsonb, text) to authenticated;

-- ============================================================================
-- Admin RPCs: subscription upsert / delete
-- ============================================================================

create or replace function public.rpc_upsert_plugin_webhook_subscription(
  p_tenant_id uuid,
  p_installation_id uuid,
  p_table_schema text,
  p_table_name text,
  p_operations text[],
  p_changed_fields_allowlist text[] default null,
  p_include_payload boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_inst_tenant uuid;
  v_sub_id uuid;
begin
  perform util.check_rate_limit('plugin_webhook_sub_upsert', null, 30, 1, auth.uid(), p_tenant_id);
  v_user_id := authz.rpc_setup(p_tenant_id, 'tenant.admin');

  select pi.tenant_id
  into v_inst_tenant
  from int.plugin_installations pi
  where pi.id = p_installation_id;

  if v_inst_tenant is null then
    raise exception using
      message = 'Plugin installation not found',
      errcode = 'P0001';
  end if;

  if v_inst_tenant <> p_tenant_id then
    raise exception using
      message = 'Installation does not belong to tenant',
      errcode = '42501';
  end if;

  if p_table_schema is null
    or length(pg_catalog.btrim(p_table_schema)) = 0
    or p_table_name is null
    or length(pg_catalog.btrim(p_table_name)) = 0
  then
    raise exception using
      message = 'table_schema and table_name are required',
      errcode = '23514';
  end if;

  if p_operations is null or array_length(p_operations, 1) is null then
    raise exception using
      message = 'p_operations must be a non-empty array',
      errcode = '23514';
  end if;

  insert into int.plugin_webhook_subscriptions (
    plugin_installation_id,
    table_schema,
    table_name,
    operations,
    changed_fields_allowlist,
    include_payload
  )
  values (
    p_installation_id,
    pg_catalog.btrim(p_table_schema),
    pg_catalog.btrim(p_table_name),
    p_operations,
    p_changed_fields_allowlist,
    coalesce(p_include_payload, false)
  )
  on conflict (plugin_installation_id, table_schema, table_name)
  do update set
    operations = excluded.operations,
    changed_fields_allowlist = excluded.changed_fields_allowlist,
    include_payload = excluded.include_payload,
    updated_at = pg_catalog.now()
  returning id into v_sub_id;

  return v_sub_id;
end;
$$;

comment on function public.rpc_upsert_plugin_webhook_subscription(uuid, uuid, text, text, text[], text[], boolean) is
  'Creates or updates a webhook subscription allowlist for a plugin installation. Requires tenant.admin.';

revoke all on function public.rpc_upsert_plugin_webhook_subscription(uuid, uuid, text, text, text[], text[], boolean) from public;
grant execute on function public.rpc_upsert_plugin_webhook_subscription(uuid, uuid, text, text, text[], text[], boolean) to authenticated;

create or replace function public.rpc_delete_plugin_webhook_subscription(
  p_tenant_id uuid,
  p_subscription_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  perform util.check_rate_limit('plugin_webhook_sub_delete', null, 30, 1, auth.uid(), p_tenant_id);
  v_user_id := authz.rpc_setup(p_tenant_id, 'tenant.admin');

  delete from int.plugin_webhook_subscriptions sub
  using int.plugin_installations pi
  where
    sub.id = p_subscription_id
    and pi.id = sub.plugin_installation_id
    and pi.tenant_id = p_tenant_id;

  if not found then
    raise exception using
      message = 'Subscription not found for tenant',
      errcode = 'P0001';
  end if;
end;
$$;

comment on function public.rpc_delete_plugin_webhook_subscription(uuid, uuid) is
  'Deletes a plugin webhook subscription. Requires tenant.admin.';

revoke all on function public.rpc_delete_plugin_webhook_subscription(uuid, uuid) from public;
grant execute on function public.rpc_delete_plugin_webhook_subscription(uuid, uuid) to authenticated;

-- ============================================================================
-- Public read views (security invoker)
-- ============================================================================

create or replace view public.v_plugin_webhook_subscriptions
with (security_invoker = true)
as
select
  s.id,
  pi.tenant_id,
  s.plugin_installation_id,
  p.key as plugin_key,
  s.table_schema,
  s.table_name,
  s.operations,
  s.changed_fields_allowlist,
  s.include_payload,
  s.created_at,
  s.updated_at
from int.plugin_webhook_subscriptions s
join int.plugin_installations pi on pi.id = s.plugin_installation_id
join int.plugins p on p.id = pi.plugin_id
where
  pi.tenant_id = authz.get_current_tenant_id()
  and (select auth.uid()) is not null
  and authz.has_permission((select auth.uid()), pi.tenant_id, 'tenant.admin');

comment on view public.v_plugin_webhook_subscriptions is
  'Tenant admin view of plugin webhook subscription allowlists for the current tenant context.';

grant select on public.v_plugin_webhook_subscriptions to authenticated;

create or replace view public.v_plugin_delivery_queue_recent
with (security_invoker = true)
as
select
  q.id,
  q.tenant_id,
  q.plugin_installation_id,
  p.key as plugin_key,
  q.event_type,
  q.status,
  q.attempts,
  q.last_error,
  q.created_at,
  q.updated_at
from int.plugin_delivery_queue q
join int.plugin_installations pi on pi.id = q.plugin_installation_id
join int.plugins p on p.id = pi.plugin_id
where
  q.tenant_id = authz.get_current_tenant_id()
  and (select auth.uid()) is not null
  and authz.has_permission((select auth.uid()), q.tenant_id, 'tenant.admin');

comment on view public.v_plugin_delivery_queue_recent is
  'Recent plugin webhook delivery metadata for the current tenant (no payload body). Tenant admin only.';

grant select on public.v_plugin_delivery_queue_recent to authenticated;
