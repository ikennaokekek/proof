import { getSession, unauthorized } from "@/lib/server/session";
import { membershipChangeSchema } from "@/lib/domain/foundation";
import { isStrictUuid } from "@/lib/server/authorization";
import { supabaseRequest, readSupabaseError } from "@/lib/server/connectors";
import { protectMutation, logSecurityEvent } from "@/lib/server/security";
export async function PATCH(request: Request, { params }: { params: Promise<{ organizationId: string; memberId: string }> }) {
  const { organizationId, memberId } = await params; const session = await getSession();
  if (!session) return unauthorized();
  if (!isStrictUuid(organizationId) || !isStrictUuid(memberId)) return Response.json({ error: "invalid_id" }, { status: 400 });
  const limited = protectMutation(request, { scope: "membership.change", limit: 30, windowMs: 3600000, subject: session.userId }); if (limited) return limited;
  const parsed = membershipChangeSchema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return Response.json({ error: "invalid_request" }, { status: 400 });
  const r = await supabaseRequest("/rest/v1/rpc/update_membership", { method: "POST", body: JSON.stringify({ target_org: organizationId, target_member: memberId, new_roles: parsed.data.roles, new_active: parsed.data.active, new_job_title: parsed.data.jobTitle }) }, session.accessToken);
  if (!r.ok) { const e = await readSupabaseError(r); return Response.json({ error: e.code === "42501" ? "forbidden" : e.code === "P0002" ? "not_found" : "membership_change_failed" }, { status: e.code === "42501" ? 403 : e.code === "P0002" ? 404 : 409 }); }
  logSecurityEvent(parsed.data.active ? "membership.reactivate" : "membership.suspend", request, "succeeded", { organizationId, memberId });
  logSecurityEvent("membership.change", request, "succeeded", { organizationId, memberId });
  return Response.json(await r.json());
}