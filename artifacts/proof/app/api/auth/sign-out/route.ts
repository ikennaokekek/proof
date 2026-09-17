import { clearSession, getSession } from "@/lib/server/session";
import { supabaseRequest } from "@/lib/server/connectors";
import {
  logSecurityEvent,
  protectMutation,
} from "@/lib/server/security";

export async function POST(request: Request) {
  const rejected = protectMutation(request, {
    scope: "auth.sign_out",
    limit: 30,
    windowMs: 5 * 60 * 1_000,
  });
  if (rejected) return rejected;
  const session = await getSession();
  if (session) {
    await supabaseRequest(
      "/auth/v1/logout",
      { method: "POST" },
      session.accessToken,
    );
  }
  await clearSession();
  logSecurityEvent("auth.sign_out", request, "succeeded", {
    hadSession: Boolean(session),
  });
  return new Response(null, { status: 204 });
}