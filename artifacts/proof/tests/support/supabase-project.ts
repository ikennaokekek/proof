export type SupabaseDatabaseTarget = {
  kind: "direct" | "pooler";
  projectRef: string;
};

export function validateSupabaseDatabaseTarget(
  apiUrlValue: string,
  connectionStringValue: string,
): SupabaseDatabaseTarget {
  const apiUrl = new URL(apiUrlValue);
  const connectionString = new URL(connectionStringValue);
  const apiMatch = /^([a-z0-9]+)\.supabase\.co$/i.exec(apiUrl.hostname);
  if (!apiMatch) {
    throw new Error("SUPABASE_TEST_URL must identify a hosted Supabase project");
  }

  if (!["postgres:", "postgresql:"].includes(connectionString.protocol)) {
    throw new Error("SUPABASE_TEST_DATABASE_URL must use PostgreSQL");
  }

  const projectRef = apiMatch[1];
  const username = decodeURIComponent(connectionString.username);
  const directMatch =
    connectionString.hostname === `db.${projectRef}.supabase.co` &&
    username === "postgres";
  const poolerMatch =
    /^[a-z0-9.-]+\.pooler\.supabase\.com$/i.test(connectionString.hostname) &&
    username === `postgres.${projectRef}`;

  if (!directMatch && !poolerMatch) {
    throw new Error(
      "SUPABASE_TEST_DATABASE_URL does not match SUPABASE_TEST_URL",
    );
  }

  return {
    kind: directMatch ? "direct" : "pooler",
    projectRef,
  };
}