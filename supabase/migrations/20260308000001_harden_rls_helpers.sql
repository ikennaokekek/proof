-- Keep policy helpers outside the API-exposed public schema. Authenticated
-- callers may execute them only as part of policy evaluation.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_active_member(target_org uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = target_org and m.user_id = auth.uid() and m.active
  );
$$;

create or replace function private.has_membership_role(target_org uuid, required_role text)
returns boolean language sql stable security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = target_org and m.user_id = auth.uid() and m.active
      and required_role = any(m.roles)
  );
$$;

revoke all on function private.is_active_member(uuid) from public, anon;
grant execute on function private.is_active_member(uuid) to authenticated;
revoke all on function private.has_membership_role(uuid, text) from public, anon;
grant execute on function private.has_membership_role(uuid, text) to authenticated;

drop policy if exists organizations_select_member on public.organizations;
create policy organizations_select_member on public.organizations for select
  using (private.is_active_member(id));
drop policy if exists memberships_select_same_tenant on public.memberships;
create policy memberships_select_same_tenant on public.memberships for select
  using (private.is_active_member(organization_id));

revoke all on function public.is_active_member(uuid) from public, anon, authenticated;
revoke all on function public.has_membership_role(uuid, text) from public, anon, authenticated;
drop function public.is_active_member(uuid);
drop function public.has_membership_role(uuid, text);