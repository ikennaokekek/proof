---
name: PROOF BFF route prefix
description: Why browser-facing PROOF API requests use a dedicated prefix.
---

Use `/proof-api` for browser-facing PROOF BFF requests and rewrite it internally
to the Next.js `/api` route handlers.

**Why:** The separate API Server artifact owns `/api` in Replit's shared preview
routing. Browser requests to `/api` reach that service rather than the PROOF
Next.js artifact, even though standalone Next.js E2E tests can pass.

**How to apply:** Keep the generated client base URL and E2E requests on
`/proof-api`. New Next.js route handlers may remain under the internal `app/api`
directory.