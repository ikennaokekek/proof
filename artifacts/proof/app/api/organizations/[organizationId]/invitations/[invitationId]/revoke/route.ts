import { getSession, unauthorized } from "@/lib/server/session";
import { isStrictUuid } from "@/lib/server/authorization";
import { supabaseRequest, readSupabaseError } from "@/lib/server/connectors";
import { protectMutation, logSecurityEvent } from "@/lib/server/security";
export async function POST(request: Request, { params }: { params: Promise<{ organizationId: string; invitationId: string }> }) {
  const { organizationId, invitationId } = await params;
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isStrictUuid(organizationId) || !isStrictUuid(invitationId)) return Response.json({ error: "invalid_id" }, { status: 400 });
  const limited = protectMutation(request, { scope: "membership.invitation.revoke", limit: 30, windowMs: 3600000, subject: session.userId });
  if (limited) return limited;
  const response = await supabaseRequest("/rest/v1/rpc/revoke_membership_invitation", { method: "POST", body: JSON.stringify({ target_org: organizationId, invitation: invitationId }) }, session.accessToken);
  if (!response.ok) { const e = await readSupabaseError(response); return Response.json({ error: e.code === "42501" ? "forbidden" : e.code === "P0002" ? "not_found" : "revoke_failed" }, { status: e.code === "42501" ? 403 : e.code === "P0002" ? 404 : 409 }); }
  logSecurityEvent("membership.invitation_revoke", request, "succeeded", { organizationId, invitationId });
  return Response.json(await response.json());
}