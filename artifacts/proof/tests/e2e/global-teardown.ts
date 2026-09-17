import { Pool } from "pg";

export default async function globalTeardown() {
  const connectionString = process.env.SUPABASE_TEST_DATABASE_URL;
  if (!connectionString) {
    console.log(
      JSON.stringify({
        trustedTestCleanup: {
          status: "skipped",
          reason: "SUPABASE_TEST_DATABASE_URL is unavailable",
        },
      }),
    );
    return;
  }

  const apiUrl = process.env.SUPABASE_TEST_URL;
  if (!apiUrl) {
    throw new Error("SUPABASE_TEST_URL is required for trusted E2E cleanup");
  }
  const projectRef = new URL(apiUrl).hostname.split(".", 1)[0];
  const databaseHost = new URL(connectionString).hostname;
  if (!projectRef || !databaseHost.includes(projectRef)) {
    throw new Error(
      "SUPABASE_TEST_DATABASE_URL does not match SUPABASE_TEST_URL",
    );
  }

  const pool = new Pool({ connectionString, max: 1 });
  try {
    const result = await pool.query<{
      deleted_users: string;
      deleted_organizations: string;
    }>(`
      with deleted_users as (
        delete from auth.users
        where email like 'proof-slice1-e2e-%@example.com'
        returning id
      ),
      deleted_organizations as (
        delete from public.organizations
        where name like 'Slice 1 E2E %'
        returning id
      )
      select
        (select count(*)::text from deleted_users) as deleted_users,
        (select count(*)::text from deleted_organizations) as deleted_organizations
    `);
    const cleanup = result.rows[0];
    console.log(
      JSON.stringify({
        trustedTestCleanup: {
          deletedUsers: Number(cleanup?.deleted_users ?? 0),
          deletedOrganizations: Number(
            cleanup?.deleted_organizations ?? 0,
          ),
        },
      }),
    );
  } finally {
    await pool.end();
  }
}