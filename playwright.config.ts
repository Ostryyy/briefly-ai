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
  // Next.js i tak wymusi "development" przy `next dev`, ale endpoint dopuszcza E2E_MODE=true:
  NODE_ENV: process.env.NODE_ENV ?? "test",
  E2E_MODE: "true",
};

export default defineConfig({
  testDir: "tests/e2e",
  // ⬆️ podnieś timeout, bo w testach czekasz do 60s na READY/FAILED
  timeout: 120_000,
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
      name: "chromium-parallel",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/user.json",
      },
      testIgnore: /auth\.setup\.ts/,
      grepInvert: /@serial-env/,
      dependencies: ["setup"],
    },

    {
      name: "chromium-serial-env",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/user.json",
      },
      testIgnore: /auth\.setup\.ts/,
      grep: /@serial-env/,
      workers: 1,
      fullyParallel: false,
      dependencies: ["setup", "chromium-parallel"],
    },
  ],
});
