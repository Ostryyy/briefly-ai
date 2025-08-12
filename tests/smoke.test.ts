import { test, expect } from "vitest";

test("vitest is working and ENV is replaced", () => {
  expect(process.env.NODE_ENV).toBe("test");
  expect(process.env.SKIP_ENV_VALIDATION).toBe("true");
  expect(process.env.MONGODB_DB).toBe("briefly_test");
});
