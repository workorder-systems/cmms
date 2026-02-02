-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Migration: Auto-Set Tenant Context on Tenant Creation
--
-- This migration updates rpc_create_tenant to automatically set tenant context
-- after creating a tenant. This ensures that:
-- 1. User metadata is updated with current_tenant_id (for JWT hook)
-- 2. Session variable app.current_tenant_id is set (for RPC functions in same call)
-- 3. Views work immediately after tenant creation (via session variable or JWT)
--
-- Rationale:
-- - When a user creates a tenant, they become a member and should immediately
--   work in that tenant context
-- - This matches real-world UX expectations
-- - With SECURITY INVOKER views, tenant context is required for views to return data
-- - JWT hook will add tenant_id to claims on next token refresh
--
-- See ADR 0003 and docs/security-definer-views-research.md for context.

create or replace function public.rpc_create_tenant(
  p_name text,
  p_slug text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant_id uuid;
  v_admin_role_id uuid;
  v_user_id uuid;
begin
  v_user_id := authz.validate_authenticated();

  perform util.check_rate_limit('tenant_create', null, 5, 1, v_user_id, null);

  insert into app.tenants (name, slug)
  values (p_name, p_slug)
  returning id into v_tenant_id;

  perform cfg.create_default_tenant_roles(v_tenant_id);

  select id into v_admin_role_id
  from cfg.tenant_roles
  where tenant_id = v_tenant_id
    and key = 'admin';

  insert into app.tenant_memberships (user_id, tenant_id)
  values (v_user_id, v_tenant_id);

  insert into app.user_tenant_roles (user_id, tenant_id, tenant_role_id, assigned_by)
  values (v_user_id, v_tenant_id, v_admin_role_id, v_user_id);

  -- Automatically set tenant context after creation
  -- This updates user metadata (raw_user_meta_data->>'current_tenant_id') so the
  -- custom_access_token_hook can add tenant_id to JWT claims on next token refresh.
  -- Also sets session variable app.current_tenant_id for RPC functions in same call.
  -- This enables views to work immediately after tenant creation.
  perform authz.set_tenant_context(v_tenant_id);

  return v_tenant_id;
end;
$$;

comment on function public.rpc_create_tenant(text, text) is 
  'Creates a new tenant with the specified name and slug. Validates authentication, enforces rate limiting (5 requests/minute per user), creates default roles and workflows, adds creator as tenant member, assigns admin role to creator, and automatically sets tenant context. The automatic context setting updates user metadata and session variable, enabling views to work immediately after tenant creation. Returns the UUID of the created tenant. Security implications: Any authenticated user can create tenants (with rate limiting). Tenant creation is audited in Migration 6. Rate limiting prevents abuse.';
