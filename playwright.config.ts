import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000/";

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    ignoreHTTPSErrors: true,
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Only auto-start a local server when testing localhost.
  webServer: BASE_URL.includes("localhost")
    ? {
        command: "npx --yes serve -l 3000 .",
        url: "http://localhost:3000/",
        reuseExistingServer: true,
        timeout: 60_000,
      }
    : undefined,
});
