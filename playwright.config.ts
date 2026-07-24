import { defineConfig } from "@playwright/test";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.e2e", quiet: true });

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://app.zesiai.com",
    headless: true,
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
      },
    },
  ],
});
