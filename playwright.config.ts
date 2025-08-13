import { defineConfig, devices } from "@playwright/test";
import * as path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "tests/e2e/.env.e2e") });

const E2E_PORT = Number(process.env.E2E_PORT ?? 3000);
const BASE_URL = process.env.BASE_URL ?? `http://localhost:${E2E_PORT}`;

const webEnv: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(process.env).flatMap(([k, v]) =>
      typeof v === "string" ? ([[k, v]] as const) : []
    )
  ),
  PORT: String(E2E_PORT),
  BASE_URL,
  MOCK_MODE: "true",
  YTDLP_PATH: path.resolve(__dirname, "tests/e2e/yt-dlp-mock.js"),
  NODE_ENV: process.env.NODE_ENV ?? "test",
};

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev:e2e",
    port: E2E_PORT,
    reuseExistingServer: !process.env.CI,
    env: webEnv,
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/user.json",
      },
      testIgnore: /auth\.setup\.ts/,
      dependencies: ["setup"],
    },
  ],
});
