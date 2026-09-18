import { getSession, unauthorized } from "@/lib/server/session";
import { isStrictUuid } from "@/lib/server/authorization";
import { supabaseRequest, readSupabaseError } from "@/lib/server/connectors";
import { protectMutation, logSecurityEvent } from "@/lib/server/security";
export async function DELETE(request: Request, { params }: { params: Promise<{ organizationId: string; authorityId: string }> }) {
  const { organizationId, authorityId } = await params; const session = await getSession(); if (!session) return unauthorized();
  if (!isStrictUuid(organizationId) || !isStrictUuid(authorityId)) return Response.json({ error: "invalid_id" }, { status: 400 });
  const limited = protectMutation(request, { scope: "authority.revoke", limit: 30, windowMs: 3600000, subject: session.userId }); if (limited) return limited;
  const r = await supabaseRequest("/rest/v1/rpc/revoke_approval_authority", { method: "POST", body: JSON.stringify({ target_org: organizationId, authority: authorityId }) }, session.accessToken);
  if (!r.ok) { const e = await readSupabaseError(r); return Response.json({ error: e.code === "42501" ? "forbidden" : e.code === "P0002" ? "not_found" : "authority_revoke_failed" }, { status: e.code === "42501" ? 403 : e.code === "P0002" ? 404 : 409 }); }
  logSecurityEvent("authority.revoke", request, "succeeded", { organizationId, authorityId });
  return Response.json(await r.json());
}