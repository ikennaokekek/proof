import { describe, expect, it } from "vitest";
import {
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