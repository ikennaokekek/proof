import { getSession, unauthorized } from "@/lib/server/session";
import { organizationInputSchema } from "@/lib/domain/foundation";
import {
  readSupabaseError,
  supabaseRequest,
} from "@/lib/server/connectors";

type OrganizationRow = { id: string; name: string; created_at: string };
type MembershipRow = {
  organization_id: string;
  roles: string[];
  job_title: string;
};

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();
  const membershipsResponse = await supabaseRequest(
    "/rest/v1/memberships?select=organization_id,roles,job_title&active=eq.true",
    { method: "GET" },
    session.accessToken,
  );
  if (!membershipsResponse.ok) {
    return Response.json({ error: "organization_lookup_failed" }, { status: 503 });
  }
  const memberships = (await membershipsResponse.json()) as MembershipRow[];
  if (memberships.length === 0) return Response.json([]);
  const ids = memberships.map((membership) => membership.organization_id).join(",");
  const organizationsResponse = await supabaseRequest(
    `/rest/v1/organizations?select=id,name,created_at&id=in.(${ids})&order=created_at.asc`,
    { method: "GET" },
    session.accessToken,
  );
  if (!organizationsResponse.ok) {
    return Response.json({ error: "organization_lookup_failed" }, { status: 503 });
  }
  const organizations = (await organizationsResponse.json()) as OrganizationRow[];
  const byOrganization = new Map(
    memberships.map((membership) => [membership.organization_id, membership]),
  );
  return Response.json(
    organizations.map((organization) => ({
      id: organization.id,
      name: organization.name,
      createdAt: organization.created_at,
      membershipRoles: byOrganization.get(organization.id)?.roles ?? [],
      jobTitle: byOrganization.get(organization.id)?.job_title ?? "",
    })),
  );
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  const parsed = organizationInputSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
  const response = await supabaseRequest(
    "/rest/v1/rpc/establish_organization",
    {
      method: "POST",
      body: JSON.stringify({
        organization_name: parsed.data.name,
        creator_job_title: parsed.data.jobTitle,
        establishment_capacity: parsed.data.establishmentCapacity,
        eligibility_attested: parsed.data.eligibilityAttested,
      }),
    },
    session.accessToken,
  );
  if (!response.ok) {
    const error = await readSupabaseError(response);
    const status = error.code === "42501" ? 403 : 400;
    return Response.json({ error: "organization_establishment_failed" }, { status });
  }
  const organization = (await response.json()) as OrganizationRow;
  return Response.json(
    {
      id: organization.id,
      name: organization.name,
      createdAt: organization.created_at,
      membershipRoles: ["Owner"],
      jobTitle: parsed.data.jobTitle,
    },
    { status: 201 },
  );
}