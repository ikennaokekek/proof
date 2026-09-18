import { isStrictUuid } from "@/lib/server/authorization";
import { supabaseRequest } from "@/lib/server/connectors";
import { getSession, unauthorized } from "@/lib/server/session";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ organizationId: string }> },
) {
  const { organizationId } = await params;
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isStrictUuid(organizationId)) {
    return Response.json({ error: "invalid_organization_id" }, { status: 400 });
  }

  const response = await supabaseRequest(
    `/rest/v1/approval_authority_requests?select=id,member_id,category,requested_by,status,created_at,decided_by,decided_at,authority_id&organization_id=eq.${organizationId}&order=created_at.desc`,
    {},
    session.accessToken,
  );
  return response.ok
    ? Response.json(await response.json())
    : Response.json(
        { error: response.status === 403 ? "forbidden" : "authority_request_lookup_failed" },
        { status: response.status === 403 ? 403 : 503 },
      );
}