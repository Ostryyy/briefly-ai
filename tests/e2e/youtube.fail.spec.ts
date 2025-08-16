import { test, expect } from "@playwright/test";
import { setMockConfig, resetMockConfig } from "./helpers/mock";
import {
  waitStartSuccess,
  waitHomeFailed,
  waitJobsListFailed,
  waitJobDetailsFailed,
} from "./helpers/jobs";

/**
 * Forced processing failure (MOCK worker):
 * - Keep duration valid (https://youtu.be/happy) to pass the route check.
 * - Force worker failure via mock config so the job ends in FAILED.
 */
test.describe("@serial-env", () => {
  test.beforeAll(async ({ request }) => {
    await setMockConfig(request, {
      forceFail: true,
      failProb: 0,
    });
  });

  test.afterAll(async ({ request }) => {
    await resetMockConfig(request);
  });

  test("YouTube → FAILED visible on home, jobs list and job details (forced fail)", async ({
    page,
    context,
  }) => {
    await page.goto("/");

    await page.getByTestId("jobform-mode-youtube").click();
    await page
      .getByTestId("jobform-youtube-url")
      .fill("https://youtu.be/happy");

    const submitBtn = page.getByTestId("jobform-submit");
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    const jobId = await waitStartSuccess(page);

    const jobsPage = await context.newPage();
    const jobPage = await context.newPage();
    await Promise.all([jobsPage.goto("/jobs"), jobPage.goto(`/jobs/${jobId}`)]);

    await Promise.all([
      waitHomeFailed(page),
      waitJobsListFailed(jobsPage, jobId),
      waitJobDetailsFailed(jobPage, jobId),
    ]);

    await expect(page.getByRole("link", { name: "Open summary" })).toHaveCount(
      0
    );
    await expect(jobPage.getByTestId("summary-viewer")).toHaveCount(0);
    await expect(jobPage.getByText("Message")).toBeVisible();
  });
});
