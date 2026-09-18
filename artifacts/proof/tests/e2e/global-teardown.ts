import { Pool } from "pg";
import { validateSupabaseDatabaseTarget } from "../support/supabase-project";

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
  validateSupabaseDatabaseTarget(apiUrl, connectionString);

  const pool = new Pool({ connectionString, max: 1 });
  try {
    await pool.query("begin");
    const organizations = await pool.query(`
      delete from public.organizations
      where name like 'Slice 1 E2E %'
         or name like 'Slice 2 E2E %'
      returning id
    `);
    const users = await pool.query(`
      delete from auth.users
      where email like 'proof-slice1-e2e-%@example.com'
         or email like 'proof-slice2-e2e-%@example.com'
      returning id
    `);
    await pool.query("commit");
    console.log(
      JSON.stringify({
        trustedTestCleanup: {
          deletedUsers: users.rowCount ?? 0,
          deletedOrganizations: organizations.rowCount ?? 0,
        },
      }),
    );
  } catch (error) {
    await pool.query("rollback");
    throw error;
  } finally {
    await pool.end();
  }
}