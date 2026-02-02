-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Migration: Add RPC function to clear tenant context
--
-- Problem: Tests need to verify that views filter by tenant context when context
-- is not set. Since createTestTenant now auto-sets tenant context, tests need a
-- way to clear it.
--
-- Solution: Add rpc_clear_tenant_context() function that removes current_tenant_id
-- from user metadata and clears session variable. Client should refresh token
-- after calling this to get new JWT without tenant_id claim.

create or replace function public.rpc_clear_tenant_context()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  v_user_id := authz.validate_authenticated();
  
  -- Clear tenant context from user metadata
  update auth.users
  set raw_user_meta_data = raw_user_meta_data - 'current_tenant_id'
  where id = v_user_id;
  
  -- Clear session variable
  perform pg_catalog.set_config('app.current_tenant_id', '', true);
end;
$$;

comment on function public.rpc_clear_tenant_context() is 
  'Clears tenant context by removing current_tenant_id from user metadata and clearing session variable. Useful for testing or when user wants to switch tenants. Client should refresh token after calling this to get new JWT without tenant_id claim.';

revoke all on function public.rpc_clear_tenant_context() from public;
grant execute on function public.rpc_clear_tenant_context() to authenticated;
