import { getSession, unauthorized } from "@/lib/server/session";
import { isStrictUuid } from "@/lib/server/authorization";
import { supabaseRequest } from "@/lib/server/connectors";
export async function GET(_: Request, { params }: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await params; const session = await getSession();
  if (!session) return unauthorized();
  if (!isStrictUuid(organizationId)) return Response.json({ error: "invalid_organization_id" }, { status: 400 });
  const r = await supabaseRequest(`/rest/v1/memberships?select=id,user_id,roles,job_title,active,joined_at&organization_id=eq.${organizationId}&order=joined_at.asc`, {}, session.accessToken);
  return r.ok ? Response.json(await r.json()) : Response.json({ error: r.status === 403 ? "forbidden" : "member_lookup_failed" }, { status: r.status === 403 ? 403 : 503 });
}