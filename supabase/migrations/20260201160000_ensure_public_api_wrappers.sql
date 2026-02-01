-- ============================================================================
-- Ensure Public API Wrappers Follow ADR Pattern
-- ============================================================================
-- Purpose: Ensures all functions that access internal schemas (int, cfg, app)
--          are properly wrapped as public RPCs following ADR 0001, 0002, 0010.
-- 
-- ADR Compliance:
-- - ADR 0001: All client access via public views (reads) and public RPCs (writes)
-- - ADR 0002: Modules expose public API, plugins use public API
-- - ADR 0010: Naming conventions (rpc_<verb>_<resource>, v_<resource>)
--
-- This migration ensures:
-- 1. All public RPCs have explicit, stable function signatures
-- 2. Internal schema access is properly encapsulated
-- 3. PostgREST can properly discover and cache function signatures
-- ============================================================================

-- ============================================================================
-- Fix rpc_register_plugin: Ensure it's properly structured as internal-only
-- ============================================================================
-- This function is intentionally service_role only (not part of public API)
-- but we ensure it has explicit signature for PostgREST schema cache

create or replace function public.rpc_register_plugin(
  p_key text,
  p_name text,
  p_description text default null,
  p_is_integration boolean default false,
  p_is_active boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plugin_id uuid;
begin
  -- Input validation
  if length(pg_catalog.btrim(p_key)) = 0 then
    raise exception using
      message = 'Plugin key is required',
      errcode = '23514';
  end if;

  if length(pg_catalog.btrim(p_name)) = 0 then
    raise exception using
      message = 'Plugin name is required',
      errcode = '23514';
  end if;

  -- Access internal schema (int.plugins) - this is the public wrapper pattern
  -- The function is in public schema but accesses int schema internally
  insert into int.plugins (
    key,
    name,
    description,
    is_integration,
    is_active
  )
  values (
    p_key,
    p_name,
    p_description,
    p_is_integration,
    p_is_active
  )
  on conflict (key)
  do update set
    name = excluded.name,
    description = excluded.description,
    is_integration = excluded.is_integration,
    is_active = excluded.is_active,
    updated_at = pg_catalog.now()
  returning id into v_plugin_id;

  return v_plugin_id;
end;
$$;

comment on function public.rpc_register_plugin(text, text, text, boolean, boolean) is
  'Registers or updates a plugin catalog entry in int.plugins. This is an internal-only function for service_role usage (not part of public client API). Follows ADR pattern: public RPC wrapper that accesses internal int schema.';

-- Ensure proper grants (service_role only, not authenticated)
revoke all on function public.rpc_register_plugin(text, text, text, boolean, boolean) from public;
grant execute on function public.rpc_register_plugin(text, text, text, boolean, boolean) to service_role;
grant execute on function public.rpc_register_plugin(text, text, text, boolean, boolean) to postgres;

-- ============================================================================
-- Ensure rpc_install_plugin follows public API wrapper pattern
-- ============================================================================
-- This is a public API function (authenticated users can call it)
-- It wraps access to int.plugin_installations

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
  -- Rate limiting and permission check (follows ADR pattern)
  perform util.check_rate_limit('plugin_install', null, 10, 1, auth.uid(), p_tenant_id);
  
  -- Permission validation (tenant.admin required per ADR)
  perform authz.rpc_setup(p_tenant_id, 'tenant.admin');
  v_user_id := authz.validate_authenticated();

  -- Validate plugin exists and is active (accesses int.plugins internally)
  select id into v_plugin_id
  from int.plugins
  where key = p_plugin_key
    and is_active = true;

  if v_plugin_id is null then
    raise exception using
      message = format('Plugin %s not found or not active', p_plugin_key),
      errcode = 'P0001';
  end if;

  -- Validate secret_ref if provided
  if p_secret_ref is not null and length(pg_catalog.btrim(p_secret_ref)) = 0 then
    raise exception using
      message = 'Secret reference must be non-empty when provided',
      errcode = '23514';
  end if;

  -- Create or update installation (accesses int.plugin_installations internally)
  -- Uses ON CONFLICT to handle re-installation gracefully
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
  'Installs a plugin for a tenant. Public API wrapper that accesses int.plugin_installations internally. Requires tenant.admin permission. Follows ADR 0001 (public RPC for writes) and ADR 0010 (rpc_<verb>_<resource> naming). Rate limited to 10 requests per minute per user.';

revoke all on function public.rpc_install_plugin(uuid, text, text, jsonb) from public;
grant execute on function public.rpc_install_plugin(uuid, text, text, jsonb) to authenticated;

-- ============================================================================
-- Ensure rpc_uninstall_plugin follows public API wrapper pattern
-- ============================================================================

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
  -- Rate limiting and permission check
  perform util.check_rate_limit('plugin_uninstall', null, 10, 1, auth.uid(), p_tenant_id);
  
  -- Permission validation
  perform authz.rpc_setup(p_tenant_id, 'tenant.admin');
  v_user_id := authz.validate_authenticated();

  -- Validate installation belongs to tenant (accesses int.plugin_installations)
  select tenant_id into v_installation_tenant_id
  from int.plugin_installations
  where id = p_installation_id;

  if not found then
    raise exception using
      message = format('Plugin installation %s not found', p_installation_id),
      errcode = 'P0001';
  end if;

  if v_installation_tenant_id != p_tenant_id then
    raise exception using
      message = 'Unauthorized: Installation does not belong to this tenant',
      errcode = '42501';
  end if;

  -- Hard delete (accesses int.plugin_installations)
  -- Audit trigger will log the deletion
  delete from int.plugin_installations
  where id = p_installation_id;
end;
$$;

comment on function public.rpc_uninstall_plugin(uuid, uuid) is
  'Uninstalls a plugin for a tenant. Public API wrapper that accesses int.plugin_installations internally. Requires tenant.admin permission. Follows ADR 0001 (public RPC for writes) and ADR 0010 (rpc_<verb>_<resource> naming). Rate limited to 10 requests per minute per user.';

revoke all on function public.rpc_uninstall_plugin(uuid, uuid) from public;
grant execute on function public.rpc_uninstall_plugin(uuid, uuid) to authenticated;

-- ============================================================================
-- Ensure public views properly wrap internal schema access
-- ============================================================================
-- Views are already correct, but we ensure they're properly structured

-- v_plugins view is already correct - it's a public view reading from int.plugins
-- v_plugin_installations view is already correct - it's a public view reading from int.plugin_installations
-- Both follow ADR 0001 pattern: public views for reads

-- ============================================================================
-- Note on PostgREST Schema Cache
-- ============================================================================
-- After running this migration, PostgREST's schema cache should be refreshed.
-- In local development, restart Supabase: `supabase stop && supabase start`
-- In production, PostgREST will refresh its cache automatically on next request,
-- but you may need to wait a few seconds or trigger a schema reload.
