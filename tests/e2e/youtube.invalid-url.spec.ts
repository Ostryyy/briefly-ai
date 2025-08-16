import { test, expect } from "@playwright/test";
import { waitStartFailure } from "./helpers/jobs";

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

  await waitStartFailure(page);
  await expect(page.getByTestId("jobinfo-id-value")).toHaveCount(0);
});
