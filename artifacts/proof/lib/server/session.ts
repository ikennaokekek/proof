import "server-only";

import { cookies } from "next/headers";
import { supabaseRequest } from "./connectors";

const ACCESS_COOKIE = "proof-access-token";
const REFRESH_COOKIE = "proof-refresh-token";

export type Session = { userId: string; email: string; accessToken: string };

type SupabaseUser = { id?: unknown; email?: unknown };
type SupabaseTokenResponse = {
  access_token?: unknown;
  refresh_token?: unknown;
  expires_in?: unknown;
  user?: SupabaseUser;
};

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export async function persistSession(tokens: SupabaseTokenResponse) {
  if (
    typeof tokens.access_token !== "string" ||
    typeof tokens.refresh_token !== "string"
  ) {
    throw new Error("Supabase did not return a complete session");
  }
  const store = await cookies();
  const accessMaxAge =
    typeof tokens.expires_in === "number" ? tokens.expires_in : 3600;
  store.set(ACCESS_COOKIE, tokens.access_token, cookieOptions(accessMaxAge));
  store.set(
    REFRESH_COOKIE,
    tokens.refresh_token,
    cookieOptions(60 * 60 * 24 * 30),
  );
}

export async function clearSession() {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
}

async function userForToken(accessToken: string): Promise<Session | null> {
  const response = await supabaseRequest(
    "/auth/v1/user",
    { method: "GET" },
    accessToken,
  );
  if (!response.ok) return null;
  const user = (await response.json()) as SupabaseUser;
  if (typeof user.id !== "string" || typeof user.email !== "string") return null;
  return { userId: user.id, email: user.email, accessToken };
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const accessToken = store.get(ACCESS_COOKIE)?.value;
  if (accessToken) {
    const current = await userForToken(accessToken);
    if (current) return current;
  }

  const refreshToken = store.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return null;
  const refreshed = await supabaseRequest(
    "/auth/v1/token?grant_type=refresh_token",
    { method: "POST", body: JSON.stringify({ refresh_token: refreshToken }) },
  );
  if (!refreshed.ok) {
    await clearSession();
    return null;
  }
  const tokens = (await refreshed.json()) as SupabaseTokenResponse;
  await persistSession(tokens);
  return typeof tokens.access_token === "string"
    ? userForToken(tokens.access_token)
    : null;
}

export function unauthorized() {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}