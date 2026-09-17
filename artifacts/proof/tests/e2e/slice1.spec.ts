import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";

test("unauthenticated shell and server boundary", async ({ page }) => {
  const session = await page.request.get("/proof-api/session");
  expect(session.status()).toBe(200);
  expect(await session.json()).toEqual({ authenticated: false, user: null });

  const organizations = await page.request.get("/proof-api/organizations");
  expect(organizations.status()).toBe(401);

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Sign in to PROOF" })).toBeVisible();
  await expect(page.getByLabel("Email address")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
});

test("authenticated founder lifecycle and authorization boundaries", async ({
  page,
}) => {
  const suffix = randomUUID();
  const email = `proof-slice1-e2e-${suffix}@example.com`;
  const password = `Slice1-E2E-${suffix}-Aa!`;
  const organizationName = `Slice 1 E2E ${suffix}`;

  const signup = await page.request.post("/proof-api/auth/sign-up", {
    data: { email, password },
  });
  expect(signup.status()).toBe(201);
  expect(await signup.json()).toMatchObject({ authenticated: true });

  const session = await page.request.get("/proof-api/session");
  expect(session.status()).toBe(200);
  const sessionBody = await session.json();
  expect(sessionBody.authenticated).toBe(true);
  expect(sessionBody.user.email).toBe(email);
  expect(sessionBody.user.id).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );

  const forgedAuthority = await page.request.post("/proof-api/organizations", {
    data: {
      name: organizationName,
      jobTitle: "Business Owner",
      establishmentCapacity: "business_owner",
      eligibilityAttested: true,
      roles: ["Owner"],
      userId: sessionBody.user.id,
    },
  });
  expect(forgedAuthority.status()).toBe(400);

  const missingAttestation = await page.request.post(
    "/proof-api/organizations",
    {
      data: {
        name: `${organizationName} rejected`,
        jobTitle: "Business Owner",
        establishmentCapacity: "business_owner",
        eligibilityAttested: false,
      },
    },
  );
  expect(missingAttestation.status()).toBe(403);

  const createOrganization = await page.request.post(
    "/proof-api/organizations",
    {
      data: {
        name: organizationName,
        jobTitle: "Business Owner",
        establishmentCapacity: "business_owner",
        eligibilityAttested: true,
      },
    },
  );
  expect(createOrganization.status()).toBe(201);
  const organization = await createOrganization.json();
  expect(organization).toMatchObject({
    name: organizationName,
    membershipRoles: ["Owner"],
    jobTitle: "Business Owner",
  });
  expect(organization.id).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );

  const list = await page.request.get("/proof-api/organizations");
  expect(list.status()).toBe(200);
  const organizations = await list.json();
  expect(organizations).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: organization.id,
        name: organizationName,
        membershipRoles: ["Owner"],
      }),
    ]),
  );

  const detail = await page.request.get(
    `/proof-api/organizations/${organization.id}`,
  );
  expect(detail.status()).toBe(200);
  const detailBody = await detail.json();
  expect(detailBody).toMatchObject({
    id: organization.id,
    name: organizationName,
    membershipRoles: ["Owner"],
    jobTitle: "Business Owner",
  });
  expect(detailBody.members).toEqual([
    expect.objectContaining({
      userId: sessionBody.user.id,
      roles: ["Owner"],
      jobTitle: "Business Owner",
    }),
  ]);

  const signout = await page.request.post("/proof-api/auth/sign-out");
  expect(signout.status()).toBe(200);

  const sessionAfterSignout = await page.request.get("/proof-api/session");
  expect(sessionAfterSignout.status()).toBe(200);
  expect(await sessionAfterSignout.json()).toEqual({
    authenticated: false,
    user: null,
  });

  const organizationsAfterSignout = await page.request.get(
    "/proof-api/organizations",
  );
  expect(organizationsAfterSignout.status()).toBe(401);

  console.log(
    JSON.stringify({
      testCleanup: { email, organizationId: organization.id },
    }),
  );
});