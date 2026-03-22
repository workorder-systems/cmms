-- SPDX-License-Identifier: AGPL-3.0-or-later
--
-- Migration: rpc_revoke_permission_from_role
-- Purpose: Add RPC to revoke a permission from a tenant role. Requires tenant.admin
--   (or tenant.role.manage) permission. Used by Roles page to allow removing
--   permissions from a role.
-- Affected: public.rpc_revoke_permission_from_role (new), cfg.tenant_role_permissions (delete).
-- Special: Destructive; rate limited; permission-gated.

-- ============================================================================
-- Revoke permission from role
-- ============================================================================

create or replace function public.rpc_revoke_permission_from_role(
  p_tenant_id uuid,
  p_role_key text,
  p_permission_key text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_role_id uuid;
  v_permission_id uuid;
begin
  /* Rate limit: 20 revokes per minute per user per tenant */
  perform util.check_rate_limit('permission_revoke', null, 20, 1, auth.uid(), p_tenant_id);

  v_user_id := authz.rpc_setup(p_tenant_id, 'tenant.admin');

  select id into v_role_id
  from cfg.tenant_roles
  where tenant_id = p_tenant_id
    and key = p_role_key;

  if v_role_id is null then
    raise exception using
      message = format('Role %s not found in tenant', p_role_key),
      errcode = 'P0001';
  end if;

  select id into v_permission_id
  from cfg.permissions
  where key = p_permission_key;

  if v_permission_id is null then
    raise exception using
      message = format('Permission %s not found', p_permission_key),
      errcode = 'P0001';
  end if;

  /* Remove the role-permission mapping (idempotent: no error if already missing) */
  delete from cfg.tenant_role_permissions
  where tenant_role_id = v_role_id
    and permission_id = v_permission_id;
end;
$$;

comment on function public.rpc_revoke_permission_from_role(uuid, text, text) is
  'Revokes a permission from a tenant role. Requires tenant.admin permission. Validates that role and permission exist. Rate limited to 20 revokes per minute per user. Idempotent if mapping does not exist.';

revoke all on function public.rpc_revoke_permission_from_role(uuid, text, text) from public;
grant execute on function public.rpc_revoke_permission_from_role(uuid, text, text) to authenticated;
