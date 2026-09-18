import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";

test.describe.configure({ mode: "serial" });

test("Slice 2 membership, invitation, authority, and suspension journey", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const suffix = randomUUID();
  const ownerEmail = `proof-slice2-e2e-owner-${suffix}@example.com`;
  const memberEmail = `proof-slice2-e2e-member-${suffix}@example.com`;
  const ownerPassword = `Slice2-Owner-${suffix}-Aa!`;
  const memberPassword = `Slice2-Member-${suffix}-Aa!`;
  const organizationName = `Slice 2 E2E ${suffix}`;
  const origin = "http://localhost:3000";
  const headers = { origin, "sec-fetch-site": "same-origin" };

  const ownerSignup = await page.request.post("/proof-api/auth/sign-up", {
    headers,
    data: { email: ownerEmail, password: ownerPassword },
  });
  expect(ownerSignup.status()).toBe(201);
  const ownerSession = await page.request.get("/proof-api/session");
  const owner = await ownerSession.json();
  expect(owner.authenticated).toBe(true);

  const organizationResponse = await page.request.post("/proof-api/organizations", {
    headers,
    data: {
      name: organizationName,
      jobTitle: "Business Owner",
      establishmentCapacity: "business_owner",
      eligibilityAttested: true,
    },
  });
  expect(organizationResponse.status()).toBe(201);
  const organization = await organizationResponse.json();
  const organizationId = organization.id as string;

  const invitationPath = `/proof-api/organizations/${organizationId}/invitations`;
  const invitationInput = {
    email: memberEmail,
    roles: ["Requester"],
    jobTitle: "Accounts Assistant",
  };
  for (const forged of [
    { ...invitationInput, userId: owner.user.id },
    { ...invitationInput, organizationId },
    { ...invitationInput, roles: ["Owner"] },
    { ...invitationInput, authority: "payment", status: "accepted" },
  ]) {
    const rejected = await page.request.post(invitationPath, {
      headers,
      data: forged,
    });
    expect(rejected.status()).toBe(400);
  }

  const invitationResponse = await page.request.post(invitationPath, {
    headers,
    data: invitationInput,
  });
  expect(invitationResponse.status()).toBe(201);
  const invitationResult = await invitationResponse.json();
  expect(invitationResult.invitation).toMatchObject({
    email: memberEmail,
    roles: ["Requester"],
    status: "pending",
  });
  const invitationToken = invitationResult.token as string;

  const ownerSignout = await page.request.post("/proof-api/auth/sign-out", {
    headers,
  });
  expect(ownerSignout.status()).toBe(204);
  const memberSignup = await page.request.post("/proof-api/auth/sign-up", {
    headers,
    data: { email: memberEmail, password: memberPassword },
  });
  expect(memberSignup.status()).toBe(201);
  const memberSession = await page.request.get("/proof-api/session");
  const member = await memberSession.json();
  expect(member.authenticated).toBe(true);
  const memberUserId = member.user.id as string;

  const accept = await page.request.post("/proof-api/invitations/accept", {
    headers,
    data: { token: invitationToken },
  });
  expect(accept.status()).toBe(201);
  const acceptedMembership = await accept.json();
  expect(acceptedMembership.roles).toEqual(["Requester"]);
  const memberId = acceptedMembership.id as string;
  const replay = await page.request.post("/proof-api/invitations/accept", {
    headers,
    data: { token: invitationToken },
  });
  expect([404, 409]).toContain(replay.status());

  expect(
    (await page.request.get(`/proof-api/organizations/${organizationId}`)).status(),
  ).toBe(200);
  const memberMutation = await page.request.patch(
    `/proof-api/organizations/${organizationId}/members/${memberId}`,
    {
      headers,
      data: { roles: ["Approver"], active: true, jobTitle: "Approver" },
    },
  );
  expect(memberMutation.status()).toBe(403);
  const memberAuthority = await page.request.post(
    `/proof-api/organizations/${organizationId}/authorities`,
    { headers, data: { memberId, category: "payment" } },
  );
  expect(memberAuthority.status()).toBe(403);
  expect(
    (
      await page.request.post(
        `/proof-api/organizations/${randomUUID()}/authorities`,
        { headers, data: { memberId, category: "payment" } },
      )
    ).status(),
  ).not.toBeLessThan(400);

  await page.request.post("/proof-api/auth/sign-out", { headers });
  const ownerSignin = await page.request.post("/proof-api/auth/sign-in", {
    headers,
    data: { email: ownerEmail, password: ownerPassword },
  });
  expect(ownerSignin.status()).toBe(200);
  const membersResponse = await page.request.get(
    `/proof-api/organizations/${organizationId}/members`,
  );
  expect(membersResponse.status()).toBe(200);
  const members = await membersResponse.json();
  const membership = members.find((item: { user_id: string }) => item.user_id === memberUserId);
  expect(membership).toMatchObject({ user_id: memberUserId, roles: ["Requester"], active: true });

  const assign = await page.request.patch(
    `/proof-api/organizations/${organizationId}/members/${memberId}`,
    {
      headers,
      data: { roles: ["Approver"], active: true, jobTitle: "Payment Approver" },
    },
  );
  expect(assign.status()).toBe(200);
  expect(await assign.json()).toMatchObject({
    user_id: memberUserId,
    roles: ["Approver"],
    job_title: "Payment Approver",
    active: true,
  });
  const authority = await page.request.post(
    `/proof-api/organizations/${organizationId}/authorities`,
    { headers, data: { memberId, category: "payment" } },
  );
  expect(authority.status()).toBe(201);
  const authorityBody = await authority.json();
  expect(authorityBody).toMatchObject({
    member_id: memberId,
    category: "payment",
    active: true,
  });
  const revoke = await page.request.delete(
    `/proof-api/organizations/${organizationId}/authorities/${authorityBody.id}`,
    { headers },
  );
  expect(revoke.status()).toBe(200);
  expect(await revoke.json()).toMatchObject({ id: authorityBody.id, active: false });
  expect(
    (await page.request.get(`/proof-api/organizations/${organizationId}/authorities`)).status(),
  ).toBe(200);

  const crossOrigin = await page.request.post(
    `/proof-api/organizations/${organizationId}/authorities`,
    {
      headers: { origin: "https://attacker.invalid", "sec-fetch-site": "cross-site" },
      data: { memberId, category: "payment" },
    },
  );
  expect(crossOrigin.status()).toBe(403);
  const crossTenant = await page.request.patch(
    `/proof-api/organizations/${randomUUID()}/members/${memberId}`,
    { headers, data: { roles: ["Approver"], active: true, jobTitle: "Nope" } },
  );
  expect(crossTenant.status()).not.toBeLessThan(400);

  const suspend = await page.request.patch(
    `/proof-api/organizations/${organizationId}/members/${memberId}`,
    { headers, data: { roles: ["Approver"], active: false, jobTitle: "Payment Approver" } },
  );
  expect(suspend.status()).toBe(200);
  await page.request.post("/proof-api/auth/sign-out", { headers });
  await page.request.post("/proof-api/auth/sign-in", {
    headers,
    data: { email: memberEmail, password: memberPassword },
  });
  expect(
    (await page.request.get(`/proof-api/organizations/${organizationId}`)).status(),
  ).toBe(404);
  expect((await page.request.get("/proof-api/organizations")).status()).toBe(200);

  await page.request.post("/proof-api/auth/sign-out", { headers });
  await page.request.post("/proof-api/auth/sign-in", {
    headers,
    data: { email: ownerEmail, password: ownerPassword },
  });
  const reactivate = await page.request.patch(
    `/proof-api/organizations/${organizationId}/members/${memberId}`,
    { headers, data: { roles: ["Approver"], active: true, jobTitle: "Payment Approver" } },
  );
  expect(reactivate.status()).toBe(200);
  await page.goto(`/organizations/${organizationId}`);
  await expect(page.getByRole("tab", { name: "Members" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Authority" })).toBeVisible();

  console.log(JSON.stringify({ testCleanup: { ownerEmail, memberEmail, organizationId } }));
});