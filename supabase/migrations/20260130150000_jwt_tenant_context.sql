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
  -- Wrap entire function in exception handling to prevent hook failures
  -- If anything goes wrong, return event unchanged (fail gracefully)
  begin
    -- Extract user ID from event
    -- Event structure: { "user": { "id": "...", ... }, "claims": {...}, ... }
    -- Try multiple possible event structures for compatibility
    v_user_id := coalesce(
      (event->'user'->>'id')::uuid,
      (event->>'user_id')::uuid,
      (event->>'sub')::uuid  -- JWT 'sub' claim is the user ID
    );
    
    if v_user_id is null then
      return event; -- No user, return event unchanged
    end if;
    
    -- Get current tenant from user metadata
    -- Use fully qualified table name since search_path is empty
    select (raw_user_meta_data->>'current_tenant_id')::uuid
    into v_tenant_id
    from auth.users
    where id = v_user_id;
    
    -- If tenant_id exists and user is still a member, add to claims
    if v_tenant_id is not null then
      -- Check tenant membership (use fully qualified table name)
      if exists (
        select 1
        from app.tenant_memberships
        where user_id = v_user_id
          and tenant_id = v_tenant_id
      ) then
        -- Add tenant_id to JWT claims
        -- Claims might already exist in event, or we need to create them
        v_claims := coalesce(event->'claims', '{}'::jsonb);
        v_claims := v_claims || jsonb_build_object('tenant_id', v_tenant_id::text);
        event := event || jsonb_build_object('claims', v_claims);
      end if;
    end if;
    
    return event;
  exception
    when others then
      -- Log error but don't fail - return event unchanged
      -- This ensures authentication still works even if hook has issues
      -- In production, you might want to log this to a table
      return event;
  end;
end;
$$;

comment on function authz.custom_access_token_hook(jsonb) is 
  'Supabase Auth hook that adds current_tenant_id from user metadata to JWT claims. Validates tenant membership before adding claim. Called automatically by Supabase Auth before token issuance. Enables stateless tenant context across PostgREST requests.';

-- Set ownership and permissions
-- Supabase Auth calls hooks as the supabase_auth_admin role, not postgres
alter function authz.custom_access_token_hook(jsonb) owner to postgres;

-- Grant schema usage to supabase_auth_admin (required for Auth service to call hook)
grant usage on schema authz to supabase_auth_admin;

-- Grant execute permission to supabase_auth_admin (Auth service role)
grant execute on function authz.custom_access_token_hook(jsonb) to supabase_auth_admin;

-- Revoke from public roles for security
revoke all on function authz.custom_access_token_hook(jsonb) from public;
revoke all on function authz.custom_access_token_hook(jsonb) from authenticated;
revoke all on function authz.custom_access_token_hook(jsonb) from anon;
