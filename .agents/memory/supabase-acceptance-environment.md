---
name: Supabase acceptance environment
description: How PROOF runs real authenticated acceptance tests without changing development or production Auth behavior.
---

Run Playwright against a dedicated hosted Supabase acceptance project with email confirmation disabled. Store its URL and publishable key as development-only test-prefixed environment variables, and map them to the normal server variable names only in the Playwright web-server command.

**Why:** Hosted email delivery rate limits blocked repeatable sign-up verification, while local Supabase requires container support unavailable in this Replit environment. The isolated project preserves real Supabase Auth and RLS without changing the main project.

**How to apply:** Keep all application routes unchanged. Never add test-login routes, fake JWTs, injected cookies, service-role browser requests, disabled RLS, or Auth mocks. Use a dedicated test database credential for trusted cleanup and verify its hostname matches the acceptance API project; the workspace's generic database URL may target a different database. Remove disposable users and organizations after each acceptance run.