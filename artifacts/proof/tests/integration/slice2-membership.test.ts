import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { validateSupabaseDatabaseTarget } from "../support/supabase-project";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const hosted = process.env.SUPABASE_TEST_MODE === "hosted";
const api = process.env.SUPABASE_TEST_URL;
const key = process.env.SUPABASE_TEST_PUBLISHABLE_KEY;
const ids = Array.from({ length: 6 }, () => crypto.randomUUID());
const tokens: string[] = [];
const emails = ids.map((id, i) => `slice2-${i}-${id}@example.test`);
const orgs: string[] = [];
const names: string[] = [];
const access: string[] = [];
let invitationId = "";
let acceptedMemberId = "";
let authorityId = "";
let dualControlRequestId = "";
let dualControlAuthorityId = "";
let staleDualControlRequestId = "";
let unverifiedInvitationDigest = "";

type AuthBody = { access_token?: string; user?: { id?: string } };

async function request(endpoint: string, init: RequestInit = {}, token?: string) {
  if (!api || !key) throw new Error("Hosted Supabase configuration is required");
  const headers = new Headers(init.headers);
  headers.set("apikey", key);
  if (token) headers.set("authorization", `Bearer ${token}`);
  if (init.body) headers.set("content-type", "application/json");
  return fetch(`${api}${endpoint}`, { ...init, headers });
}

async function sql(user: string | null, text: string, values: unknown[] = [], commit = false) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("set local role authenticated");
    await client.query("select set_config('request.jwt.claim.sub',$1,true)", [user ?? ""]);
    const result = await client.query(text, values);
    await client.query(commit ? "commit" : "rollback");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function rpc<T>(name: string, user: number | null, args: Record<string, unknown>) {
  const body = JSON.stringify(args);
  if (hosted) {
    const response = await request(`/rest/v1/rpc/${name}`, { method: "POST", body }, user === null ? undefined : access[user]);
    const value = await response.json();
    if (!response.ok) throw Object.assign(new Error(JSON.stringify(value)), { status: response.status });
    return value as T;
  }
  const keys = Object.keys(args);
  const result = await sql(user === null ? null : ids[user], `select * from public.${name}(${keys.map((k, i) => `$${i + 1}`).join(",")})`, Object.values(args), true);
  const row = result.rows[0];
  return (Object.keys(row).length === 1 && name in row ? row[name] : row) as T;
}

async function expectDenied(action: () => Promise<unknown>) {
  await expect(action()).rejects.toBeTruthy();
}

async function invite(owner: number, email: string, roles = ["Requester"], title = "Buyer", expires = new Date(Date.now() + 172800000).toISOString()) {
  const digest = crypto.randomUUID().replaceAll("-", "").padEnd(64, "0");
  if (hosted) {
    const value = await rpc<{ id: string }>("create_membership_invitation", owner, {
      target_org: orgs[0], invite_email: email, invite_roles: roles, invite_job_title: title,
      invite_digest: digest, invite_expires_at: new Date(Date.now() + 172800000).toISOString(),
    });
    return { id: value.id, digest };
  }
  const value = await rpc<{ id: string }>("create_membership_invitation", owner, {
    target_org: orgs[0], invite_email: email, invite_roles: roles, invite_job_title: title,
    invite_digest: digest, invite_expires_at: expires,
  });
  return { id: value.id, digest };
}

describe("Slice 2 membership, invitation, authority and audit RLS", () => {
  beforeAll(async () => {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
    if (process.env.SUPABASE_TEST_MODE !== "local" && !hosted) throw new Error("SUPABASE_TEST_MODE must explicitly select local or hosted");
    if (hosted) validateSupabaseDatabaseTarget(api!, process.env.DATABASE_URL);
    else {
      const dbHost = new URL(process.env.DATABASE_URL).hostname;
      if (dbHost.endsWith(".supabase.co") || dbHost.endsWith(".pooler.supabase.com")) throw new Error("Local integration refuses hosted database targets");
      await pool.query(`create schema if not exists auth;
        create table if not exists auth.users (id uuid primary key, email text not null unique);
        alter table auth.users add column if not exists email_confirmed_at timestamptz;
        create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
        do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
        do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
        grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated`);
      const dir = path.resolve(process.cwd(), "../../supabase/migrations");
      for (const file of (await readdir(dir)).filter((x) => x.endsWith(".sql")).sort()) await pool.query(await readFile(path.join(dir, file), "utf8"));
      await pool.query("insert into auth.users(id,email,email_confirmed_at) select * from unnest($1::uuid[],$2::text[],array_fill(now(),array[6])) on conflict do nothing", [ids, emails]);
    }
    for (const i of [0, 4]) {
      names.push(`Slice 2 ${crypto.randomUUID()} ${i}`);
      if (hosted) {
        const r = await request("/auth/v1/signup", { method: "POST", body: JSON.stringify({ email: emails[i], password: `Slice2-${ids[i]}-Aa!` }) });
        const b = await r.json() as AuthBody;
        if (!r.ok || !b.user?.id || !b.access_token) throw new Error(`Hosted signup failed: ${r.status}`);
        ids[i] = b.user.id; access[i] = b.access_token;
        const org = await rpc<{ id: string }>("establish_organization", i, { organization_name: names.at(-1), creator_job_title: "Business Owner", establishment_capacity: "business_owner", eligibility_attested: true });
        orgs.push(org.id);
      } else {
        const org = await rpc<{ id: string }>("establish_organization", i, { organization_name: names.at(-1), creator_job_title: "Business Owner", establishment_capacity: "business_owner", eligibility_attested: true });
        orgs.push(org.id);
      }
    }
    if (hosted) {
      for (const i of [1, 2, 3, 5]) {
        const r = await request("/auth/v1/signup", { method: "POST", body: JSON.stringify({ email: emails[i], password: `Slice2-${ids[i]}-Aa!` }) });
        const b = await r.json() as AuthBody;
        if (!r.ok || !b.access_token || !b.user?.id) throw new Error(`Hosted signup failed: ${r.status}`);
        access[i] = b.access_token;
        ids[i] = b.user.id;
      }
    }
    // Seed the working tenant through the public invitation/acceptance paths.
    const adminInvite = await invite(0, emails[1], ["Requester"], "Manager");
    tokens.push(adminInvite.digest);
    const memberInvite = await invite(0, emails[2], ["Approver"], "Approver");
    tokens.push(memberInvite.digest);
    // Local auth fixtures are verified; hosted projects may require email confirmation.
    if (!hosted) await pool.query("update auth.users set email_confirmed_at=now() where id=any($1::uuid[])", [ids]);
    for (const [i, digest] of [[1, adminInvite.digest], [2, memberInvite.digest]] as const) {
      const row = await rpc<{ id: string }>("accept_membership_invitation", i, { token_digest_input: digest });
      if (i === 2) acceptedMemberId = row.id;
    }
    const promoted = await rpc<{ id: string }>("update_membership", 0, { target_org: orgs[0], target_member: (await sql(ids[1], "select id from public.memberships where organization_id=$1 and user_id=$2", [orgs[0], ids[1]])).rows[0].id, new_roles: ["Admin"], new_active: true, new_job_title: "Manager" });
    expect(promoted.id).toBeTruthy();
  });

  afterAll(async () => {
    try {
      if (orgs.length) await pool.query("delete from public.organizations where id=any($1::uuid[]) or name=any($2::text[])", [orgs, names]);
      await pool.query("delete from auth.users where id=any($1::uuid[]) or email=any($2::text[])", [ids, emails]);
    } finally { await pool.end(); }
  });

  it("creates invitations and exposes them only to managers", async () => { const row = await invite(0, emails[3]); invitationId = row.id; expect(row.id).toBeTruthy(); const rows = await sql(ids[0], "select id from public.invitations where id=$1", [row.id]); expect(rows.rowCount).toBe(1); });
  it("manager can see invitations while ordinary members cannot", async () => { expect((await sql(ids[1], "select id from public.invitations where organization_id=$1", [orgs[0]])).rowCount).toBeGreaterThan(0); expect((await sql(ids[2], "select id from public.invitations where organization_id=$1", [orgs[0]])).rowCount).toBe(0); });
  it("revokes a pending invitation", async () => { const row = await rpc<{ status: string }>("revoke_membership_invitation", 0, { target_org: orgs[0], invitation: invitationId }); expect(row.status).toBe("revoked"); });
  it("requires a verified email to accept", async () => { const row = await invite(0, emails[3]); unverifiedInvitationDigest = row.digest; await pool.query("update auth.users set email_confirmed_at=null where id=$1", [ids[3]]); await expectDenied(() => rpc("accept_membership_invitation", 3, { token_digest_input: row.digest })); });
  it("accepts the same pending invitation after email verification", async () => { await pool.query("update auth.users set email_confirmed_at=now() where id=$1", [ids[3]]); const member = await rpc<{ id: string }>("accept_membership_invitation", 3, { token_digest_input: unverifiedInvitationDigest }); expect(member.id).toBeTruthy(); });
  it("denies invitation replay", async () => {
    const row = await invite(0, emails[5]);
    await rpc("accept_membership_invitation", 5, { token_digest_input: row.digest });
    await expectDenied(() => rpc("accept_membership_invitation", 5, { token_digest_input: row.digest }));
  }, 15_000);
  it("denies duplicate pending invitations", async () => {
    const duplicateEmail = `duplicate-${crypto.randomUUID()}@example.test`;
    await invite(0, duplicateEmail);
    await expectDenied(() => invite(0, duplicateEmail));
  }, 15_000);
  it("denies invitation acceptance by the wrong account", async () => {
    const wrong = await invite(0, emails[4]);
    await expectDenied(() => rpc("accept_membership_invitation", 3, { token_digest_input: wrong.digest }));
  }, 15_000);
  it("denies expired invitations", async () => {
    const expired = crypto.randomUUID().replaceAll("-", "").padEnd(64, "0");
    const expiredEmail = `expired-${crypto.randomUUID()}@example.test`;
    await pool.query(
      "insert into public.invitations(organization_id,email,roles,job_title,token_digest,expires_at,invited_by) values($1,$2,$3,$4,$5,now()-interval '1 minute',$6)",
      [orgs[0], expiredEmail, ["Requester"], "Buyer", expired, ids[0]],
    );
    await expectDenied(() => rpc("accept_membership_invitation", 3, { token_digest_input: expired }));
  }, 15_000);
  it("changes roles and job title", async () => { const row = await rpc<{ job_title: string }>("update_membership", 0, { target_org: orgs[0], target_member: acceptedMemberId, new_roles: ["Requester"], new_active: true, new_job_title: "Buyer" }); expect(row.job_title).toBe("Buyer"); });
  it("rejects duplicate and forged roles", async () => { await expectDenied(() => rpc("update_membership", 0, { target_org: orgs[0], target_member: acceptedMemberId, new_roles: ["Requester", "Requester"], new_active: true, new_job_title: "Buyer" })); await expectDenied(() => invite(0, `forged-${crypto.randomUUID()}@example.test`, ["Owner"])); });
  it("prevents admins assigning or modifying Owner/Admin", async () => { await expectDenied(() => rpc("update_membership", 1, { target_org: orgs[0], target_member: acceptedMemberId, new_roles: ["Admin"], new_active: true, new_job_title: "Nope" })); });
  it("prevents admin self-change and owner self-change", async () => { const admin = (await sql(ids[1], "select id from public.memberships where user_id=$1 and organization_id=$2", [ids[1], orgs[0]])).rows[0].id; await expectDenied(() => rpc("update_membership", 1, { target_org: orgs[0], target_member: admin, new_roles: ["Requester"], new_active: true, new_job_title: "Nope" })); const owner = (await sql(ids[0], "select id from public.memberships where user_id=$1 and organization_id=$2", [ids[0], orgs[0]])).rows[0].id; await expectDenied(() => rpc("update_membership", 0, { target_org: orgs[0], target_member: owner, new_roles: ["Requester"], new_active: true, new_job_title: "Nope" })); });
  it("protects the last active Owner", async () => { const owner = (await sql(ids[0], "select id from public.memberships where user_id=$1 and organization_id=$2", [ids[0], orgs[0]])).rows[0].id; await expectDenied(() => rpc("update_membership", 0, { target_org: orgs[0], target_member: owner, new_roles: ["Owner"], new_active: false, new_job_title: "Owner" })); });
  it("bootstraps sole Owner approval authority", async () => { const owner = (await sql(ids[0], "select id from public.memberships where user_id=$1 and organization_id=$2", [ids[0], orgs[0]])).rows[0].id; await rpc("update_membership", 0, { target_org: orgs[0], target_member: owner, new_roles: ["Owner", "Approver"], new_active: true, new_job_title: "Business Owner" }); const a = await rpc<{ id: string }>("grant_approval_authority", 0, { target_org: orgs[0], target_member: owner, authority_category: "payment" }); authorityId = a.id; expect(a.id).toBeTruthy(); });
  it("requires an active Approver and blocks duplicate authority", async () => { await expectDenied(() => rpc("grant_approval_authority", 0, { target_org: orgs[0], target_member: acceptedMemberId, authority_category: "supplier_bank_detail_change" })); await expectDenied(() => rpc("grant_approval_authority", 0, { target_org: orgs[0], target_member: acceptedMemberId, authority_category: "payment" })); });
  it("blocks Admin authority grant and revoke", async () => { await expectDenied(() => rpc("grant_approval_authority", 1, { target_org: orgs[0], target_member: acceptedMemberId, authority_category: "payment" })); await expectDenied(() => rpc("revoke_approval_authority", 1, { target_org: orgs[0], authority: authorityId })); });
  it("revokes authority while preserving history and has_authority false", async () => { const row = await rpc<{ active: boolean }>("revoke_approval_authority", 0, { target_org: orgs[0], authority: authorityId }); expect(row.active).toBe(false); const history = await sql(ids[0], "select count(*)::int as count from public.approval_authorities where id=$1", [authorityId]); expect(history.rows[0].count).toBe(1); expect((await sql(ids[0], "select private.has_authority($1,'payment') as value", [orgs[0]])).rows[0].value).toBe(false); });
  it("requires dual control when another active Owner exists", async () => {
    const secondOwner = (await sql(ids[1], "select id from public.memberships where user_id=$1 and organization_id=$2", [ids[1], orgs[0]])).rows[0].id;
    await rpc("update_membership", 0, { target_org: orgs[0], target_member: secondOwner, new_roles: ["Owner"], new_active: true, new_job_title: "Finance Owner" });
    await rpc("update_membership", 0, { target_org: orgs[0], target_member: acceptedMemberId, new_roles: ["Approver"], new_active: true, new_job_title: "Payment Approver" });
    await expectDenied(() => rpc("grant_approval_authority", 0, { target_org: orgs[0], target_member: acceptedMemberId, authority_category: "payment" }));
    const result = await rpc<{ outcome: string; request: { id: string } }>("request_approval_authority_grant", 0, { target_org: orgs[0], target_member: acceptedMemberId, authority_category: "payment" });
    expect(result.outcome).toBe("pending");
    dualControlRequestId = result.request.id;
    expect((await sql(ids[0], "select id from public.approval_authorities where member_id=$1 and category='payment' and active", [acceptedMemberId])).rowCount).toBe(0);
  });
  it("denies duplicate, unilateral, self, Admin, and cross-tenant approval attempts", async () => {
    await expectDenied(() => rpc("request_approval_authority_grant", 0, { target_org: orgs[0], target_member: acceptedMemberId, authority_category: "payment" }));
    await expectDenied(() => rpc("approve_approval_authority_grant", 0, { target_org: orgs[0], authority_request: dualControlRequestId }));
    await expectDenied(() => rpc("approve_approval_authority_grant", 2, { target_org: orgs[0], authority_request: dualControlRequestId }));
    await expectDenied(() => rpc("approve_approval_authority_grant", 4, { target_org: orgs[1], authority_request: dualControlRequestId }));
    const firstOwner = (await sql(ids[0], "select id from public.memberships where user_id=$1 and organization_id=$2", [ids[0], orgs[0]])).rows[0].id;
    await expectDenied(() => rpc("request_approval_authority_grant", 0, { target_org: orgs[0], target_member: firstOwner, authority_category: "supplier_bank_detail_change" }));
  });
  it("serializes concurrent second-Owner approvals to one grant", async () => {
    const approvals = await Promise.allSettled([
      rpc<{ id: string }>("approve_approval_authority_grant", 1, { target_org: orgs[0], authority_request: dualControlRequestId }),
      rpc<{ id: string }>("approve_approval_authority_grant", 1, { target_org: orgs[0], authority_request: dualControlRequestId }),
    ]);
    expect(approvals.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect(approvals.filter(result => result.status === "rejected")).toHaveLength(1);
    const row = (approvals.find(result => result.status === "fulfilled") as PromiseFulfilledResult<{ id: string }>).value;
    dualControlAuthorityId = row.id;
    expect(row.id).toBeTruthy();
    expect((await sql(ids[2], "select private.has_authority($1,'payment') as value", [orgs[0]])).rows[0].value).toBe(true);
    await expectDenied(() => rpc("approve_approval_authority_grant", 1, { target_org: orgs[0], authority_request: dualControlRequestId }));
  });
  it("serializes concurrent authority requests to one pending change", async () => {
    const requests = await Promise.allSettled([
      rpc<{ request: { id: string } }>("request_approval_authority_grant", 0, { target_org: orgs[0], target_member: acceptedMemberId, authority_category: "supplier_bank_detail_change" }),
      rpc<{ request: { id: string } }>("request_approval_authority_grant", 1, { target_org: orgs[0], target_member: acceptedMemberId, authority_category: "supplier_bank_detail_change" }),
    ]);
    expect(requests.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect(requests.filter(result => result.status === "rejected")).toHaveLength(1);
    staleDualControlRequestId = (requests.find(result => result.status === "fulfilled") as PromiseFulfilledResult<{ request: { id: string } }>).value.request.id;
  });
  it("rejects stale authority requests after target suspension", async () => {
    await rpc("update_membership", 0, { target_org: orgs[0], target_member: acceptedMemberId, new_roles: ["Approver"], new_active: false, new_job_title: "Paused" });
    await expectDenied(() => rpc("approve_approval_authority_grant", 1, { target_org: orgs[0], authority_request: staleDualControlRequestId }));
    await rpc("update_membership", 0, { target_org: orgs[0], target_member: acceptedMemberId, new_roles: ["Approver"], new_active: true, new_job_title: "Active" });
  });
  it("suspension immediately disables access and authority, then reactivation restores membership", async () => { await rpc("update_membership", 0, { target_org: orgs[0], target_member: acceptedMemberId, new_roles: ["Approver"], new_active: false, new_job_title: "Paused" }); expect((await sql(ids[2], "select id from public.memberships where id=$1", [acceptedMemberId])).rowCount).toBe(0); expect((await sql(ids[2], "select private.has_authority($1,'payment') as value", [orgs[0]])).rows[0].value).toBe(false); await rpc("update_membership", 0, { target_org: orgs[0], target_member: acceptedMemberId, new_roles: ["Approver"], new_active: true, new_job_title: "Active" }); expect((await sql(ids[2], "select id from public.memberships where id=$1", [acceptedMemberId])).rowCount).toBe(1); });
  it("hides cross-tenant invitation, member, authority, and request IDs", async () => { expect((await sql(ids[0], "select id from public.invitations where id=$1", [crypto.randomUUID()])).rowCount).toBe(0); expect((await sql(ids[0], "select id from public.memberships where organization_id=$1", [orgs[1]])).rowCount).toBe(0); expect((await sql(ids[0], "select id from public.approval_authorities where organization_id=$1", [orgs[1]])).rowCount).toBe(0); expect((await sql(ids[4], "select id from public.approval_authority_requests where id=$1", [dualControlRequestId])).rowCount).toBe(0); });
  it("denies anonymous RPC calls", async () => { await expectDenied(() => rpc("create_membership_invitation", null, { target_org: orgs[0], invite_email: "anon@example.test", invite_roles: ["Requester"], invite_job_title: "Buyer", invite_digest: "a".repeat(64), invite_expires_at: new Date(Date.now() + 86400000).toISOString() })); });
  it("denies direct writes to every Slice 2 table", async () => { for (const table of ["invitations", "approval_authorities", "approval_authority_requests", "membership_audit_events"]) await expect(sql(ids[0], `insert into public.${table} default values`)).rejects.toBeTruthy(); });
  it("creates audit events for invitation, membership and authority changes", async () => { const count = await sql(ids[0], "select count(*)::int as count from public.membership_audit_events where organization_id=$1", [orgs[0]]); expect(count.rows[0].count).toBeGreaterThan(0); });
  it("denies direct audit mutation", async () => { await expect(sql(ids[0], "update public.membership_audit_events set metadata='{}' where organization_id=$1", [orgs[0]])).rejects.toBeTruthy(); await expect(sql(ids[0], "delete from public.membership_audit_events where organization_id=$1", [orgs[0]])).rejects.toBeTruthy(); });
  it("blocks privileged direct audit mutation and deletion", async () => {
    const event = await pool.query<{ id: string }>(
      "select id from public.membership_audit_events where organization_id=$1 limit 1",
      [orgs[0]],
    );
    const eventId = event.rows[0]?.id;
    expect(eventId).toBeTruthy();
    expect(dualControlAuthorityId).toBeTruthy();
    await expectDenied(() => pool.query(
      "update public.membership_audit_events set metadata=jsonb_build_object('tampered',true) where id=$1",
      [eventId],
    ));
    await expectDenied(() => pool.query(
      "delete from public.membership_audit_events where id=$1",
      [eventId],
    ));
  });
});