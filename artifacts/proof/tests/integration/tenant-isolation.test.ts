import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { validateSupabaseDatabaseTarget } from "../support/supabase-project";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const users = [crypto.randomUUID(), crypto.randomUUID()];
const organizationIds: string[] = [];
const accessTokens: string[] = [];
const hostedApiUrl = process.env.SUPABASE_TEST_URL;
const hostedPublishableKey = process.env.SUPABASE_TEST_PUBLISHABLE_KEY;
const hosted = Boolean(hostedApiUrl && hostedPublishableKey);
let databaseConnected = false;

type SupabaseAuthResponse = {
  access_token?: string;
  user?: { id?: string };
};

async function supabaseRequest(
  path: string,
  options: RequestInit = {},
  accessToken?: string,
) {
  if (!hostedApiUrl || !hostedPublishableKey) {
    throw new Error("Hosted Supabase configuration is required");
  }
  const headers = new Headers(options.headers);
  headers.set("apikey", hostedPublishableKey);
  if (accessToken) headers.set("authorization", `Bearer ${accessToken}`);
  if (options.body) headers.set("content-type", "application/json");
  return fetch(`${hostedApiUrl}${path}`, { ...options, headers });
}

async function createHostedUser(index: number) {
  const suffix = crypto.randomUUID();
  const response = await supabaseRequest("/auth/v1/signup", {
    method: "POST",
    body: JSON.stringify({
      email: `proof-slice1-rls-${suffix}@example.com`,
      password: `Slice1-RLS-${suffix}-Aa!`,
    }),
  });
  const body = (await response.json()) as SupabaseAuthResponse;
  if (!response.ok || !body.user?.id || !body.access_token) {
    throw new Error(
      `Hosted test user creation failed with status ${response.status}`,
    );
  }
  users[index] = body.user.id;
  accessTokens[index] = body.access_token;
}

async function establishHostedOrganization(index: number) {
  const response = await supabaseRequest(
    "/rest/v1/rpc/establish_organization",
    {
      method: "POST",
      body: JSON.stringify({
        organization_name: `Tenant ${index + 1}`,
        creator_job_title: "Business Owner",
        establishment_capacity: "business_owner",
        eligibility_attested: true,
      }),
    },
    accessTokens[index],
  );
  const body = (await response.json()) as { id?: string };
  if (!response.ok || !body.id) {
    throw new Error(
      `Hosted organization establishment failed with status ${response.status}`,
    );
  }
  organizationIds.push(body.id);
}

async function asUser<T>(
  userId: string | null,
  operation: (client: pg.PoolClient) => Promise<T>,
  commit = false,
) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("set local role authenticated");
    await client.query("select set_config('request.jwt.claim.sub',$1,true)", [userId ?? ""]);
    const result = await operation(client);
    await client.query(commit ? "commit" : "rollback");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

beforeAll(async () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  if (Boolean(hostedApiUrl) !== Boolean(hostedPublishableKey)) {
    throw new Error(
      "SUPABASE_TEST_URL and SUPABASE_TEST_PUBLISHABLE_KEY must be provided together",
    );
  }

  if (hosted) {
    validateSupabaseDatabaseTarget(
      hostedApiUrl!,
      process.env.DATABASE_URL,
    );
    const schema = await pool.query<{
      auth_uid: boolean;
      organizations: boolean;
      memberships: boolean;
    }>(`
      select
        to_regprocedure('auth.uid()') is not null as auth_uid,
        to_regclass('public.organizations') is not null as organizations,
        to_regclass('public.memberships') is not null as memberships
    `);
    expect(schema.rows[0]).toEqual({
      auth_uid: true,
      organizations: true,
      memberships: true,
    });
    databaseConnected = true;
    await createHostedUser(0);
    await createHostedUser(1);
  } else {
    await pool.query(`
      create schema if not exists auth;
      create table if not exists auth.users (id uuid primary key, email text not null unique);
      create or replace function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
      $$;
      do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
      do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
      grant usage on schema auth to authenticated;
      grant execute on function auth.uid() to authenticated;
    `);
    databaseConnected = true;
    const migrationsDirectory = path.resolve(
      process.cwd(),
      "../../supabase/migrations",
    );
    const migrationNames = (await readdir(migrationsDirectory))
      .filter((name) => name.endsWith(".sql"))
      .sort();
    for (const migrationName of migrationNames) {
      const migration = await readFile(
        path.join(migrationsDirectory, migrationName),
        "utf8",
      );
      await pool.query(migration);
    }
    await pool.query(
      "insert into auth.users(id,email) values ($1,$2),($3,$4) on conflict do nothing",
      [users[0], `slice1-${users[0]}@example.test`, users[1], `slice1-${users[1]}@example.test`],
    );
  }

  for (let index = 0; index < users.length; index += 1) {
    if (hosted) {
      await establishHostedOrganization(index);
    } else {
      const result = await asUser(
        users[index],
        (client) =>
          client.query(
            "select id from public.establish_organization($1,$2,$3,$4)",
            [`Tenant ${index + 1}`, "Business Owner", "business_owner", true],
          ),
        true,
      );
      organizationIds.push(result.rows[0].id);
    }
  }
});

afterAll(async () => {
  try {
    if (!databaseConnected) return;
    if (organizationIds.length > 0) {
      await pool.query(
        "delete from public.organizations where id = any($1::uuid[])",
        [organizationIds],
      );
    }
    await pool.query("delete from auth.users where id = any($1::uuid[])", [users]);
  } finally {
    await pool.end();
  }
});

describe("PostgreSQL RLS tenant isolation", () => {
  it("creates the authenticated founder as initial Owner", async () => {
    if (hosted) {
      const response = await supabaseRequest(
        `/rest/v1/memberships?select=user_id,roles,job_title&organization_id=eq.${organizationIds[0]}`,
        {},
        accessTokens[0],
      );
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual([
        { user_id: users[0], roles: ["Owner"], job_title: "Business Owner" },
      ]);
      return;
    }
    const rows = await asUser(users[0], (client) =>
      client.query(
        "select user_id, roles, job_title from public.memberships where organization_id=$1",
        [organizationIds[0]],
      ),
    );
    expect(rows.rows).toEqual([
      { user_id: users[0], roles: ["Owner"], job_title: "Business Owner" },
    ]);
  });

  it("hides another tenant's organization and membership", async () => {
    if (hosted) {
      const organizations = await supabaseRequest(
        "/rest/v1/organizations?select=id",
        {},
        accessTokens[0],
      );
      const memberships = await supabaseRequest(
        "/rest/v1/memberships?select=organization_id",
        {},
        accessTokens[0],
      );
      expect(organizations.status).toBe(200);
      expect(memberships.status).toBe(200);
      expect(await organizations.json()).toEqual([{ id: organizationIds[0] }]);
      expect(await memberships.json()).toEqual([
        { organization_id: organizationIds[0] },
      ]);
      return;
    }
    const organizations = await asUser(users[0], (client) =>
      client.query("select id from public.organizations where id=$1", [
        organizationIds[0],
      ]),
    );
    const memberships = await asUser(users[0], (client) =>
      client.query(
        "select organization_id from public.memberships where organization_id=$1",
        [organizationIds[0]],
      ),
    );
    expect(organizations.rows).toEqual([{ id: organizationIds[0] }]);
    expect(memberships.rows).toEqual([{ organization_id: organizationIds[0] }]);
    const foreignOrganizations = await asUser(users[0], (client) =>
      client.query("select id from public.organizations where id=$1", [
        organizationIds[1],
      ]),
    );
    const foreignMemberships = await asUser(users[0], (client) =>
      client.query(
        "select organization_id from public.memberships where organization_id=$1",
        [organizationIds[1]],
      ),
    );
    expect(foreignOrganizations.rowCount).toBe(0);
    expect(foreignMemberships.rowCount).toBe(0);
  });

  it("returns no tenant data without authenticated identity", async () => {
    if (hosted) {
      const response = await supabaseRequest(
        "/rest/v1/organizations?select=id",
      );
      expect([401, 403]).toContain(response.status);
      return;
    }
    const rows = await asUser(null, (client) =>
      client.query("select id from public.organizations"),
    );
    expect(rows.rowCount).toBe(0);
  });

  it("denies direct client writes and forged ownership", async () => {
    if (hosted) {
      const response = await supabaseRequest(
        "/rest/v1/organizations",
        {
          method: "POST",
          body: JSON.stringify({ name: "Forged" }),
        },
        accessTokens[0],
      );
      expect([401, 403]).toContain(response.status);
      return;
    }
    await expect(
      asUser(users[0], (client) =>
        client.query("insert into public.organizations(name) values ('Forged')"),
      ),
    ).rejects.toMatchObject({ code: "42501" });
  });

  it("rejects organization establishment without identity", async () => {
    if (hosted) {
      const response = await supabaseRequest(
        "/rest/v1/rpc/establish_organization",
        {
          method: "POST",
          body: JSON.stringify({
            organization_name: "No Identity",
            creator_job_title: "Owner",
            establishment_capacity: "business_owner",
            eligibility_attested: true,
          }),
        },
      );
      expect([401, 403]).toContain(response.status);
      return;
    }
    await expect(
      asUser(null, (client) =>
        client.query(
          "select id from public.establish_organization($1,$2,$3,$4)",
          ["No Identity", "Owner", "business_owner", true],
        ),
      ),
    ).rejects.toMatchObject({ code: "42501" });
  });

  it("rejects organization establishment without the eligibility attestation", async () => {
    if (hosted) {
      const response = await supabaseRequest(
        "/rest/v1/rpc/establish_organization",
        {
          method: "POST",
          body: JSON.stringify({
            organization_name: "No Attestation",
            creator_job_title: "Owner",
            establishment_capacity: "business_owner",
            eligibility_attested: false,
          }),
        },
        accessTokens[0],
      );
      expect([400, 403]).toContain(response.status);
      return;
    }
    await expect(
      asUser(users[0], (client) =>
        client.query(
          "select id from public.establish_organization($1,$2,$3,$4)",
          ["No Attestation", "Owner", "business_owner", false],
        ),
      ),
    ).rejects.toMatchObject({ code: "42501" });
  });
});