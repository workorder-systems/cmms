-- SPDX-License-Identifier: AGPL-3.0-or-later
--
-- Migration: rpc_remove_member_from_tenant
-- Purpose: Add RPC to remove a user from a tenant. Requires tenant.member.remove (or tenant.admin)
--   permission. Caller cannot remove themselves. Deletes user_tenant_roles, membership_scopes,
--   marks profile is_active = false, then deletes tenant_membership.
-- Affected: public.rpc_remove_member_from_tenant (new), app.user_tenant_roles,
--   app.membership_scopes, app.profiles, app.tenant_memberships (delete/update).
-- Special: Destructive operation; rate limited; permission-gated.

-- ============================================================================
-- Remove member from tenant
-- ============================================================================

create or replace function public.rpc_remove_member_from_tenant(
  p_tenant_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_remover_id uuid;
begin
  /* Rate limit: 10 removals per minute per user per tenant */
  perform util.check_rate_limit('member_remove', null, 10, 1, auth.uid(), p_tenant_id);

  v_remover_id := authz.validate_authenticated();

  /* Caller cannot remove themselves */
  if v_remover_id = p_user_id then
    raise exception using
      message = 'Unauthorized: You cannot remove yourself from the tenant',
      errcode = '42501';
  end if;

  /* Require tenant.member.remove permission (tenant.admin implies it in practice) */
  perform authz.validate_permission(v_remover_id, p_tenant_id, 'tenant.member.remove');
  perform authz.set_tenant_context(p_tenant_id);

  /* Ensure target is actually a member of this tenant */
  if not authz.is_tenant_member(p_user_id, p_tenant_id) then
    raise exception using
      message = 'User is not a member of this tenant',
      errcode = 'P0001';
  end if;

  /* Remove role assignments for this user in this tenant */
  delete from app.user_tenant_roles
  where user_id = p_user_id
    and tenant_id = p_tenant_id;

  /* Remove ABAC scopes for this user in this tenant */
  delete from app.membership_scopes
  where user_id = p_user_id
    and tenant_id = p_tenant_id;

  /* Mark profile as inactive (preserve for historical data) */
  update app.profiles
  set is_active = false,
      updated_at = pg_catalog.now()
  where user_id = p_user_id
    and tenant_id = p_tenant_id;

  /* Remove membership (destructive: user loses access to tenant) */
  delete from app.tenant_memberships
  where user_id = p_user_id
    and tenant_id = p_tenant_id;
end;
$$;

comment on function public.rpc_remove_member_from_tenant(uuid, uuid) is
  'Removes a user from a tenant. Requires tenant.member.remove permission. Caller cannot remove themselves. Deletes role assignments, membership scopes, marks profile inactive, then deletes tenant membership. Rate limited to 10 removals per minute per user.';

revoke all on function public.rpc_remove_member_from_tenant(uuid, uuid) from public;
grant execute on function public.rpc_remove_member_from_tenant(uuid, uuid) to authenticated;
