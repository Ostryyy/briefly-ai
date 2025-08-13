import { test, expect } from "@playwright/test";

test("opens home with active session", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText(/create a summary/i)).toBeVisible({
    timeout: 10_000,
  });
});
