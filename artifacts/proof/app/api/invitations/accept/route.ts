import { createHash } from "node:crypto";
import { acceptInvitationSchema } from "@/lib/domain/foundation";
import { getSession, unauthorized } from "@/lib/server/session";
import { supabaseRequest, readSupabaseError } from "@/lib/server/connectors";
import { protectMutation, logSecurityEvent } from "@/lib/server/security";
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  const limited = protectMutation(request, { scope: "membership.invitation.accept", limit: 10, windowMs: 3600000, subject: session.userId });
  if (limited) return limited;
  const parsed = acceptInvitationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_request" }, { status: 400 });
  const digest = createHash("sha256").update(parsed.data.token).digest("hex");
  const response = await supabaseRequest("/rest/v1/rpc/accept_membership_invitation", { method: "POST", body: JSON.stringify({ token_digest_input: digest }) }, session.accessToken);
  if (!response.ok) { const e = await readSupabaseError(response); return Response.json({ error: e.code === "42501" ? "forbidden" : e.code === "23505" ? "conflict" : e.code === "P0002" ? "not_found" : "invitation_unavailable" }, { status: e.code === "42501" ? 403 : e.code === "23505" ? 409 : e.code === "P0002" ? 404 : 409 }); }
  logSecurityEvent("membership.invitation_accept", request, "succeeded", { userId: session.userId });
  return Response.json(await response.json(), { status: 201 });
}