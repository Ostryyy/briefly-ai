import { test, expect } from "@playwright/test";
import { waitStartFailure } from "./helpers/jobs";

/**
 * Validation error (too long):
 * - URL 'https://youtu.be/too-long' maps to ~999 min in the mock.
 * - /api/youtube should respond 400; UI shows error toast and does NOT render job info.
 */
test("YouTube → shows error toast when video duration exceeds the limit", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByTestId("jobform-mode-youtube").click();
  await page
    .getByTestId("jobform-youtube-url")
    .fill("https://youtu.be/too-long");

  const submitBtn = page.getByTestId("jobform-submit");
  await expect(submitBtn).toBeEnabled();
  await submitBtn.click();

  await waitStartFailure(page);
  await expect(page.getByTestId("jobinfo-id-value")).toHaveCount(0);

  await expect(submitBtn).toBeEnabled();
});
