import { getSession, unauthorized } from "@/lib/server/session";
import { authorityInputSchema } from "@/lib/domain/foundation";
import { isStrictUuid } from "@/lib/server/authorization";
import { supabaseRequest, readSupabaseError } from "@/lib/server/connectors";
import { protectMutation, logSecurityEvent } from "@/lib/server/security";
export async function GET(_: Request, { params }: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await params; const session = await getSession(); if (!session) return unauthorized();
  if (!isStrictUuid(organizationId)) return Response.json({ error: "invalid_organization_id" }, { status: 400 });
  const r = await supabaseRequest(`/rest/v1/approval_authorities?select=id,member_id,category,created_at,active,revoked_at&organization_id=eq.${organizationId}&order=created_at.desc`, {}, session.accessToken);
  return r.ok ? Response.json(await r.json()) : Response.json({ error: r.status === 403 ? "forbidden" : "authority_lookup_failed" }, { status: r.status === 403 ? 403 : 503 });
}
export async function POST(request: Request, { params }: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await params; const session = await getSession(); if (!session) return unauthorized();
  if (!isStrictUuid(organizationId)) return Response.json({ error: "invalid_organization_id" }, { status: 400 });
  const limited = protectMutation(request, { scope: "authority.grant", limit: 20, windowMs: 3600000, subject: session.userId }); if (limited) return limited;
  const parsed = authorityInputSchema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return Response.json({ error: "invalid_request" }, { status: 400 });
  const r = await supabaseRequest("/rest/v1/rpc/request_approval_authority_grant", { method: "POST", body: JSON.stringify({ target_org: organizationId, target_member: parsed.data.memberId, authority_category: parsed.data.category }) }, session.accessToken);
  if (!r.ok) { const e = await readSupabaseError(r); return Response.json({ error: e.code === "42501" ? "forbidden" : e.code === "23505" ? "conflict" : "authority_grant_failed" }, { status: e.code === "42501" ? 403 : e.code === "23505" ? 409 : 400 }); }
  const result = await r.json() as { outcome: "granted"; authority: unknown } | { outcome: "pending"; request: unknown };
  logSecurityEvent(result.outcome === "granted" ? "authority.grant" : "authority.grant_requested", request, "succeeded", { organizationId, memberId: parsed.data.memberId, category: parsed.data.category });
  return Response.json(result.outcome === "granted" ? result.authority : result.request, { status: result.outcome === "granted" ? 201 : 202 });
}