import { test, expect } from "@playwright/test";

/**
 * Invalid URL:
 * - Non-YouTube URL should be rejected by /api/youtube with 400.
 * - UI shows error toast and no job is started.
 */
test("YouTube → shows error toast for invalid URL", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("jobform-mode-youtube").click();
  await page
    .getByTestId("jobform-youtube-url")
    .fill("https://example.com/not-youtube");

  const submitBtn = page.getByTestId("jobform-submit");
  await expect(submitBtn).toBeEnabled();
  await submitBtn.click();

  const overlay = page.getByTestId("jobform-overlay");
  await overlay.waitFor({ state: "visible" });
  await overlay.waitFor({ state: "detached" });

  await expect(page.getByTestId("toast-job-start-error")).toBeVisible();
  await expect(page.getByTestId("jobinfo-id-value")).toHaveCount(0);
});
