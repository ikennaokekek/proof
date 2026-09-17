import "server-only";

export type SupabaseError = {
  error?: string;
  code?: string | number;
  error_code?: string;
  message?: string;
  msg?: string;
  details?: string;
  hint?: string;
};

function getSupabaseConfiguration() {
  const url = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error("Supabase server configuration is unavailable");
  }
  return { url: url.replace(/\/$/, ""), publishableKey };
}

export async function supabaseRequest(
  path: string,
  init: RequestInit = {},
  accessToken?: string,
) {
  const { url, publishableKey } = getSupabaseConfiguration();
  const headers = new Headers(init.headers);
  if (init.body) headers.set("content-type", "application/json");
  headers.set("apikey", publishableKey);
  headers.set(
    "authorization",
    `Bearer ${accessToken ?? publishableKey}`,
  );

  return fetch(`${url}${path.startsWith("/") ? path : `/${path}`}`, {
    ...init,
    cache: "no-store",
    headers,
  });
}

export async function readSupabaseError(response: Response): Promise<SupabaseError> {
  const text = await response.text();
  try {
    return JSON.parse(text) as SupabaseError;
  } catch {
    return {
      message: text.trim().slice(0, 500) || response.statusText || "Supabase request failed",
    };
  }
}