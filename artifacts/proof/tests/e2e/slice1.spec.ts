import { expect, test } from "@playwright/test";

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