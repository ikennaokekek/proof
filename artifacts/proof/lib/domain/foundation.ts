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

export const memberRoles = proofRoles;
export const approvalAuthorityCategories = [
  "payment",
  "supplier_bank_detail_change",
] as const;

export const invitationInputSchema = z.object({
  email: z.string().trim().email().max(320),
  roles: z.array(z.enum(["Requester", "Approver", "Auditor"])).min(1).max(3)
    .transform((roles) => [...new Set(roles)] as Array<"Requester" | "Approver" | "Auditor">)
    .refine((roles) => roles.length > 0),
  jobTitle: z.string().trim().min(2).max(100),
}).strict();

export const acceptInvitationSchema = z.object({ token: z.string().min(32).max(512) }).strict();
export const membershipChangeSchema = z.object({
  roles: z.array(z.enum(proofRoles)).min(1).max(5)
    .transform((roles) => [...new Set(roles)] as Array<(typeof proofRoles)[number]>)
    .refine((roles) => roles.length > 0),
  active: z.boolean(),
  jobTitle: z.string().trim().min(2).max(100),
}).strict();
export const authorityInputSchema = z.object({
  memberId: z.string().uuid(),
  category: z.enum(approvalAuthorityCategories),
}).strict();

export function isRoleSeparateFromJobTitle(
  roles: readonly string[],
  jobTitle: string,
) {
  return !roles.includes(jobTitle);
}