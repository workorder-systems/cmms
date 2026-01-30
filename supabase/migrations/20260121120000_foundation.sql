-- SPDX-License-Identifier: AGPL-3.0-or-later

create schema if not exists extensions;
create extension if not exists pgcrypto schema extensions;
create extension if not exists citext schema extensions;

create schema if not exists app;
create schema if not exists cfg;
create schema if not exists int;
create schema if not exists audit;
create schema if not exists util;
create schema if not exists authz;

comment on schema extensions is 'PostgreSQL extensions (pgcrypto, citext, etc.)';
comment on schema app is 'Core application write model (CMMS domain - tenants, work orders, assets, locations)';
comment on schema cfg is 'Vertical configuration & tenant-specific product packs (permissions, roles, workflows)';
comment on schema int is 'Integrations, async jobs, webhooks';
comment on schema audit is 'Audit log & domain events for compliance and security';
comment on schema util is 'Shared utility functions & triggers (timestamps, validations)';
comment on schema authz is 'Authorization & RLS helper functions for multi-tenant security';

revoke create on schema public from public;
grant usage on schema public to authenticated, anon;

create or replace function util.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

comment on function util.set_updated_at() is 'Automatically sets updated_at = now() on row updates. This trigger function is applied to all tables with updated_at columns to ensure timestamp tracking.';

revoke all on function util.set_updated_at() from public;
grant execute on function util.set_updated_at() to postgres;

create or replace function util.prevent_created_at_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.created_at is distinct from old.created_at then
    raise exception using
      message = 'created_at is immutable',
      errcode = '23503';
  end if;
  return new;
end;
$$;

comment on function util.prevent_created_at_update() is 'Prevents modification of created_at timestamp. Keeps created_at immutable once set. Raises exception if update attempted.';

revoke all on function util.prevent_created_at_update() from public;
grant execute on function util.prevent_created_at_update() to postgres;

create or replace function authz.get_current_tenant_id()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tenant_id uuid;
begin
  -- Primary: Read from JWT claims (works across requests)
  -- JWT claims are set by custom_access_token_hook based on user metadata
  begin
    v_tenant_id := (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid;
    if v_tenant_id is not null then
      return v_tenant_id;
    end if;
  exception
    when others then
      null; -- JWT claim not set, try fallback
  end;
  
  -- Fallback: Session variable (for RPC functions within same call)
  -- This maintains backward compatibility for RPC functions that set context
  begin
    v_tenant_id := pg_catalog.current_setting('app.current_tenant_id', true)::uuid;
    return v_tenant_id;
  exception
    when others then
      return null;
  end;
end;
$$;

comment on function authz.get_current_tenant_id() is 'Gets current tenant ID from JWT claims (primary) or session context variable (fallback). JWT claims are set by custom_access_token_hook based on user metadata and persist across PostgREST requests. Session variable fallback maintains backward compatibility for RPC functions. CRITICAL: This is NOT used for security enforcement - RLS policies must derive tenant access via auth.uid() and membership tables.';

revoke all on function authz.get_current_tenant_id() from public;
grant execute on function authz.get_current_tenant_id() to authenticated;
