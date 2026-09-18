import { describe, expect, it } from "vitest";
import {
  authorityInputSchema,
  invitationInputSchema,
  membershipChangeSchema,
  isRoleSeparateFromJobTitle,
  organizationInputSchema,
} from "../lib/domain/foundation";

describe("Slice 1 input and role boundaries", () => {
  it("rejects client-owned authority fields", () => {
    const result = organizationInputSchema.safeParse({
      name: "Northstar",
      jobTitle: "Founder",
      establishmentCapacity: "business_owner",
      eligibilityAttested: true,
      userId: crypto.randomUUID(),
      roles: ["Owner"],
      verified: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an ineligible establishment capacity", () => {
    expect(
      organizationInputSchema.safeParse({
        name: "Northstar",
        jobTitle: "Operations Manager",
        establishmentCapacity: "operations_manager",
        eligibilityAttested: true,
      }).success,
    ).toBe(false);
  });

  it("requires an explicit eligible-founder attestation", () => {
    expect(
      organizationInputSchema.safeParse({
        name: "Northstar",
        jobTitle: "Founder",
        establishmentCapacity: "business_owner",
        eligibilityAttested: false,
      }).success,
    ).toBe(false);
  });

  it("keeps job titles separate from PROOF roles", () => {
    expect(isRoleSeparateFromJobTitle(["Owner"], "Chief Executive")).toBe(true);
    expect(isRoleSeparateFromJobTitle(["Owner"], "Owner")).toBe(false);
  });
});

describe("Slice 2 membership input boundaries", () => {
  it("normalizes duplicate invitation roles and rejects forged owner roles", () => {
    const normalized = invitationInputSchema.safeParse({
      email: "member@example.test",
      roles: ["Approver", "Approver"],
      jobTitle: "Finance Manager",
    });
    expect(normalized.success).toBe(true);
    if (normalized.success) expect(normalized.data.roles).toEqual(["Approver"]);
    expect(invitationInputSchema.safeParse({
      email: "member@example.test", roles: ["Owner"], jobTitle: "Owner",
    }).success).toBe(false);
  });

  it("requires job title separately and rejects client authority fields", () => {
    expect(membershipChangeSchema.safeParse({
      roles: ["Requester"], active: true,
    }).success).toBe(false);
    expect(membershipChangeSchema.safeParse({
      roles: ["Requester", "Requester"], active: true, jobTitle: "Analyst",
      userId: crypto.randomUUID(), authority: true,
    }).success).toBe(false);
    expect(authorityInputSchema.safeParse({
      memberId: crypto.randomUUID(), category: "payment", outcome: true,
    }).success).toBe(false);
  });
});