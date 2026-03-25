/*
 * migration: oauth jwt tenant_id follows rpc_set_tenant_context
 *
 * purpose: For OAuth access tokens, custom_access_token_hook previously set JWT tenant_id to the
 * first row in app.oauth_client_tenant_grants (ordered by tenant_id), ignoring
 * auth.users.raw_user_meta_data.current_tenant_id updated by rpc_set_tenant_context.
 * That made Cursor/mcp-remote sessions stick on the wrong org after set_active_tenant even
 * after a token refresh. Prefer current_tenant_id when it is among the client's granted tenants;
 * otherwise keep the first granted tenant as default.
 *
 * affected: authz.custom_access_token_hook(jsonb) only.
 */

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
  v_oauth_client_id text;
  v_grant_tenants uuid[];
  v_oauth_tenant_json jsonb;
begin
  begin
    v_user_id := coalesce(
      (event->'user'->>'id')::uuid,
      (event->>'user_id')::uuid,
      (event->>'sub')::uuid
    );

    if v_user_id is null then
      return event;
    end if;

    v_claims := coalesce(event->'claims', '{}'::jsonb);

    v_oauth_client_id := nullif(trim(coalesce(event->>'client_id', '')), '');

    if v_oauth_client_id is not null then
      select coalesce(
        array_agg(tenant_id order by tenant_id),
        '{}'::uuid[]
      )
      into v_grant_tenants
      from app.oauth_client_tenant_grants
      where user_id = v_user_id
        and oauth_client_id = v_oauth_client_id;

      select coalesce(
        jsonb_agg(tenant_id::text order by tenant_id),
        '[]'::jsonb
      )
      into v_oauth_tenant_json
      from app.oauth_client_tenant_grants
      where user_id = v_user_id
        and oauth_client_id = v_oauth_client_id;

      if v_grant_tenants is not null and cardinality(v_grant_tenants) > 0 then
        v_tenant_id := null;
        select (raw_user_meta_data->>'current_tenant_id')::uuid
        into v_tenant_id
        from auth.users
        where id = v_user_id;

        if v_tenant_id is not null and v_tenant_id = any(v_grant_tenants) then
          v_claims := v_claims
            || jsonb_build_object('tenant_id', v_tenant_id::text)
            || jsonb_build_object('oauth_tenant_ids', v_oauth_tenant_json);
        else
          v_claims := v_claims
            || jsonb_build_object('tenant_id', v_grant_tenants[1]::text)
            || jsonb_build_object('oauth_tenant_ids', v_oauth_tenant_json);
        end if;
        event := event || jsonb_build_object('claims', v_claims);
      end if;

      return event;
    end if;

    select (raw_user_meta_data->>'current_tenant_id')::uuid
    into v_tenant_id
    from auth.users
    where id = v_user_id;

    if v_tenant_id is not null then
      if exists (
        select 1
        from app.tenant_memberships
        where user_id = v_user_id
          and tenant_id = v_tenant_id
      ) then
        v_claims := v_claims || jsonb_build_object('tenant_id', v_tenant_id::text);
        event := event || jsonb_build_object('claims', v_claims);
      end if;
    end if;

    return event;
  exception
    when others then
      return event;
  end;
end;
$$;

comment on function authz.custom_access_token_hook(jsonb) is
  'Adds tenant_id to JWT: for OAuth (client_id set), prefer raw_user_meta_data.current_tenant_id when it is in oauth_client_tenant_grants; else first granted tenant. oauth_tenant_ids lists all granted tenants. Non-OAuth: current_tenant_id with membership check.';

alter function authz.custom_access_token_hook(jsonb) owner to postgres;

grant execute on function authz.custom_access_token_hook(jsonb) to supabase_auth_admin;
