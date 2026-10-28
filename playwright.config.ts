import { defineConfig, devices } from "@playwright/test";
import * as dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.WORKERS
    ? parseInt(process.env.WORKERS, 10)
    : process.env.CI
      ? 2
      : undefined,
  reporter: process.env.CI
    ? [["blob"], ["list"]]
    : [
        ["list"],
        [
          "html",
          { open: "never", title: "Playwright Docker Kubernetes Testing Lab" },
        ],
      ],
  use: {
    baseURL: "https://www.saucedemo.com",
    screenshot: "only-on-failure",
    video: {
      mode: process.env.CI ? "off" : "retain-on-failure",
      size: { width: 1280, height: 720 },
    },
    actionTimeout: 30 * 1000,
    navigationTimeout: 45 * 1000,
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      testMatch: "tests/ui/**/*.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      testMatch: "tests/ui/**/*.spec.ts",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      testMatch: "tests/ui/**/*.spec.ts",
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "api",
      testMatch: "tests/api/**/*.spec.ts",
    },
  ],
});
