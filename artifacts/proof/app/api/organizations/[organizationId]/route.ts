import { z } from "zod";
import { getSession, unauthorized } from "@/lib/server/session";
import { requireMembership } from "@/lib/server/authorization";
import { supabaseRequest } from "@/lib/server/connectors";

export async function GET(
  _request: Request,
  context: { params: Promise<{ organizationId: string }> },
) {
  const session = await getSession();
  if (!session) return unauthorized();
  const id = z.string().uuid().safeParse((await context.params).organizationId);
  if (!id.success) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
  const membership = await requireMembership(
    session.accessToken,
    session.userId,
    id.data,
  );
  if (!membership) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }
  const organizationResponse = await supabaseRequest(
    `/rest/v1/organizations?select=id,name,created_at&id=eq.${id.data}&limit=1`,
    { method: "GET" },
    session.accessToken,
  );
  const membersResponse = await supabaseRequest(
    `/rest/v1/memberships?select=user_id,roles,job_title,joined_at&organization_id=eq.${id.data}&active=eq.true`,
    { method: "GET" },
    session.accessToken,
  );
  if (!organizationResponse.ok || !membersResponse.ok) {
    return Response.json({ error: "organization_lookup_failed" }, { status: 503 });
  }
  const organizations = (await organizationResponse.json()) as Array<{
    id: string;
    name: string;
    created_at: string;
  }>;
  const organization = organizations[0];
  if (!organization) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }
  const members = (await membersResponse.json()) as Array<{
    user_id: string;
    roles: string[];
    job_title: string;
    joined_at: string;
  }>;
  return Response.json({
    id: organization.id,
    name: organization.name,
    createdAt: organization.created_at,
    membershipRoles: membership.roles,
    jobTitle: membership.job_title,
    members: members.map((member) => ({
      userId: member.user_id,
      roles: member.roles,
      jobTitle: member.job_title,
      joinedAt: member.joined_at,
    })),
  });
}