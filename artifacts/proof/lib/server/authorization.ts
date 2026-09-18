import "server-only";

import { supabaseRequest } from "./connectors";

export type Membership = {
  id?: string;
  organization_id: string;
  user_id: string;
  roles: string[];
  job_title: string;
  joined_at: string;
  active?: boolean;
};

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isStrictUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function hasRole(membership: Membership, role: string): boolean {
  return membership.active !== false && membership.roles.includes(role);
}

export function canManageMembers(membership: Membership): boolean {
  return hasRole(membership, "Owner") || hasRole(membership, "Admin");
}

export function canManageAuthorities(membership: Membership): boolean {
  return hasRole(membership, "Owner");
}

export async function requireActiveMembership(
  accessToken: string,
  userId: string,
  organizationId: string,
) {
  return requireMembership(accessToken, userId, organizationId);
}

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