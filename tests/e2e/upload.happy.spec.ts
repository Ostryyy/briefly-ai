import { test, expect } from "@playwright/test";
import {
  waitOverlayAndGetJobId,
  waitHomeReadyOrFail,
  waitJobsListReadyOrFail,
  waitJobDetailsReadyOrFail,
} from "./helpers/jobs";

test("Upload → READY visible on home, jobs list and job details (dummy buffer)", async ({
  page,
  context,
}) => {
  await page.goto("/");

  await expect(page.getByTestId("home-title")).toBeVisible();
  await page.getByTestId("jobform-mode-upload").click();

  const levelSelect = page.getByTestId("jobform-level-select");
  await expect(levelSelect).toBeEnabled();
  await levelSelect.selectOption("detailed");
  await expect(levelSelect).toHaveValue("detailed");

  const submitBtn = page.getByTestId("jobform-submit");
  await expect(submitBtn).toBeDisabled();

  const fileInput = page.locator(
    'input[type="file"][data-testid="jobform-file-input"]'
  );
  await expect(fileInput).toBeAttached();

  await fileInput.setInputFiles({
    name: "tiny.mp3",
    mimeType: "audio/mpeg",
    buffer: Buffer.from("dummy-mp3-content"),
  });

  await expect(page.getByText("tiny.mp3")).toBeVisible();
  await expect(submitBtn).toBeEnabled();

  await submitBtn.click();

  const jobId = await waitOverlayAndGetJobId(page);
  console.log("Started jobId:", jobId);

  const jobsPage = await context.newPage();
  const jobPage = await context.newPage();

  await Promise.all([jobsPage.goto("/jobs"), jobPage.goto(`/jobs/${jobId}`)]);

  await Promise.all([
    waitHomeReadyOrFail(page),
    waitJobsListReadyOrFail(jobsPage, jobId),
    waitJobDetailsReadyOrFail(jobPage, jobId),
  ]);
});
