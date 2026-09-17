import { z } from "zod";

export const establishmentCapacities = [
  "chief_executive",
  "business_owner",
  "chief_financial_officer",
  "finance_director",
] as const;

export const organizationInputSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    jobTitle: z.string().trim().min(2).max(100),
    establishmentCapacity: z.enum(establishmentCapacities),
    eligibilityAttested: z.literal(true),
  })
  .strict();

export const proofRoles = [
  "Owner",
  "Admin",
  "Requester",
  "Approver",
  "Auditor",
] as const;

export function isRoleSeparateFromJobTitle(
  roles: readonly string[],
  jobTitle: string,
) {
  return !roles.includes(jobTitle);
}