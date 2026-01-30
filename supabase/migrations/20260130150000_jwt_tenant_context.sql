-- SPDX-License-Identifier: AGPL-3.0-or-later

-- Custom access token hook that adds tenant_id to JWT claims
-- This hook is called by Supabase Auth before issuing tokens
-- Purpose: Enables stateless tenant context across PostgREST requests via JWT claims
-- Security: Validates tenant membership before adding claim to JWT
-- Note: Function created in authz schema (auth schema is protected, authz is for authorization helpers)
create or replace function authz.custom_access_token_hook(
  event jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_tenant_id uuid;
  v_claims jsonb;
begin
  -- Extract user ID from event
  v_user_id := (event->>'user_id')::uuid;
  
  if v_user_id is null then
    return event; -- No user, return event unchanged
  end if;
  
  -- Get current tenant from user metadata
  select (raw_user_meta_data->>'current_tenant_id')::uuid
  into v_tenant_id
  from auth.users
  where id = v_user_id;
  
  -- If tenant_id exists and user is still a member, add to claims
  if v_tenant_id is not null then
    if exists (
      select 1
      from app.tenant_memberships
      where user_id = v_user_id
        and tenant_id = v_tenant_id
    ) then
      -- Add tenant_id to JWT claims
      v_claims := coalesce(event->'claims', '{}'::jsonb);
      v_claims := v_claims || jsonb_build_object('tenant_id', v_tenant_id::text);
      event := event || jsonb_build_object('claims', v_claims);
    end if;
  end if;
  
  return event;
end;
$$;

comment on function authz.custom_access_token_hook(jsonb) is 
  'Supabase Auth hook that adds current_tenant_id from user metadata to JWT claims. Validates tenant membership before adding claim. Called automatically by Supabase Auth before token issuance. Enables stateless tenant context across PostgREST requests.';

-- Set ownership and permissions
alter function authz.custom_access_token_hook(jsonb) owner to postgres;

revoke all on function authz.custom_access_token_hook(jsonb) from public;
grant execute on function authz.custom_access_token_hook(jsonb) to postgres;
