import "server-only";

import { supabaseRequest } from "./connectors";

export type Membership = {
  organization_id: string;
  user_id: string;
  roles: string[];
  job_title: string;
  joined_at: string;
};

export async function requireMembership(
  accessToken: string,
  userId: string,
  organizationId: string,
): Promise<Membership | null> {
  const query = new URLSearchParams({
    select: "organization_id,user_id,roles,job_title,joined_at",
    organization_id: `eq.${organizationId}`,
    user_id: `eq.${userId}`,
    active: "eq.true",
    limit: "1",
  });
  const response = await supabaseRequest(
    `/rest/v1/memberships?${query}`,
    { method: "GET" },
    accessToken,
  );
  if (!response.ok) throw new Error("Membership lookup failed");
  const rows = (await response.json()) as Membership[];
  return rows[0] ?? null;
}