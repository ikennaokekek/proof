import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  use: { baseURL: "http://localhost:3000" },
  webServer: {
    command:
      'NEXT_DIST_DIR=.next-playwright SUPABASE_URL="$SUPABASE_TEST_URL" SUPABASE_PUBLISHABLE_KEY="$SUPABASE_TEST_PUBLISHABLE_KEY" pnpm run dev',
    port: 3000,
    reuseExistingServer: false,
  },
});