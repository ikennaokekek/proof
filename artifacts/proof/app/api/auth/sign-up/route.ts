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
    scope: "auth.sign_up",
    limit: 5,
    windowMs: 60 * 60 * 1_000,
    subject: parsed.data.email,
  });
  if (rejected) return rejected;
  const response = await supabaseRequest("/auth/v1/signup", {
    method: "POST",
    body: JSON.stringify(parsed.data),
  });
  if (!response.ok) {
    const error = await readSupabaseError(response);
    console.error("[supabase-auth] sign-up failed", {
      status: response.status,
      code: error.error_code ?? error.code,
      message: error.message ?? error.msg ?? error.error,
    });
    logSecurityEvent("auth.sign_up", request, "failed", {
      upstreamStatus: response.status,
    });
    return Response.json(
      { authenticated: false, message: "Unable to create that account." },
      { status: response.status },
    );
  }
  const result = await response.json();
  if (result.access_token && result.refresh_token) {
    await persistSession(result);
    logSecurityEvent("auth.sign_up", request, "succeeded", {
      sessionEstablished: true,
    });
    return Response.json(
      { authenticated: true, message: "Account created" },
      { status: 201 },
    );
  }
  logSecurityEvent("auth.sign_up", request, "succeeded", {
    sessionEstablished: false,
  });
  return Response.json(
    {
      authenticated: false,
      message: "Check your email to confirm your account before signing in.",
    },
    { status: 201 },
  );
}