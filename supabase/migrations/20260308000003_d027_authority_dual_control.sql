-- D-027: critical Approval Authority increases require dual control whenever
-- another active Owner exists. Sole-owner bootstrap remains explicit.

create table if not exists public.approval_authority_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  member_id uuid not null references public.memberships(id) on delete cascade,
  category text not null check (category in ('payment','supplier_bank_detail_change')),
  requested_by uuid not null references auth.users(id),
  status text not null default 'pending' check (status in ('pending','approved')),
  created_at timestamptz not null default now(),
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  authority_id uuid references public.approval_authorities(id),
  check (
    (status='pending' and decided_by is null and decided_at is null and authority_id is null)
    or
    (status='approved' and decided_by is not null and decided_at is not null and authority_id is not null)
  )
);

create unique index if not exists approval_authority_requests_pending_target_idx
  on public.approval_authority_requests(organization_id,member_id,category)
  where status='pending';
create index if not exists approval_authority_requests_org_idx
  on public.approval_authority_requests(organization_id,status,created_at desc);

alter table public.membership_audit_events
  add column if not exists authority_request_id uuid
    references public.approval_authority_requests(id);

create or replace function public.grant_approval_authority(
  target_org uuid, target_member uuid, authority_category text
) returns public.approval_authorities
language plpgsql volatile security definer set search_path=pg_catalog,public as $$
declare
  actor public.memberships;
  target public.memberships;
  result public.approval_authorities;
  owner_count integer;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode='42501';
  end if;

  select * into actor from public.memberships
    where organization_id=target_org and user_id=auth.uid() and active
    for update;
  if not found or not ('Owner'=any(actor.roles)) then
    raise exception 'owner permission required' using errcode='42501';
  end if;

  if authority_category not in ('payment','supplier_bank_detail_change') then
    raise exception 'invalid authority category' using errcode='22023';
  end if;

  select * into target from public.memberships
    where id=target_member and organization_id=target_org and active
    for update;
  if not found or not ('Approver'=any(target.roles)) then
    raise exception 'active approver required' using errcode='23514';
  end if;

  select count(*) into owner_count from public.memberships
    where organization_id=target_org and active and 'Owner'=any(roles);
  if owner_count <> 1 then
    raise exception 'dual control request required' using errcode='42501';
  end if;

  insert into public.approval_authorities(
    organization_id,member_id,category,granted_by
  ) values (
    target_org,target_member,authority_category,auth.uid()
  ) returning * into result;

  insert into public.membership_audit_events(
    organization_id,actor_id,event_type,membership_id,authority_id,metadata
  ) values (
    target_org,auth.uid(),'authority.granted',target_member,result.id,
    jsonb_build_object('category',authority_category,'governance','sole_owner_bootstrap')
  );
  return result;
exception
  when unique_violation then
    raise exception 'authority already granted' using errcode='23505';
end; $$;

create or replace function public.request_approval_authority_grant(
  target_org uuid, target_member uuid, authority_category text
) returns jsonb
language plpgsql volatile security definer set search_path=pg_catalog,public as $$
declare
  actor public.memberships;
  target public.memberships;
  owner_count integer;
  authority public.approval_authorities;
  request public.approval_authority_requests;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode='42501';
  end if;

  select * into actor from public.memberships
    where organization_id=target_org and user_id=auth.uid() and active
    for update;
  if not found or not ('Owner'=any(actor.roles)) then
    raise exception 'owner permission required' using errcode='42501';
  end if;

  if authority_category not in ('payment','supplier_bank_detail_change') then
    raise exception 'invalid authority category' using errcode='22023';
  end if;

  select * into target from public.memberships
    where id=target_member and organization_id=target_org and active
    for update;
  if not found or not ('Approver'=any(target.roles)) then
    raise exception 'active approver required' using errcode='23514';
  end if;

  if exists (
    select 1 from public.approval_authorities
    where member_id=target_member and category=authority_category and active
  ) then
    raise exception 'authority already granted' using errcode='23505';
  end if;

  select count(*) into owner_count from public.memberships
    where organization_id=target_org and active and 'Owner'=any(roles);

  if owner_count = 1 then
    select * into authority from public.grant_approval_authority(
      target_org,target_member,authority_category
    );
    return jsonb_build_object(
      'outcome','granted',
      'authority',to_jsonb(authority)
    );
  end if;

  if target.user_id=auth.uid() then
    raise exception 'owner cannot request own authority increase' using errcode='42501';
  end if;

  insert into public.approval_authority_requests(
    organization_id,member_id,category,requested_by
  ) values (
    target_org,target_member,authority_category,auth.uid()
  ) returning * into request;

  insert into public.membership_audit_events(
    organization_id,actor_id,event_type,membership_id,authority_request_id,metadata
  ) values (
    target_org,auth.uid(),'authority.grant_requested',target_member,request.id,
    jsonb_build_object('category',authority_category,'governance','dual_control')
  );

  return jsonb_build_object(
    'outcome','pending',
    'request',to_jsonb(request)
  );
exception
  when unique_violation then
    raise exception 'authority or pending request already exists' using errcode='23505';
end; $$;

create or replace function public.approve_approval_authority_grant(
  target_org uuid, authority_request uuid
) returns public.approval_authorities
language plpgsql volatile security definer set search_path=pg_catalog,public as $$
declare
  actor public.memberships;
  requester public.memberships;
  target public.memberships;
  request public.approval_authority_requests;
  result public.approval_authorities;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode='42501';
  end if;

  select * into actor from public.memberships
    where organization_id=target_org and user_id=auth.uid() and active
    for update;
  if not found or not ('Owner'=any(actor.roles)) then
    raise exception 'owner permission required' using errcode='42501';
  end if;

  select * into request from public.approval_authority_requests
    where id=authority_request and organization_id=target_org
    for update;
  if not found then
    raise exception 'authority request not found' using errcode='P0002';
  end if;
  if request.status <> 'pending' then
    raise exception 'authority request is no longer pending' using errcode='23514';
  end if;
  if request.requested_by=auth.uid() then
    raise exception 'requester cannot approve own authority increase' using errcode='42501';
  end if;

  select * into requester from public.memberships
    where organization_id=target_org and user_id=request.requested_by and active
    for update;
  if not found or not ('Owner'=any(requester.roles)) then
    raise exception 'requesting owner is no longer eligible' using errcode='23514';
  end if;

  select * into target from public.memberships
    where id=request.member_id and organization_id=target_org and active
    for update;
  if not found or not ('Approver'=any(target.roles)) then
    raise exception 'target is no longer an active approver' using errcode='23514';
  end if;
  if target.user_id=auth.uid() then
    raise exception 'owner cannot approve own authority increase' using errcode='42501';
  end if;

  insert into public.approval_authorities(
    organization_id,member_id,category,granted_by
  ) values (
    target_org,request.member_id,request.category,auth.uid()
  ) returning * into result;

  update public.approval_authority_requests
    set status='approved',decided_by=auth.uid(),decided_at=now(),authority_id=result.id
    where id=request.id;

  insert into public.membership_audit_events(
    organization_id,actor_id,event_type,membership_id,authority_id,
    authority_request_id,metadata
  ) values (
    target_org,auth.uid(),'authority.granted',request.member_id,result.id,
    request.id,jsonb_build_object(
      'category',request.category,
      'governance','dual_control',
      'requested_by',request.requested_by
    )
  );
  return result;
exception
  when unique_violation then
    raise exception 'authority already granted' using errcode='23505';
end; $$;

alter table public.approval_authority_requests enable row level security;
drop policy if exists authority_requests_owner_read on public.approval_authority_requests;
create policy authority_requests_owner_read on public.approval_authority_requests
  for select using (private.is_owner(organization_id));

revoke all on public.approval_authority_requests from anon,authenticated;
grant select on public.approval_authority_requests to authenticated;

revoke all on function
  public.request_approval_authority_grant(uuid,uuid,text),
  public.approve_approval_authority_grant(uuid,uuid)
from public,anon;
grant execute on function
  public.request_approval_authority_grant(uuid,uuid,text),
  public.approve_approval_authority_grant(uuid,uuid)
to authenticated;