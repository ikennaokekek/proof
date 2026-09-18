import { createHash, randomBytes } from "node:crypto";
import { getSession, unauthorized } from "@/lib/server/session";
import { invitationInputSchema } from "@/lib/domain/foundation";
import { isStrictUuid } from "@/lib/server/authorization";
import { readSupabaseError, supabaseRequest } from "@/lib/server/connectors";
import { protectMutation, logSecurityEvent } from "@/lib/server/security";

export async function GET(_: Request, { params }: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await params;
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isStrictUuid(organizationId)) return Response.json({ error: "invalid_organization_id" }, { status: 400 });
  const response = await supabaseRequest(`/rest/v1/invitations?select=id,email,roles,job_title,expires_at,status,created_at&organization_id=eq.${organizationId}&order=created_at.desc`, {}, session.accessToken);
  if (!response.ok) return Response.json({ error: "forbidden" }, { status: response.status === 403 ? 403 : 503 });
  return Response.json(await response.json());
}

export async function POST(request: Request, { params }: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await params;
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isStrictUuid(organizationId)) return Response.json({ error: "invalid_organization_id" }, { status: 400 });
  const limited = protectMutation(request, { scope: "membership.invite", limit: 20, windowMs: 3600000, subject: session.userId });
  if (limited) return limited;
  const parsed = invitationInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_request" }, { status: 400 });
  const rawToken = randomBytes(32).toString("base64url");
  const digest = createHash("sha256").update(rawToken).digest("hex");
  const response = await supabaseRequest("/rest/v1/rpc/create_membership_invitation", {
    method: "POST",
    body: JSON.stringify({ target_org: organizationId, invite_email: parsed.data.email, invite_roles: parsed.data.roles, invite_job_title: parsed.data.jobTitle, invite_digest: digest, invite_expires_at: new Date(Date.now() + 7 * 86400000).toISOString() }),
  }, session.accessToken);
  if (!response.ok) {
    const error = await readSupabaseError(response);
    return Response.json({ error: error.code === "42501" ? "forbidden" : error.code === "23505" ? "conflict" : "invitation_failed" }, { status: error.code === "42501" ? 403 : error.code === "23505" ? 409 : 400 });
  }
  const row = await response.json() as {
    id: string;
    email: string;
    roles: string[];
    job_title: string;
    expires_at: string;
    status: string;
    created_at: string;
  };
  const invitation = {
    id: row.id,
    email: row.email,
    roles: row.roles,
    job_title: row.job_title,
    expires_at: row.expires_at,
    status: row.status,
    created_at: row.created_at,
  };
  logSecurityEvent("membership.invitation_create", request, "succeeded", { organizationId, invitationId: invitation.id });
  return Response.json({ invitation, token: rawToken }, { status: 201, headers: { "cache-control": "no-store" } });
}