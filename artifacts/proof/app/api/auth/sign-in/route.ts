import { z } from "zod";
import {
  readSupabaseError,
  supabaseRequest,
} from "@/lib/server/connectors";
import { persistSession } from "@/lib/server/session";
import {
  logSecurityEvent,
  protectMutation,
} from "@/lib/server/security";

const credentials = z
  .object({
    email: z.string().email().max(254),
    password: z.string().min(12).max(128),
  })
  .strict();

export async function POST(request: Request) {
  const parsed = credentials.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
  const rejected = protectMutation(request, {
    scope: "auth.sign_in",
    limit: 10,
    windowMs: 15 * 60 * 1_000,
    subject: parsed.data.email,
  });
  if (rejected) return rejected;
  const response = await supabaseRequest(
    "/auth/v1/token?grant_type=password",
    { method: "POST", body: JSON.stringify(parsed.data) },
  );
  if (!response.ok) {
    const error = await readSupabaseError(response);
    console.error("[supabase-auth] sign-in failed", {
      status: response.status,
      code: error.error_code ?? error.code,
      message: error.message ?? error.msg ?? error.error,
    });
    logSecurityEvent("auth.sign_in", request, "failed", {
      upstreamStatus: response.status,
    });
    return Response.json(
      { authenticated: false, message: "Unable to sign in with those credentials." },
      { status: response.status === 400 ? 401 : response.status },
    );
  }
  await persistSession(await response.json());
  logSecurityEvent("auth.sign_in", request, "succeeded");
  return Response.json({ authenticated: true, message: "Signed in" });
}