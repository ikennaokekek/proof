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
  const response = await supabaseRequest("/auth/v1/signup", {
    method: "POST",
    body: JSON.stringify(parsed.data),
  });
  if (!response.ok) {
    return Response.json(
      { authenticated: false, message: "Unable to create that account." },
      { status: response.status },
    );
  }
  const result = await response.json();
  if (result.access_token && result.refresh_token) {
    await persistSession(result);
    return Response.json(
      { authenticated: true, message: "Account created" },
      { status: 201 },
    );
  }
  return Response.json(
    {
      authenticated: false,
      message: "Check your email to confirm your account before signing in.",
    },
    { status: 201 },
  );
}