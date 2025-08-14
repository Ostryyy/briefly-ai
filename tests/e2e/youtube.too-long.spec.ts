import { test, expect } from "@playwright/test";

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

  // Overlay appears and goes away after the 400 response is handled.
  const overlay = page.getByTestId("jobform-overlay");
  await overlay.waitFor({ state: "visible" });
  await overlay.waitFor({ state: "detached" });

  // Error toast should be visible; no Job ID rendered.
  const errorToast = page.getByTestId("toast-job-start-error");
  await expect(errorToast).toBeVisible();
  await expect(page.getByTestId("jobinfo-id-value")).toHaveCount(0);

  // Submit should become usable again.
  await expect(submitBtn).toBeEnabled();
});
