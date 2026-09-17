-- Slice 1 foundation. Only identity, tenancy and membership data lives here.
-- job_title is deliberately not a role: roles are the membership.roles array.
create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  created_at timestamptz not null default now()
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  roles text[] not null default '{}',
  job_title text not null check (char_length(job_title) between 2 and 100),
  establishment_capacity text not null check (
    establishment_capacity in ('chief_executive','business_owner','chief_financial_officer','finance_director')
  ),
  eligibility_attested_at timestamptz not null,
  active boolean not null default true,
  joined_at timestamptz not null default now(),
  unique (organization_id, user_id),
  check (roles <@ array['Owner','Admin','Requester','Approver','Auditor']::text[]),
  check (cardinality(roles) > 0)
);

create index if not exists memberships_user_idx on public.memberships(user_id) where active;
create index if not exists memberships_org_idx on public.memberships(organization_id) where active;

alter table public.memberships
  add column if not exists establishment_capacity text,
  add column if not exists eligibility_attested_at timestamptz;

create or replace function public.is_active_member(target_org uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = target_org and m.user_id = auth.uid() and m.active
  );
$$;

create or replace function public.has_membership_role(target_org uuid, required_role text)
returns boolean language sql stable security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = target_org and m.user_id = auth.uid() and m.active
      and required_role = any(m.roles)
  );
$$;

-- One transaction, one authoritative identity. The caller cannot choose the
-- owner or inject a role; establishmentCapacity is an eligibility assertion.
drop function if exists public.establish_organization(text, text, text);
create or replace function public.establish_organization(
  organization_name text,
  creator_job_title text,
  establishment_capacity text,
  eligibility_attested boolean
) returns public.organizations
language plpgsql volatile security definer
set search_path = pg_catalog, public
as $$
declare created_org public.organizations;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if establishment_capacity not in ('chief_executive','business_owner','chief_financial_officer','finance_director') then
    raise exception 'creator is not eligible to establish an organization' using errcode = '42501';
  end if;
  if eligibility_attested is not true then
    raise exception 'eligibility attestation required' using errcode = '42501';
  end if;
  if char_length(organization_name) not between 2 and 120 or char_length(creator_job_title) not between 2 and 100 then
    raise exception 'invalid organization details' using errcode = '22023';
  end if;
  insert into public.organizations(name) values (organization_name) returning * into created_org;
  insert into public.memberships(
    organization_id,user_id,roles,job_title,establishment_capacity,eligibility_attested_at
  ) values (
    created_org.id, auth.uid(), array['Owner']::text[], creator_job_title,
    establishment_capacity, now()
  );
  return created_org;
end;
$$;

alter table public.organizations enable row level security;
alter table public.memberships enable row level security;

drop policy if exists organizations_select_member on public.organizations;
create policy organizations_select_member on public.organizations for select
  using (public.is_active_member(id));
drop policy if exists memberships_select_same_tenant on public.memberships;
create policy memberships_select_same_tenant on public.memberships for select
  using (public.is_active_member(organization_id));
-- Writes occur through the establishment function or future narrowly scoped
-- server functions; direct client inserts/updates are intentionally denied.
drop policy if exists organizations_no_direct_insert on public.organizations;
drop policy if exists memberships_no_direct_insert on public.memberships;

revoke all on public.organizations from anon, authenticated;
revoke all on public.memberships from anon, authenticated;
grant select on public.organizations to authenticated;
grant select on public.memberships to authenticated;
revoke all on function public.establish_organization(text, text, text, boolean) from public, anon;
grant execute on function public.establish_organization(text, text, text, boolean) to authenticated;
revoke all on function public.is_active_member(uuid) from public, anon;
grant execute on function public.is_active_member(uuid) to authenticated;
revoke all on function public.has_membership_role(uuid, text) from public, anon;
grant execute on function public.has_membership_role(uuid, text) to authenticated;