---
name: Supabase runtime boundary
description: Why PROOF calls Supabase REST directly from server-only code instead of the Replit connector proxy.
---

Use the Supabase project URL and publishable key from managed environment variables in server-only code. Keep access and refresh tokens in httpOnly cookies. Use the management connection only for migrations and database verification, not application runtime traffic.

**Why:** The configured Supabase connector proxy repeatedly failed before reaching Supabase with an internal `fetch failed` response, while direct Auth requests and management SQL access to the same project worked.

**How to apply:** Preserve this boundary for Slice 1 Auth and PostgREST calls. Do not move tokens into browser storage or replace the publishable key with an elevated service key.