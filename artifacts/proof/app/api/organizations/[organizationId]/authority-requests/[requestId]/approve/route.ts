import { isStrictUuid } from "@/lib/server/authorization";
import { readSupabaseError, supabaseRequest } from "@/lib/server/connectors";
import { protectMutation, logSecurityEvent } from "@/lib/server/security";
import { getSession, unauthorized } from "@/lib/server/session";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ organizationId: string; requestId: string }> },
) {
  const { organizationId, requestId } = await params;
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isStrictUuid(organizationId) || !isStrictUuid(requestId)) {
    return Response.json({ error: "invalid_id" }, { status: 400 });
  }
  const limited = protectMutation(request, {
    scope: "authority.approve",
    limit: 30,
    windowMs: 3_600_000,
    subject: session.userId,
  });
  if (limited) return limited;

  const response = await supabaseRequest(
    "/rest/v1/rpc/approve_approval_authority_grant",
    {
      method: "POST",
      body: JSON.stringify({ target_org: organizationId, authority_request: requestId }),
    },
    session.accessToken,
  );
  if (!response.ok) {
    const error = await readSupabaseError(response);
    const status =
      error.code === "42501" ? 403 :
      error.code === "P0002" ? 404 :
      error.code === "23505" || error.code === "23514" ? 409 : 400;
    return Response.json(
      {
        error:
          error.code === "42501" ? "forbidden" :
          error.code === "P0002" ? "not_found" :
          error.code === "23514" ? "stale_authority_request" :
          error.code === "23505" ? "conflict" : "authority_approval_failed",
      },
      { status },
    );
  }
  logSecurityEvent("authority.approve", request, "succeeded", {
    organizationId,
    authorityRequestId: requestId,
  });
  return Response.json(await response.json());
}