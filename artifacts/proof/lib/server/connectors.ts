import "server-only";

import { ReplitConnectors } from "@replit/connectors-sdk";

export type SupabaseError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

export function getSupabaseConnector() {
  return new ReplitConnectors();
}

export async function supabaseRequest(
  path: string,
  init: RequestInit = {},
  accessToken?: string,
) {
  const headers = new Headers(init.headers);
  if (init.body) headers.set("content-type", "application/json");
  if (accessToken) headers.set("authorization", `Bearer ${accessToken}`);

  return getSupabaseConnector().proxy("supabase", path, {
    ...init,
    headers: Object.fromEntries(headers.entries()),
  });
}

export async function readSupabaseError(response: Response): Promise<SupabaseError> {
  return response.json().catch(() => ({ message: "Supabase request failed" }));
}