import { test, expect } from "@playwright/test";
import {
  waitOverlayAndGetJobId,
  waitHomeReadyOrFail,
  waitJobsListReadyOrFail,
  waitJobDetailsReadyOrFail,
} from "./helpers/jobs";

/**
 * Edge case:
 * - URL 'https://youtu.be/edge-ok' returns duration == MAX_VIDEO_MINUTES (30 min by default in .env.e2e).
 * - Should still pass validation and reach READY.
 */
test("YouTube → READY when duration equals MAX_VIDEO_MINUTES (edge OK)", async ({
  page,
  context,
}) => {
  await page.goto("/");

  await page.getByTestId("jobform-mode-youtube").click();
  await page
    .getByTestId("jobform-youtube-url")
    .fill("https://youtu.be/edge-ok");

  const submitBtn = page.getByTestId("jobform-submit");
  await expect(submitBtn).toBeEnabled();
  await submitBtn.click();

  const jobId = await waitOverlayAndGetJobId(page);
  const jobsPage = await context.newPage();
  const jobPage = await context.newPage();

  await Promise.all([jobsPage.goto("/jobs"), jobPage.goto(`/jobs/${jobId}`)]);
  await Promise.all([
    waitHomeReadyOrFail(page),
    waitJobsListReadyOrFail(jobsPage, jobId),
    waitJobDetailsReadyOrFail(jobPage, jobId),
  ]);
});
