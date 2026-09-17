import { z } from "zod";
import { supabaseRequest } from "@/lib/server/connectors";
import { persistSession } from "@/lib/server/session";

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
  const response = await supabaseRequest(
    "/auth/v1/token?grant_type=password",
    { method: "POST", body: JSON.stringify(parsed.data) },
  );
  if (!response.ok) {
    return Response.json(
      { authenticated: false, message: "Unable to sign in with those credentials." },
      { status: response.status === 400 ? 401 : response.status },
    );
  }
  await persistSession(await response.json());
  return Response.json({ authenticated: true, message: "Signed in" });
}