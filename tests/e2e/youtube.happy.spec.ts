import { test, expect } from "@playwright/test";
import {
  waitStartSuccess,
  waitHomeReadyOrFail,
  waitJobsListReadyOrFail,
  waitJobDetailsReadyOrFail,
} from "./helpers/jobs";

/**
 * Happy path:
 * - Uses mock yt-dlp URL 'https://youtu.be/happy' (10 min) → passes duration check.
 * - Starts a YouTube job, then verifies READY status on home, jobs list and job details.
 */
test("YouTube → READY visible on home, jobs list and job details (happy)", async ({
  page,
  context,
}) => {
  await page.goto("/");

  await expect(page.getByTestId("home-title")).toBeVisible();
  await page.getByTestId("jobform-mode-youtube").click();

  const urlInput = page.getByTestId("jobform-youtube-url");
  await expect(urlInput).toBeVisible();
  await urlInput.fill("https://youtu.be/happy");

  const levelSelect = page.getByTestId("jobform-level-select");
  await levelSelect.selectOption("short");
  await expect(levelSelect).toHaveValue("short");

  const submitBtn = page.getByTestId("jobform-submit");
  await expect(submitBtn).toBeEnabled();
  await submitBtn.click();

  const jobId = await waitStartSuccess(page);
  const jobsPage = await context.newPage();
  const jobPage = await context.newPage();

  await Promise.all([jobsPage.goto("/jobs"), jobPage.goto(`/jobs/${jobId}`)]);
  await Promise.all([
    waitHomeReadyOrFail(page),
    waitJobsListReadyOrFail(jobsPage, jobId),
    waitJobDetailsReadyOrFail(jobPage, jobId),
  ]);
});
