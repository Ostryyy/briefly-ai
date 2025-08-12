import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.env.ts"],
    include: ["tests/**/*.test.ts"],
    passWithNoTests: true,
    restoreMocks: true,
    mockReset: true,
    clearMocks: true,
  },
  resolve: {
    alias: {
      "@server": path.resolve(__dirname, "src/server"),
      "@shared": path.resolve(__dirname, "src/shared"),
      "server-only": path.resolve(__dirname, "tests/shims/server-only.ts"),
    },
  },
});
