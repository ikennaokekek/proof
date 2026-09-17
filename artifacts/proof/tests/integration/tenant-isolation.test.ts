import { readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const users = [crypto.randomUUID(), crypto.randomUUID()];
const organizationIds: string[] = [];

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
  const migration = await readFile(
    path.resolve(process.cwd(), "../../supabase/migrations/20260308000000_slice1_foundation.sql"),
    "utf8",
  );
  await pool.query(migration);
  await pool.query(
    "insert into auth.users(id,email) values ($1,$2),($3,$4) on conflict do nothing",
    [users[0], `slice1-${users[0]}@example.test`, users[1], `slice1-${users[1]}@example.test`],
  );
  for (let index = 0; index < users.length; index += 1) {
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
});

afterAll(async () => {
  try {
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
    const rows = await asUser(null, (client) =>
      client.query("select id from public.organizations"),
    );
    expect(rows.rowCount).toBe(0);
  });

  it("denies direct client writes and forged ownership", async () => {
    await expect(
      asUser(users[0], (client) =>
        client.query("insert into public.organizations(name) values ('Forged')"),
      ),
    ).rejects.toMatchObject({ code: "42501" });
  });

  it("rejects organization establishment without identity", async () => {
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