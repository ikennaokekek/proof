-- Slice 2: invitations, membership management and approval authority.
-- All mutations below are security-definer entry points; client roles never
-- receive INSERT/UPDATE/DELETE privileges on these relations.
create extension if not exists pgcrypto;
alter table public.memberships alter column establishment_capacity drop not null;
alter table public.memberships alter column eligibility_attested_at drop not null;

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null check (char_length(email) between 3 and 320),
  token_digest text not null unique check (token_digest ~ '^[0-9a-f]{64}$'),
  roles text[] not null check (roles <@ array['Requester','Approver','Auditor']::text[] and cardinality(roles)>0),
  job_title text not null check (char_length(job_title) between 2 and 100),
  expires_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','accepted','revoked','expired')),
  invited_by uuid not null references auth.users(id),
  accepted_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  revoked_at timestamptz
);
create index if not exists invitations_org_idx on public.invitations(organization_id, created_at desc);
create or replace function private.unique_role_array(value text[]) returns boolean
language sql immutable as $$ select value is not null and cardinality(value)=cardinality(array(select distinct unnest(value))) $$;
alter table public.memberships drop constraint if exists memberships_roles_unique;
alter table public.memberships add constraint memberships_roles_unique check (private.unique_role_array(roles));
alter table public.invitations drop constraint if exists invitations_roles_unique;
alter table public.invitations add constraint invitations_roles_unique check (private.unique_role_array(roles));
create unique index if not exists invitations_pending_email_idx
  on public.invitations(organization_id, lower(email)) where status='pending';

create table if not exists public.approval_authorities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  member_id uuid not null references public.memberships(id) on delete cascade,
  category text not null check (category in ('payment','supplier_bank_detail_change')),
  granted_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  active boolean not null default true,
  revoked_by uuid references auth.users(id),
  revoked_at timestamptz
);
alter table public.approval_authorities
  add column if not exists active boolean not null default true,
  add column if not exists revoked_by uuid references auth.users(id),
  add column if not exists revoked_at timestamptz;
alter table public.approval_authorities
  drop constraint if exists approval_authorities_member_id_category_key;
create unique index if not exists approval_authorities_active_member_category_idx
  on public.approval_authorities(member_id, category) where active;

create table if not exists public.membership_audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid not null references auth.users(id),
  event_type text not null,
  membership_id uuid references public.memberships(id),
  invitation_id uuid references public.invitations(id),
  authority_id uuid references public.approval_authorities(id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists membership_audit_org_idx on public.membership_audit_events(organization_id, created_at desc);
create or replace function private.protect_membership_audit_event()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  if tg_op = 'DELETE'
     and not exists (
       select 1 from public.organizations
       where id = old.organization_id
     ) then
    return old;
  end if;
  raise exception 'membership audit events are append-only' using errcode='42501';
end; $$;
drop trigger if exists membership_audit_events_append_only on public.membership_audit_events;
create trigger membership_audit_events_append_only
before update or delete on public.membership_audit_events
for each row execute function private.protect_membership_audit_event();

create or replace function private.is_manager(target_org uuid)
returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
 select exists(select 1 from public.memberships m where m.organization_id=target_org and m.user_id=auth.uid() and m.active and ('Owner'=any(m.roles) or 'Admin'=any(m.roles)));
$$;
create or replace function private.is_owner(target_org uuid)
returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
 select exists(select 1 from public.memberships m where m.organization_id=target_org and m.user_id=auth.uid() and m.active and 'Owner'=any(m.roles));
$$;
create or replace function private.has_authority(target_org uuid, requested_category text)
returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
 select exists(select 1 from public.approval_authorities a join public.memberships m on m.id=a.member_id
   where a.organization_id=target_org and a.category=requested_category and a.active
     and m.user_id=auth.uid() and m.active and 'Approver'=any(m.roles));
$$;

create or replace function public.create_membership_invitation(
  target_org uuid, invite_email text, invite_roles text[], invite_job_title text,
  invite_digest text, invite_expires_at timestamptz
) returns public.invitations language plpgsql volatile security definer set search_path=pg_catalog,public as $$
declare result public.invitations; actor public.memberships;
begin
 if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
 select * into actor from public.memberships where organization_id=target_org and user_id=auth.uid() and active for update;
 if not found or not ('Owner'=any(actor.roles) or 'Admin'=any(actor.roles)) then raise exception 'manager permission required' using errcode='42501'; end if;
 if invite_roles is null or cardinality(invite_roles)=0 or not (invite_roles <@ array['Requester','Approver','Auditor']::text[]) then raise exception 'invalid invitation roles' using errcode='22023'; end if;
 if invite_expires_at <= now() or invite_expires_at > now()+interval '7 days' then raise exception 'invalid invitation expiry' using errcode='22023'; end if;
 if lower(trim(invite_email)) = lower((select email from auth.users where id=auth.uid())) then raise exception 'cannot invite self' using errcode='23514'; end if;
 insert into public.invitations(organization_id,email,roles,job_title,token_digest,expires_at,invited_by)
 values(target_org,lower(trim(invite_email)),invite_roles,invite_job_title,lower(invite_digest),invite_expires_at,auth.uid()) returning * into result;
 insert into public.membership_audit_events(organization_id,actor_id,event_type,invitation_id,metadata)
 values(target_org,auth.uid(),'invitation.created',result.id,jsonb_build_object('roles',result.roles));
 return result;
exception when unique_violation then raise exception 'pending invitation already exists' using errcode='23505';
end; $$;

create or replace function public.revoke_membership_invitation(target_org uuid, invitation uuid)
returns public.invitations language plpgsql volatile security definer set search_path=pg_catalog,public as $$
declare result public.invitations;
begin
 if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
 if not private.is_manager(target_org) then raise exception 'manager permission required' using errcode='42501'; end if;
 update public.invitations set status='revoked',revoked_at=now() where id=invitation and organization_id=target_org and status='pending' returning * into result;
 if not found then raise exception 'invitation not found' using errcode='P0002'; end if;
 insert into public.membership_audit_events(organization_id,actor_id,event_type,invitation_id) values(target_org,auth.uid(),'invitation.revoked',result.id);
 return result;
end; $$;

create or replace function public.accept_membership_invitation(token_digest_input text)
returns public.memberships language plpgsql volatile security definer set search_path=pg_catalog,public as $$
declare invite public.invitations; uemail text; result public.memberships;
begin
 if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
 select email into uemail from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if uemail is null then raise exception 'verified email required' using errcode='42501'; end if;
 select * into invite from public.invitations where token_digest=lower(token_digest_input) for update;
 if not found then raise exception 'invitation not found' using errcode='P0002'; end if;
 if invite.status <> 'pending' then raise exception 'invitation is no longer pending' using errcode='23514'; end if;
 if invite.expires_at <= now() then raise exception 'invitation expired' using errcode='23514'; end if;
 if lower(uemail) <> lower(invite.email) then raise exception 'invitation email mismatch' using errcode='42501'; end if;
 insert into public.memberships(organization_id,user_id,roles,job_title,establishment_capacity,eligibility_attested_at)
 values(invite.organization_id,auth.uid(),invite.roles,invite.job_title,null,null) returning * into result;
 update public.invitations set status='accepted',accepted_by=auth.uid(),accepted_at=now() where id=invite.id;
 insert into public.membership_audit_events(organization_id,actor_id,event_type,membership_id,invitation_id)
 values(invite.organization_id,auth.uid(),'invitation.accepted',result.id,invite.id);
 return result;
exception when unique_violation then raise exception 'user is already a member' using errcode='23505';
end; $$;

drop function if exists public.update_membership(uuid,uuid,text[],boolean);
create or replace function public.update_membership(
 target_org uuid, target_member uuid, new_roles text[], new_active boolean, new_job_title text
) returns public.memberships language plpgsql volatile security definer set search_path=pg_catalog,public as $$
declare actor public.memberships; old public.memberships; result public.memberships; owner_count integer;
begin
 if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
 select * into actor from public.memberships where organization_id=target_org and user_id=auth.uid() and active for update;
 if not found or not ('Owner'=any(actor.roles) or 'Admin'=any(actor.roles)) then raise exception 'manager permission required' using errcode='42501'; end if;
 select * into old from public.memberships where id=target_member and organization_id=target_org for update;
 if not found then raise exception 'member not found' using errcode='P0002'; end if;
 if char_length(trim(new_job_title)) not between 2 and 100 then raise exception 'invalid job title' using errcode='22023'; end if;
 if new_roles is null or cardinality(new_roles)=0 or not (new_roles <@ array['Owner','Admin','Requester','Approver','Auditor']::text[]) then raise exception 'invalid roles' using errcode='22023'; end if;
 if old.user_id=auth.uid() then
   select count(*) into owner_count from public.memberships
     where organization_id=target_org and active and 'Owner'=any(roles);
   if not ('Owner'=any(old.roles)) or owner_count <> 1 or not new_active
      or not ('Owner'=any(new_roles))
      or not (new_roles <@ array['Owner','Approver']::text[])
      or trim(new_job_title) <> old.job_title then
     raise exception 'self membership change is limited to sole-owner authority bootstrap' using errcode='42501';
   end if;
 end if;
 if 'Owner'=any(old.roles) and (not ('Owner'=any(new_roles)) or not new_active) then
   if not 'Owner'=any(actor.roles) then raise exception 'admin cannot modify owner' using errcode='42501'; end if;
   if old.user_id=auth.uid() then raise exception 'owner cannot self-suspend or self-demote' using errcode='42501'; end if;
   select count(*) into owner_count from public.memberships where organization_id=target_org and active and 'Owner'=any(roles);
   if owner_count <= 1 then raise exception 'cannot remove last active owner' using errcode='23514'; end if;
 end if;
 if not 'Owner'=any(actor.roles) and ('Owner'=any(new_roles) or 'Owner'=any(old.roles) or 'Admin'=any(new_roles) or 'Admin'=any(old.roles)) then raise exception 'admin cannot assign or modify owner/admin' using errcode='42501'; end if;
 update public.memberships set roles=new_roles,active=new_active,job_title=trim(new_job_title) where id=target_member returning * into result;
 insert into public.membership_audit_events(organization_id,actor_id,event_type,membership_id,metadata)
 values(target_org,auth.uid(),case when new_active then 'membership.reactivated' else 'membership.suspended' end,target_member,jsonb_build_object('roles',new_roles,'active',new_active,'job_title',trim(new_job_title)));
 return result;
end; $$;

create or replace function public.grant_approval_authority(target_org uuid, target_member uuid, authority_category text)
returns public.approval_authorities language plpgsql volatile security definer set search_path=pg_catalog,public as $$
declare m public.memberships; result public.approval_authorities; owner_count integer;
begin
 if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
 if not private.is_owner(target_org) then raise exception 'owner permission required' using errcode='42501'; end if;
 if authority_category not in ('payment','supplier_bank_detail_change') then raise exception 'invalid authority category' using errcode='22023'; end if;
 select * into m from public.memberships where id=target_member and organization_id=target_org and active for update;
 if not found or not ('Approver'=any(m.roles)) then raise exception 'active approver required' using errcode='23514'; end if;
 select count(*) into owner_count from public.memberships where organization_id=target_org and active and 'Owner'=any(roles);
 if m.user_id=auth.uid() and owner_count <> 1 then raise exception 'owner self-grant is bootstrap only' using errcode='42501'; end if;
 insert into public.approval_authorities(organization_id,member_id,category,granted_by) values(target_org,target_member,authority_category,auth.uid()) returning * into result;
 insert into public.membership_audit_events(organization_id,actor_id,event_type,membership_id,authority_id,metadata) values(target_org,auth.uid(),'authority.granted',target_member,result.id,jsonb_build_object('category',authority_category));
 return result;
exception when unique_violation then raise exception 'authority already granted' using errcode='23505';
end; $$;

create or replace function public.revoke_approval_authority(target_org uuid, authority uuid)
returns public.approval_authorities language plpgsql volatile security definer set search_path=pg_catalog,public as $$
declare result public.approval_authorities;
begin
 if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
 if not private.is_owner(target_org) then raise exception 'owner permission required' using errcode='42501'; end if;
  update public.approval_authorities
    set active=false, revoked_by=auth.uid(), revoked_at=now()
    where id=authority and organization_id=target_org and active
    returning * into result;
 if not found then raise exception 'authority not found' using errcode='P0002'; end if;
 insert into public.membership_audit_events(organization_id,actor_id,event_type,membership_id,authority_id) values(target_org,auth.uid(),'authority.revoked',result.member_id,result.id);
 return result;
end; $$;

alter table public.invitations enable row level security;
alter table public.approval_authorities enable row level security;
alter table public.membership_audit_events enable row level security;
drop policy if exists invitations_manager_read on public.invitations;
create policy invitations_manager_read on public.invitations for select using (private.is_manager(organization_id));
drop policy if exists authorities_member_read on public.approval_authorities;
create policy authorities_member_read on public.approval_authorities for select using (private.is_active_member(organization_id));
drop policy if exists membership_audit_manager_read on public.membership_audit_events;
create policy membership_audit_manager_read on public.membership_audit_events for select using (private.is_manager(organization_id));

revoke all on public.invitations, public.approval_authorities, public.membership_audit_events from anon,authenticated;
grant select on public.invitations, public.approval_authorities, public.membership_audit_events to authenticated;
revoke all on function private.protect_membership_audit_event() from public,anon,authenticated;
revoke all on function public.create_membership_invitation(uuid,text,text[],text,text,timestamptz),public.revoke_membership_invitation(uuid,uuid),public.accept_membership_invitation(text),public.update_membership(uuid,uuid,text[],boolean,text),public.grant_approval_authority(uuid,uuid,text),public.revoke_approval_authority(uuid,uuid) from public,anon;
grant execute on function public.create_membership_invitation(uuid,text,text[],text,text,timestamptz),public.revoke_membership_invitation(uuid,uuid),public.accept_membership_invitation(text),public.update_membership(uuid,uuid,text[],boolean,text),public.grant_approval_authority(uuid,uuid,text),public.revoke_approval_authority(uuid,uuid) to authenticated;
revoke all on function private.is_manager(uuid),private.is_owner(uuid),private.has_authority(uuid,text) from public,anon;
grant execute on function private.is_manager(uuid),private.is_owner(uuid),private.has_authority(uuid,text) to authenticated;