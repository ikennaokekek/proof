import { clearSession, getSession } from "@/lib/server/session";
import { supabaseRequest } from "@/lib/server/connectors";

export async function POST() {
  const session = await getSession();
  if (session) {
    await supabaseRequest(
      "/auth/v1/logout",
      { method: "POST" },
      session.accessToken,
    );
  }
  await clearSession();
  return new Response(null, { status: 204 });
}