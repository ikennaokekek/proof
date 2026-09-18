import { describe, expect, it } from "vitest";
import { validateSupabaseDatabaseTarget } from "./support/supabase-project";

const apiUrl = "https://abcdefghijklmnopqrst.supabase.co";

describe("Supabase acceptance database target validation", () => {
  it("accepts the matching direct database endpoint", () => {
    expect(
      validateSupabaseDatabaseTarget(
        apiUrl,
        "postgresql://postgres:secret@db.abcdefghijklmnopqrst.supabase.co:5432/postgres",
      ),
    ).toEqual({
      kind: "direct",
      projectRef: "abcdefghijklmnopqrst",
    });
  });

  it("accepts a shared pooler only when its username carries the project ref", () => {
    expect(
      validateSupabaseDatabaseTarget(
        apiUrl,
        "postgresql://postgres.abcdefghijklmnopqrst:secret@aws-0-eu-west-1.pooler.supabase.com:5432/postgres",
      ),
    ).toEqual({
      kind: "pooler",
      projectRef: "abcdefghijklmnopqrst",
    });
  });

  it.each([
    "postgresql://postgres.wrongproject:secret@aws-0-eu-west-1.pooler.supabase.com:5432/postgres",
    "postgresql://postgres.abcdefghijklmnopqrst:secret@attacker.example:5432/postgres",
    "postgresql://postgres:secret@db.wrongproject.supabase.co:5432/postgres",
  ])("rejects a mismatched or untrusted database target", (databaseUrl) => {
    expect(() =>
      validateSupabaseDatabaseTarget(apiUrl, databaseUrl),
    ).toThrow("does not match");
  });
});